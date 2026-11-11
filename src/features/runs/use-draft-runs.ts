import { useContext } from "react";
import { DraftRunsContext } from "./draft-runs-state";

export function useDraftRuns() {
  const context = useContext(DraftRunsContext);
  if (!context) throw new Error("DraftRunsProvider is missing.");
  return context;
}
