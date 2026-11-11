import { sql } from "drizzle-orm";
import {
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
