import { createContext } from "react";

export interface RunConfig {
  defaultEnvironment: string;
  environments: Array<{ id: string; label: string; target: string }>;
  variables: Array<{ name: string; label: string; secret: boolean }>;
}

export const RunEnvironmentContext = createContext<{
  config?: RunConfig;
  environment: string;
  setEnvironment: (value: string) => void;
  variablesOpen: boolean;
  setVariablesOpen: (open: boolean) => void;
} | null>(null);
