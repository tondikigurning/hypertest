import type { ScenarioResult } from "../schema/types";

/**
 * Sort scenario results by source file alphabetical order, then line number.
 * Provides a stable, deterministic ordering across runs.
 */
export function sortResultsBySourceOrder(results: Array<ScenarioResult>): Array<ScenarioResult> {
  return [...results].sort((a, b) => {
    const fileCmp = a.file.localeCompare(b.file);
    if (fileCmp !== 0) return fileCmp;
    return (a.line ?? 0) - (b.line ?? 0);
  });
}
