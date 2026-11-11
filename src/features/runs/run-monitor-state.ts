import { createContext } from "react";

export interface RunMonitorContextValue {
  monitoring: boolean;
  setMonitoring: (monitoring: boolean) => void;
}

export const RunMonitorContext = createContext<RunMonitorContextValue | null>(null);
