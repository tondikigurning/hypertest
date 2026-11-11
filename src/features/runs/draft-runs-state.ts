import { createContext } from "react";
import type { DraftRunState } from "./draft-evidence-store";

export interface DraftRunsState {
  run: DraftRunState | null;
  starting: boolean;
  error: string;
  revision: number;
  start: (scenarioId: string, environment: string) => Promise<void>;
  cancel: () => Promise<void>;
  discard: () => Promise<void>;
}
export const DraftRunsContext = createContext<DraftRunsState | null>(null);
