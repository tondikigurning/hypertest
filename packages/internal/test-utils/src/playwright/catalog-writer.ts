import fs from "node:fs";
import path from "node:path";
import type { ScenarioResult } from "../schema/types";
import { mergeMarkdownCatalog } from "../vitest/renderers";
import { type BddCatalogTarget, bddCatalogTargetFromFile, catalogPathForTarget } from "./catalog-routes";

interface CatalogGroup {
  target: BddCatalogTarget;
  results: Array<ScenarioResult>;
}

/**
 * Writes BDD e2e scenarios into committed testing-docs catalogs, mirroring the
 * source feature-file tree (one catalog per .feature file).
 *
 * Called after each BDD run for the catalogs it covered: executed scenarios carry
 * status/last-run, while catalog-only stubs keep the previously committed values
 * (see scenarioToCatalogRow).
 * Preserves existing unit/integration/manual rows in each catalog.
 */
export function writeBddCatalogs(results: Array<ScenarioResult>, repoRoot: string): void {
  const groups = groupResultsByCatalog(results);
  if (groups.length === 0) return;

  for (const group of groups) {
    const catalogPath = catalogPathForTarget(repoRoot, group.target);
    fs.mkdirSync(path.dirname(catalogPath), { recursive: true });

    const existing = fs.existsSync(catalogPath) ? fs.readFileSync(catalogPath, "utf8") : null;
    const merged = mergeMarkdownCatalog(existing, group.results, group.target.componentName, "e2e");
    fs.writeFileSync(catalogPath, merged, "utf8");
    // biome-ignore lint/suspicious/noConsole: reporter output
    console.log(`[bdd-catalog] catalog → ${catalogPath}`);
  }
}

function groupResultsByCatalog(results: Array<ScenarioResult>): Array<CatalogGroup> {
  const grouped = new Map<string, CatalogGroup>();

  for (const result of results) {
    const target = bddCatalogTargetFromFile(result.file);
    if (!target) continue;

    const key = `${target.app}/${target.relPath}`;
    let group = grouped.get(key);
    if (!group) {
      group = { target, results: [] };
      grouped.set(key, group);
    }
    group.results.push(result);
  }

  return [...grouped.values()];
}
