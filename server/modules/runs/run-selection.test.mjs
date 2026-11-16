import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { automationCatalog, scenarioCatalog } from "../catalog/scenario-catalog.mjs";
import { featureFilePatterns, resolveSelection } from "./run-selection.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "automation-groups-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = [
    ["case-management/cases.feature", "TEN_CAS_LST_E2E_001"],
    ["case-management/cases/integration/work-orders.feature", "TEN_CAS_INT_E2E_001"],
    ["case-management/cases/integration/platform.feature", "TEN_CAS_INT_E2E_002"],
    ["case-management/cases-archive.feature", "TEN_ARC_LST_E2E_001"],
    ["workforce-management/work-orders.feature", "TEN_WKO_LST_E2E_001"],
  ];
  for (const [file, id] of files) {
    await mkdir(join(root, file, ".."), { recursive: true });
    await writeFile(join(root, file), `Feature: Test\n  @${id}\n  Scenario: Business outcome\n    Then it succeeds\n`);
  }
  return { root, features: scenarioCatalog(root), catalog: automationCatalog(root) };
}

test("resolves nested groups from server sources and keeps sibling menus outside the selection", async (t) => {
  const { features, catalog } = await fixture(t);
  const parent = resolveSelection({ kind: "group", path: "case-management/cases" }, features, catalog);
  assert.equal(parent.ids.length, 3);
  assert.ok(!parent.ids.includes("TEN_ARC_LST_E2E_001"));
  const child = resolveSelection({ kind: "group", path: "case-management/cases/integration" }, features, catalog);
  assert.equal(child.ids.length, 2);
  assert.ok(child.files.every((file) => file.startsWith("case-management/cases/integration/")));
  const pattern = new RegExp(featureFilePatterns(child.files)[0]);
  assert.ok(pattern.test(`tests/bdd/features/${child.files[0]}.spec.js`));
  assert.ok(!pattern.test(`tests/bdd/features/${child.files[0]}-extra.spec.js`));
  const single = resolveSelection({ kind: "feature", file: child.files[0] }, features, catalog);
  assert.equal(single.ids.length, 1);
});

test("rejects stale catalogs, missing groups, invalid paths and ambiguous identities", async (t) => {
  const { features, catalog } = await fixture(t);
  const selection = { kind: "group", path: "case-management/cases" };
  assert.throws(() => resolveSelection(selection, features, catalog.slice(1)), /Refresh the catalog/);
  const memberIndexes = catalog.flatMap((item, index) =>
    item.file.startsWith("case-management/cases/") ? [index] : [],
  );
  const duplicateRows = [...catalog];
  duplicateRows[memberIndexes[1]] = duplicateRows[memberIndexes[0]];
  assert.throws(() => resolveSelection(selection, features, duplicateRows), /Refresh the catalog/);
  assert.throws(
    () =>
      resolveSelection(
        selection,
        features,
        catalog.map((item) => ({ ...item, key: `${item.key}-stale` })),
      ),
    /Refresh the catalog/,
  );
  const duplicate = { ...features[0], file: "other/menu.feature", key: "other/menu.feature:3" };
  assert.throws(() => resolveSelection(selection, [...features, duplicate], catalog), /ambiguous scenario IDs/);
  const unavailable = catalog.map((item) => ({ ...item, availability: "unavailable" }));
  assert.throws(() => resolveSelection(selection, features, unavailable), /Refresh the catalog/);
  for (const path of [
    "",
    "case-management",
    "case-management/../cases",
    "case-management//cases",
    "case-management\\cases",
    "/case-management/cases",
    "case-management/cases.feature",
  ]) {
    assert.throws(() => resolveSelection({ kind: "group", path }, features, catalog), /Invalid run selection/);
  }
  assert.throws(
    () => resolveSelection({ kind: "group", path: "case-management/missing" }, features, catalog),
    /missing or ambiguous/,
  );
});
