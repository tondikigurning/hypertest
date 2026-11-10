import { describe, expect, it } from "vitest";
import { mergeMarkdownCatalog, parseCatalogMarkdown, toMarkdownCatalog } from "./renderers";
import type { ScenarioResult } from "../schema/types";

const existingCatalog = `# pipeline-renderer — Scenario Catalog

> Generated from tests. Do not edit by hand.

| ID | Type | Category | Method | Tags | Expect | Scenario | Title |
| -- | ---- | -------- | ------ | ---- | ------ | -------- | ----- |
| DV_PIP_UT_001 | positive | Pipeline Tabs | unit | — | Default tab is active | — | Default tab is active |
`;

const e2eResult: ScenarioResult = {
  meta: {
    id: "DV_PIP_E2E_001",
    title: "Selecting a pipeline tab activates it",
    expect: "Selecting a pipeline tab should activate it",
    type: "ui-interaction",
    category: "Pipeline Renderer — Component",
    method: "e2e",
    scenario: "Given the user is on the list\nWhen the user selects a tab\nThen the selected tab is active",
    tags: ["smoke", "flow:DV_PIP_TAB_FLOW"],
  },
  runner: "playwright",
  status: "passed",
  durationMs: 1000,
  file: "apps/tenants/tests/bdd/features/_components/pipeline.feature",
};

const unitResult: ScenarioResult = {
  meta: {
    id: "DV_PIP_UT_001",
    title: "Default tab is active",
    type: "positive",
    category: "Pipeline Tabs",
    method: "unit",
  },
  runner: "vitest",
  status: "passed",
  durationMs: 12,
  executedAt: "2026-10-26T09:30:45.000Z",
  file: "packages/dataview/src/pipeline-renderer/pipeline-renderer.test.ts",
};

describe("catalog status and last run", () => {
  it("renders status, execution date and duration for executed scenarios", () => {
    const executed: ScenarioResult = {
      ...e2eResult,
      status: "failed",
      executedAt: "2026-10-26T09:30:45.000Z",
      durationMs: 2670,
    };
    const merged = mergeMarkdownCatalog(null, [executed], "pipeline-renderer", "e2e");
    const row = parseCatalogMarkdown(merged)[0];

    expect(row?.status).toBe("failed");
    expect(row?.lastRun).toBe("2026\u201110\u201126\u00A016:30");
    expect(row?.duration).toBe("2.7s");
  });

  it("keeps the previous status, last run and duration when a catalog-only stub has no execution", () => {
    const executed: ScenarioResult = {
      ...e2eResult,
      status: "passed",
      executedAt: "2026-10-26T09:30:45.000Z",
      durationMs: 850,
    };
    const withRun = mergeMarkdownCatalog(null, [executed], "pipeline-renderer", "e2e");
    const stub: ScenarioResult = { ...e2eResult, status: "skipped" };
    const regenerated = mergeMarkdownCatalog(withRun, [stub], "pipeline-renderer", "e2e");
    const row = parseCatalogMarkdown(regenerated)[0];

    expect(row?.status).toBe("passed");
    expect(row?.lastRun).toBe("2026\u201110\u201126\u00A016:30");
    expect(row?.duration).toBe("850ms");
  });

  it("marks manual scenarios as manual without a run date or duration", () => {
    const manual: ScenarioResult = {
      ...e2eResult,
      meta: { ...e2eResult.meta, id: "DV_PIP_MAN_001", method: "manual", reason: "Visual check" },
      status: "manual",
    };
    const merged = mergeMarkdownCatalog(null, [manual], "pipeline-renderer", "e2e");
    const row = parseCatalogMarkdown(merged)[0];

    expect(row?.status).toBe("manual");
    expect(row?.lastRun).toBe("—");
    expect(row?.duration).toBe("—");
  });

  it("reads catalogs written before the duration column", () => {
    const legacy = `# pipeline-renderer — Scenario Catalog

> Generated from tests. Do not edit by hand.

| ID | Status | Last Run (UTC) | Type | Category | Method | Tags | Title | Expect | Scenario |
| -- | ------ | -------------- | ---- | -------- | ------ | ---- | ----- | ------ | -------- |
| DV_PIP_E2E_001 | passed | 2026-10-26 09:30 | positive | Pipeline Tabs | e2e | smoke | Tab test | tab is active | Given a tab |
`;
    const row = parseCatalogMarkdown(legacy)[0];

    expect(row?.status).toBe("passed");
    expect(row?.duration).toBe("—");
    expect(row?.title).toBe("Tab test");
  });

  it("reads catalogs that keep status columns before the scenario", () => {
    const legacy = `# pipeline-renderer — Scenario Catalog

> Generated from tests. Do not edit by hand.

| ID | Status | Last Run (UTC) | Duration | Type | Category | Method | Tags | Title | Expect | Scenario |
| -- | ------ | -------------- | -------- | ---- | -------- | ------ | ---- | ----- | ------ | -------- |
| DV_PIP_E2E_001 | passed | 2026-10-26 09:30 | 2.0s | positive | Pipeline Tabs | e2e | smoke | Tab test | tab is active | Given a tab |
`;
    const row = parseCatalogMarkdown(legacy)[0];

    expect(row?.status).toBe("passed");
    expect(row?.lastRun).toBe("2026\u201110\u201126\u00A016:30");
    expect(row?.duration).toBe("2.0s");
    expect(row?.title).toBe("Tab test");
  });

  it("renders status, last run and duration after the scenario column", () => {
    const executed: ScenarioResult = {
      ...e2eResult,
      status: "passed",
      executedAt: "2026-10-26T09:30:45.000Z",
      durationMs: 1500,
    };
    const merged = mergeMarkdownCatalog(null, [executed], "pipeline-renderer", "e2e");
    const header = merged.split("\n").find((line) => line.startsWith("| ID")) ?? "";
    const headerCells = header.split("|").map((cell) => cell.trim()).filter(Boolean);
    const rowCells =
      merged
        .split("\n")
        .find((line) => line.startsWith("| DV_PIP_E2E_001"))
        ?.split("|")
        .map((cell) => cell.trim())
        .filter(Boolean) ?? [];

    expect(headerCells.indexOf("Status")).toBeGreaterThan(headerCells.indexOf("Scenario"));
    expect(rowCells[1]).toBe("Ui\u2011interaction");
    expect(rowCells[3]).toBe("E2E");
    expect(rowCells[4]).toBe("Smoke");
    expect(rowCells[8]).toBe("Passed");
    expect(rowCells[9]).toBe("2026\u201110\u201126\u00A016:30");
    expect(rowCells[10]).toBe("1.5s");

    const row = parseCatalogMarkdown(merged)[0];
    expect(row?.type).toBe("ui-interaction");
    expect(row?.status).toBe("passed");
    expect(row?.lastRun).toBe("2026\u201110\u201126\u00A016:30");
    expect(row?.duration).toBe("1.5s");
    expect(row?.scenario).toBe(e2eResult.meta.scenario?.replace(/\n/g, "<br>"));
  });

  it("sizes Title and Scenario columns from their longest lines", () => {
    const merged = mergeMarkdownCatalog(null, [e2eResult], "pipeline-renderer", "e2e");
    const lines = merged.split("\n").filter((line) => line.startsWith("|"));
    const headerCells = (lines[0] ?? "").split("|").map((cell) => cell.trim()).filter(Boolean);
    const separatorCells = (lines[1] ?? "").split("|").map((cell) => cell.trim()).filter(Boolean);
    const titleWidth = separatorCells[headerCells.indexOf("Title")]?.length ?? 0;
    const scenarioWidth = separatorCells[headerCells.indexOf("Scenario")]?.length ?? 0;
    const scenarioLines = (e2eResult.meta.scenario ?? "").replace(/\n/g, "<br>").split("<br>");
    const longestScenarioLine = Math.max(...scenarioLines.map((line) => line.length));

    expect(titleWidth).toBeGreaterThanOrEqual(e2eResult.meta.title.length);
    expect(scenarioWidth).toBeGreaterThanOrEqual(longestScenarioLine);
  });
});

describe("mergeMarkdownCatalog", () => {
  it("updates executed rows in a partial feature run and keeps all other latest results", () => {
    const first: ScenarioResult = {
      ...e2eResult,
      meta: { ...e2eResult.meta, id: "DV_PIP_E2E_001", title: "First scenario" },
      status: "passed",
      executedAt: "2026-10-26T09:30:45.000Z",
      durationMs: 850,
      evidenceUrl: "https://drive.google.com/drive/folders/first",
    };
    const second: ScenarioResult = {
      ...e2eResult,
      meta: { ...e2eResult.meta, id: "DV_PIP_E2E_002", title: "Second scenario" },
      status: "passed",
      executedAt: "2026-10-26T09:30:45.000Z",
      durationMs: 900,
    };
    const existing = mergeMarkdownCatalog(null, [first, second], "pipeline-renderer", "e2e");
    const updatedSecond: ScenarioResult = {
      ...second,
      status: "failed",
      executedAt: "2026-11-02T09:30:45.000Z",
      durationMs: 1200,
    };

    const firstStub: ScenarioResult = { ...first, status: "skipped", executedAt: undefined };
    const merged = mergeMarkdownCatalog(existing, [firstStub, updatedSecond], "pipeline-renderer", "e2e");
    const rows = parseCatalogMarkdown(merged);

    expect(rows.find((row) => row.id === first.meta.id)).toMatchObject({
      status: "passed",
      lastRun: "2026\u201110\u201126\u00A016:30",
      evidence: "[View evidence](https://drive.google.com/drive/folders/first)",
    });
    expect(rows.find((row) => row.id === second.meta.id)).toMatchObject({
      status: "failed",
      lastRun: "2026\u201111\u201102\u00A016:30",
    });
  });

  it("preserves unit rows and appends e2e rows", () => {
    const merged = mergeMarkdownCatalog(existingCatalog, [e2eResult], "pipeline-renderer", "e2e");
    const rows = parseCatalogMarkdown(merged);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe("DV_PIP_E2E_001");
    expect(rows[0]?.method).toBe("e2e");
    expect(rows[1]?.id).toBe("DV_PIP_UT_001");
    expect(rows[1]?.method).toBe("unit");
  });

  it("replaces e2e rows with the same id on re-run", () => {
    const first = mergeMarkdownCatalog(existingCatalog, [e2eResult], "pipeline-renderer", "e2e");
    const updated: ScenarioResult = {
      ...e2eResult,
      meta: { ...e2eResult.meta, title: "Updated title" },
    };
    const second = mergeMarkdownCatalog(first, [updated], "pipeline-renderer", "e2e");
    const rows = parseCatalogMarkdown(second).filter((row) => row.method === "e2e");

    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Updated title");
  });

  it("drops stale e2e rows when ids are renumbered or removed", () => {
    const staleE2e: ScenarioResult = {
      ...e2eResult,
      meta: { ...e2eResult.meta, id: "DV_PIP_E2E_099", title: "Removed scenario" },
    };
    const withStale = mergeMarkdownCatalog(existingCatalog, [staleE2e], "pipeline-renderer", "e2e");
    const afterRenumber = mergeMarkdownCatalog(withStale, [e2eResult], "pipeline-renderer", "e2e");
    const e2eRows = parseCatalogMarkdown(afterRenumber).filter((row) => row.method === "e2e");

    expect(e2eRows).toHaveLength(1);
    expect(e2eRows[0]?.id).toBe("DV_PIP_E2E_001");
  });
});

describe("catalog columns by tier", () => {
  it("uses the flow name as Category and drops flow tags from Tags in e2e catalogs", () => {
    const merged = mergeMarkdownCatalog(null, [e2eResult], "pipeline-renderer", "e2e");
    const row = parseCatalogMarkdown(merged)[0];

    expect(row?.category).toBe("Tab");
    expect(row?.tags).toBe("smoke");
    expect(merged).not.toContain("flow:DV_PIP_TAB_FLOW");
  });

  it("title-cases each word of a multi-word flow name", () => {
    const toggle: ScenarioResult = {
      ...e2eResult,
      meta: { ...e2eResult.meta, tags: ["regression", "flow:TEN_PRF_FILTER_TOGGLE_FLOW"] },
    };
    const merged = mergeMarkdownCatalog(null, [toggle], "profanity", "e2e");
    const row = parseCatalogMarkdown(merged)[0];

    expect(row?.category).toBe("Filter Toggle");
    expect(row?.tags).toBe("regression");
  });

  it("keeps the flow name for flows without a module code", () => {
    const dashboard: ScenarioResult = {
      ...e2eResult,
      meta: { ...e2eResult.meta, tags: ["smoke", "flow:TEN_DASHBOARD_FLOW"] },
    };
    const merged = mergeMarkdownCatalog(null, [dashboard], "dashboard", "e2e");
    const row = parseCatalogMarkdown(merged)[0];

    expect(row?.category).toBe("Dashboard");
    expect(row?.tags).toBe("smoke");
  });

  it("omits the Category column in unit catalogs", () => {
    const catalog = toMarkdownCatalog([unitResult], "pipeline-renderer", "unit");
    const header = catalog.split("\n").find((line) => line.startsWith("| ID")) ?? "";
    const headerCells = header.split("|").map((cell) => cell.trim()).filter(Boolean);
    const rowCells =
      catalog
        .split("\n")
        .find((line) => line.startsWith("| DV_PIP_UT_001"))
        ?.split("|")
        .map((cell) => cell.trim())
        .filter(Boolean) ?? [];

    expect(headerCells).not.toContain("Category");
    expect(headerCells.slice(0, 4)).toEqual(["ID", "Type", "Method", "Tags"]);
    expect(rowCells[1]).toBe("Positive");
    expect(rowCells[2]).toBe("Unit");
    expect(rowCells[3]).toBe("—");

    const row = parseCatalogMarkdown(catalog)[0];
    expect(row?.category).toBe("");
    expect(row?.status).toBe("passed");
    expect(row?.duration).toBe("12ms");
  });

  it("still reads unit catalogs written with a Category column", () => {
    const row = parseCatalogMarkdown(existingCatalog)[0];

    expect(row?.category).toBe("Pipeline Tabs");
    expect(row?.title).toBe("Default tab is active");
  });
});
