import { resultStore } from "../results/result-store.mjs";
import { createLocalRunService } from "../runs/local-run-service.mjs";
import { catalogStore } from "./catalog-store.mjs";

const environments = createLocalRunService().environments;

export function createCatalogController({
  catalog = catalogStore,
  results = resultStore,
  availableEnvironments = environments,
} = {}) {
  return async function getCatalog(req, res, next) {
    const environment = req.query.environment;
    if (
      environment !== undefined &&
      (typeof environment !== "string" || !availableEnvironments.some((item) => item.id === environment))
    )
      return res.status(400).json({ error: "Select a valid environment." });
    try {
      const scenarios = await catalog.list();
      if (!environment)
        return res.json(
          scenarios.map((scenario) => ({
            ...scenario,
            status: "",
            lastRun: "",
            duration: "",
            evidenceUrl: "",
          })),
        );
      const rows = await results.list(environment);
      const byScenarioId = new Map(rows.map((row) => [row.scenarioId, row]));
      const idCounts = new Map();
      for (const scenario of scenarios) {
        if (scenario.id) idCounts.set(scenario.id, (idCounts.get(scenario.id) ?? 0) + 1);
      }
      return res.json(
        scenarios.map((scenario) => {
          const row = idCounts.get(scenario.id) === 1 ? byScenarioId.get(scenario.id) : undefined;
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
  };
}

export const getCatalog = createCatalogController();
