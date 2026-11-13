import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { createAgentLanguageModel } from "./agent-provider.mjs";
import { createSession } from "./agent-session.mjs";

const git = promisify(execFile);
const secret = "fake-private-provider-value";

test("PRD versions can be managed in the draft workspace", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "automation-prd-session-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = join(root, "workspace");
  await mkdir(workspace);
  await git("git", ["init", "--quiet"], { cwd: workspace });
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
    { cwd: workspace },
  );
  const head = (await git("git", ["rev-parse", "HEAD"], { cwd: workspace })).stdout.trim();
  const branch = (await git("git", ["branch", "--show-current"], { cwd: workspace })).stdout.trim();
  const session = createSession({
    stateFile: join(root, "session.json"),
    prepareWorkspace: async () => ({ workspace, branch, baseCommit: head, baseBranch: branch, expectedHead: head }),
  });
  assert.deepEqual((await session.prdVersions("sales", "orders")).items, []);
  const created = await session.createPrdVersion({
    module: "sales",
    submodule: "orders",
    initialContent: "# Orders\n",
  });
  assert.equal(created.items[0].content, "# Orders\n");
  await session.updatePrdVersion({
    module: "sales",
    submodule: "orders",
    versionId: "v1",
    name: "First",
    content: "# Updated\n",
  });
  assert.equal(await readFile(join(workspace, "docs/prd/sales/orders.md"), "utf8"), "# Updated\n");
  assert.equal((await session.prdVersions("sales", "orders")).items[0].name, "First");
  await session.deletePrdVersion({ module: "sales", submodule: "orders", versionId: "v1" });
  assert.deepEqual((await session.prdVersions("sales", "orders")).items, []);
});

test("selected provider and model survive session reload before a workspace exists", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "automation-agent-settings-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const options = {
    stateFile: join(root, "session.json"),
    runtime: { getProviderCredential: async () => ({ apiKey: secret }), isModelVerified: async () => true },
  };
  await createSession(options).setModel("openai", "example-model");
  const restored = createSession(options).snapshot();
  assert.equal(restored.provider, "openai");
  assert.equal(restored.model, "example-model");
});

test("new chats and draft sessions retain the selected provider and model", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "automation-agent-preferences-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const options = {
    stateFile: join(root, "first.json"),
    preferencesFile: join(root, "preferences.json"),
    runtime: { getProviderCredential: async () => ({ apiKey: secret }), isModelVerified: async () => true },
  };
  const session = createSession(options);
  await session.setModel("openai", "example-model");
  await session.reset();
  assert.equal(session.snapshot().provider, "openai");
  assert.equal(createSession(options).snapshot().model, "example-model");
  const next = createSession({ ...options, stateFile: join(root, "next.json") });
  assert.equal(next.snapshot().provider, "openai");
  assert.equal(next.snapshot().model, "example-model");
  await next.clearProvider("openai");
  assert.equal(createSession({ ...options, stateFile: join(root, "third.json") }).snapshot().provider, undefined);
});

async function waitUntil(predicate) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const result = predicate();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Agent did not reach the expected state.");
}

test("agent loop pauses for a user answer and redacts provider keys", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "automation-agent-session-"));
  const workspace = join(root, "workspace");
  await mkdir(join(workspace, ".agents/skills/ask-qa"), { recursive: true });
  await mkdir(join(workspace, "e2e/node_modules"), { recursive: true });
  await mkdir(join(workspace, "node_modules"), { recursive: true });
  await mkdir(join(workspace, "packages/internal/test-utils/node_modules"), { recursive: true });
  await writeFile(join(workspace, ".gitignore"), "node_modules/\n");
  await writeFile(join(workspace, ".agents/skills/ask-qa/SKILL.md"), "Answer the user's QA question.");
  const options = { cwd: workspace };
  await git("git", ["init", "--quiet"], options);
  await git("git", ["add", "."], options);
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
    options,
  );
  const head = (await git("git", ["rev-parse", "HEAD"], options)).stdout.trim();
  const branch = (await git("git", ["branch", "--show-current"], options)).stdout.trim();
  let calls = 0;
  const requestBodies = [];
  const server = createServer((req, res) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      requestBodies.push(body);
      calls++;
      const delta =
        calls === 1
          ? {
              role: "assistant",
              tool_calls: [
                {
                  index: 0,
                  id: "call-1",
                  type: "function",
                  function: {
                    name: "ask_user",
                    arguments: JSON.stringify({ question: `Which option? ${secret}`, options: [], isSecret: false }),
                  },
                },
              ],
            }
          : { role: "assistant", content: `Done. ${secret}` };
      const finish = calls === 1 ? "tool_calls" : "stop";
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        `data: ${JSON.stringify({ id: `response-${calls}`, object: "chat.completion.chunk", created: 1, model: "test/model", choices: [{ index: 0, delta, finish_reason: null }] })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({ id: `response-${calls}`, object: "chat.completion.chunk", created: 1, model: "test/model", choices: [{ index: 0, delta: {}, finish_reason: finish }] })}\n\n`,
      );
      res.end("data: [DONE]\n\n");
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await rm(root, { recursive: true, force: true });
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
  const session = createSession({
    stateFile: join(root, "session.json"),
    prepareWorkspace: async () => ({ workspace, branch, baseCommit: head, expectedHead: head, baseBranch: branch }),
    runtime: {
      getProviderCredential: async () => ({ apiKey: secret, baseUrl }),
      isModelVerified: async () => true,
      createAgentLanguageModel,
      recordAgentUsage: async () => {},
    },
  });
  await session.setModel("9router", "test/model");
  await session.send("Please help with QA.");
  const question = await waitUntil(() => session.snapshot().userRequest);
  assert.equal(session.snapshot().busy, true);
  assert.match(question.questions[0].question, /\[redacted\]/);
  assert.equal(calls, 1);
  session.answer(question.id, { [question.questions[0].id]: "Use the first option" });
  await waitUntil(() => !session.snapshot().busy);
  assert.equal(session.snapshot().error, "");
  assert.equal(calls, 2);
  assert.match(JSON.stringify(session.snapshot().messages), /Done\. \[redacted\]/);
  assert.doesNotMatch(JSON.stringify(session.snapshot()), /fake-private-provider-value/);
  assert.doesNotMatch(requestBodies.join("\n"), /fake-private-provider-value/);
  assert.doesNotMatch(await readFile(join(root, "session.json"), "utf8"), /fake-private-provider-value/);
});
