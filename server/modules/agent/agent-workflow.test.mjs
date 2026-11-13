import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { automationCatalog } from "../catalog/scenario-catalog.mjs";
import { createSession, selectDraftScenario } from "./agent-session.mjs";
import { createAgentTools } from "./agent-tools.mjs";

const git = promisify(execFile);
const featurePath = "e2e/tests/bdd/features/example/orders.feature";
const prdPath = "docs/prd/example/orders.md";
const scenarioId = "TEN_ORD_LST_E2E_001";

async function waitFor(session, predicate) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const snapshot = session.snapshot();
    if (predicate(snapshot)) return snapshot;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`Agent did not reach the expected state: ${JSON.stringify(session.snapshot())}`);
}

async function workflow(t, responses, runtime = {}, files = {}) {
  const root = await mkdtemp(join(tmpdir(), "automation-agent-workflow-"));
  const workspace = join(root, "workspace");
  for (const name of ["ask-qa", "write-prd", "write-e2e-scenarios", "write-e2e-code"]) {
    await mkdir(join(workspace, ".agents/skills", name), { recursive: true });
    await writeFile(join(workspace, ".agents/skills", name, "SKILL.md"), `Active workflow instructions: ${name}`);
  }
  await writeFile(join(workspace, ".gitignore"), "node_modules/\n");
  for (const path of ["node_modules", "e2e/node_modules", "packages/internal/test-utils/node_modules"]) {
    await mkdir(join(workspace, path), { recursive: true });
  }
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(workspace, path, ".."), { recursive: true });
    await writeFile(join(workspace, path), content);
  }
  await git("git", ["init", "--quiet"], { cwd: workspace });
  await git("git", ["add", "."], { cwd: workspace });
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
      "-qm",
      "base",
    ],
    { cwd: workspace },
  );
  const head = (await git("git", ["rev-parse", "HEAD"], { cwd: workspace })).stdout.trim();
  const branch = (await git("git", ["branch", "--show-current"], { cwd: workspace })).stdout.trim();
  const requests = [];
  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requests.push(JSON.parse(body));
      const response = responses.shift();
      const delta = response?.tool
        ? {
            role: "assistant",
            tool_calls: [
              {
                index: 0,
                id: `call-${requests.length}`,
                type: "function",
                function: { name: response.tool, arguments: JSON.stringify(response.input) },
              },
            ],
          }
        : { role: "assistant", content: response?.text || "No more scripted responses." };
      res.writeHead(200, { "content-type": "text/event-stream" });
      for (const [value, finish] of [
        [delta, null],
        [{}, response?.tool ? "tool_calls" : "stop"],
      ]) {
        res.write(
          `data: ${JSON.stringify({ id: `response-${requests.length}`, object: "chat.completion.chunk", created: 1, model: "test/model", choices: [{ index: 0, delta: value, finish_reason: finish }] })}\n\n`,
        );
      }
      res.end("data: [DONE]\n\n");
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const session = createSession({
    stateFile: join(root, "session.json"),
    prepareWorkspace: async () => ({ workspace, branch, baseBranch: branch, baseCommit: head, expectedHead: head }),
    runtime: {
      getProviderCredential: async () => ({
        apiKey: "test-only-key",
        baseUrl: `http://127.0.0.1:${server.address().port}/v1`,
      }),
      isModelVerified: async () => true,
      recordAgentUsage: async () => {},
      ...runtime,
    },
  });
  t.after(async () => {
    if (session.snapshot().busy) await session.cancel();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  await session.setModel("9router", "test/model");
  return { session, workspace, requests };
}

test("chat hands off skills, reviews artifacts, and runs a newly authored draft scenario", async (t) => {
  const prd = "---\nstatus: reviewed\n---\n# Orders\n- [validated] Users can list orders.\n";
  const feature = `Feature: Orders\n  @${scenarioId} @flow:LIST\n  Scenario: List orders\n    Given the orders page is open\n    Then the orders are visible\n`;
  const implementation = "e2e/tests/bdd/steps/example/orders.steps.ts";
  const responses = [
    { tool: "use_skill", input: { skill: "write-prd" } },
    { tool: "write_file", input: { path: prdPath, content: prd } },
    { tool: "use_skill", input: { skill: "write-e2e-scenarios" } },
    { text: "PRD reviewed. Continue with scenario discovery on a subsequent turn." },
  ];
  let runs = 0;
  const { session, workspace, requests } = await workflow(t, responses, {
    startIsolatedDraftRun: async (input) => {
      runs++;
      assert.equal(input.scenarioId, scenarioId);
      assert.equal(input.workspace, workspace);
      assert.match(input.patch, /orders\.steps\.ts/);
      return {
        active: () => false,
        publicRun: () => ({
          id: "draft-test",
          scenarioId,
          target: input.target,
          status: "passed",
          done: true,
          tests: [{ title: "List orders", status: "passed" }],
          isolated: true,
        }),
        dispose: async () => {},
      };
    },
  });
  await session.send("Help prepare order coverage.");
  const prdReview = await waitFor(session, (state) => state.approvalRequest || !state.busy);
  assert.equal(prdReview.approvalRequest?.kind, "prd-review", "ask-qa must be able to activate the PRD skill");
  session.decideApproval(prdReview.approvalRequest.id, "accept");
  await waitFor(session, (state) => !state.busy);
  assert.equal(await readFile(join(workspace, prdPath), "utf8"), prd);
  assert.match(JSON.stringify(requests[1].messages[0]), /Active workflow instructions: write-prd/);
  assert.equal(session.snapshot().requestedSkill, "write-prd", "PRD review must end the current workflow turn");
  assert.match(
    requests
      .at(-1)
      .messages.filter((message) => message.role === "tool")
      .at(-1).content,
    /subsequent turn/,
  );

  responses.push(
    { tool: "use_skill", input: { skill: "write-e2e-scenarios" } },
    {
      tool: "confirm_flows",
      input: { featurePath, prdPath, flows: [{ id: "LIST", description: "View the orders list" }] },
    },
    { tool: "write_file", input: { path: featurePath, content: feature } },
    { tool: "use_skill", input: { skill: "write-e2e-code" } },
    { text: "Review the scenarios in Changes before implementation." },
  );
  await session.send("Discover the list journey.");
  const flows = await waitFor(session, (state) => state.approvalRequest || !state.busy);
  assert.equal(flows.approvalRequest?.kind, "flow-review");
  session.decideApproval(flows.approvalRequest.id, "accept");
  await waitFor(session, (state) => !state.busy);
  assert.equal(
    session.snapshot().requestedSkill,
    "write-e2e-scenarios",
    "unapproved scenario changes must block the implementation handoff",
  );
  assert.match(JSON.stringify(requests.at(-1)), /Review and approve/);
  const review = await session.diff();
  await session.approveScenarios(review.digest);

  responses.push(
    { tool: "use_skill", input: { skill: "write-e2e-code" } },
    {
      tool: "write_file",
      input: {
        path: featurePath,
        content: feature.replace("Then the orders are visible", "Then the orders are deleted"),
      },
    },
    { tool: "write_file", input: { path: implementation, content: "// reviewed implementation\n" } },
    { tool: "run_draft_scenario", input: { scenarioId, file: "example/orders.feature", dataOwner: "e2e-owned" } },
    { text: "The isolated draft scenario passed; official results are unchanged." },
  );
  await session.send(
    "Implement and verify the approved scenario.",
    undefined,
    undefined,
    [],
    undefined,
    { label: "Test", target: "https://example.invalid" },
    { E2E_USERNAME: "test-user", E2E_PASSWORD: "test-password" },
  );
  const safety = await waitFor(session, (state) => state.approvalRequest || !state.busy);
  assert.equal(safety.approvalRequest?.kind, "data-safety");
  assert.equal(runs, 0, "execution must wait for a separate data-safety decision");
  session.decideApproval(safety.approvalRequest.id, "accept");
  await waitFor(session, (state) => !state.busy);
  assert.equal(session.snapshot().error, "");
  assert.equal(runs, 1);
  assert.equal(
    await readFile(join(workspace, featurePath), "utf8"),
    feature,
    "Implementation cannot rewrite approved scenario intent",
  );
  assert.equal(session.draftRun().status, "passed");
  const runResult = requests
    .at(-1)
    .messages.filter((message) => message.role === "tool")
    .at(-1);
  assert.equal(JSON.parse(runResult.content).isolated, true);
  await session.discardDraftRun();
});

test("allow all resolves pending review and permits subsequent flow and implementation without manual approval", async (t) => {
  const prd = "---\nstatus: reviewed\n---\n# Orders\n- [validated] Users can list orders.\n";
  const feature = `Feature: Orders\n  @${scenarioId} @flow:LIST\n  Scenario: List orders\n    Given the orders page is open\n`;
  const implementation = "e2e/tests/bdd/steps/example/orders.steps.ts";
  const responses = [
    { tool: "use_skill", input: { skill: "write-prd" } },
    { tool: "write_file", input: { path: prdPath, content: prd } },
    { tool: "use_skill", input: { skill: "write-e2e-scenarios" } },
    { tool: "confirm_flows", input: { featurePath, prdPath, flows: [{ id: "LIST", description: "List orders" }] } },
    { tool: "write_file", input: { path: featurePath, content: feature } },
    { tool: "use_skill", input: { skill: "write-e2e-code" } },
    { tool: "write_file", input: { path: implementation, content: "// implementation\n" } },
    { tool: "run_draft_scenario", input: { scenarioId, file: "example/orders.feature", dataOwner: "e2e-owned" } },
    { text: "Finished." },
  ];
  let runs = 0;
  const { session, workspace } = await workflow(t, responses, {
    startIsolatedDraftRun: async () => {
      runs++;
      return {
        active: () => false,
        publicRun: () => ({ id: "fixture", scenarioId, status: "passed", done: true, tests: [], isolated: true }),
        dispose: async () => {},
      };
    },
  });
  await session.send(
    "Prepare coverage.",
    undefined,
    undefined,
    [],
    undefined,
    { label: "Test", target: "https://example.invalid" },
    { E2E_USERNAME: "test-user", E2E_PASSWORD: "test-password" },
  );
  const pending = await waitFor(session, (state) => state.approvalRequest || !state.busy);
  assert.equal(pending.approvalRequest?.kind, "prd-review");
  session.setAllowAll(true);
  await waitFor(session, (state) => !state.busy);
  assert.equal(session.snapshot().allowAll, true);
  assert.equal(await readFile(join(workspace, implementation), "utf8"), "// implementation\n");
  assert.equal(runs, 1);
  assert.equal((await session.diff()).scenarioApproved, false);
  await session.discardDraftRun();
  session.setAllowAll(false);
  assert.equal(session.snapshot().allowAll, false);
  assert.equal((await session.diff()).scenarioApproved, false);
});

test("draft selection rejects missing, duplicate and moved scenario identities", () => {
  const row = { id: scenarioId, file: "example/orders.feature", key: "orders:1" };
  assert.equal(selectDraftScenario([row], { scenarioId, file: row.file }), row);
  assert.throws(() => selectDraftScenario([], { scenarioId }), /missing or ambiguous/);
  assert.throws(
    () => selectDraftScenario([row, { ...row, key: "orders:2" }], { scenarioId, file: row.file }),
    /ambiguous/,
  );
  assert.throws(() => selectDraftScenario([row], { scenarioId, file: "other/orders.feature" }), /source changed/);
  assert.throws(
    () => selectDraftScenario([{ ...row, availability: "unavailable" }], { scenarioId }),
    /missing or ambiguous/,
  );
});

test("relative browser navigation forwards its validated absolute URL", async () => {
  let args;
  const tools = createAgentTools({
    target: "https://example.invalid/app/",
    ensureBrowser: async () => {},
    runBrowserCommand: async (input) => {
      args = input;
      return { stdout: "navigated" };
    },
  });
  await tools.playwright_cli.execute({ action: "goto", value: "/orders" });
  assert.deepEqual(args, ["goto", "https://example.invalid/orders"]);
});

test("large feature files can be read in bounded pages", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "automation-agent-read-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const content = Array.from({ length: 3000 }, (_, index) => `line ${index + 1}: ${"x".repeat(30)}`).join("\n");
  await writeFile(join(workspace, "large.feature"), content);
  const tools = createAgentTools({ workspace });
  assert.match(await tools.read_file.execute({ path: "large.feature", startLine: 2500, lineCount: 2 }), /line 2500:/);
});

test("declined and stale data-safety approval never launch a draft runner", async (t) => {
  const implementation = "e2e/tests/bdd/steps/example/orders.steps.ts";
  const feature = `Feature: Orders\n  @${scenarioId}\n  Scenario: List orders\n    Given the orders page is open\n`;
  const run = {
    tool: "run_draft_scenario",
    input: { scenarioId, file: "example/orders.feature", dataOwner: "e2e-owned" },
  };
  const responses = [
    { tool: "write_file", input: { path: implementation, content: "// implementation\n" } },
    run,
    { text: "The draft was not run." },
  ];
  let runs = 0;
  const { session, workspace, requests } = await workflow(
    t,
    responses,
    {
      startIsolatedDraftRun: async () => {
        runs++;
        throw new Error("Runner must not start");
      },
    },
    { [featurePath]: feature },
  );
  const environment = { label: "Fixture", target: "https://example.invalid" };
  const variables = { E2E_USERNAME: "synthetic-user", E2E_PASSWORD: "synthetic-password" };
  const send = () =>
    session.send(
      "/write-e2e-code Verify this existing scenario.",
      undefined,
      undefined,
      [],
      undefined,
      environment,
      variables,
    );
  await send();
  const declined = await waitFor(session, (state) => state.approvalRequest || !state.busy);
  assert.equal(declined.approvalRequest?.kind, "data-safety");
  session.decideApproval(declined.approvalRequest.id, "decline");
  await waitFor(session, (state) => !state.busy);
  const declineResult = requests
    .at(-1)
    .messages.filter((message) => message.role === "tool")
    .at(-1);
  assert.equal(JSON.parse(declineResult.content).status, "not run");
  assert.equal(runs, 0);

  responses.push(run, { text: "The draft changed during review; review it again." });
  await send();
  const stale = await waitFor(session, (state) => state.approvalRequest || !state.busy);
  assert.equal(stale.approvalRequest?.kind, "data-safety");
  await writeFile(join(workspace, implementation), "// edited during approval\n");
  session.decideApproval(stale.approvalRequest.id, "accept");
  await waitFor(session, (state) => !state.busy);
  assert.equal(runs, 0);
  assert.equal(session.draftRun(), null);
  assert.match(
    requests
      .at(-1)
      .messages.filter((message) => message.role === "tool")
      .at(-1).content,
    /changed since review/,
  );
});

test("browser locator inspection stays read-only and CLI option overrides are rejected", async () => {
  const calls = [];
  const tools = createAgentTools({
    target: "https://example.invalid",
    ensureBrowser: async () => {},
    requestApproval: async () => assert.fail("Locator inspection does not mutate data"),
    runBrowserCommand: async (args) => {
      calls.push(args);
      return { stdout: "getByRole('button', { name: 'Orders' })" };
    },
  });
  assert.match(await tools.playwright_cli.execute({ action: "generate-locator", target: "e4" }), /getByRole/);
  assert.deepEqual(calls, [["generate-locator", "e4"]]);
  await assert.rejects(
    tools.playwright_cli.execute({ action: "snapshot", target: "--config=other.json" }),
    /cannot override/,
  );
  await assert.rejects(
    tools.playwright_cli.execute({ action: "goto", value: "https://other.invalid" }),
    /selected target origin/,
  );
  assert.equal(calls.length, 1);
});

test("answers use browser configuration saved while an agent question is pending", async (t) => {
  const responses = [
    { tool: "ask_user", input: { question: "Configure Variables?", options: [], isSecret: false } },
    { tool: "playwright_cli", input: { action: "snapshot" } },
    { text: "Explored." },
  ];
  const starts = [];
  const { session, requests } = await workflow(t, responses, {
    startExplorationBrowser: async (input) => {
      starts.push(input);
      return "fixture-browser";
    },
    runExplorationBrowserCommand: async () => ({ stdout: "fixture snapshot fixture-user fixture-password" }),
    closeExplorationBrowser: async () => {},
  });
  await session.send("Create a PRD.");
  const pending = await waitFor(session, (state) => state.userRequest || !state.busy);
  assert.ok(pending.userRequest);
  const environment = { label: "Fixture", target: "https://example.invalid" };
  const variables = { E2E_USERNAME: "fixture-user", E2E_PASSWORD: "fixture-password" };
  session.answer(
    pending.userRequest.id,
    { [pending.userRequest.questions[0].id]: "Configured" },
    environment,
    variables,
  );
  await waitFor(session, (state) => !state.busy);
  assert.equal(starts.length, 1);
  assert.equal(starts[0].target, environment.target);
  assert.equal(starts[0].variables.E2E_USERNAME, variables.E2E_USERNAME);
  assert.doesNotMatch(JSON.stringify(requests), /fixture-password|fixture-user/);
});

test("follow-up chat resolves an unchanged explorer attachment to its current draft source", async (t) => {
  const feature = `Feature: Orders\n  @${scenarioId}\n  Scenario: List orders\n    Given the old orders page is open\n`;
  const { session, workspace, requests } = await workflow(
    t,
    [{ text: "Using the current draft scenario." }],
    {},
    { [featurePath]: feature },
  );
  const original = automationCatalog(join(workspace, "e2e/tests/bdd/features"))[0];
  const updated = feature.replace("List orders", "View draft orders").replace("old orders", "current orders");
  const inserted = "  @TEN_ORD_LST_E2E_002\n  Scenario: Another journey\n    Given a separate page\n";
  await writeFile(join(workspace, featurePath), updated.replace("  @", `${inserted}\n  @`));
  const contexts = [{ id: "selected-scenario", kind: "scenario", ref: original.key, auto: true, value: original }];
  await session.send("Continue with the selected draft.", undefined, undefined, contexts);
  await waitFor(session, (state) => !state.busy);
  assert.equal(session.snapshot().error, "");
  assert.match(JSON.stringify(requests.at(-1).messages), /View draft orders/);
  assert.match(JSON.stringify(requests.at(-1).messages), /current orders page/);
  await writeFile(join(workspace, featurePath), `${updated}\n${updated.replace("Feature: Orders\n", "")}`);
  await assert.rejects(session.send("Continue.", undefined, undefined, contexts), /unavailable or ambiguous/);
});
