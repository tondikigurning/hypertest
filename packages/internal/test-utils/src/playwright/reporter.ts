import fs from "node:fs";
import path from "node:path";
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import type { ScenarioMeta, ScenarioResult, ScenarioStatus } from "../schema/types.js";
import { validateMeta } from "../schema/validate.js";
import { resolveBddScenarioMeta } from "./bdd-scenario-meta.js";
import { collectFeatureScenarioMap } from "./feature-catalog.js";

/**
 * Regex matching a valid scenario ID for the E2E tier (e.g. TEN_LOGIN_E2E_001).
 * The TIER segment must be exactly "E2E" for Playwright/Gherkin scenarios.
 */
const ID_RE = /^[A-Z]{2,4}_[A-Z0-9_]+_E2E_\d{3,4}$/;

/** Purpose tags that are forwarded as-is into ScenarioMeta.tags. */
const PURPOSE_TAGS = new Set(["smoke", "regression", "quarantine", "fixme"]);

/**
 * Playwright reporter adapter for the Hyperscal scenario contract.
 *
 * Reads Gherkin tags produced by playwright-bdd (which emits them as `{ tag: ['@tagname', ...] }`)
 * and converts each tagged TestCase into a common ScenarioResult JSON.
 *
 * Tag convention (Gherkin @tag → Playwright tag string `@tag`, leading `@` stripped internally):
 *   @TEN_LOGIN_E2E_001    → id (matches /^[A-Z]{2,4}_[A-Z0-9_]+_E2E_\d{3,4}$/)
 *   @smoke / @regression  → meta.tags
 *   @quarantine           → meta.tags (non-blocking in CI, excluded from tag-filtered runs)
 *   @flow:TEN_LOGIN_FLOW  → stored in meta.tags as "flow:TEN_LOGIN_FLOW"
 *   @ref:HC-467           → meta.refs
 *   @expect:<value>       → expected outcome text (use URL encoding for spaces)
 *   @type:positive        → type override (default: "positive")
 *
 * Feature title → meta.category
 * Scenario title → meta.title
 * method = "e2e", runner = "playwright" (auto-stamped, never authored)
 *
 * Usage in playwright.bdd.config.ts:
 *   reporter: [['@hyperscal/test-utils/playwright', { outputFile: 'temp/test-results/tenants/bdd.results.json' }]]
 */
export default class PlaywrightScenarioReporter implements Reporter {
  private results: Array<ScenarioResult> = [];
  private readonly outputFile: string;
  private readonly repoRoot: string;
  private readonly featureMetaById: Map<string, ScenarioMeta>;

  constructor(options: { outputFile?: string } = {}) {
    this.repoRoot = findRepoRoot(process.cwd());
    const rawOutput = options.outputFile ?? "temp/test-results/playwright/bdd.results.json";
    this.outputFile = path.isAbsolute(rawOutput) ? rawOutput : path.join(this.repoRoot, rawOutput);
    this.featureMetaById = collectFeatureScenarioMap(this.repoRoot);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const rawTags = collectTags(test);
    const id = rawTags.find((t) => ID_RE.test(t));

    if (!id) {
      // Not a scenario-contract test (no matching ID tag) — skip silently.
      return;
    }

    const purposeTags = rawTags.filter((t) => PURPOSE_TAGS.has(t));
    const flowRefs = rawTags.filter((t) => t.startsWith("flow:"));
    const refs = rawTags.filter((t) => t.startsWith("ref:")).map((t) => t.slice("ref:".length));
    const expectRaw = rawTags.find((t) => t.startsWith("expect:"))?.slice("expect:".length);
    const typeRaw = rawTags.find((t) => t.startsWith("type:"))?.slice("type:".length);
    const validTypes: ReadonlyArray<ScenarioMeta["type"]> = ["positive", "negative", "ui-interaction", "edge-case"];
    const type: ScenarioMeta["type"] = validTypes.includes(typeRaw as ScenarioMeta["type"])
      ? (typeRaw as ScenarioMeta["type"])
      : "positive";

    const featureMeta = this.featureMetaById.get(id);
    const resolved = resolveBddScenarioMeta(test);
    const category = featureMeta?.category ?? resolved.category;
    const title = featureMeta?.title ?? resolved.title;
    const expectedOutcome = parseExpectedOutcome(expectRaw, featureMeta?.expect ?? asExpectationSentence(title));
    const gherkinScenario = featureMeta?.scenario ?? `Then ${expectedOutcome}`;

    // Flow refs are stored in tags so they appear in the aggregate and catalog.
    const allTags = [...purposeTags, ...flowRefs];

    const meta: ScenarioMeta = {
      id,
      title,
      expect: expectedOutcome,
      type,
      category,
      method: "e2e",
      scenario: gherkinScenario,
      ...(allTags.length > 0 ? { tags: allTags } : {}),
      ...(refs.length > 0 ? { refs } : {}),
    };

    try {
      validateMeta(meta);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: reporter output
      console.warn(`[playwright-reporter] Invalid meta for test "${title}": ${(err as Error).message}`);
      return;
    }

    // Explicitly force 'skipped' if the scenario is tagged with @fixme,
    // overriding Playwright's underlying test result status.
    const status = allTags.includes("fixme") ? "skipped" : mapStatus(result.status);

    const scenarioResult: ScenarioResult = {
      meta,
      runner: "playwright",
      status,
      durationMs: result.duration,
      executedAt: result.startTime.toISOString(),
      file: relativePath(this.repoRoot, test.location.file),
      line: test.location.line,
      evidenceAttachments: result.attachments
        .filter((attachment) => attachment.path && /^(image|video)\//.test(attachment.contentType))
        .map((attachment) => ({ path: attachment.path!, contentType: attachment.contentType })),
      ...(status === "failed" && result.errors.length > 0 ? { error: result.errors[0]?.message?.slice(0, 200) } : {}),
    };

    const existing = this.results.find((r) => r.meta.id === id);
    if (!existing) {
      this.results.push(scenarioResult);
    }
  }

  async onEnd(_result: FullResult): Promise<void> {
    if (this.results.length > 0) {
      fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
      fs.writeFileSync(this.outputFile, JSON.stringify(this.results, null, 2), "utf8");
      // biome-ignore lint/suspicious/noConsole: reporter output
      console.log(`[playwright-reporter] results → ${this.outputFile}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collects all tags from a TestCase, normalising away the leading `@`.
 * playwright-bdd v8 emits tags via `{ tag: ['@tagname', ...] }` so test.tags
 * contains `@`-prefixed strings. We also check annotations for older versions.
 */
function collectTags(test: TestCase): Array<string> {
  const seen = new Set<string>();
  const tags: Array<string> = [];

  const add = (raw: string) => {
    const t = raw.startsWith("@") ? raw.slice(1) : raw;
    if (t && !seen.has(t)) {
      seen.add(t);
      tags.push(t);
    }
  };

  if (Array.isArray((test as unknown as { tags: Array<string> }).tags)) {
    for (const t of (test as unknown as { tags: Array<string> }).tags) add(t);
  }

  if (Array.isArray(test.annotations)) {
    for (const a of test.annotations) {
      const value = (a as { value?: string }).value ?? a.description;
      if (a.type === "tag" && value) add(value);
    }
  }

  return tags;
}

function parseExpectedOutcome(raw: string | undefined, fallback: string): string {
  if (!raw || raw.trim() === "") return fallback;

  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded || fallback;
  } catch {
    return raw.trim() || fallback;
  }
}

function asExpectationSentence(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "Expected outcome is satisfied";
  return trimmed;
}

function mapStatus(playwrightStatus: TestResult["status"]): ScenarioStatus {
  switch (playwrightStatus) {
    case "passed":
      return "passed";
    case "failed":
    case "timedOut":
    case "interrupted":
      return "failed";
    case "skipped":
      return "skipped";
    default:
      return "skipped";
  }
}

function relativePath(root: string, file: string): string {
  return path.relative(root, file).replace(/\\/g, "/");
}

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}
