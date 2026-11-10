/**
 * Authored metadata attached to every scenario test.
 * Developers fill this in; auto-derived fields (status, duration, runner, file, line) are NOT part of this.
 */
export interface ScenarioMeta {
  /** Stable ID: <PKG>_<COMPONENT>_<TIER>_<NNN>. Never renumber, only retire. */
  id: string;
  /** Human-readable title — becomes the test name. */
  title: string;
  /** Expected outcome for this scenario (required for e2e, optional for other methods). */
  expect?: string;
  /** What kind of scenario this is. */
  type: "positive" | "negative" | "ui-interaction" | "edge-case";
  /** Stable grouping within the component (e.g. "Pipeline Tabs"). */
  category: string;
  /** Which testing tier this scenario belongs to. */
  method: "unit" | "integration" | "e2e" | "manual";
  /** E2E-only Gherkin scenario steps (Given/When/Then...) as a multiline string. */
  scenario?: string;
  /** Cross-cutting purpose tags (smoke, regression, quarantine, etc.). */
  tags?: Array<string>;
  /** Optional links to a unit of work (issue/bug/PRD req). Phase-2 gate hook. */
  refs?: Array<string>;
  /** Required for manual scenarios — explains why it cannot be automated. */
  reason?: string;
}

/** Author input accepted by scenario() helpers. */
export type AuthoredScenarioMeta = ScenarioMeta;

/** Status of a scenario after a test run. */
export type ScenarioStatus = "passed" | "failed" | "skipped" | "manual";

/**
 * Full result record emitted by an adapter after a test run.
 * This is the common contract all runners must produce.
 */
export interface ScenarioResult {
  /** The authored metadata. */
  meta: ScenarioMeta;
  /** Which test runner produced this result. */
  runner: "vitest" | "playwright" | string;
  /** Outcome of the run. */
  status: ScenarioStatus;
  /** Duration in milliseconds. */
  durationMs: number;
  /** Source file (relative to repo root). */
  file: string;
  /** Line number in the source file. */
  line?: number;
  /** ISO timestamp of the execution that produced this result. Absent for catalog-only stubs. */
  executedAt?: string;
  /** Error message if status is "failed". */
  error?: string;
  /** Local Playwright image/video attachments for this execution. */
  evidenceAttachments?: Array<{ path: string; contentType: string; exampleId?: string }>;
  examples?: Array<{
    id: string;
    title: string;
    status: string;
    durationMs: number;
    startedAt?: string;
    evidenceNames: Array<string>;
  }>;
  /** Folder containing evidence for this execution. */
  evidenceUrl?: string;
}

/** The valid `type` values for a scenario. */
export const SCENARIO_TYPES = ["positive", "negative", "ui-interaction", "edge-case"] as const;

/** The valid `method` values for a scenario. */
export const SCENARIO_METHODS = ["unit", "integration", "e2e", "manual"] as const;

// Augment Vitest's TaskMeta so the .scenario property is globally recognized
declare module "vitest" {
  interface TaskMeta {
    scenario?: ScenarioMeta;
  }
}
