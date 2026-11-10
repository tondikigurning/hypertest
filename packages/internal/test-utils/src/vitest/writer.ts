import fs from "node:fs";
import path from "node:path";
import type { ScenarioResult } from "../schema/types";
import { toJSON, toMarkdownCatalog, toMarkdownResults } from "./renderers";

interface WriteOptions {
  /** Package slug (e.g. "dataview") */
  packageName: string;
  /** Component name derived from the test file (e.g. "pipeline-renderer") */
  componentName: string;
  /** Absolute path to the monorepo root */
  repoRoot: string;
}

/**
 * Derives a kebab-case component name from a file path.
 * e.g. "packages/dataview/src/pipeline-renderer/pipeline-renderer.test.tsx" → "pipeline-renderer"
 */
export function componentNameFromFile(filePath: string): string {
  const base = path.basename(filePath);
  return base.replace(/\.test\.[jt]sx?$/, "").replace(/\.spec\.[jt]sx?$/, "");
}

/**
 * Strips a leading `<prefix>:` from a Vitest project name so it's safe to use as a directory
 * name. Vitest project names use several prefixes across the monorepo ("pkg:ui", "app:tenants",
 * "crm:shared") — an un-stripped colon is a reserved character on Windows and breaks
 * fs.mkdirSync for any of these except "pkg:". Names with no colon (e.g. "@hyperscal/form") are
 * left as-is.
 * e.g. "pkg:dataview" → "dataview", "app:tenants" → "tenants"
 */
export function packageSlugFromName(vitestName: string): string {
  return vitestName.replace(/^[^/:]+:/, "");
}

/**
 * Writes scenario results to disk according to TEST_WRITE / TEST_FORMATS.
 * Always prints the absolute path(s) of every file written.
 *
 * Class A (committed catalog .md) → testing-docs/components/ when TEST_WRITE=1.
 * Class C (json/junit for aggregate-report.mjs) → always temp/test-results/.
 */
export function writeResults(results: Array<ScenarioResult>, opts: WriteOptions): void {
  const testWrite = process.env.TEST_WRITE === "1";
  const formats = (process.env.TEST_FORMATS ?? "markdown").split(",").map((f) => f.trim());

  if (testWrite) {
    writeCommittedCatalog(results, opts);
  }

  // JSON/JUnit (and markdown when not committing catalogs) always go to temp/ for aggregation.
  const ephemeralFormats = testWrite ? formats.filter((f) => f !== "markdown") : formats;
  if (ephemeralFormats.length > 0) {
    writeEphemeral(results, opts, ephemeralFormats);
  }
}

/**
 * TEST_WRITE=1 — write the deterministic catalog to committed testing-docs/ path (class A).
 */
function writeCommittedCatalog(results: Array<ScenarioResult>, opts: WriteOptions): void {
  const catalogDir = path.join(opts.repoRoot, "testing-docs", "components", opts.packageName);
  fs.mkdirSync(catalogDir, { recursive: true });

  const catalogPath = path.join(catalogDir, `${opts.componentName}.md`);
  fs.writeFileSync(catalogPath, toMarkdownCatalog(results, opts.componentName, "unit"), "utf8");
  // biome-ignore lint/suspicious/noConsole: reporter output
  console.log(`[test-utils] catalog → ${catalogPath}`);
}

/**
 * TEST_WRITE=0 — write to ephemeral temp/ paths (gitignored, class C).
 */
function writeEphemeral(results: Array<ScenarioResult>, opts: WriteOptions, formats: Array<string>): void {
  const tempDir = path.join(opts.repoRoot, "temp", "test-results", opts.packageName);
  fs.mkdirSync(tempDir, { recursive: true });

  if (formats.includes("markdown")) {
    const mdPath = path.join(tempDir, `${opts.componentName}.results.md`);
    fs.writeFileSync(mdPath, toMarkdownResults(results, opts.componentName, new Date()), "utf8");
    // biome-ignore lint/suspicious/noConsole: reporter output
    console.log(`[test-utils] results → ${mdPath}`);
  }

  if (formats.includes("json")) {
    const jsonPath = path.join(tempDir, `${opts.componentName}.results.json`);
    fs.writeFileSync(jsonPath, toJSON(results), "utf8");
    // biome-ignore lint/suspicious/noConsole: reporter output
    console.log(`[test-utils] json    → ${jsonPath}`);
  }

  if (formats.includes("junit")) {
    const junitPath = path.join(tempDir, `${opts.componentName}.junit.xml`);
    fs.writeFileSync(junitPath, toJUnit(results, opts.componentName), "utf8");
    // biome-ignore lint/suspicious/noConsole: reporter output
    console.log(`[test-utils] junit   → ${junitPath}`);
  }
}

/**
 * Minimal JUnit XML output for CI dashboards.
 */
function toJUnit(results: Array<ScenarioResult>, suiteName: string): string {
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped" || r.status === "manual").length;

  const cases = results
    .map((r) => {
      const attrs = `classname="${escapeXml(r.meta.category)}" name="${escapeXml(`${r.meta.id}: ${r.meta.title}`)}" time="${(r.durationMs / 1000).toFixed(3)}"`;
      if (r.status === "failed") {
        return `    <testcase ${attrs}>\n      <failure message="${escapeXml(r.error ?? "Test failed")}" />\n    </testcase>`;
      }
      if (r.status === "skipped" || r.status === "manual") {
        return `    <testcase ${attrs}>\n      <skipped />\n    </testcase>`;
      }
      return `    <testcase ${attrs} />`;
    })
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<testsuites>`,
    `  <testsuite name="${escapeXml(suiteName)}" tests="${results.length}" failures="${failed}" skipped="${skipped}" errors="0">`,
    cases,
    `  </testsuite>`,
    `</testsuites>`,
    "",
  ].join("\n");
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
