import { useEffect, useState } from "react";
import type { Scenario } from "./scenario";

const catalogApi = "/automation/api/scenarios";
const catalogSnapshot = "/automation/scenario-catalog.json";

/** Load the snapshot when the development API is unavailable; refresh after each completed run. */
export function useScenarioCatalog(
  completedRunId: string | undefined,
  onInitialLoad: (catalog: Array<Scenario>) => void,
  environment: string,
) {
  const [scenarios, setScenarios] = useState<Array<Scenario>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setScenarios([]);
    setError("");
    setLoading(true);
    const load = async () => {
      let response = environment
        ? await fetch(`${catalogApi}?${new URLSearchParams({ environment })}`, { signal: controller.signal }).catch(
            () => null,
          )
        : null;
      if (!environment || !response) {
        response = await fetch(catalogSnapshot, { signal: controller.signal });
      }
      if (!response.ok) throw new Error("Could not load the scenario catalog.");
      let catalog: Array<Scenario> = await response.json();
      if (!environment)
        catalog = catalog.map((scenario) => ({ ...scenario, status: "", lastRun: "", duration: "", evidenceUrl: "" }));
      if (controller.signal.aborted) return;
      setScenarios(catalog);
      onInitialLoad(catalog);
    };
    load()
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not load scenarios. Please try again later.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [onInitialLoad, environment]);

  useEffect(() => {
    if (!completedRunId || loading) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch(`${catalogApi}?${new URLSearchParams({ environment })}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return;
        const catalog: Array<Scenario> = await response.json();
        if (!controller.signal.aborted) setScenarios(catalog);
      } catch {
        // The local API is unavailable in static builds.
      }
    };
    void refresh();
    return () => controller.abort();
  }, [completedRunId, loading, environment]);

  return { scenarios, error, loading };
}
