import { type ReactNode, useEffect, useState } from "react";
import { useWorkspaceUser } from "../auth/auth-context";
import { type RunConfig, RunEnvironmentContext } from "./run-environment-state";

export function RunEnvironmentProvider({ children }: { children: ReactNode }) {
  const user = useWorkspaceUser();
  const preferenceKey = `automation-environment:v1:${user.id}`;
  const [config, setConfig] = useState<RunConfig>();
  const [environment, setEnvironment] = useState(() => {
    try {
      return localStorage.getItem(preferenceKey) || "";
    } catch {
      return "";
    }
  });
  const [variablesOpen, setVariablesOpen] = useState(false);
  useEffect(() => {
    try {
      if (environment) localStorage.setItem(preferenceKey, environment);
    } catch {
      /* Continue with the current selection in memory. */
    }
  }, [environment, preferenceKey]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    const refresh = async () => {
      try {
        const response = await fetch("/api/local/config", { signal: controller.signal });
        if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
          const data: RunConfig = await response.json();
          if (!controller.signal.aborted) {
            setConfig(data);
            setEnvironment((current) =>
              data.environments.some((item) => item.id === current) ? current : data.defaultEnvironment,
            );
          }
        }
      } catch {
        /* Static builds do not have a local runner. */
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(refresh, 2000);
      }
    };
    void refresh();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);
  return (
    <RunEnvironmentContext.Provider value={{ config, environment, setEnvironment, variablesOpen, setVariablesOpen }}>
      {children}
    </RunEnvironmentContext.Provider>
  );
}
