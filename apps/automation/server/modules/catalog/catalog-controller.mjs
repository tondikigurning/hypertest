import { resolve } from "node:path";
import { resultStore } from "../results/result-store.mjs";
import { createLocalRunService } from "../runs/local-run-service.mjs";
import { automationCatalog } from "./scenario-catalog.mjs";

const features = resolve(import.meta.dirname, "../../../../tenants/tests/bdd/features");

const environments = createLocalRunService().environments;

export async function getCatalog(req, res, next) {
  const environment = req.query.environment;
  if (!environment)
    return res.json(
      automationCatalog(features).map((scenario) => ({
        ...scenario,
        status: "",
        lastRun: "",
        duration: "",
        evidenceUrl: "",
      })),
    );
  if (typeof environment !== "string" || !environments.some((item) => item.id === environment))
    return res.status(400).json({ error: "Select a valid environment." });
  try {
    const rows = await resultStore.list(environment);
    const results = new Map(rows.map((row) => [row.scenarioId, row]));
    return res.json(
      automationCatalog(features).map((scenario) => {
        const row = results.get(scenario.id);
        return {
          ...scenario,
          status: row?.status || "",
          lastRun: row?.executedAt?.toISOString() || "",
          duration: row ? `${row.durationMs}ms` : "",
          evidenceUrl: row?.evidenceUrl || "",
          evidenceLabel: "View evidence",
          examples: row?.examples ?? [],
        };
      }),
    );
  } catch (error) {
    return next(error);
  }
}
