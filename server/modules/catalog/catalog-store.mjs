import { asc } from "drizzle-orm";
import { database } from "../../database.mjs";
import { scenarioCatalog } from "../results/schema.mjs";

export function createCatalogStore(getDatabase = database) {
  return {
    async list() {
      const rows = await getDatabase()
        .select({ payload: scenarioCatalog.payload })
        .from(scenarioCatalog)
        .orderBy(asc(scenarioCatalog.position));
      return rows.map((row) => row.payload);
    },
    async replace(scenarios) {
      const rows = scenarios.map((scenario, position) => ({
        key: scenario.key,
        scenarioId: scenario.id || "",
        module: scenario.module || "",
        feature: scenario.feature || "",
        file: scenario.file,
        sourceLine: scenario.line ?? scenario.sourceLine ?? 0,
        position,
        payload: scenario,
      }));
      const db = getDatabase();
      await db.transaction(async (tx) => {
        await tx.delete(scenarioCatalog);
        if (rows.length) await tx.insert(scenarioCatalog).values(rows);
      });
      return rows.length;
    },
  };
}

export const catalogStore = createCatalogStore();
