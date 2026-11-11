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
  { id: "openai-compatible", label: "OpenAI-compatible endpoint", models: [] },
];

const providerIds = new Set(agentProviders.map((provider) => provider.id));
const modelIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const customModelAgents = new WeakMap();

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
  if (url.protocol !== "https:") throw new Error("OpenAI-compatible endpoints must use HTTPS.");
  if (url.username || url.password || url.search || url.hash)
    throw new Error("The endpoint URL contains unsupported parts.");
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
  if (typeof value !== "string" || value.length > 512) throw new Error("Enter a valid HTTPS endpoint URL.");
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid HTTPS endpoint URL.");
  }
  await assertPublicEndpoint(url);
  return url.toString().replace(/\/$/, "");
}

export function isAgentProvider(value) {
  return providerIds.has(value);
}

export function modelIsListed(provider, modelId) {
  if (!modelIdPattern.test(modelId || "")) return false;
  if (provider === "openai-compatible") return true;
  return agentProviders.find((entry) => entry.id === provider)?.models.some((model) => model.id === modelId) ?? false;
}

export function createAgentLanguageModel({ provider, modelId, apiKey, baseUrl }) {
  if (!isAgentProvider(provider) || !modelIsListed(provider, modelId))
    throw new Error("Choose a supported provider and model.");
  if (typeof apiKey !== "string" || !apiKey) throw new Error("Save an API key for this provider first.");
  if (provider === "openai") return createOpenAI({ apiKey })(modelId);
  if (provider === "anthropic") return createAnthropic({ apiKey })(modelId);
  if (provider === "google") return createGoogleGenerativeAI({ apiKey })(modelId);
  if (typeof baseUrl !== "string" || !baseUrl) throw new Error("Save an endpoint URL for this provider first.");
  const endpoint = new URL(baseUrl);
  const agent = new Agent({
    connect: {
      lookup(hostname, options, callback) {
        if (hostname.toLowerCase() !== endpoint.hostname.toLowerCase()) {
          callback(new Error("The provider attempted to contact an unconfigured endpoint."));
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
  const model = createOpenAICompatible({
    name: "automationOpenAICompatible",
    apiKey,
    baseURL: baseUrl,
    includeUsage: true,
    fetch: async (input, init) => {
      const requestUrl = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (requestUrl.origin !== endpoint.origin || requestUrl.username || requestUrl.password)
        throw new Error("The provider attempted to contact an unconfigured endpoint.");
      return fetch(input, { ...init, dispatcher: agent, redirect: "error" });
    },
  })(modelId);
  customModelAgents.set(model, agent);
  return model;
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
      stopWhen: stepCountIs(2),
      maxRetries: 0,
      timeout: 30000,
    });
    if (!toolCalled) throw new Error("The selected model did not complete the tool-calling check.");
    return result.usage;
  } finally {
    await closeAgentLanguageModel(model);
  }
}
