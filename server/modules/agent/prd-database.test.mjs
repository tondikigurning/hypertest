import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDatabase, database } from "../../database.mjs";
import { agentPrds } from "../results/schema.mjs";
import { createAgentTools } from "./agent-tools.mjs";
import { authorizeFlowWrite, confirmFlowReview, flowReviewKey } from "./flow-review.mjs";
import { createPrdDatabase, prdIdentity } from "./prd-database.mjs";

test("agent file tools never fall back to workspace PRD files", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "qrex-no-prd-store-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const tools = createAgentTools({ workspace });
  const path = "docs/prd/example/cases.md";
  await assert.rejects(tools.write_file.execute({ path, content: "# Cases" }), /database store/);
  await assert.rejects(tools.edit_file.execute({ path, oldText: "a", newText: "b" }), /database store/);
  await assert.rejects(tools.read_file.execute({ path }), /database store/);
  await assert.rejects(readFile(join(workspace, path)), { code: "ENOENT" });
});

function runCli(userId, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["server/modules/agent/prd-cli.mjs", ...args], {
      env: { ...process.env, AUTOMATION_PRD_IDENTITY: userId },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    let error = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (error += chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output, error }));
    child.stdin.end(input === undefined ? undefined : JSON.stringify(input));
  });
}

test("terminal PRD access shares the selected database identity and rejects stale writes", async (t) => {
  const userId = randomUUID();
  t.after(async () => {
    await database().delete(agentPrds).where(eq(agentPrds.userId, userId));
    await closeDatabase();
  });
  const path = "docs/prd/example/cases.md";
  const draft = "---\nstatus: draft\n---\n# Cases\n";
  assert.equal((await runCli(userId, ["write", path], { content: draft, expected: null })).code, 0);
  assert.equal(await createPrdDatabase(userId).read(path), draft);
  assert.equal((await runCli(userId, ["read", path])).output, draft);
  const stale = await runCli(userId, ["write", path], { content: "changed", expected: null });
  assert.notEqual(stale.code, 0);
  assert.match(stale.error, /changed/);
  const review = await runCli(userId, ["write", path], {
    content: "---\nstatus: reviewed\n---\n[validated] Cases\n",
    expected: draft,
  });
  assert.notEqual(review.code, 0);
  assert.equal(await createPrdDatabase(userId).read(path), draft);
  const updated = `${draft}Updated content.\n`;
  assert.equal((await runCli(userId, ["write", path], { content: updated, expected: draft })).code, 0);
  assert.equal((await runCli(userId, ["read", path])).output, updated);
  assert.equal(JSON.parse((await runCli(userId, ["list"])).output)[0].content, updated);
  assert.notEqual((await runCli(randomUUID(), ["read", path])).code, 0, "other identities cannot read this PRD");

  const accepted = "# Cases\n- [validated] Read cases\n";
  assert.equal(
    (
      await runCli(userId, ["write", path], {
        content: accepted,
        expected: updated,
        approvedSha256: createHash("sha256").update(accepted).digest("hex"),
      })
    ).code,
    0,
  );
  assert.notEqual((await runCli(userId, ["write", path], { content: "replacement", expected: accepted })).code, 0);
  assert.equal((await runCli(userId, ["read", path])).output, accepted);

  const store = createPrdDatabase(userId);
  await store.mutate("create", { module: "example", menu: "cases", name: "Second" });
  const versions = JSON.parse((await runCli(userId, ["versions", path])).output);
  assert.equal(versions.items.length, 2);
  const active = versions.items.find((item) => item.active);
  const previous = versions.items.find((item) => !item.active);
  const staleDelete = await runCli(userId, ["delete", path], { versionId: previous.id, expectedContent: "stale" });
  assert.notEqual(staleDelete.code, 0);
  assert.match(staleDelete.error, /changed/);
  const activeDelete = await runCli(userId, ["delete", path], {
    versionId: active.id,
    expectedContent: active.content,
  });
  assert.notEqual(activeDelete.code, 0);
  assert.match(activeDelete.error, /another version active/);
  assert.equal(
    (await runCli(userId, ["delete", path], { versionId: previous.id, expectedContent: previous.content })).code,
    0,
  );
  assert.equal((await store.versions("example", "cases")).items.length, 1);
  assert.equal(
    (await runCli(userId, ["delete", path], { versionId: active.id, expectedContent: active.content })).code,
    0,
  );
  assert.notEqual((await runCli(userId, ["read", path])).code, 0);
  assert.deepEqual(JSON.parse((await runCli(userId, ["list"])).output), []);
});

test("PRDs and versions persist in the database without writing a repository file", async (t) => {
  const userId = `test-${randomUUID()}`;
  const workspace = await mkdtemp(join(tmpdir(), "qrex-prd-db-"));
  t.after(async () => {
    await database().delete(agentPrds).where(eq(agentPrds.userId, userId));
    await closeDatabase();
    await rm(workspace, { recursive: true, force: true });
  });
  const store = createPrdDatabase(userId);
  let approvals = 0;
  const approval = {
    requestApproval: async () => {
      approvals++;
      return true;
    },
    redact: (value) => value,
  };
  const tools = createAgentTools({
    workspace,
    prdStore: {
      isPrd: (path) => !!prdIdentity(path),
      list: store.list,
      read: store.read,
      write: (path, content, expected) => store.write(path, content, { ...approval, expected }),
    },
  });
  const path = "docs/prd/knowledge/articles.md";
  await tools.write_file.execute({ path, content: "---\nstatus: draft\n---\n# Articles\n" });
  assert.match(await tools.read_file.execute({ path }), /Articles/);
  assert.deepEqual(await tools.list_files.execute({ directory: "docs/prd" }), [path]);
  await assert.rejects(readFile(join(workspace, path)), { code: "ENOENT" });
  assert.equal((await createPrdDatabase(userId).versions("knowledge", "articles")).items.length, 1);
  await store.mutate("create", { module: "knowledge", menu: "articles", name: "Second" }, approval);
  assert.equal((await store.versions("knowledge", "articles")).items.length, 2);
  await store.write(path, "---\nstatus: reviewed\n---\n[validated] Read articles\n", approval);
  assert.equal(approvals, 1);
  const version = (await store.versions("knowledge", "articles")).items.find((item) => item.active);
  const manualContent = "---\nstatus: reviewed\n---\n[validated] Edited manually\n";
  await store.mutate("update", {
    module: "knowledge",
    menu: "articles",
    versionId: version.id,
    content: manualContent,
    expectedContent: version.content,
  });
  assert.equal(await store.read(path), manualContent);
  assert.equal(approvals, 1, "manual edits must not request agent approval");
  await assert.rejects(
    store.mutate("update", {
      module: "knowledge",
      menu: "articles",
      versionId: version.id,
      content: "stale",
      expectedContent: version.content,
    }),
    /changed/,
  );
  await assert.rejects(store.write(path, "old", { ...approval, expected: "outdated" }), /changed/);
  const feature = "e2e/tests/bdd/features/knowledge/articles.feature";
  const confirmation = await confirmFlowReview({
    workspace,
    featurePath: feature,
    prdPath: path,
    flows: [{ id: "READ", description: "Read articles" }],
    safePath: async () => {},
    redact: (value) => value,
    requestApproval: async () => true,
    readPrd: store.read,
  });
  const confirmations = { [flowReviewKey(feature)]: confirmation };
  const content = "Feature: Articles\n  @ART_001 @flow:READ\n  Scenario: Read articles\n    Given articles exist\n";
  await authorizeFlowWrite({
    workspace,
    path: feature,
    content,
    confirmations,
    safePath: async () => {},
    readPrd: store.read,
  });
  await store.write(path, "---\nstatus: draft\n---\nchanged\n", approval);
  await assert.rejects(
    authorizeFlowWrite({
      workspace,
      path: feature,
      content,
      confirmations,
      safePath: async () => {},
      readPrd: store.read,
    }),
    /Confirm the affected flow/,
  );
});
