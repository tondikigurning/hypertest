import type { Totals } from "../aggregate/types";
import type { ScenarioResult } from "../schema/types";

/** Extract the first path segment of `result.file` as a package slug. */
export function packageSlugFromFile(file: string): string | undefined {
  const segments = file.split("/");
  if (segments.length < 2) return undefined;

  // apps/<app>/...  → <app>
  if (segments[0] === "apps") return segments[1];

  // packages/<pkg>/...  → <pkg>
  // packages/internal/<pkg>/...  → <pkg> (nested internal packages)
  if (segments[0] === "packages") {
    if (segments[1] === "internal" && segments.length >= 3) return segments[2];
    return segments[1];
  }

  return segments[0];
}

/** Build Totals from a flat array of ScenarioResults. */
export function buildTotals(results: Array<ScenarioResult>): Totals {
  const totals: Totals = { passed: 0, failed: 0, skipped: 0, manual: 0, total: results.length };
  for (const r of results) {
    if (r.status === "passed") totals.passed += 1;
    else if (r.status === "failed") totals.failed += 1;
    else if (r.status === "skipped") totals.skipped += 1;
    else if (r.status === "manual") totals.manual += 1;
  }
  return totals;
}

export interface ClassifiedResults {
  failures: Array<ScenarioResult>;
  e2eByModule: Map<string, Array<ScenarioResult>>;
  unitByPackage: Map<string, Array<ScenarioResult>>;
  integrationByPackage: Map<string, Array<ScenarioResult>>;
}

export function classifyResults(results: Array<ScenarioResult>): ClassifiedResults {
  const failures: Array<ScenarioResult> = [];
  const e2eByModule = new Map<string, Array<ScenarioResult>>();
  const unitByPackage = new Map<string, Array<ScenarioResult>>();
  const integrationByPackage = new Map<string, Array<ScenarioResult>>();

  for (const result of results) {
    if (result.status === "failed") failures.push(result);

    const method = result.meta.method;

    if (method === "e2e" || result.runner === "playwright") {
      const moduleSlug = e2eModuleSlug(result);
      const bucket = e2eByModule.get(moduleSlug) ?? [];
      bucket.push(result);
      e2eByModule.set(moduleSlug, bucket);
    } else if (method === "unit") {
      const slug = packageSlugFromFile(result.file) ?? "unknown";
      const bucket = unitByPackage.get(slug) ?? [];
      bucket.push(result);
      unitByPackage.set(slug, bucket);
    } else if (method === "integration") {
      const slug = packageSlugFromFile(result.file) ?? "unknown";
      const bucket = integrationByPackage.get(slug) ?? [];
      bucket.push(result);
      integrationByPackage.set(slug, bucket);
    }
  }

  return { failures, e2eByModule, unitByPackage, integrationByPackage };
}

function e2eModuleSlug(result: ScenarioResult): string {
  const file = result.file.replace(/\\/g, "/");

  const match = file.match(
    /(?:^|\/)(?:apps\/([^/]+)|(e2e))\/.features-gen\/[^/]+\/tests\/bdd\/(?:features|steps)\/(.+)\.spec\.(?:ts|tsx|js|mjs)$/,
  );
  if (match) {
    const app = match[1] ?? "scenarios";
    let featurePath = match[3];
    if (featurePath.endsWith(".feature")) featurePath = featurePath.slice(0, -".feature".length);
    return `${app}/${featurePath}`;
  }

  const segments = file.split(/[/\\]/);
  return segments[segments.length - 2]
    ? `${segments[segments.length - 2]}/${segments[segments.length - 1].replace(/\.[^.]+$/, "")}`
    : file;
}
