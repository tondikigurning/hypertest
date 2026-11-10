import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { automationCatalog, parseFeature, scenarioCatalog } from "./scenario-catalog.mjs";

test("builds Automation metadata directly from feature files", () => {
  const root = mkdtempSync(join(tmpdir(), "automation-source-catalog-"));
  try {
    writeFileSync(
      join(root, "sample.feature"),
      `Feature: Sample
  @TEN_EXA_LST_E2E_001 @flow:TEN_EXA_LIST_ITEMS_FLOW @type:negative @expect:Expected%20result @regression
  Scenario: Example
    Then it works
`,
    );
    const [item] = automationCatalog(root);
    assert.equal(item.category, "List Items");
    assert.equal(item.type, "negative");
    assert.equal(item.expect, "Expected result");
    assert.deepEqual(item.catalogTags, ["regression"]);
    assert.equal(item.docFile, "sample.md");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("preserves backgrounds, outline examples and their tags without leaking tags", () => {
  const scenarios = parseFeature(
    `Feature: Sample
  Background: Common
    Given a shared setup
  @TEN_EXA_LST_E2E_001 @flow:TEN_EXA_LIST_FLOW
  Scenario Outline: Example
    When a value <value> is entered
    @example-tag
    Examples: Values
      | value |
      | first |
  @TEN_EXA_LST_E2E_002
  Scenario: Next
    Then it works`,
    "sample/example.feature",
  );
  assert.equal(scenarios.length, 2);
  assert.deepEqual(scenarios[0].background, ["Given a shared setup"]);
  assert.deepEqual(scenarios[0].steps, [
    "When a value <value> is entered",
    "@example-tag",
    "Examples: Values",
    "| value |",
    "| first |",
  ]);
  assert.equal(scenarios[1].id, "TEN_EXA_LST_E2E_002");
  assert.ok(!scenarios[1].tags.includes("@example-tag"));
});

test("preserves multiline step arguments as text", () => {
  const [scenario] = parseFeature(
    `Feature: Sample
  Scenario: Data
    * submit a payload
      """json
      { "value": "hello" }
      """
    Then it succeeds`,
    "sample/example.feature",
  );
  assert.deepEqual(scenario.steps, [
    "* submit a payload",
    '"""json',
    '{ "value": "hello" }',
    '"""',
    "Then it succeeds",
  ]);
});

test("discovery blocks ambiguous IDs and outlines without examples without claiming runnable status", () => {
  const root = mkdtempSync(join(tmpdir(), "automation-catalog-"));
  try {
    mkdirSync(join(root, "sample"));
    writeFileSync(
      join(root, "sample", "sample.feature"),
      `Feature: Sample
  @TEN_EXA_LST_E2E_001
  Scenario: First
    Then it works
  @TEN_EXA_LST_E2E_001
  Scenario: Duplicate
    Then it works
  Scenario: Missing ID
    Then it works
  @TEN_EXA_LST_E2E_002
  Scenario Outline: No examples
    Then <value> works
  @TEN_EXA_LST_E2E_003
  Scenario: Needs runner verification
    Then it works
`,
    );
    const scenarios = scenarioCatalog(root);
    assert.deepEqual(
      scenarios.map((s) => s.availability),
      ["unavailable", "unavailable", "unavailable", "unavailable", "unknown"],
    );
    assert.match(scenarios[0].availabilityReasons[0], /more than once/);
    assert.match(scenarios[2].availabilityReasons[0], /stable scenario ID/);
    assert.match(scenarios[3].availabilityReasons[0], /no examples/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
