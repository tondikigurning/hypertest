/**
 * Resolves committed catalog paths for BDD scenarios by MIRRORING the source
 * feature-file tree under testing-docs/e2e/.
 *
 * The root `e2e/tests/bdd/features/<rel>.feature` tree maps to
 * `testing-docs/e2e/scenarios/<rel>.md`. Other apps under `apps/<app>` map to
 * `testing-docs/e2e/<app>/<rel>.md`.
 *
 * The source path is read from `ScenarioResult.file`, which is either the
 * `.feature` source (catalog generation) or the playwright-bdd generated
 * `.feature.spec.js` (post-run reporter) — both contain the same
 * `tests/bdd/features/<rel>.feature` segment.
 */
export interface BddCatalogTarget {
  /** App slug, e.g. "scenarios". */
  app: string;
  /** Feature path relative to the features root, without extension, e.g. "user-management/users". */
  relPath: string;
  /** Catalog filename stem (last path segment), e.g. "users". */
  componentName: string;
}

const FEATURE_PATH_RE = /tests\/bdd\/features\/(.+?)\.feature(?:\.spec\.[cm]?[jt]s)?$/;
const APP_PATH_RE = /apps\/([^/]+)\//;
const E2E_WORKSPACE_PATH_RE = /(?:^|\/)e2e\/(?:\.features-gen\/[^/]+\/)?tests\/bdd\//;

/**
 * Derives the mirrored catalog target from a feature (or generated spec) file path.
 * Returns null when the path is not a recognisable BDD feature file.
 */
export function bddCatalogTargetFromFile(file: string): BddCatalogTarget | null {
  const normalized = file.replace(/\\/g, "/");
  const app = normalized.match(APP_PATH_RE)?.[1] ?? (E2E_WORKSPACE_PATH_RE.test(normalized) ? "scenarios" : undefined);
  const relPath = normalized.match(FEATURE_PATH_RE)?.[1];
  if (!app || !relPath) return null;

  const componentName = relPath.split("/").pop() ?? relPath;
  return { app, relPath, componentName };
}

export function catalogPathForTarget(repoRoot: string, target: BddCatalogTarget): string {
  return `${repoRoot}/testing-docs/e2e/${target.app}/${target.relPath}.md`;
}
