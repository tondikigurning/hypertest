import { resolve } from "node:path";
import { catalogStore } from "./catalog-store.mjs";
import { automationCatalog } from "./scenario-catalog.mjs";

export const bddFeatureRoot = resolve(import.meta.dirname, "../../../e2e/tests/bdd/features");

export async function syncScenarioCatalog(root = bddFeatureRoot, store = catalogStore) {
  const scenarios = automationCatalog(root);
  await store.replace(scenarios);
  return scenarios.length;
}
