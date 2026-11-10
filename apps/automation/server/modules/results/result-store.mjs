import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { latestResults } from "./schema.mjs";

let connection;
function database() {
  const connectionString =
    process.env.AUTOMATION_DATABASE_URL || "postgresql://automation:automation@127.0.0.1:55432/automation";
  if (!connection) connection = drizzle(new pg.Pool({ connectionString }));
  return connection;
}

export function createResultStore(getDatabase = database) {
  return {
    async list(environment) {
      return getDatabase().select().from(latestResults).where(eq(latestResults.environmentId, environment));
    },
    async save(environment, runId, results, uploadStatus) {
      const rows = results
        .filter(
          (result) => result.executedAt && result.meta?.id && ["passed", "failed", "skipped"].includes(result.status),
        )
        .map((result) => ({
          environmentId: environment,
          scenarioId: result.meta.id,
          runId,
          status: result.status,
          executedAt: new Date(result.executedAt),
          durationMs: result.durationMs,
          evidenceUrl: result.evidenceUrl || null,
          uploadStatus: uploadStatus === "uploaded" && !result.evidenceUrl ? "unavailable" : uploadStatus,
          examples: result.examples ?? [],
        }));
      if (!rows.length) return;
      await getDatabase()
        .insert(latestResults)
        .values(rows)
        .onConflictDoUpdate({
          target: [latestResults.environmentId, latestResults.scenarioId],
          set: {
            runId: sql`excluded.run_id`,
            status: sql`excluded.status`,
            executedAt: sql`excluded.executed_at`,
            durationMs: sql`excluded.duration_ms`,
            evidenceUrl: sql`excluded.evidence_url`,
            uploadStatus: sql`excluded.upload_status`,
            examples: sql`excluded.examples`,
          },
          setWhere: sql`(${latestResults.executedAt} < excluded.executed_at OR (${latestResults.executedAt} = excluded.executed_at AND ${latestResults.runId} = excluded.run_id))`,
        });
    },
  };
}

export const resultStore = createResultStore();
