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

export const agentPrds = pgTable(
  "automation_agent_prds",
  {
    module: text("module").notNull(),
    menu: text("menu").notNull(),
    state: jsonb("state").notNull(),
    revision: integer("revision").notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.module, table.menu] })],
);

// Workspace identities are separate from the preview's browser partition IDs.
export const workspaceUsers = pgTable(
  "automation_workspace_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
    githubId: text("github_id").unique(),
    displayName: text("display_name").notNull(),
    username: text("username").unique(),
    passwordHash: text("password_hash"),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("automation_workspace_user_role_check", sql`${table.role} in ('engineer', 'viewer')`),
    check("automation_workspace_user_status_check", sql`${table.status} in ('active', 'disabled')`),
    check(
      "automation_workspace_user_identity_check",
      sql`(${table.role} = 'engineer' and ${table.githubId} is not null and ${table.username} is null and ${table.passwordHash} is null and not ${table.mustChangePassword}) or (${table.role} = 'viewer' and ${table.githubId} is null and ${table.username} is not null and ${table.passwordHash} is not null)`,
    ),
    check(
      "automation_workspace_username_normalized_check",
      sql`${table.username} is null or (${table.username} = lower(trim(${table.username})) and length(${table.username}) > 0)`,
    ),
  ],
);

export const workspaceSessions = pgTable(
  "automation_workspace_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => workspaceUsers.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("automation_workspace_sessions_user_idx").on(table.userId)],
);

export const workspaceGithubCredentials = pgTable("automation_workspace_github_credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => workspaceUsers.id),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
