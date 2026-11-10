import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
