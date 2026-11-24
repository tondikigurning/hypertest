import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { eq } from "drizzle-orm";
import express from "express";
import { closeDatabase, database } from "../../database.mjs";
import { agentPrds } from "../results/schema.mjs";
import { createAgentRouter } from "./agent-routes.mjs";
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

function runCli(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["server/modules/agent/prd-cli.mjs", ...args], {
      env: { ...process.env, AUTOMATION_PRD_IDENTITY: "" },
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

test("terminal PRD access shares database records without an identity and rejects stale writes", async (t) => {
  const module = `test_${randomUUID().replaceAll("-", "")}`;
  t.after(async () => {
    await database().delete(agentPrds).where(eq(agentPrds.module, module));
    await closeDatabase();
  });
  const path = `docs/prd/${module}/cases.md`;
  const draft = "---\nstatus: draft\n---\n# Cases\n";
  assert.equal((await runCli(["write", path], { content: draft, expected: null })).code, 0);
  assert.equal(await createPrdDatabase().read(path), draft);
  assert.equal((await runCli(["read", path])).output, draft);
  const stale = await runCli(["write", path], { content: "changed", expected: null });
  assert.notEqual(stale.code, 0);
  assert.match(stale.error, /changed/);
  const review = await runCli(["write", path], {
    content: "---\nstatus: reviewed\n---\n[validated] Cases\n",
    expected: draft,
  });
  assert.notEqual(review.code, 0);
  assert.equal(await createPrdDatabase().read(path), draft);
  const updated = `${draft}Updated content.\n`;
  assert.equal((await runCli(["write", path], { content: updated, expected: draft })).code, 0);
  assert.equal((await runCli(["read", path])).output, updated);
  assert.equal(JSON.parse((await runCli(["list"])).output).find((item) => item.module === module).content, updated);
  assert.equal(await createPrdDatabase().read(path), updated);

  const accepted = "# Cases\n- [validated] Read cases\n";
  assert.equal(
    (
      await runCli(["write", path], {
        content: accepted,
        expected: updated,
        approvedSha256: createHash("sha256").update(accepted).digest("hex"),
      })
    ).code,
    0,
  );
  assert.notEqual((await runCli(["write", path], { content: "replacement", expected: accepted })).code, 0);
  assert.equal((await runCli(["read", path])).output, accepted);

  const store = createPrdDatabase();
  await store.mutate("create", { module, menu: "cases", name: "Second" });
  const versions = JSON.parse((await runCli(["versions", path])).output);
  assert.equal(versions.items.length, 2);
  const active = versions.items.find((item) => item.active);
  const previous = versions.items.find((item) => !item.active);
  const staleDelete = await runCli(["delete", path], { versionId: previous.id, expectedContent: "stale" });
  assert.notEqual(staleDelete.code, 0);
  assert.match(staleDelete.error, /changed/);
  const activeDelete = await runCli(["delete", path], {
    versionId: active.id,
    expectedContent: active.content,
  });
  assert.notEqual(activeDelete.code, 0);
  assert.match(activeDelete.error, /another version active/);
  assert.equal((await runCli(["delete", path], { versionId: previous.id, expectedContent: previous.content })).code, 0);
  assert.equal((await store.versions(module, "cases")).items.length, 1);
  assert.equal((await runCli(["delete", path], { versionId: active.id, expectedContent: active.content })).code, 0);
  assert.notEqual((await runCli(["read", path])).code, 0);
  assert.equal(
    JSON.parse((await runCli(["list"])).output).some((item) => item.module === module),
    false,
  );
});

test("terminal PRD read resolves only a unique active document for the exact menu", async (t) => {
  const first = randomUUID();
  const second = randomUUID();
  const menu = `cases-${randomUUID()}`;
  const path = `docs/prd/example/${menu}.md`;
  const content = "---\nstatus: reviewed\n---\n# Cases\n";
  t.after(async () => {
    await database().delete(agentPrds).where(eq(agentPrds.userId, first));
    await database().delete(agentPrds).where(eq(agentPrds.userId, second));
    await closeDatabase();
  });
  assert.match((await runCli(undefined, ["read", path])).error, /not found/);
  await createPrdDatabase(first).mutate(
    "create",
    { module: "example", menu, initialContent: content },
    {
      requestApproval: async () => true,
      redact: (value) => value,
    },
  );
  assert.equal((await runCli(undefined, ["read", path])).output, content);
  await createPrdDatabase(second).mutate(
    "create",
    { module: "example", menu, initialContent: content },
    {
      requestApproval: async () => true,
      redact: (value) => value,
    },
  );
  const ambiguous = await runCli(undefined, ["read", path]);
  assert.notEqual(ambiguous.code, 0);
  assert.match(ambiguous.error, /Multiple PRDs/);
  assert.equal(ambiguous.output, "");
  assert.equal((await runCli(first, ["read", path])).output, content);
  assert.notEqual((await runCli(undefined, ["list"])).code, 0);
  assert.notEqual((await runCli(undefined, ["write", path], { content, expected: null })).code, 0);
});

test("PRDs and versions persist in the database without writing a repository file", async (t) => {
  const module = `test_${randomUUID().replaceAll("-", "")}`;
  const workspace = await mkdtemp(join(tmpdir(), "qrex-prd-db-"));
  t.after(async () => {
    await database().delete(agentPrds).where(eq(agentPrds.module, module));
    await closeDatabase();
    await rm(workspace, { recursive: true, force: true });
  });
  const store = createPrdDatabase();
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
  const path = `docs/prd/${module}/articles.md`;
  await tools.write_file.execute({ path, content: "---\nstatus: draft\n---\n# Articles\n" });
  assert.match(await tools.read_file.execute({ path }), /Articles/);
  assert.ok((await tools.list_files.execute({ directory: "docs/prd" })).includes(path));
  await assert.rejects(readFile(join(workspace, path)), { code: "ENOENT" });
  assert.equal((await createPrdDatabase().versions(module, "articles")).items.length, 1);
  await store.mutate("create", { module, menu: "articles", name: "Second" }, approval);
  assert.equal((await store.versions(module, "articles")).items.length, 2);
  await store.write(path, "---\nstatus: reviewed\n---\n[validated] Read articles\n", approval);
  assert.equal(approvals, 1);
  const version = (await store.versions(module, "articles")).items.find((item) => item.active);
  const manualContent = "---\nstatus: reviewed\n---\n[validated] Edited manually\n";
  await store.mutate("update", {
    module,
    menu: "articles",
    versionId: version.id,
    content: manualContent,
    expectedContent: version.content,
  });
  assert.equal(await store.read(path), manualContent);
  assert.equal(approvals, 1, "manual edits must not request agent approval");
  await assert.rejects(
    store.mutate("update", {
      module,
      menu: "articles",
      versionId: version.id,
      content: "stale",
      expectedContent: version.content,
    }),
    /changed/,
  );
  await assert.rejects(store.write(path, "old", { ...approval, expected: "outdated" }), /changed/);
  const feature = `e2e/tests/bdd/features/${module}/articles.feature`;
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

test("PRD HTTP operations work without browser identity or a draft", async (t) => {
  const module = `test_${randomUUID().replaceAll("-", "")}`;
  const app = express();
  app.use("/agent", createAgentRouter());
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await database().delete(agentPrds).where(eq(agentPrds.module, module));
    await closeDatabase();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const host = `127.0.0.1:${server.address().port}`;
  const previousHosts = process.env.AUTOMATION_WEB_ALLOWED_HOSTS;
  process.env.AUTOMATION_WEB_ALLOWED_HOSTS = host;
  t.after(() => {
    if (previousHosts === undefined) delete process.env.AUTOMATION_WEB_ALLOWED_HOSTS;
    else process.env.AUTOMATION_WEB_ALLOWED_HOSTS = previousHosts;
  });
  const origin = base;
  const created = await fetch(`${base}/agent/prd-versions`, {
    method: "POST",
    headers: { origin, host, "content-type": "application/json" },
    body: JSON.stringify({ module, menu: "cases", name: "First" }),
  });
  assert.equal(created.status, 201);
  const version = (await created.json()).items[0];
  const updated = await fetch(`${base}/agent/prd-versions/${version.id}`, {
    method: "PUT",
    headers: { origin, host, "content-type": "application/json" },
    body: JSON.stringify({ module, menu: "cases", content: "Shared", expectedContent: "" }),
  });
  assert.equal(updated.status, 200);
  const read = await fetch(`${base}/agent/prd-versions?module=${module}&menu=cases`, { headers: { host } });
  assert.equal((await read.json()).items[0].content, "Shared");
  const deleted = await fetch(`${base}/agent/prd-versions/${version.id}?module=${module}&menu=cases`, {
    method: "DELETE",
    headers: { origin, host },
  });
  assert.equal(deleted.status, 200);
});
