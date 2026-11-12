import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, stepCountIs, tool } from "ai";
import { Agent } from "undici";
import { z } from "zod";

export const agentProviders = [
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-5.4", label: "GPT-5.4" },
      { id: "gpt-5.4-mini", label: "GPT-5.4 mini" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    models: [
      { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
      { id: "claude-opus-5", label: "Claude Opus 5" },
    ],
  },
  {
    id: "google",
    label: "Google",
    models: [
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
      { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    compatibleEndpoint: true,
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    models: [],
  },
  { id: "groq", label: "Groq", compatibleEndpoint: true, defaultBaseUrl: "https://api.groq.com/openai/v1", models: [] },
  {
    id: "deepseek",
    label: "DeepSeek",
    compatibleEndpoint: true,
    defaultBaseUrl: "https://api.deepseek.com/v1",
    models: [],
  },
  { id: "xai", label: "xAI", compatibleEndpoint: true, defaultBaseUrl: "https://api.x.ai/v1", models: [] },
  {
    id: "mistral",
    label: "Mistral",
    compatibleEndpoint: true,
    defaultBaseUrl: "https://api.mistral.ai/v1",
    models: [],
  },
  {
    id: "9router",
    label: "9Router (local)",
    compatibleEndpoint: true,
    defaultBaseUrl: "http://127.0.0.1:20128/v1",
    models: [],
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    compatibleEndpoint: true,
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    models: [],
  },
  { id: "openai-compatible", label: "Other OpenAI-compatible endpoint", compatibleEndpoint: true, models: [] },
];

const providerIds = new Set(agentProviders.map((provider) => provider.id));
const modelIdPattern = /^[A-Za-z0-9@_][A-Za-z0-9._:/@+-]{0,191}$/;
const customModelAgents = new WeakMap();

export function isLocalProviderEndpoint(url) {
  return ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase().replace(/^\[|\]$/g, ""));
}

function isPrivateAddress(address) {
  const version = isIP(address);
  if (version === 4) {
    const [first, second, third] = address.split(".").map(Number);
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0) ||
      (first === 192 && second === 168) ||
      (first === 192 && second === 88 && third === 99) ||
      (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100))) ||
      (first === 203 && second === 0 && third === 113) ||
      first >= 224
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("::ffff:") ||
      !/^[23]/.test(normalized) ||
      normalized.startsWith("2001:db8:") ||
      normalized.startsWith("2001:0:") ||
      normalized.startsWith("2002:")
    );
  }
  return true;
}

async function assertPublicEndpoint(url) {
  if (url.username || url.password || url.search || url.hash)
    throw new Error("The endpoint URL contains unsupported parts.");
  if (isLocalProviderEndpoint(url)) {
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Local endpoints must use HTTP or HTTPS.");
    return [];
  }
  if (url.protocol !== "https:") throw new Error("Remote OpenAI-compatible endpoints must use HTTPS.");
  const hostname = url.hostname.toLowerCase();
  if (!hostname.includes(".") || hostname.endsWith(".localhost") || hostname.endsWith(".local"))
    throw new Error("The endpoint must use a public DNS hostname.");
  const normalizedHost = hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(normalizedHost)
    ? [{ address: normalizedHost }]
    : await lookup(normalizedHost, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address)))
    throw new Error("The endpoint must resolve only to public IP addresses.");
  return addresses;
}

export async function normalizeOpenAICompatibleBaseUrl(value) {
  if (typeof value !== "string" || value.length > 512) throw new Error("Enter a valid endpoint URL.");
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid endpoint URL.");
  }
  await assertPublicEndpoint(url);
  return url.toString().replace(/\/$/, "");
}

export function isAgentProvider(value) {
  return providerIds.has(value);
}

export function isCompatibleAgentProvider(value) {
  return agentProviders.some((provider) => provider.id === value && provider.compatibleEndpoint === true);
}

export function modelIsListed(provider, modelId) {
  if (!modelIdPattern.test(modelId || "")) return false;
  return isAgentProvider(provider);
}

function compatibleConnection({ apiKey, baseUrl }) {
  if (typeof baseUrl !== "string" || !baseUrl) throw new Error("Save an endpoint URL for this provider first.");
  const endpoint = new URL(baseUrl);
  const local = isLocalProviderEndpoint(endpoint);
  const hostname = endpoint.hostname.replace(/^\[|\]$/g, "");
  if (
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    (local ? !["http:", "https:"].includes(endpoint.protocol) : endpoint.protocol !== "https:") ||
    (!local && isIP(hostname) && isPrivateAddress(hostname))
  )
    throw new Error("The configured endpoint URL is invalid.");
  if (!apiKey && !local) throw new Error("Save an API key for this provider first.");
  const agent = new Agent({
    connect: {
      lookup(hostname, options, callback) {
        if (hostname.toLowerCase() !== endpoint.hostname.toLowerCase()) {
          callback(new Error("The provider attempted to contact an unconfigured endpoint."));
          return;
        }
        if (local) {
          const address = options?.family === 6 ? "::1" : "127.0.0.1";
          if (options?.all) callback(null, [{ address, family: isIP(address) }]);
          else callback(null, address, isIP(address));
          return;
        }
        void lookup(hostname, { all: true, verbatim: true })
          .then((addresses) => {
            if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address)))
              throw new Error("The endpoint must resolve only to public IP addresses.");
            const matching = options?.family ? addresses.filter(({ family }) => family === options.family) : addresses;
            if (!matching.length) throw new Error("The provider endpoint has no public address for this connection.");
            if (options?.all) callback(null, matching);
            else callback(null, matching[0].address, matching[0].family);
          })
          .catch(callback);
      },
    },
  });
  const safeFetch = async (input, init) => {
    const requestUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (requestUrl.origin !== endpoint.origin || requestUrl.username || requestUrl.password)
      throw new Error("The provider attempted to contact an unconfigured endpoint.");
    return fetch(input, { ...init, dispatcher: agent, redirect: "error" });
  };
  return { agent, safeFetch };
}

export function createAgentLanguageModel({ provider, modelId, apiKey, baseUrl }) {
  if (!isAgentProvider(provider) || !modelIsListed(provider, modelId))
    throw new Error("Choose a supported provider and model.");
  if ((!apiKey || typeof apiKey !== "string") && !isCompatibleAgentProvider(provider))
    throw new Error("Save an API key for this provider first.");
  if (provider === "openai") return createOpenAI({ apiKey })(modelId);
  if (provider === "anthropic") return createAnthropic({ apiKey })(modelId);
  if (provider === "google") return createGoogleGenerativeAI({ apiKey })(modelId);
  const { agent, safeFetch } = compatibleConnection({ apiKey, baseUrl });
  const model = createOpenAICompatible({
    name: "automationOpenAICompatible",
    apiKey,
    baseURL: baseUrl,
    includeUsage: true,
    fetch: safeFetch,
  })(modelId);
  customModelAgents.set(model, agent);
  return model;
}

export async function discoverCompatibleModels({ provider, apiKey, baseUrl }) {
  if (!isCompatibleAgentProvider(provider)) throw new Error("Model discovery is not available for this provider.");
  const { agent, safeFetch } = compatibleConnection({ apiKey, baseUrl });
  try {
    const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
    const response = await safeFetch(`${baseUrl.replace(/\/$/, "")}/models`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error("Could not retrieve models from this endpoint.");
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) {
        await reader.cancel();
        throw new Error("The provider model list is too large.");
      }
      chunks.push(value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!Array.isArray(data?.data)) throw new Error("The provider did not return a compatible model list.");
    return [
      ...new Set(
        data.data.map((item) => item?.id).filter((id) => typeof id === "string" && modelIsListed(provider, id)),
      ),
    ].slice(0, 1000);
  } finally {
    await agent.close().catch(() => {});
  }
}

async function readProviderModels(url, headers) {
  const response = await fetch(url, {
    headers,
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error("Could not retrieve models from this provider.");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 1024 * 1024) {
      await reader.cancel();
      throw new Error("The provider model list is too large.");
    }
    chunks.push(value);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("The provider returned an invalid model list.");
  }
}

export async function discoverAgentModels({ provider, apiKey, baseUrl }) {
  if (isCompatibleAgentProvider(provider)) return discoverCompatibleModels({ provider, apiKey, baseUrl });
  if (typeof apiKey !== "string" || !apiKey) throw new Error("Save an API key for this provider first.");

  let url;
  let headers;
  if (provider === "openai") {
    url = "https://api.openai.com/v1/models";
    headers = { authorization: `Bearer ${apiKey}` };
  } else if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/models?limit=1000";
    headers = { "anthropic-version": "2023-06-01", "x-api-key": apiKey };
  } else if (provider === "google") {
    url = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000";
    headers = { "x-goog-api-key": apiKey };
  } else {
    throw new Error("Model discovery is not available for this provider.");
  }

  const data = await readProviderModels(url, headers);
  const models =
    provider === "google"
      ? (Array.isArray(data?.models) ? data.models : [])
          .filter((model) => model?.supportedGenerationMethods?.includes("generateContent"))
          .map((model) => model.name?.replace(/^models\//, ""))
      : (Array.isArray(data?.data) ? data.data : []).map((model) => model?.id);

  return [...new Set(models.filter((modelId) => typeof modelId === "string" && modelIsListed(provider, modelId)))];
}

export async function closeAgentLanguageModel(model) {
  const agent = customModelAgents.get(model);
  if (agent) {
    customModelAgents.delete(model);
    await agent.close().catch(() => {});
  }
}

export async function verifyToolCalling(model) {
  let toolCalled = false;
  try {
    const result = await generateText({
      model,
      system:
        "Call the supplied verification tool once with the exact value 'agent-tools-ready'. Do not answer without calling it.",
      prompt: "Verify that tool calling works.",
      tools: {
        verify_agent_tools: tool({
          description: "Confirms that this model can call an application tool.",
          inputSchema: z.object({ value: z.string().min(1).max(40) }),
          execute: async ({ value }) => {
            if (value !== "agent-tools-ready") throw new Error("The verification value did not match.");
            toolCalled = true;
            return { verified: true };
          },
        }),
      },
      toolChoice: "required",
      stopWhen: stepCountIs(1),
      maxRetries: 0,
      timeout: 30000,
    });
    if (!toolCalled) throw new Error("The selected model did not complete the tool-calling check.");
    return result.usage;
  } finally {
    await closeAgentLanguageModel(model);
  }
}
