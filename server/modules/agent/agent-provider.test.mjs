import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { initializeAgentEncryption } from "./agent-crypto.mjs";
import {
  createAgentLanguageModel,
  discoverCompatibleModels,
  modelIsListed,
  normalizeOpenAICompatibleBaseUrl,
  verifyToolCalling,
} from "./agent-provider.mjs";

test("UI encryption setup creates a stable local key without replacing an existing one", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "automation-provider-key-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const options = { keyFile: join(directory, "nested", "encryption.key"), environment: {}, fileEnvironment: {} };
  initializeAgentEncryption(options);
  const first = (await readFile(options.keyFile, "utf8")).trim();
  assert.equal(Buffer.from(first, "base64url").length, 32);
  initializeAgentEncryption(options);
  assert.equal((await readFile(options.keyFile, "utf8")).trim(), first);
  assert.throws(
    () => initializeAgentEncryption({ ...options, environment: { AUTOMATION_AGENT_ENCRYPTION_KEY: "invalid" } }),
    /32-byte/,
  );
  assert.equal((await readFile(options.keyFile, "utf8")).trim(), first);
});

test("custom provider endpoints allow loopback but reject private network and insecure remote URLs", async () => {
  assert.equal(await normalizeOpenAICompatibleBaseUrl("http://127.0.0.1:20128/v1/"), "http://127.0.0.1:20128/v1");
  assert.equal(await normalizeOpenAICompatibleBaseUrl("http://localhost:11434/v1"), "http://localhost:11434/v1");
  await assert.rejects(normalizeOpenAICompatibleBaseUrl("http://192.168.1.10/v1"), /HTTPS/);
  await assert.rejects(normalizeOpenAICompatibleBaseUrl("https://127.0.0.2/v1"), /public/);
  await assert.rejects(normalizeOpenAICompatibleBaseUrl("http://user:pass@localhost:1234/v1"), /unsupported/);
  assert.equal(modelIsListed("openai", "gpt-custom-2026"), true);
  assert.equal(modelIsListed("9router", "provider/model:latest"), true);
  assert.equal(modelIsListed("openai-compatible", "@cf/meta/model"), true);
  assert.equal(modelIsListed("unknown", "model"), false);
});

test("local model discovery uses the configured endpoint and filters malformed IDs", async (t) => {
  const server = createServer((req, res) => {
    assert.equal(req.url, "/v1/models");
    assert.equal(req.headers.authorization, "Bearer fake-test-key");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        data: [{ id: "router/model" }, { id: "router/model" }, { id: "bad model" }, { id: "local:latest" }],
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
  assert.deepEqual(await discoverCompatibleModels({ provider: "9router", apiKey: "fake-test-key", baseUrl }), [
    "router/model",
    "local:latest",
  ]);
});

test("a local OpenAI-compatible provider can pass the tool check without an API key", async (t) => {
  let calls = 0;
  const server = createServer((req, res) => {
    assert.equal(req.url, "/v1/chat/completions");
    assert.equal(req.headers.authorization, undefined);
    req.resume();
    req.on("end", () => {
      calls++;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: `response-${calls}`,
          object: "chat.completion",
          created: 1,
          model: "example/model",
          choices: [
            {
              index: 0,
              message:
                calls === 1
                  ? {
                      role: "assistant",
                      content: null,
                      tool_calls: [
                        {
                          id: "call-1",
                          type: "function",
                          function: { name: "verify_agent_tools", arguments: '{"value":"agent-tools-ready"}' },
                        },
                      ],
                    }
                  : { role: "assistant", content: "Verified." },
              finish_reason: calls === 1 ? "tool_calls" : "stop",
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
      );
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  const baseUrl = `http://127.0.0.1:${server.address().port}/v1`;
  const model = createAgentLanguageModel({ provider: "9router", modelId: "example/model", baseUrl });
  await verifyToolCalling(model);
  assert.equal(calls, 1);
});

test("provider redirects cannot forward an API key to another endpoint", async (t) => {
  let destinationCalls = 0;
  const destination = createServer((_req, res) => {
    destinationCalls++;
    res.writeHead(200).end();
  });
  destination.listen(0, "127.0.0.1");
  await once(destination, "listening");
  const source = createServer((_req, res) => {
    res.writeHead(302, { location: `http://127.0.0.1:${destination.address().port}/stolen` }).end();
  });
  source.listen(0, "127.0.0.1");
  await once(source, "listening");
  t.after(async () => {
    await Promise.all([
      new Promise((resolve, reject) => source.close((error) => (error ? reject(error) : resolve()))),
      new Promise((resolve, reject) => destination.close((error) => (error ? reject(error) : resolve()))),
    ]);
  });
  const model = createAgentLanguageModel({
    provider: "9router",
    modelId: "example/model",
    apiKey: "fake-test-key",
    baseUrl: `http://127.0.0.1:${source.address().port}/v1`,
  });
  await assert.rejects(verifyToolCalling(model));
  assert.equal(destinationCalls, 0);
});
