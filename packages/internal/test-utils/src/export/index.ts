import fs from "node:fs";
import path from "node:path";

export { buildTotals, classifyResults } from "./classify";
export { buildGoogleExportPayload, flowIdFromTags, shortenFlowId, tagsWithoutFlow } from "./payload";
export {
  buildDriveMirrorPlan,
  type DriveMirrorPlan,
  type DrivePushResult,
  type GoogleDrivePushConfig,
  type PushDriveOptions,
  pushGoogleExportToDrive,
} from "./push-drive";
export {
  buildPushPlan,
  type PushGoogleExportOptions,
  type PushGoogleExportResult,
  pushGoogleExportToSheets,
} from "./push-sheets";
export {
  parentFoldersOf,
  reportFolderTag,
  spreadsheetNameFromRelativePath,
} from "./report-paths";
export {
  type GoogleSheetsPushConfig,
  type ResolveDrivePushConfigResult,
  type ResolveSheetsPushConfigResult,
  resolveGoogleDrivePushConfig,
  resolveGoogleSheetsPushConfig,
  type ServiceAccountCredentials,
} from "./resolve-credentials";
export { buildClearRanges, buildStylingRequests, buildValuesBatchUpdateBody } from "./sheets-requests";
export type {
  BuildGoogleExportOptions,
  GoogleExportPayload,
  GoogleSheetTab,
} from "./types";

/**
 * Find the latest report folder under `testing-docs/reports/`.
 * Returns the absolute path to the folder or null if none found.
 */
export function findLatestReportDir(reportsRoot: string): string | null {
  if (!fs.existsSync(reportsRoot)) return null;
  const entries = fs.readdirSync(reportsRoot, { withFileTypes: true });
  const dirs = entries
    .filter((e) => {
      if (!e.isDirectory() || !/^\d{4}-\d{2}-\d{2}_\d{4}$/.test(e.name)) return false;
      return fs.existsSync(path.join(reportsRoot, e.name, "aggregate.json"));
    })
    .map((e) => e.name)
    .sort()
    .reverse();
  return dirs.length > 0 ? path.join(reportsRoot, dirs[0]) : null;
}

/**
 * Load .env.local from the given directory (or monorepo root by scanning upward).
 */
export function loadEnvLocal(dir: string, env: NodeJS.ProcessEnv = process.env): void {
  let current = path.resolve(dir);
  const root = path.parse(current).root;

  while (current !== root) {
    const envPath = path.join(current, ".env.local");
    if (fs.existsSync(envPath)) {
      parseEnvFile(envPath, env);
    }
    current = path.dirname(current);
  }

  const pkgEnvPath = path.resolve(dir, "packages/internal/test-utils/.env.local");
  if (fs.existsSync(pkgEnvPath) && pkgEnvPath !== path.resolve(dir, ".env.local")) {
    parseEnvFile(pkgEnvPath, env);
  }
}

function parseEnvFile(filePath: string, env: NodeJS.ProcessEnv): void {
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!env[key]) {
      env[key] = value;
    }
  }
}
