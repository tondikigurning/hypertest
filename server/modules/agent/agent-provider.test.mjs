import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { initializeAgentEncryption } from "./agent-crypto.mjs";
import { agentEffortProfile } from "./agent-effort.mjs";
import {
  agentProviders,
  agentReasoningSettings,
  closeAgentLanguageModel,
  createAgentLanguageModel,
  discoverAgentEffortProfile,
  discoverCompatibleModels,
  modelIsListed,
  normalizeOpenAICompatibleBaseUrl,
  verifyToolCalling,
} from "./agent-provider.mjs";

test("effort options require explicit provider metadata, never model-name inference", () => {
  for (const { id } of agentProviders) {
    assert.deepEqual(agentReasoningSettings(id, undefined), {});
    assert.equal(agentEffortProfile(id, "gpt-5.4").levels, null);
    assert.throws(() => agentReasoningSettings(id, "high", "gpt-5.4"), /not available/);
  }
  assert.equal(agentEffortProfile("openrouter", "model", { supported_parameters: ["reasoning"] }).levels, null);
  assert.equal(agentEffortProfile("9router", "model", { reasoning_efforts: "high" }).levels, null);
  assert.deepEqual(
    agentEffortProfile("9router", "model", {
      reasoning_efforts: ["high", "low", "high", "unsupported", null],
    }).levels,
    ["low", "high"],
  );
  const metadata = {
    capabilities: {
      effort: {
        supported: true,
        low: { supported: true },
        high: { supported: true },
        max: { supported: false },
      },
    },
  };
  const profile = agentEffortProfile("anthropic", "new-model", metadata);
  assert.deepEqual(profile.levels, ["low", "high"]);
  assert.throws(() => agentReasoningSettings("anthropic", "max", "new-model", profile), /not available/);
  assert.throws(() => agentReasoningSettings("anthropic", "high", "other-model", profile), /not available/);
  assert.throws(() => agentReasoningSettings("openai", "high", "new-model", profile), /not available/);
  assert.equal(
    agentEffortProfile("anthropic", "model", {
      capabilities: {
        effort: {
          supported: false,
          high: { supported: true },
        },
      },
    }).levels,
    null,
  );
});

test("native SDK adapters serialize metadata-authorized effort into provider requests", async () => {
  for (const [provider, createModel, verify] of [
    ["openai", createOpenAI, (body) => assert.equal(body.reasoning.effort, "high")],
    [
      "anthropic",
      createAnthropic,
      (body) => {
        assert.equal(body.output_config.effort, "high");
        assert.equal(body.thinking.type, "adaptive");
      },
    ],
  ]) {
    let body;
    const fetch = async (_url, init) => {
      body = JSON.parse(init.body);
      throw new Error("Captured request");
    };
    const modelId = provider === "openai" ? "gpt-5.4" : "claude-opus-4-6";
    const profile = agentEffortProfile(provider, modelId, {
      reasoning_efforts: ["high"],
      capabilities: {
        effort: { supported: true, high: { supported: true } },
        thinking: { types: { adaptive: { supported: true } } },
      },
    });
    const model = createModel({ apiKey: "test-key", fetch })(modelId);
    await assert.rejects(
      generateText({
        model,
        prompt: "Hello",
        maxRetries: 0,
        ...agentReasoningSettings(provider, "high", modelId, profile),
      }),
    );
    assert.ok(body);
    verify(body);
  }
});

test("Anthropic effort discovery reads capabilities from its model API", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.anthropic.com/v1/models/claude-custom");
    assert.equal(init.headers["anthropic-version"], "2026-10-21");
    assert.equal(init.headers["x-api-key"], "fake-key");
    return Response.json({
      id: "claude-custom",
      capabilities: {
        effort: { supported: true, low: { supported: true }, high: { supported: true } },
        thinking: { types: { adaptive: { supported: true } } },
      },
    });
  });
  const profile = await discoverAgentEffortProfile({
    provider: "anthropic",
    modelId: "claude-custom",
    apiKey: "fake-key",
  });
  assert.deepEqual(profile.levels, ["low", "high"]);
  assert.equal(profile.adaptiveThinking, true);
});

test("model API responses without effort metadata keep the control unavailable", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "https://api.openai.com/v1/models/gpt-5.4");
    return Response.json({ id: "gpt-5.4", object: "model", owned_by: "openai" });
  });
  const profile = await discoverAgentEffortProfile({ provider: "openai", modelId: "gpt-5.4", apiKey: "fake-key" });
  assert.equal(profile.levels, null);
  assert.throws(() => agentReasoningSettings("openai", "high", "gpt-5.4", profile), /not available/);
});

test("compatible model metadata controls effort and provider default omits it", async (t) => {
  const bodies = [];
  let metadata = { reasoning_efforts: ["low", "high"] };
  const server = createServer((req, res) => {
    if (req.url === "/v1/models") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "test", ...metadata }] }));
      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      bodies.push(JSON.parse(body));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "test",
          object: "chat.completion",
          created: 1,
          model: "test",
          choices: [{ index: 0, message: { role: "assistant", content: "OK" }, finish_reason: "stop" }],
        }),
      );
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))));
  const connection = { provider: "9router", modelId: "test", baseUrl: `http://127.0.0.1:${server.address().port}/v1` };
  const model = createAgentLanguageModel(connection);
  try {
    const profile = await discoverAgentEffortProfile(connection);
    assert.deepEqual(profile.levels, ["low", "high"]);
    await generateText({ model, prompt: "Hello", ...agentReasoningSettings("9router", "high", "test", profile) });
    await generateText({ model, prompt: "Hello", ...agentReasoningSettings("9router", undefined, "test", profile) });
    assert.equal(bodies[0].reasoning_effort, "high");
    assert.equal(Object.hasOwn(bodies[1], "reasoning_effort"), false);
    metadata = {};
    const missing = await discoverAgentEffortProfile(connection);
    assert.equal(missing.levels, null);
    assert.throws(() => agentReasoningSettings("9router", "high", "test", missing), /not available/);
  } finally {
    await closeAgentLanguageModel(model);
  }
});

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
