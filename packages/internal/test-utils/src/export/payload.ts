import type { AggregateReport, Totals } from "../aggregate/types";
import type { ScenarioResult } from "../schema/types";
import { buildTotals, classifyResults } from "./classify";
import { reportFolderTag, spreadsheetNameFromRelativePath } from "./report-paths";
import { sortResultsBySourceOrder } from "./sort-results";
import type { BuildGoogleExportOptions, GoogleExportPayload, GoogleSheetTab } from "./types";

/** Columns aligned with dated report scenario tables (errors kept in a dedicated column). */
const SCENARIO_HEADERS = [
  "Status",
  "ID",
  "Type",
  "Category",
  "Method",
  "Tags",
  "Runner",
  "Duration",
  "Title",
  "Scenario",
  "Error",
] as const;

/** E2E sheets: Category → Flow (short label from `@flow:…` tag). */
const E2E_SCENARIO_HEADERS = [
  "Status",
  "ID",
  "Type",
  "Flow",
  "Method",
  "Tags",
  "Runner",
  "Duration",
  "Title",
  "Expect",
  "Scenario",
  "Error",
] as const;

/**
 * Builds a Google Sheets-shaped payload mirroring `testing-docs/reports/<date>/`:
 * Overview · Report (nav) · Failures · e2e · unit · …
 */
export function buildGoogleExportPayload(
  aggregate: AggregateReport,
  options: BuildGoogleExportOptions = {},
): GoogleExportPayload {
  const now = options.now?.() ?? new Date();
  const runLabel = formatRunLabel(aggregate.runAt);
  const spreadsheetTitle = options.spreadsheetTitle ?? `Hyperscal Test Report — ${runLabel}`;
  const classified = classifyResults(aggregate.results);
  const reportFolder = options.reportFolder ?? reportFolderTag(aggregate.runAt, options.sourcePath);

  const sheets: Array<GoogleSheetTab> = [
    buildOverviewSheet(aggregate, classified, options.sourcePath, now),
    buildReportIndexSheet(aggregate, classified),
  ];

  if (classified.failures.length > 0) {
    sheets.push({
      title: "failures",
      relativePath: "failures.md",
      values: [Array.from(SCENARIO_HEADERS), ...sortResults(classified.failures).map(scenarioRow)],
    });
  }

  for (const [module, results] of [...classified.e2eByModule.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    sheets.push({
      title: spreadsheetNameFromRelativePath(`e2e/${module}.md`),
      relativePath: `e2e/${module}.md`,
      values: [Array.from(E2E_SCENARIO_HEADERS), ...sortResults(results).map(e2eScenarioRow)],
    });
  }

  for (const [pkg, results] of [...classified.unitByPackage.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    sheets.push({
      title: pkg,
      relativePath: `unit/${pkg}.md`,
      values: [Array.from(SCENARIO_HEADERS), ...sortResults(results).map(scenarioRow)],
    });
  }

  for (const [pkg, results] of [...classified.integrationByPackage.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    sheets.push({
      title: pkg,
      relativePath: `integration/${pkg}.md`,
      values: [Array.from(SCENARIO_HEADERS), ...sortResults(results).map(scenarioRow)],
    });
  }

  return {
    generatedAt: now.toISOString(),
    sourceRunAt: aggregate.runAt,
    spreadsheetTitle,
    reportFolder,
    sheets,
  };
}

function buildOverviewSheet(
  aggregate: AggregateReport,
  classified: ReturnType<typeof classifyResults>,
  sourcePath: string | undefined,
  now: Date,
): GoogleSheetTab {
  const t = aggregate.totals;
  const rows: Array<Array<string | number>> = [
    ["Section", "Field", "Value"],
    ["Meta", "Generated (export)", now.toISOString()],
    ["Meta", "Test run at", aggregate.runAt],
    ["Meta", "Duration (ms)", Math.round(aggregate.durationMs)],
  ];
  if (sourcePath) rows.push(["Meta", "Source aggregate", sourcePath]);

  rows.push(
    ["Totals", "Passed", t.passed],
    ["Totals", "Failed", t.failed],
    ["Totals", "Skipped", t.skipped],
    ["Totals", "Manual", t.manual],
    ["Totals", "Total", t.total],
    ["Totals", "Pass rate %", passRate(t)],
  );

  appendGroupRows(rows, "By tier", aggregate.byTier);
  appendGroupRows(rows, "By runner", aggregate.byRunner);
  appendGroupRows(rows, "By package", aggregate.byPackage);

  for (const [module, results] of [...classified.e2eByModule.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const totals = buildTotals(results);
    rows.push([
      "E2E by module",
      module,
      `passed ${totals.passed} · failed ${totals.failed} · skipped ${totals.skipped} · total ${totals.total}`,
    ]);
  }

  for (const [pkg, results] of [...classified.unitByPackage.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const totals = buildTotals(results);
    rows.push([
      "Unit by package",
      pkg,
      `passed ${totals.passed} · failed ${totals.failed} · skipped ${totals.skipped} · total ${totals.total}`,
    ]);
  }

  if (aggregate.newlyFailed.length > 0) {
    for (const id of aggregate.newlyFailed) {
      rows.push(["Newly failing", id, ""]);
    }
  }

  if (aggregate.quarantined.length > 0) {
    for (const id of aggregate.quarantined) {
      rows.push(["Quarantined", id, ""]);
    }
  }

  return { title: "overview", relativePath: "overview.md", values: rows };
}

function buildReportIndexSheet(
  aggregate: AggregateReport,
  classified: ReturnType<typeof classifyResults>,
): GoogleSheetTab {
  const headers = ["Section", "Passed", "Failed", "Skipped", "Manual", "Total", "Report path"];
  const rows: Array<Array<string | number>> = [headers];

  for (const [module, results] of [...classified.e2eByModule.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const totals = buildTotals(results);
    rows.push([
      `e2e / ${module}`,
      totals.passed,
      totals.failed,
      totals.skipped,
      totals.manual,
      totals.total,
      `e2e/${module}.md`,
    ]);
  }

  for (const [pkg, results] of [...classified.unitByPackage.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const totals = buildTotals(results);
    rows.push([
      `unit / ${pkg}`,
      totals.passed,
      totals.failed,
      totals.skipped,
      totals.manual,
      totals.total,
      `unit/${pkg}.md`,
    ]);
  }

  for (const [pkg, results] of [...classified.integrationByPackage.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const totals = buildTotals(results);
    rows.push([
      `integration / ${pkg}`,
      totals.passed,
      totals.failed,
      totals.skipped,
      totals.manual,
      totals.total,
      `integration/${pkg}.md`,
    ]);
  }

  if (classified.failures.length > 0) {
    const totals = buildTotals(classified.failures);
    rows.push([
      "failures (all tiers)",
      totals.passed,
      totals.failed,
      totals.skipped,
      totals.manual,
      totals.total,
      "failures.md",
    ]);
  }

  const summary = aggregate.totals;
  rows.push(["SUMMARY", summary.passed, summary.failed, summary.skipped, summary.manual, summary.total, "overview.md"]);

  return { title: "report", relativePath: "report.md", values: rows };
}

function appendGroupRows(rows: Array<Array<string | number>>, section: string, groups: Record<string, Totals>): void {
  for (const [name, totals] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
    rows.push([
      section,
      name,
      `passed ${totals.passed} · failed ${totals.failed} · skipped ${totals.skipped} · manual ${totals.manual} · total ${totals.total} (${passRate(totals)}%)`,
    ]);
  }
}

function scenarioRow(result: ScenarioResult): Array<string | number> {
  const { meta } = result;
  const e2e = isE2eResult(result);

  const rmeta = meta as unknown as Record<string, unknown>;
  const refs = rmeta.refs as Array<string> | undefined;
  const rawScenario =
    typeof rmeta.scenario === "string" ? rmeta.scenario : (result as unknown as Record<string, unknown>).scenario;

  const scenarioText =
    typeof rawScenario === "string"
      ? (rawScenario as string).replace(/<br\s*\/?>/gi, "\n")
      : Array.isArray(rawScenario)
        ? rawScenario.join("\n")
        : "—";

  let tagsStr = "—";
  if (e2e) {
    tagsStr = tagsWithoutFlow(meta.tags, refs);
  } else {
    const combined = [...(meta.tags ?? []), ...(refs ?? []).map((r: string) => `ref:${r}`)];
    if (combined.length > 0) tagsStr = combined.join(", ");
  }

  return [
    statusGlyph(result.status),
    meta.id,
    meta.type,
    e2e ? flowLabelForE2e(meta) : meta.category,
    meta.method,
    tagsStr,
    result.runner,
    formatDuration(result),
    meta.title,
    scenarioText,
    truncateError(result.error),
  ];
}

function e2eScenarioRow(result: ScenarioResult): Array<string | number> {
  const base = scenarioRow(result);
  const expectText = (result.meta as unknown as Record<string, unknown>).expect ?? "—";

  const row: Array<string | number> = [...base.slice(0, 9), String(expectText), base[9] ?? "—", base[10] ?? ""];
  return row;
}

function isE2eResult(result: ScenarioResult): boolean {
  return result.meta.method === "e2e" || result.runner === "playwright";
}

function flowLabelForE2e(meta: ScenarioResult["meta"]): string {
  const flowId = flowIdFromTags(meta.tags);
  if (!flowId) return meta.category;
  return shortenFlowId(flowId, meta.id);
}

function isFlowTag(tag: string): boolean {
  return /^@?flow:/i.test(tag.trim());
}

function flowIdFromTags(tags: Array<string> | undefined): string | undefined {
  const hit = (tags ?? []).find(isFlowTag);
  if (!hit) return undefined;
  return (
    hit
      .trim()
      .replace(/^@?flow:/i, "")
      .trim() || undefined
  );
}

export { flowIdFromTags, shortenFlowId, tagsWithoutFlow };

function shortenFlowId(flowId: string, testId?: string): string {
  const withoutFlow = flowId.replace(/_FLOW$/i, "").trim();
  if (!withoutFlow) return flowId;

  const flowParts = withoutFlow.split("_").filter(Boolean);
  const idParts = (testId ?? "").split("_").filter((part) => part.length > 0 && part !== "E2E" && !/^\d+$/.test(part));

  let shared = 0;
  while (shared < idParts.length && shared < flowParts.length && idParts[shared] === flowParts[shared]) {
    shared += 1;
  }

  if (shared > 0) {
    const rest = flowParts.slice(shared);
    if (rest.length > 0) return rest.join("_");
  }

  const areaStripped = withoutFlow.match(/^TEN_[A-Z0-9]{2,4}_(.+)$/i)?.[1];
  if (areaStripped) return areaStripped;
  const tenStripped = withoutFlow.match(/^TEN_(.+)$/i)?.[1];
  if (tenStripped) return tenStripped;
  return withoutFlow;
}

function tagsWithoutFlow(tags: Array<string> | undefined, refs: Array<string> | undefined): string {
  const filtered = (tags ?? []).filter((tag) => !isFlowTag(tag));
  const allTags = [...filtered, ...(refs ?? []).map((r) => `ref:${r}`)];
  return allTags.length > 0 ? allTags.join(", ") : "—";
}

function statusGlyph(status: ScenarioResult["status"]): string {
  if (status === "passed") return "✅ passed";
  if (status === "failed") return "❌ failed";
  if (status === "skipped") return "⏭ skipped";
  return "🔵 manual";
}

function formatDuration(result: ScenarioResult): string {
  if (result.status === "manual") return "—";
  return `${Math.round(result.durationMs)}ms`;
}

function truncateError(error: string | undefined, max = 240): string {
  if (!error) return "";
  const oneLine = error.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

function passRate(totals: Totals): number {
  return totals.total === 0 ? 0 : Math.round((totals.passed / totals.total) * 1000) / 10;
}

function sortResults(results: Array<ScenarioResult>): Array<ScenarioResult> {
  return sortResultsBySourceOrder(results);
}

function formatRunLabel(runAt: string): string {
  const d = new Date(runAt);
  if (Number.isNaN(d.getTime())) return runAt;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}${pad(d.getUTCMinutes())} UTC`;
}
