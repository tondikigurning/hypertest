import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { link, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { authorizeScenarioImplementationWrite, scenarioChanges } from "./agent-session.mjs";
import { createAgentTools, safeWorkspacePath } from "./agent-tools.mjs";
import {
  authorizeFlowWrite,
  changedScenarioFlows,
  confirmFlowReview,
  contentDigest,
  flowReviewKey,
} from "./flow-review.mjs";
import { requiresPrdReview } from "./prd-review.mjs";

const git = promisify(execFile);

test("implementation writes require approval of the current scenario snapshot", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "automation-agent-review-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const options = { cwd: workspace };
  await git("git", ["init", "--quiet"], options);
  await git(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--allow-empty",
      "-qm",
      "base",
    ],
    options,
  );
  const feature = "e2e/tests/bdd/features/example.feature";
  const registry = "e2e/tests/bdd/features/example.flows.md";
  const implementation = "e2e/tests/bdd/steps/example.ts";
  await mkdir(join(workspace, "e2e/tests/bdd/features"), { recursive: true });
  await mkdir(join(workspace, "e2e/tests/bdd/steps"), { recursive: true });
  await writeFile(join(workspace, implementation), "original");
  let approvedDigest;
  const tools = createAgentTools({
    workspace,
    authorizeFileWrite: (path) => authorizeScenarioImplementationWrite(workspace, "HEAD", path, approvedDigest),
  });
  await tools.write_file.execute({ path: registry, content: "# Example flows\n" });
  assert.equal((await scenarioChanges(workspace)).scenarioDigest, undefined);
  await tools.write_file.execute({ path: feature, content: "Feature: Example\n  Scenario: First\n    Given a step\n" });
  await assert.rejects(
    tools.write_file.execute({ path: implementation, content: "blocked" }),
    /approve the current scenario changes/,
  );
  await assert.rejects(
    tools.edit_file.execute({ path: implementation, oldText: "original", newText: "blocked" }),
    /approve the current scenario changes/,
  );
  assert.equal(await readFile(join(workspace, implementation), "utf8"), "original");
  approvedDigest = (await scenarioChanges(workspace)).scenarioDigest;
  await tools.write_file.execute({ path: registry, content: "# Example flows\n\nUpdated gaps.\n" });
  assert.equal((await scenarioChanges(workspace)).scenarioDigest, approvedDigest);
  await tools.edit_file.execute({ path: implementation, oldText: "original", newText: "approved" });
  assert.equal(await readFile(join(workspace, implementation), "utf8"), "approved");
  await tools.write_file.execute({
    path: feature,
    content: "Feature: Example\n  Scenario: Changed\n    Given a step\n",
  });
  await assert.rejects(
    tools.write_file.execute({ path: implementation, content: "stale approval" }),
    /approve the current scenario changes/,
  );
  assert.equal(await readFile(join(workspace, implementation), "utf8"), "approved");
});

test("browser approval identifies the action and hides configured credentials", async () => {
  let request;
  let browserCalled = false;
  let browserStarted = false;
  const tools = createAgentTools({
    browserName: "draft-browser",
    target: "https://example.invalid",
    scenarioId: "E2E_001",
    variables: { E2E_PASSWORD: "private-value" },
    ensureBrowser: async () => {
      browserStarted = true;
    },
    requestApproval: async (value) => {
      request = value;
      return false;
    },
    runBrowserCommand: async () => {
      browserCalled = true;
    },
  });
  const result = await tools.playwright_cli.execute({
    action: "fill",
    target: "textbox",
    value: "private-value",
    dataOwner: "e2e-owned",
  });
  assert.equal(result.denied, true);
  assert.equal(browserCalled, false);
  assert.equal(browserStarted, false);
  assert.match(request.command, /E2E_001.*fill.*textbox.*\[redacted\]/);
  assert.doesNotMatch(request.command, /private-value/);
});

test("browser exploration starts on the first browser command", async () => {
  const calls = [];
  const tools = createAgentTools({
    target: "https://example.invalid",
    ensureBrowser: async () => calls.push("start"),
    runBrowserCommand: async (args) => {
      calls.push(args[0]);
      return { stdout: "snapshot" };
    },
  });
  assert.deepEqual(calls, []);
  assert.equal(await tools.playwright_cli.execute({ action: "snapshot" }), "snapshot");
  assert.deepEqual(calls, ["start", "snapshot"]);
});

test("closing an exploration browser does not start a new one", async () => {
  const calls = [];
  const tools = createAgentTools({
    target: "https://example.invalid",
    ensureBrowser: async () => calls.push("start"),
    closeBrowser: async () => calls.push("close"),
  });
  assert.equal(await tools.playwright_cli.execute({ action: "close" }), "Exploration browser closed.");
  assert.deepEqual(calls, ["close"]);
});

test("retained PRD validation is distinguished from newly validated content", () => {
  const previous = "---\nstatus: draft\n---\n- [observed][validated] Existing.\n";
  assert.equal(requiresPrdReview(previous, `${previous}- [observed][needs-review] New.\n`), false);
  assert.equal(requiresPrdReview(previous, previous.replace("Existing.", "Changed.")), true);
  assert.equal(requiresPrdReview(previous, `${previous}- [observed][validated] Existing.\n`), true);
  assert.equal(requiresPrdReview(previous, previous.replace("status: draft", "status: 'reviewed'")), false);
});

test("an edit does not overwrite a file changed while approval is pending", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "automation-agent-edit-race-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const path = "example.txt";
  await writeFile(join(workspace, path), "original");
  const tools = createAgentTools({
    workspace,
    authorizeFileWrite: async () => writeFile(join(workspace, path), "external change"),
  });
  await assert.rejects(
    tools.edit_file.execute({ path, oldText: "original", newText: "agent change" }),
    /changed while awaiting approval/,
  );
  assert.equal(await readFile(join(workspace, path), "utf8"), "external change");
});

test("workspace writes reject Windows path aliases and alternate streams", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "automation-agent-path-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const tools = createAgentTools({ workspace });
  for (const path of ["e2e/tests/bdd./steps/example.ts", "docs/prd /example.md", "example.txt:stream", "NUL.txt"]) {
    await assert.rejects(tools.write_file.execute({ path, content: "blocked" }), /outside the agent's allowed/);
  }
});

test("agent tools do not read or change files hard-linked outside the workspace", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "automation-agent-hardlink-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = join(root, "workspace");
  await mkdir(workspace);
  await writeFile(join(root, "outside.txt"), "outside");
  await link(join(root, "outside.txt"), join(workspace, "alias.txt"));
  const tools = createAgentTools({ workspace });
  await assert.rejects(tools.read_file.execute({ path: "alias.txt" }), /unavailable/);
  await assert.rejects(tools.write_file.execute({ path: "alias.txt", content: "changed" }), /unavailable/);
  await assert.rejects(
    tools.edit_file.execute({ path: "alias.txt", oldText: "outside", newText: "changed" }),
    /unavailable/,
  );
  assert.equal(await readFile(join(root, "outside.txt"), "utf8"), "outside");
});

test("agent file and browser output redacts the configured provider key", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "automation-agent-secret-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await writeFile(join(workspace, "example.txt"), "A provider echoed private-provider-value.");
  const tools = createAgentTools({
    workspace,
    variables: { providerApiKey: "private-provider-value" },
    browserName: "browser",
    target: "https://example.invalid",
    runBrowserCommand: async () => ({ stdout: "private-provider-value" }),
  });
  assert.equal(await tools.read_file.execute({ path: "example.txt" }), "A provider echoed [redacted].");
  assert.equal(await tools.playwright_cli.execute({ action: "snapshot" }), "[redacted]");
});

test("scenario intent changes require scoped flow confirmation against the current PRD", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "automation-agent-flows-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const featurePath = "e2e/tests/bdd/features/module/example.feature";
  const prdPath = "docs/prd/module/example.md";
  const before = "Feature: Example\n  @flow:ONE\n  Scenario: Existing\n    Given a step\n";
  const after = `${before}\n  @flow:ONE\n  Scenario: New\n    Given another step\n`;
  let prdContent = "---\nstatus: reviewed\n---\nContext\n";
  await mkdir(join(workspace, "e2e/tests/bdd/features/module"), { recursive: true });
  await writeFile(join(workspace, featurePath), before);
  const confirmations = {};
  let accept = false;
  const tools = createAgentTools({
    workspace,
    confirmFlows: async ({ featurePath: feature, prdPath: prd, flows }) => {
      const approval = await confirmFlowReview({
        workspace,
        featurePath: feature,
        prdPath: prd,
        flows,
        safePath: safeWorkspacePath,
        redact: (value) => value,
        requestApproval: async () => accept,
        readPrd: async () => prdContent,
      });
      if (approval) confirmations[flowReviewKey(approval.feature)] = approval;
      return { approved: Boolean(approval) };
    },
    authorizeFileWrite: (path, content) =>
      authorizeFlowWrite({
        workspace,
        path,
        content,
        confirmations,
        safePath: safeWorkspacePath,
        readPrd: async () => prdContent,
      }),
    onFileWritten: (path, content) => {
      if (confirmations[flowReviewKey(path)]) confirmations[flowReviewKey(path)].featureDigest = contentDigest(content);
    },
  });
  await assert.rejects(tools.write_file.execute({ path: featurePath, content: after }), /Confirm the affected flow/);
  const input = { featurePath, prdPath, flows: [{ id: "ONE", description: "Existing and new journey" }] };
  assert.equal((await tools.confirm_flows.execute(input)).approved, false);
  await assert.rejects(tools.write_file.execute({ path: featurePath, content: after }), /Confirm the affected flow/);
  accept = true;
  assert.equal((await tools.confirm_flows.execute(input)).approved, true);
  await assert.rejects(
    tools.write_file.execute({
      path: featurePath,
      content: after.replace("@flow:ONE\n  Scenario: New", "@flow:TWO\n  Scenario: New"),
    }),
    /Confirm the affected flow/,
  );
  await tools.write_file.execute({ path: featurePath, content: after });
  assert.equal(await readFile(join(workspace, featurePath), "utf8"), after);
  await writeFile(join(workspace, featurePath), after.replace("another step", "external step"));
  await tools.write_file.execute({
    path: featurePath,
    content: `${after.replace("another step", "external step")}\n# comment\n`,
  });
  await assert.rejects(
    tools.write_file.execute({ path: featurePath, content: after.replace("another step", "another update") }),
    /Confirm the affected flow/,
  );
  assert.equal((await tools.confirm_flows.execute(input)).approved, true);
  prdContent = "---\nstatus: draft\n---\nChanged\n";
  await assert.rejects(
    tools.write_file.execute({ path: featurePath, content: after.replace("another step", "changed step") }),
    /Confirm the affected flow/,
  );
});

test("flow confirmation requires a PRD but does not require a document status", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "automation-agent-flow-prd-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await mkdir(join(workspace, "e2e/tests/bdd/features/module"), { recursive: true });
  const options = {
    workspace,
    featurePath: "e2e/tests/bdd/features/module/example.feature",
    prdPath: "docs/prd/module/example.md",
    flows: [{ id: "ONE", description: "A flow" }],
    safePath: safeWorkspacePath,
    redact: (value) => value,
    requestApproval: async () => true,
    readPrd: async () => "",
  };
  await assert.rejects(confirmFlowReview(options), /matching PRD is required/);
  assert.ok(await confirmFlowReview({ ...options, readPrd: async () => "# Requirements\nA flow" }));
  assert.ok(await confirmFlowReview({ ...options, readPrd: async () => "---\nstatus: draft\n---\nA flow" }));
  assert.ok(
    await confirmFlowReview({
      ...options,
      readPrd: async () => "# Requirements\n- [observed] A flow\n## Open issues\n- Outcome unverified",
    }),
    "an active PRD with unvalidated items and unresolved questions remains usable",
  );
});

test("flow confirmation is rejected if the PRD changes while the user reviews it", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "automation-agent-flow-race-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const featurePath = "e2e/tests/bdd/features/module/example.feature";
  const prdPath = "docs/prd/module/example.md";
  let prdContent = "---\nstatus: reviewed\n---\n";
  await mkdir(join(workspace, "e2e/tests/bdd/features/module"), { recursive: true });
  await assert.rejects(
    confirmFlowReview({
      workspace,
      featurePath,
      prdPath,
      flows: [{ id: "ONE", description: "A flow" }],
      safePath: safeWorkspacePath,
      redact: (value) => value,
      requestApproval: async () => {
        prdContent = "---\nstatus: draft\n---\n";
        return true;
      },
      readPrd: async () => prdContent,
    }),
    /changed while awaiting confirmation/,
  );
});

test("flow confirmation uses the owning menu PRD for flat and nested features", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "automation-agent-flow-owner-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const reviewed = "---\nstatus: reviewed\n---\n";
  let approvals = 0;
  const confirm = (featurePath, prdPath) =>
    confirmFlowReview({
      workspace,
      featurePath,
      prdPath,
      flows: [{ id: "ONE", description: "A business flow" }],
      safePath: async () => {},
      redact: (value) => value,
      readPrd: async () => reviewed,
      requestApproval: async () => {
        approvals++;
        return true;
      },
    });
  const parentPrd = "docs/prd/case-management/cases.md";
  for (const feature of [
    "e2e/tests/bdd/features/case-management/cases.feature",
    "e2e/tests/bdd/features/case-management/cases/bulk.feature",
    "e2e/tests/bdd/features/case-management/cases/integration/platform.feature",
    "e2e/tests/bdd/features/_components/filter.feature",
  ])
    assert.equal((await confirm(feature, parentPrd)).prd, parentPrd);
  const feature = "e2e/tests/bdd/features/case-management/cases/integration/platform.feature";
  for (const wrongPrd of [
    "docs/prd/case-management/integration.md",
    "docs/prd/case-management/cases/integration.md",
    "docs/prd/workforce-management/cases.md",
  ])
    await assert.rejects(confirm(feature, wrongPrd), /owning menu PRD/);
  assert.equal(approvals, 4, "mismatches must be rejected before requesting approval");

  const confirmations = {
    [flowReviewKey(feature)]: {
      featureDigest: contentDigest(""),
      prd: "docs/prd/case-management/integration.md",
      prdDigest: contentDigest(reviewed),
      ids: ["ONE"],
    },
  };
  await assert.rejects(
    authorizeFlowWrite({
      workspace,
      path: feature,
      content: "Feature: Example\n  @flow:ONE\n  Scenario: Example\n    Given a step\n",
      confirmations,
      safePath: async () => {},
      readPrd: async () => reviewed,
    }),
    /matching PRD/,
  );
});

test("flow change detection handles duplicate or missing IDs and outline examples", () => {
  const path = "e2e/tests/bdd/features/module/example.feature";
  const before =
    "Feature: Example\n  @flow:ONE\n  Scenario Outline: Example\n    Given <value>\n    Examples:\n      | value |\n      | one |\n";
  assert.deepEqual(changedScenarioFlows(path, before, before.replace("| one |", "| two |")), ["ONE"]);
  const withId = before.replace("@flow:ONE", "@TEN_EXA_EXA_E2E_001 @flow:ONE");
  const duplicate = `${withId}\n  @TEN_EXA_EXA_E2E_001 @flow:TWO\n  Scenario: Example\n    Given a step\n`;
  assert.deepEqual(changedScenarioFlows(path, withId, duplicate), ["TWO"]);
  assert.deepEqual(changedScenarioFlows(path, before, before.replace("@flow:ONE", "@flow:TWO")), ["ONE", "TWO"]);
  assert.deepEqual(changedScenarioFlows(path, duplicate, withId), ["TWO"]);
  assert.deepEqual(changedScenarioFlows(path, "", "Feature: Example\n  Scenario: No ID\n    Given a step\n"), [
    "(no flow tag)",
  ]);
});
