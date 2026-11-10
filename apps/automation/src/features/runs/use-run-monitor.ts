import { useContext } from "react";
import { RunMonitorContext } from "./run-monitor-state";

export function useRunMonitor() {
  const context = useContext(RunMonitorContext);
  if (!context) throw new Error("useRunMonitor must be used inside RunMonitorProvider.");
  return context;
}
