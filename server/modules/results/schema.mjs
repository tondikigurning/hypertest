import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const scenarioCatalog = pgTable(
  "automation_scenario_catalog",
  {
    key: text("scenario_key").primaryKey(),
    scenarioId: text("scenario_id").notNull(),
    module: text("module").notNull(),
    feature: text("feature").notNull(),
    file: text("file").notNull(),
    sourceLine: integer("source_line").notNull(),
    position: integer("catalog_position").notNull(),
    payload: jsonb("payload").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("automation_scenario_catalog_id_idx").on(table.scenarioId),
    index("automation_scenario_catalog_module_file_idx").on(table.module, table.file, table.sourceLine),
    uniqueIndex("automation_scenario_catalog_position_idx").on(table.position),
  ],
);

export const latestResults = pgTable(
  "automation_latest_results",
  {
    environmentId: text("environment_id").notNull(),
    scenarioId: text("scenario_id").notNull(),
    runId: uuid("run_id").notNull(),
    status: text("status").notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
    durationMs: integer("duration_ms").notNull(),
    evidenceUrl: text("evidence_url"),
    uploadStatus: text("upload_status").notNull(),
    examples: jsonb("examples").notNull().default([]),
  },
  (table) => [
    primaryKey({ columns: [table.environmentId, table.scenarioId] }),
    check("automation_result_status_check", sql`${table.status} in ('passed', 'failed', 'skipped')`),
    check("automation_result_duration_check", sql`${table.durationMs} >= 0`),
    check("automation_result_upload_check", sql`${table.uploadStatus} in ('uploaded', 'unavailable', 'failed')`),
  ],
);

export const agentProviderCredentials = pgTable(
  "automation_agent_provider_credentials",
  {
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    baseUrl: text("base_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.provider] }),
    check(
      "automation_agent_provider_check",
      sql`${table.provider} in ('openai', 'anthropic', 'google', 'openrouter', 'groq', 'deepseek', 'xai', 'mistral', '9router', 'ollama', 'openai-compatible')`,
    ),
  ],
);

export const agentModelChecks = pgTable(
  "automation_agent_model_checks",
  {
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    modelId: text("model_id").notNull(),
    toolCallingVerified: boolean("tool_calling_verified").notNull().default(false),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.provider, table.modelId] })],
);

export const agentUsage = pgTable(
  "automation_agent_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    sessionId: text("session_id").notNull(),
    provider: text("provider").notNull(),
    modelId: text("model_id").notNull(),
    purpose: text("purpose").notNull().default("agent"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("automation_agent_usage_user_session_idx").on(table.userId, table.sessionId),
    index("automation_agent_usage_user_created_idx").on(table.userId, table.createdAt),
    check("automation_agent_usage_input_tokens_check", sql`${table.inputTokens} >= 0`),
    check("automation_agent_usage_output_tokens_check", sql`${table.outputTokens} >= 0`),
  ],
);
