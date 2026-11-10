import assert from "node:assert/strict";
import { test } from "node:test";
import { featureFilePatterns, missingSelectedIds, resolveSelection, selectionPattern } from "./run-selection.mjs";

const features = [
  { key: "a:1", id: "TEN_EX_E2E_001", file: "a.feature", availability: "unknown" },
  { key: "a:2", id: "TEN_EX_E2E_002", file: "a.feature", availability: "unknown" },
  { key: "b:1", id: "TEN_EX_E2E_003", file: "b.feature", availability: "unknown" },
];
const catalog = features.map((item, index) => ({ ...item, category: index === 1 ? "Edit" : "List" }));

test("selects a whole feature or category from server catalogs", () => {
  assert.deepEqual(resolveSelection({ kind: "feature", file: "a.feature" }, features, catalog).ids, [
    "TEN_EX_E2E_001",
    "TEN_EX_E2E_002",
  ]);
  assert.deepEqual(resolveSelection({ kind: "category", file: "a.feature", category: "List" }, features, catalog).ids, [
    "TEN_EX_E2E_001",
  ]);
  assert.deepEqual(resolveSelection({ scenarioId: "TEN_EX_E2E_003" }, features, catalog).ids, ["TEN_EX_E2E_003"]);
});

test("rejects empty, ambiguous and unavailable selections", () => {
  assert.throws(() => resolveSelection({ kind: "feature", file: "unknown.feature" }, features, catalog));
  assert.throws(() =>
    resolveSelection(
      { kind: "feature", file: "a.feature" },
      [...features, { ...features[0], key: "duplicate" }],
      catalog,
    ),
  );
  assert.throws(() =>
    resolveSelection({ kind: "category", file: "a.feature", category: "List" }, features, [
      { ...catalog[0], availability: "unavailable" },
    ]),
  );
});

test("matches exact IDs and detects uncollected scenarios", () => {
  const ids = ["TEN_EX_E2E_001", "TEN_EX_E2E_002"];
  const pattern = new RegExp(selectionPattern(ids));
  assert.equal(pattern.test("TEN_EX_E2E_001"), true);
  assert.equal(pattern.test("@TEN_EX_E2E_001"), true);
  assert.equal(pattern.test("ref:TEN_EX_E2E_001"), false);
  assert.equal(pattern.test("@TEN_EX_E2E_0010"), false);
  assert.deepEqual(missingSelectedIds(ids, [{ suites: [{ specs: [{ tags: ["@TEN_EX_E2E_001"] }] }] }]), [
    "TEN_EX_E2E_002",
  ]);
});

test("limits Playwright collection to the resolved feature and escapes regex characters", () => {
  const resolved = resolveSelection({ scenarioId: "TEN_EX_E2E_003" }, features, catalog);
  assert.deepEqual(resolved.files, ["b.feature"]);
  const [pattern] = featureFilePatterns(["folder/a+b.feature"]);
  assert.match(".features-gen/bdd-chromium/tests/bdd/features/folder/a+b.feature.spec.js", new RegExp(pattern));
  assert.doesNotMatch(".features-gen/bdd-chromium/tests/bdd/features/folder/aaab.feature.spec.js", new RegExp(pattern));
});
