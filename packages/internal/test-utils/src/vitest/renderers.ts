import type { ScenarioMeta, ScenarioResult } from "../schema/types";

export interface CatalogRow {
  id: string;
  status: string;
  lastRun: string;
  duration: string;
  evidence?: string;
  type: ScenarioMeta["type"];
  category: string;
  method: ScenarioMeta["method"];
  tags: string;
  title: string;
  expect: string;
  scenario: string;
}

function escapeCell(value: string): string {
  const brToken = "__HYP_BR__";
  return value
    .replace(/<br\s*\/?\s*>/gi, brToken)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "&#124;")
    .replace(new RegExp(brToken, "g"), "<br>");
}

/**
 * Renders ScenarioResult[] as a raw JSON array.
 */
export function toJSON(results: Array<ScenarioResult>): string {
  return JSON.stringify(results, null, 2);
}

export type CatalogType = "e2e" | "unit";

const NBSP = "\u00A0";
const NON_BREAKING_HYPHEN = "\u2011";
const LAST_RUN_HEADER = `Last${NBSP}Run`;
const E2E_COLUMNS = [
  "ID",
  "Type",
  "Category",
  "Method",
  "Tags",
  "Title",
  "Expect",
  "Scenario",
  "Status",
  LAST_RUN_HEADER,
  "Duration",
  "Evidence",
];
const UNIT_COLUMNS = [
  "ID",
  "Type",
  "Method",
  "Tags",
  "Title",
  "Expect",
  "Scenario",
  "Status",
  LAST_RUN_HEADER,
  "Duration",
];
const ID_PATTERN = /^[A-Z]{2,4}_[A-Z0-9_]+_(UT|IT|E2E|MAN|INT)_\d{3,4}$/;

function formatLastRun(executedAt: string): string {
  const date = new Date(executedAt);
  if (Number.isNaN(date.getTime())) return executedAt;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${NON_BREAKING_HYPHEN}${values.month}${NON_BREAKING_HYPHEN}${values.day}${NBSP}${values.hour}:${values.minute}`;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMethod(method: string): string {
  return method === "e2e" ? "E2E" : capitalize(method);
}

function formatTags(tags: string): string {
  if (tags === "—") return tags;
  return tags.split(", ").map(capitalize).join(", ");
}

/**
 * Derives the readable flow name from a `flow:` tag: strips the `_FLOW` suffix and the
 * `<APP>_<CODE>_` prefix, then title-cases each word (`TEN_PRF_LIST_FLOW` → `List`,
 * `TEN_PRF_FILTER_TOGGLE_FLOW` → `Filter Toggle`, `TEN_DASHBOARD_FLOW` → `Dashboard`).
 */
function flowNameFromTags(tags: Array<string>): string | undefined {
  const flow = tags.find((tag) => tag.startsWith("flow:"))?.slice("flow:".length);
  if (!flow) return undefined;

  const name = flow.replace(/_FLOW$/, "");
  const segments = name.split("_");
  const action = segments.length > 2 ? segments.slice(2) : segments.length === 2 ? segments.slice(1) : segments;
  return action
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Builds a catalog row. Catalog-only stubs (no executedAt, e.g. generated from .feature files
 * without a run) keep the status, last run and duration of the previously committed row, so
 * generating the catalog never overwrites a recorded execution.
 *
 * E2E catalogs show the flow name as Category (flow tags are not repeated in Tags); unit
 * catalogs have no Category column.
 */
function scenarioToCatalogRow(
  result: ScenarioResult,
  previous: CatalogRow | undefined,
  catalogType: CatalogType,
): CatalogRow {
  const isE2E = catalogType === "e2e";
  const allTags = result.meta.tags ?? [];
  const visibleTags = isE2E ? allTags.filter((tag) => !tag.startsWith("flow:")) : allTags;
  const tags = visibleTags.length ? visibleTags.join(", ") : "—";
  const category = isE2E ? (flowNameFromTags(allTags) ?? result.meta.category) : result.meta.category;
  const refs = result.meta.refs?.length ? result.meta.refs.join(", ") : "";
  const title = refs ? `${result.meta.title} _(${refs})_` : result.meta.title;
  const scenario = result.meta.scenario ? result.meta.scenario.replace(/\n/g, "<br>") : "—";
  const expectValue = result.meta.expect?.trim() || (result.meta.method === "e2e" ? result.meta.title : "—");
  const status = result.status === "manual" ? "manual" : result.executedAt ? result.status : (previous?.status ?? "—");
  const lastRun = result.executedAt ? formatLastRun(result.executedAt) : (previous?.lastRun ?? "—");
  const duration =
    result.status === "manual"
      ? "—"
      : result.executedAt
        ? formatDuration(result.durationMs)
        : (previous?.duration ?? "—");
  return {
    id: result.meta.id,
    status,
    lastRun,
    duration,
    // Scenario evidence folders are stable across reruns. Keep their link while a
    // rerun is uploading (or if it fails); replace it only after a successful upload.
    evidence: result.evidenceUrl ? `[View evidence](${result.evidenceUrl})` : (previous?.evidence ?? "—"),
    type: result.meta.type,
    category,
    method: result.meta.method,
    tags,
    title,
    expect: expectValue,
    scenario,
  };
}

function formatType(type: string): string {
  return capitalize(type).replace(/-/g, NON_BREAKING_HYPHEN);
}

/** Capitalizes the outcome and lists any remaining assertions on their own line. */
function formatExpect(expect: string): string {
  return capitalize(expect).replace(/;\s+/g, ";<br>");
}

function catalogRowToCells(row: CatalogRow, catalogType: CatalogType): Array<string> {
  return [
    row.id,
    formatType(row.type),
    ...(catalogType === "e2e" ? [row.category] : []),
    formatMethod(row.method),
    formatTags(row.tags),
    row.title,
    formatExpect(row.expect),
    row.scenario,
    capitalize(row.status),
    row.lastRun,
    row.duration,
    ...(catalogType === "e2e" ? [row.evidence ?? "—"] : []),
  ].map(escapeCell);
}

function longestLine(cell: string): number {
  return Math.max(...cell.split("<br>").map((line) => line.length));
}

/**
 * Renders the catalog table. The separator row is sized from the longest line of each column
 * (not the whole multi-line cell), so Title/Scenario get proportional width while Expect,
 * whose assertions are split with `<br>`, does not dominate the table.
 */
function renderCatalogTable(rows: Array<Array<string>>, catalogType: CatalogType): string {
  const header = (catalogType === "e2e" ? E2E_COLUMNS : UNIT_COLUMNS).map(escapeCell);
  const allRows = [header, ...rows];
  const widths = header.map((_, index) => Math.max(3, ...allRows.map((row) => longestLine(row[index] ?? ""))));
  const formatRow = (cells: Array<string>) => `| ${cells.join(" | ")} |`;
  const separator = `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`;

  return [formatRow(header), separator, ...rows.map(formatRow)].join("\n");
}

interface CatalogLayout {
  id: number;
  type: number;
  category: number;
  method: number;
  tags: number;
  title: number;
  expect: number;
  scenario: number;
  status: number;
  lastRun: number;
  lastRunIsUtc: boolean;
  duration: number;
  evidence: number;
}

function splitTableRow(line: string): Array<string> {
  const parts = line.split("|");
  if (parts.length > 0 && parts[0].trim() === "") parts.shift();
  if (parts.length > 0 && parts[parts.length - 1].trim() === "") parts.pop();
  return parts.map((cell) => cell.trim());
}

function catalogLayoutFromHeader(cells: Array<string>): CatalogLayout {
  const normalized = cells.map((cell) => cell.split(NBSP).join(" "));
  const indexOf = (name: string) => normalized.indexOf(name);
  return {
    id: indexOf("ID"),
    type: indexOf("Type"),
    category: indexOf("Category"),
    method: indexOf("Method"),
    tags: indexOf("Tags"),
    title: indexOf("Title"),
    expect: indexOf("Expect"),
    scenario: indexOf("Scenario"),
    status: indexOf("Status"),
    lastRun: normalized.findIndex((cell) => cell.startsWith("Last Run")),
    lastRunIsUtc: normalized.some((cell) => cell === "Last Run (UTC)"),
    duration: indexOf("Duration"),
    evidence: indexOf("Evidence"),
  };
}

function cellAt(cells: Array<string>, index: number): string | undefined {
  if (index < 0 || index >= cells.length) return undefined;
  const value = cells[index];
  return value && value.length > 0 ? value : undefined;
}

function normalizeType(value: string): string {
  return value.split(NON_BREAKING_HYPHEN).join("-").toLowerCase();
}

/**
 * Parses committed catalog markdown table rows (unit + e2e). Columns are located from the
 * header, so catalogs with or without Category, status columns before or after the scenario,
 * and older handwritten layouts all read correctly.
 */
export function parseCatalogMarkdown(content: string): Array<CatalogRow> {
  const rows: Array<CatalogRow> = [];
  let layout: CatalogLayout | null = null;

  for (const line of content.split("\n")) {
    if (!line.startsWith("|")) continue;

    const cells = splitTableRow(line);
    if (cells[0] === "ID") {
      layout = catalogLayoutFromHeader(cells);
      continue;
    }
    if (!layout) continue;
    if (line.includes("| -- |")) continue;

    const id = cellAt(cells, layout.id);
    if (!id || !ID_PATTERN.test(id)) continue;

    const method = (cellAt(cells, layout.method) ?? "").toLowerCase() as ScenarioMeta["method"];
    const title = cellAt(cells, layout.title) ?? "";
    const expectValue = cellAt(cells, layout.expect) ?? (method === "e2e" ? title : "—");
    rows.push({
      id,
      status: (cellAt(cells, layout.status) ?? "—").toLowerCase(),
      lastRun: (() => {
        const value = cellAt(cells, layout.lastRun) ?? "—";
        if (!layout.lastRunIsUtc || value === "—") return value;
        const normalized = value.replace(/[\u2010-\u2015]/g, "-").replace(/\u00a0/g, " ");
        return formatLastRun(normalized.replace(" ", "T") + "Z");
      })(),
      duration: cellAt(cells, layout.duration) ?? "—",
      evidence: cellAt(cells, layout.evidence) ?? "—",
      type: normalizeType(cellAt(cells, layout.type) ?? "positive") as ScenarioMeta["type"],
      category: cellAt(cells, layout.category) ?? "",
      method,
      tags: (cellAt(cells, layout.tags) ?? "—").toLowerCase(),
      title,
      expect: expectValue,
      scenario: cellAt(cells, layout.scenario) ?? "—",
    });
  }

  return rows;
}

/**
 * Merges incoming e2e scenario rows into an existing catalog, preserving unit/integration/manual rows.
 */
export function mergeMarkdownCatalog(
  existingContent: string | null,
  incomingResults: Array<ScenarioResult>,
  componentName: string,
  catalogType: CatalogType,
): string {
  const existingRows = existingContent ? parseCatalogMarkdown(existingContent) : [];
  const previousById = new Map(existingRows.map((row) => [row.id, row]));
  const incomingRows = incomingResults.map((result) =>
    scenarioToCatalogRow(result, previousById.get(result.meta.id), catalogType),
  );

  // E2E rows are emitted in incoming (feature-file) order so the catalog mirrors the
  // .feature source sequence. Previously-generated e2e rows are dropped and replaced by
  // the incoming set (this also removes renumbered/removed ids). Unit/integration/manual
  // rows are preserved and appended after the e2e block.
  const preserved = existingRows.filter((row) => row.method !== "e2e");
  const byId = new Map<string, CatalogRow>();
  const order: Array<string> = [];

  for (const row of incomingRows) {
    byId.set(row.id, row);
    order.push(row.id);
  }
  for (const row of preserved) {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
      order.push(row.id);
    }
  }

  const rows = order.map((id) => catalogRowToCells(byId.get(id)!, catalogType));

  return [
    `# ${componentName} — Scenario Catalog`,
    "",
    "> Generated from tests. Do not edit by hand.",
    "",
    renderCatalogTable(rows, catalogType),
    "",
  ].join("\n");
}

/**
 * Renders the committed per-component catalog: what we test, plus the status and execution
 * time of the latest run. Sorted by ID. Used for committed per-component files (class A artifacts).
 */
export function toMarkdownCatalog(
  results: Array<ScenarioResult>,
  componentName: string,
  catalogType: CatalogType,
): string {
  const sorted = [...results].sort((a, b) => a.meta.id.localeCompare(b.meta.id));
  const rows = sorted.map((r) => catalogRowToCells(scenarioToCatalogRow(r, undefined, catalogType), catalogType));

  return [
    `# ${componentName} — Scenario Catalog`,
    "",
    "> Generated from tests. Do not edit by hand.",
    "",
    renderCatalogTable(rows, catalogType),
    "",
  ].join("\n");
}

/**
 * Renders a results report with status, duration, and runner.
 * Used for ephemeral per-run output (class C / dated aggregate class B).
 */
export function toMarkdownResults(results: Array<ScenarioResult>, title: string, runAt?: Date): string {
  const sorted = [...results].sort((a, b) => a.meta.id.localeCompare(b.meta.id));

  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const manual = results.filter((r) => r.status === "manual").length;

  const statusIcon = (s: string) => {
    if (s === "passed") return "✅";
    if (s === "failed") return "❌";
    if (s === "skipped") return "⏭";
    if (s === "manual") return "🔵";
    return "❓";
  };

  const rows = sorted
    .map((r) => {
      const duration = r.status === "manual" ? "—" : `${r.durationMs}ms`;
      const tags = r.meta.tags?.length ? r.meta.tags.join(", ") : "—";
      const expectValue = r.meta.expect?.trim() || (r.meta.method === "e2e" ? r.meta.title : "—");
      const scenarioValue = r.meta.scenario ? r.meta.scenario.replace(/\n/g, "<br>") : "—";
      return `| ${statusIcon(r.status)} | ${escapeCell(r.meta.id)} | ${escapeCell(r.meta.type)} | ${escapeCell(r.meta.category)} | ${escapeCell(r.meta.method)} | ${escapeCell(tags)} | ${escapeCell(r.meta.title)} | ${escapeCell(expectValue)} | ${escapeCell(scenarioValue)} | ${escapeCell(r.runner)} | ${escapeCell(duration)} |`;
    })
    .join("\n");

  const lines: Array<string> = [`# ${title} — Test Results`, ""];

  if (runAt) {
    lines.push(`**Run:** ${runAt.toISOString()}`, "");
  }

  lines.push(
    `**Summary:** ${passed} passed · ${failed} failed · ${skipped} skipped · ${manual} manual (${results.length} total)`,
    "",
    "| | ID | Type | Category | Method | Tags | Title | Expect | Scenario | Runner | Duration |",
    "| - | -- | ---- | -------- | ------ | ---- | ----- | ------ | -------- | ------ | -------- |",
    rows,
    "",
  );

  if (failed > 0) {
    lines.push("## Failures", "");
    for (const r of sorted.filter((r) => r.status === "failed")) {
      lines.push(`### ${r.meta.id} — ${r.meta.title}`, "");
      if (r.error) {
        lines.push("```", r.error, "```", "");
      }
    }
  }

  return lines.join("\n");
}
