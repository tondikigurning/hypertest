/**
 * Dated report folder tag helpers — same naming as `testing-docs/reports/<tag>/`.
 */

/** Prefer tag from source path `…/reports/YYYY-MM-DD_HHMM/…`, else UTC from runAt. */
export function reportFolderTag(runAt: string, sourcePath?: string): string {
  const fromPath = sourcePath?.replace(/\\/g, "/").match(/reports\/(\d{4}-\d{2}-\d{2}_\d{4})(?:\/|$)/)?.[1];
  if (fromPath) return fromPath;
  return formatDateTag(new Date(runAt));
}

export function formatDateTag(date: Date): string {
  if (Number.isNaN(date.getTime())) return "unknown-run";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}_${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
}

/** Folder segments for a relative markdown path (`e2e/scenarios/users.md` → `["e2e","scenarios"]`). */
export function parentFoldersOf(relativePath: string): Array<string> {
  const parts = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length <= 1) return [];
  const dirs: Array<string> = [];
  for (let i = 0; i < parts.length - 1; i += 1) {
    dirs.push(parts.slice(0, i + 1).join("/"));
  }
  return dirs;
}

/** Spreadsheet file name = markdown stem (`users.md` → `users`). */
export function spreadsheetNameFromRelativePath(relativePath: string): string {
  const base = relativePath.replace(/\\/g, "/").split("/").pop() ?? relativePath;
  return base.replace(/\.md$/i, "") || base;
}
