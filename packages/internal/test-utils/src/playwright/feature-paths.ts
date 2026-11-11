/**
 * Resolves the BDD feature path used to organize uploaded evidence in Drive.
 * The returned path is derived from the authored feature source, not a catalog file.
 */
export interface BddFeatureTarget {
  app: string;
  relPath: string;
}

const FEATURE_PATH_RE = /tests\/bdd\/features\/(.+?)\.feature(?:\.spec\.[cm]?[jt]s)?$/;
const APP_PATH_RE = /apps\/([^/]+)\//;
const E2E_WORKSPACE_PATH_RE = /(?:^|\/)e2e\/(?:\.features-gen\/[^/]+\/)?tests\/bdd\//;

export function bddFeatureTargetFromFile(file: string): BddFeatureTarget | null {
  const normalized = file.replace(/\\/g, "/");
  const app = normalized.match(APP_PATH_RE)?.[1] ?? (E2E_WORKSPACE_PATH_RE.test(normalized) ? "scenarios" : undefined);
  const relPath = normalized.match(FEATURE_PATH_RE)?.[1];
  if (!app || !relPath) return null;
  return { app, relPath };
}
