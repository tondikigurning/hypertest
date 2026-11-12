import { and, eq, sql } from "drizzle-orm";
import { database } from "../../database.mjs";
import { agentModelChecks, agentProviderCredentials, agentUsage } from "../results/schema.mjs";
import { decryptAgentSecret, encryptAgentSecret } from "./agent-crypto.mjs";
import {
  isAgentProvider,
  isCompatibleAgentProvider,
  isLocalProviderEndpoint,
  normalizeOpenAICompatibleBaseUrl,
} from "./agent-provider.mjs";

const noLocalApiKey = "\u0000hypertest-local-provider-without-api-key";

export async function hasAnyProviderCredentials() {
  const rows = await database()
    .select({ provider: agentProviderCredentials.provider })
    .from(agentProviderCredentials)
    .limit(1);
  return rows.length > 0;
}

export async function listProviderCredentials(userId, { includeApiKeys = false } = {}) {
  const rows = await database()
    .select({
      provider: agentProviderCredentials.provider,
      baseUrl: agentProviderCredentials.baseUrl,
      encryptedApiKey: agentProviderCredentials.encryptedApiKey,
    })
    .from(agentProviderCredentials)
    .where(eq(agentProviderCredentials.userId, userId));
  return rows.map(({ provider, baseUrl, encryptedApiKey }) => {
    const apiKey = includeApiKeys ? decryptAgentSecret(encryptedApiKey) : undefined;
    return {
      provider,
      baseUrl,
      configured: true,
      ...(includeApiKeys ? { apiKey: apiKey === noLocalApiKey ? "" : apiKey } : {}),
    };
  });
}

export async function getProviderCredential(userId, provider) {
  if (!isAgentProvider(provider)) throw new Error("Choose a supported provider.");
  const [row] = await database()
    .select()
    .from(agentProviderCredentials)
    .where(and(eq(agentProviderCredentials.userId, userId), eq(agentProviderCredentials.provider, provider)))
    .limit(1);
  if (!row) return undefined;
  const apiKey = decryptAgentSecret(row.encryptedApiKey);
  return { apiKey: apiKey === noLocalApiKey ? undefined : apiKey, baseUrl: row.baseUrl || undefined };
}

export async function saveProviderCredential(userId, { provider, apiKey, baseUrl }) {
  if (!isAgentProvider(provider)) throw new Error("Choose a supported provider.");
  const normalizedBaseUrl = isCompatibleAgentProvider(provider)
    ? await normalizeOpenAICompatibleBaseUrl(baseUrl)
    : null;
  const localEndpoint = normalizedBaseUrl && isLocalProviderEndpoint(new URL(normalizedBaseUrl));
  if (
    typeof apiKey !== "string" ||
    apiKey.length > 4096 ||
    apiKey.includes("\u0000") ||
    (!apiKey.trim() && !localEndpoint)
  )
    throw new Error("Enter a provider API key of up to 4096 characters; it is optional for local endpoints.");
  const existing = !apiKey.trim() && localEndpoint ? await getProviderCredential(userId, provider) : undefined;
  const retainedKey = existing?.baseUrl === normalizedBaseUrl ? existing.apiKey : undefined;
  const encryptedApiKey = encryptAgentSecret(apiKey.trim() || retainedKey || noLocalApiKey);
  await database()
    .insert(agentProviderCredentials)
    .values({
      userId,
      provider,
      encryptedApiKey,
      baseUrl: normalizedBaseUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [agentProviderCredentials.userId, agentProviderCredentials.provider],
      set: { encryptedApiKey, baseUrl: normalizedBaseUrl, updatedAt: new Date() },
    });
  await database()
    .delete(agentModelChecks)
    .where(and(eq(agentModelChecks.userId, userId), eq(agentModelChecks.provider, provider)));
  return { provider, configured: true, baseUrl: normalizedBaseUrl };
}

export async function deleteProviderCredential(userId, provider) {
  if (!isAgentProvider(provider)) throw new Error("Choose a supported provider.");
  const db = database();
  await db.transaction(async (tx) => {
    await tx
      .delete(agentProviderCredentials)
      .where(and(eq(agentProviderCredentials.userId, userId), eq(agentProviderCredentials.provider, provider)));
    await tx
      .delete(agentModelChecks)
      .where(and(eq(agentModelChecks.userId, userId), eq(agentModelChecks.provider, provider)));
  });
  return { provider, configured: false };
}

export async function listVerifiedModels(userId, provider) {
  const rows = await database()
    .select({ modelId: agentModelChecks.modelId, checkedAt: agentModelChecks.checkedAt })
    .from(agentModelChecks)
    .where(
      and(
        eq(agentModelChecks.userId, userId),
        eq(agentModelChecks.provider, provider),
        eq(agentModelChecks.toolCallingVerified, true),
      ),
    );
  return rows;
}

export async function isModelVerified(userId, provider, modelId) {
  const [row] = await database()
    .select({ verified: agentModelChecks.toolCallingVerified })
    .from(agentModelChecks)
    .where(
      and(
        eq(agentModelChecks.userId, userId),
        eq(agentModelChecks.provider, provider),
        eq(agentModelChecks.modelId, modelId),
      ),
    )
    .limit(1);
  return row?.verified === true;
}

export async function recordModelCheck(userId, provider, modelId, toolCallingVerified) {
  await database()
    .insert(agentModelChecks)
    .values({ userId, provider, modelId, toolCallingVerified, checkedAt: new Date() })
    .onConflictDoUpdate({
      target: [agentModelChecks.userId, agentModelChecks.provider, agentModelChecks.modelId],
      set: { toolCallingVerified, checkedAt: new Date() },
    });
}

export async function recordAgentUsage({
  userId,
  sessionId,
  provider,
  modelId,
  purpose = "agent",
  inputTokens,
  outputTokens,
}) {
  await database()
    .insert(agentUsage)
    .values({
      userId,
      sessionId,
      provider,
      modelId,
      purpose,
      inputTokens: Math.max(0, Math.floor(Number(inputTokens) || 0)),
      outputTokens: Math.max(0, Math.floor(Number(outputTokens) || 0)),
    });
}

async function aggregateUsage(userId, sessionId) {
  const query = database()
    .select({
      inputTokens: sql`coalesce(sum(${agentUsage.inputTokens}), 0)`,
      outputTokens: sql`coalesce(sum(${agentUsage.outputTokens}), 0)`,
    })
    .from(agentUsage);
  const rows = await query.where(
    sessionId ? and(eq(agentUsage.userId, userId), eq(agentUsage.sessionId, sessionId)) : eq(agentUsage.userId, userId),
  );
  const inputTokens = Number(rows[0]?.inputTokens || 0);
  const outputTokens = Number(rows[0]?.outputTokens || 0);
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}

export async function getUsageSummary(userId, sessionId) {
  const [session, user] = await Promise.all([
    sessionId
      ? aggregateUsage(userId, sessionId)
      : Promise.resolve({ inputTokens: 0, outputTokens: 0, totalTokens: 0 }),
    aggregateUsage(userId),
  ]);
  return { session, user };
}
