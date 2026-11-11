/** Authored metadata for a BDD scenario. */
export interface ScenarioMeta {
  /** Stable E2E ID: <APP>_<COMPONENT>_E2E_<NNN>. Never renumber, only retire. */
  id: string;
  /** Human-readable title. */
  title: string;
  /** Expected outcome for this E2E scenario. */
  expect: string;
  /** What kind of scenario this is. */
  type: "positive" | "negative" | "ui-interaction" | "edge-case";
  /** Feature or business-flow grouping. */
  category: string;
  /** Automation method used for the business scenario. */
  method: "e2e";
  /** Gherkin scenario steps (Given/When/Then...) as a multiline string. */
  scenario: string;
  /** Cross-cutting purpose tags (smoke, regression, quarantine, etc.). */
  tags?: Array<string>;
  /** Optional links to related work (issue/bug/PRD requirement). */
  refs?: Array<string>;
}

export type ScenarioStatus = "passed" | "failed" | "skipped";

/** Full result record emitted by the Playwright BDD reporter. */
export interface ScenarioResult {
  meta: ScenarioMeta;
  runner: "playwright";
  status: ScenarioStatus;
  durationMs: number;
  /** Source file, relative to the repository root. */
  file: string;
  line?: number;
  /** Absent for catalog-only stubs. */
  executedAt?: string;
  error?: string;
  evidenceAttachments?: Array<{ path: string; contentType: string; exampleId?: string }>;
  examples?: Array<{
    id: string;
    title: string;
    status: string;
    durationMs: number;
    startedAt?: string;
    evidenceNames: Array<string>;
  }>;
  evidenceUrl?: string;
}

export const SCENARIO_TYPES = ["positive", "negative", "ui-interaction", "edge-case"] as const;
