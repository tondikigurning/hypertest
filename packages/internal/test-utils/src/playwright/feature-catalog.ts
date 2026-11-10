import fs from "node:fs";
import path from "node:path";
import type { ScenarioMeta, ScenarioResult } from "../schema/types";
import { validateMeta } from "../schema/validate";

const ID_RE = /^[A-Z]{2,4}_[A-Z0-9_]+_E2E_\d{3,4}$/;
const PURPOSE_TAGS = new Set(["smoke", "regression", "quarantine", "fixme"]);
const VALID_TYPES: ReadonlyArray<ScenarioMeta["type"]> = ["positive", "negative", "ui-interaction", "edge-case"];
const STEP_RE = /^(Given|When|Then|And|But)\s+(.+)$/;

interface ParsedScenario {
  title: string;
  steps: Array<string>;
  examples: Array<string>;
  expect: string;
}

function metaFromTags(rawTags: Array<string>, scenario: ParsedScenario, featureTitle: string): ScenarioMeta | null {
  const id = rawTags.find((t) => ID_RE.test(t));
  if (!id) return null;

  const purposeTags = rawTags.filter((t) => PURPOSE_TAGS.has(t));
  const flowRefs = rawTags.filter((t) => t.startsWith("flow:"));
  const refs = rawTags.filter((t) => t.startsWith("ref:")).map((t) => t.slice("ref:".length));
  const expectRaw = rawTags.find((t) => t.startsWith("expect:"))?.slice("expect:".length);
  const typeRaw = rawTags.find((t) => t.startsWith("type:"))?.slice("type:".length);
  const type: ScenarioMeta["type"] = VALID_TYPES.includes(typeRaw as ScenarioMeta["type"])
    ? (typeRaw as ScenarioMeta["type"])
    : "positive";
  const expectedOutcome = parseExpectedOutcome(expectRaw, scenario.expect);

  const allTags = [...purposeTags, ...flowRefs];
  const meta: ScenarioMeta = {
    id,
    title: scenario.title,
    expect: expectedOutcome,
    type,
    category: featureTitle,
    method: "e2e",
    scenario: [...scenario.steps, ...scenario.examples].join("\n"),
    ...(allTags.length > 0 ? { tags: allTags } : {}),
    ...(refs.length > 0 ? { refs } : {}),
  };

  try {
    validateMeta(meta);
    return meta;
  } catch {
    return null;
  }
}

/**
 * Parses Gherkin .feature files into catalog-ready ScenarioResult stubs (method=e2e).
 * One row per Scenario / Scenario Outline block (not per Examples row).
 */
export function parseFeatureFileCatalog(featurePath: string, content: string): Array<ScenarioResult> {
  const lines = content.split("\n");
  const featureTitle = content.match(/^Feature:\s*(.+)$/m)?.[1]?.trim() ?? path.basename(featurePath, ".feature");
  const results: Array<ScenarioResult> = [];
  let pendingTags: Array<string> = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]?.trim() ?? "";
    if (!line || line.startsWith("#")) {
      i += 1;
      continue;
    }

    if (line.startsWith("@")) {
      pendingTags.push(...line.split(/\s+/).map((tag) => tag.replace(/^@/, "")));
      i += 1;
      continue;
    }

    const scenarioMatch = line.match(/^Scenario(?: Outline)?:\s*(.+)$/);
    if (!scenarioMatch) {
      i += 1;
      continue;
    }

    const scenarioTitle = scenarioMatch[1]?.trim() ?? "";
    const collected = collectScenarioDetails(lines, i + 1);
    const parsedScenario: ParsedScenario = {
      title: scenarioTitle,
      steps: collected.steps,
      examples: collected.examples,
      expect: deriveExpectationFromSteps(collected.steps, scenarioTitle),
    };

    const meta = metaFromTags(pendingTags, parsedScenario, featureTitle);
    pendingTags = [];
    i = collected.nextIndex;

    if (!meta) continue;

    results.push({
      meta,
      runner: "playwright",
      status: "skipped",
      durationMs: 0,
      file: featurePath.replace(/\\/g, "/"),
    });
  }

  return results;
}

export function collectFeatureCatalogs(featuresRoot: string): Array<ScenarioResult> {
  const results: Array<ScenarioResult> = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".feature")) {
        const content = fs.readFileSync(fullPath, "utf8");
        results.push(...parseFeatureFileCatalog(fullPath, content));
      }
    }
  };

  walk(featuresRoot);
  return results;
}

/**
 * Collects catalog stubs for every BDD feature file in the monorepo.
 */
export function collectAllFeatureCatalogs(repoRoot: string): Array<ScenarioResult> {
  const results: Array<ScenarioResult> = [];

  for (const root of discoverFeatureRoots(repoRoot)) {
    results.push(...collectFeatureCatalogs(root));
  }

  return results;
}

/**
 * Discovers BDD feature roots for apps in the monorepo.
 */
export function discoverFeatureRoots(repoRoot: string): Array<string> {
  const appsRoot = path.join(repoRoot, "apps");
  if (!fs.existsSync(appsRoot)) return [];

  const roots: Array<string> = [];
  for (const appName of fs.readdirSync(appsRoot)) {
    const featureRoot = path.join(appsRoot, appName, "tests", "bdd", "features");
    if (fs.existsSync(featureRoot)) roots.push(featureRoot);
  }

  return roots;
}

/**
 * Builds an ID-indexed map of e2e scenario metadata from all feature files.
 */
export function collectFeatureScenarioMap(repoRoot: string): Map<string, ScenarioMeta> {
  const byId = new Map<string, ScenarioMeta>();

  for (const result of collectAllFeatureCatalogs(repoRoot)) {
    byId.set(result.meta.id, result.meta);
  }

  return byId;
}

function collectScenarioDetails(
  lines: Array<string>,
  startIndex: number,
): {
  steps: Array<string>;
  examples: Array<string>;
  nextIndex: number;
} {
  const steps: Array<string> = [];
  const examples: Array<string> = [];
  let i = startIndex;
  let inExamples = false;
  let exampleHeaders: Array<string> = [];

  while (i < lines.length) {
    const line = (lines[i] ?? "").trim();

    if (!line || line.startsWith("#")) {
      i += 1;
      continue;
    }

    if (line.startsWith("@")) {
      break;
    }

    if (line.startsWith("Examples:")) {
      inExamples = true;
      i += 1;
      continue;
    }

    if (/^Scenario(?: Outline)?:\s*/.test(line) || /^Feature:\s*/.test(line)) {
      break;
    }

    if (inExamples && line.startsWith("|")) {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);

      if (cells.length > 0) {
        if (exampleHeaders.length === 0) {
          exampleHeaders = cells;
        } else {
          const pairs = exampleHeaders.map((h, idx) => `${h}=${cells[idx] ?? ""}`);
          examples.push(`Example: ${pairs.join(", ")}`);
        }
      }

      i += 1;
      continue;
    }

    const stepMatch = line.match(STEP_RE);
    if (stepMatch) {
      steps.push(`${stepMatch[1]} ${stepMatch[2]}`.trim());
    }

    i += 1;
  }

  return { steps, examples, nextIndex: i };
}

function deriveExpectationFromSteps(steps: Array<string>, fallbackTitle: string): string {
  let lastAssertion: string | undefined;
  let inAssertionBlock = false;

  for (const step of steps) {
    const match = step.match(STEP_RE);
    if (!match) continue;

    const keyword = match[1];
    const content = match[2]?.trim() ?? "";
    if (!content) continue;

    if (keyword === "Then") {
      inAssertionBlock = true;
      lastAssertion = content;
      continue;
    }

    if ((keyword === "And" || keyword === "But") && inAssertionBlock) {
      lastAssertion = content;
      continue;
    }

    if (keyword === "Given" || keyword === "When") {
      inAssertionBlock = false;
    }
  }

  if (lastAssertion) return lastAssertion;
  return asExpectationSentence(fallbackTitle);
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
