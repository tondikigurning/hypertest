import type { ScenarioResult } from "../schema/types";

export interface Totals {
  passed: number;
  failed: number;
  skipped: number;
  manual: number;
  total: number;
}

/**
 * Aggregate report built from all per-component ScenarioResult arrays across packages/runners.
 * Written as aggregate.json alongside classified report files in the dated reports folder.
 */
export interface AggregateReport {
  /** ISO 8601 timestamp of when this report was generated. */
  runAt: string;
  /** Sum of all scenario durationMs values (proxy for total run time). */
  durationMs: number;
  /** Overall pass/fail/skipped/manual totals. */
  totals: Totals;
  /** Totals broken down by `method` (unit | integration | e2e | manual). */
  byTier: Record<string, Totals>;
  /** Totals broken down by runner (vitest | playwright | …). */
  byRunner: Record<string, Totals>;
  /** Totals broken down by the first path segment of `result.file` (package slug). */
  byPackage: Record<string, Totals>;
  /**
   * IDs of scenarios that failed in this run but did NOT fail in the most recent
   * previous committed snapshot (testing-docs/reports/<prev>/aggregate.json).
   * On the first run (no previous snapshot) this equals all failed IDs.
   */
  newlyFailed: Array<string>;
  /** IDs of scenarios carrying the "quarantine" tag. */
  quarantined: Array<string>;
  /** Flat list of every ScenarioResult collected across all packages/runners. */
  results: Array<ScenarioResult>;
}

/** Coverage totals from @vitest/coverage-v8 JSON summary (optional). */
export interface CoverageSummary {
  lines: { pct: number; covered: number; total: number };
  statements: { pct: number; covered: number; total: number };
  functions: { pct: number; covered: number; total: number };
  branches: { pct: number; covered: number; total: number };
}
