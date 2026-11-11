import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Run } from "./types";
import { useRunMonitor } from "./use-run-monitor";

export const activeRunKey = ["local-run"] as const;

const ACTIVE_RUN_POLL_INTERVAL = 2000;

export function useActiveRun(poll = false) {
  const { monitoring, setMonitoring } = useRunMonitor();
  const { data } = useQuery({
    queryKey: activeRunKey,
    queryFn: async ({ signal }): Promise<Run | null> => {
      const response = await fetch("/api/local/run", { signal, cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Local runner unavailable");
      }
      return response.json();
    },
    enabled: monitoring,
    retry: false,
    refetchInterval:
      poll && monitoring ? (query) => (query.state.data?.done ? false : ACTIVE_RUN_POLL_INTERVAL) : false,
    staleTime: 2000,
  });
  useEffect(() => {
    if (monitoring && data !== undefined && (!data || data.done)) setMonitoring(false);
  }, [data, monitoring, setMonitoring]);
  return data ?? null;
}
