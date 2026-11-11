import { type ReactNode, useCallback, useState } from "react";
import { RunMonitorContext } from "./run-monitor-state";

const STORAGE_KEY = "automation:local-run-monitoring";

function readMonitoringFlag() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function RunMonitorProvider({ children }: { children: ReactNode }) {
  const [monitoring, setMonitoringState] = useState(readMonitoringFlag);
  const setMonitoring = useCallback((next: boolean) => {
    setMonitoringState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, "true");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Keep the in-memory flag usable when browser storage is unavailable. */
    }
  }, []);

  return <RunMonitorContext.Provider value={{ monitoring, setMonitoring }}>{children}</RunMonitorContext.Provider>;
}
