import { useContext } from "react";
import { RunEnvironmentContext } from "./run-environment-state";

export function useRunEnvironment() {
  const value = useContext(RunEnvironmentContext);
  if (!value) throw new Error("RunEnvironmentProvider is missing.");
  return value;
}
