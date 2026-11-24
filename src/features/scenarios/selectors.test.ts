import assert from "node:assert/strict";
import test from "node:test";
import { enrichScenario, parseFeature } from "../../../server/modules/catalog/scenario-catalog.mjs";
import { isMenuScope, scenarioPath, scenarioMenu } from "./navigation";
import { filterScenarios, findScenarioGroup, groupFlows, groupModules } from "./selectors";

function scenario(file: string, id: string) {
  const source = parseFeature(`Feature: Cases\n  @${id}\n  Scenario: A business outcome\n    Then the outcome is visible`, file)[0];
  return enrichScenario({ ...source, availability: "unknown", availabilityReasons: [] });
}

test("keeps product menus at one level and merges PRD-only menus without duplicating parents", () => {
  const scenarios = [
    scenario("case-management/cases/list.feature", "TEN_CAS_LST_E2E_001"),
    scenario("case-management/cases/integration/work-orders.feature", "TEN_CAS_INT_E2E_001"),
    scenario("case-management/cases/integration/platform/customer-sync.feature", "TEN_CAS_INT_E2E_002"),
    scenario("case-management/survey-template-manager.feature", "TEN_STM_LST_E2E_001"),
  ];
  const prds = [
    { module: "case-management", menu: "cases" },
    { module: "case-management", menu: "cases" },
    { module: "case-management", menu: "outage-management" },
    { module: "knowledge-management", menu: "article-management" },
  ];
  const modules = groupModules(scenarios, prds);
  assert.deepEqual(modules[0].menus.map((group) => [group.title, group.count]), [
    ["Cases", 3], ["Outage Management", 0], ["Survey Template Manager", 1],
  ]);
  assert.equal(findScenarioGroup(modules, "case-management/cases/integration")?.count, 2);
  assert.equal(findScenarioGroup(modules, "case-management/cases/integration/platform/customer-sync")?.file,
    "case-management/cases/integration/platform/customer-sync.feature");
  assert.equal(findScenarioGroup(modules, "knowledge-management/article-management")?.count, 0);
  assert.equal(findScenarioGroup(modules, "case-management/unknown"), undefined);
});

test("counts source rows with missing or duplicate IDs and tolerates flat/nested coexistence", () => {
  const scenarios = [
    scenario("case-management/cases.feature", "TEN_CAS_LST_E2E_001"),
    scenario("case-management/cases/integration.feature", "TEN_CAS_LST_E2E_001"),
    scenario("case-management/cases/integration.feature", "no-stable-id"),
  ];
  const groups = groupModules(scenarios);
  assert.equal(groups[0].menus.length, 1);
  assert.equal(groups[0].menus[0].count, 3);
  assert.equal(groups[0].menus[0].file, "case-management/cases.feature");
  assert.equal(groups[0].menus[0].children[0].count, 2);
});

test("parent filtering includes descendants, child filtering excludes siblings, search includes group paths", () => {
  const scenarios = [
    scenario("case-management/cases.feature", "TEN_CAS_LST_E2E_001"),
    scenario("case-management/cases/integration/work-orders.feature", "TEN_CAS_INT_E2E_001"),
    scenario("case-management/cases-archive.feature", "TEN_ARC_LST_E2E_001"),
    scenario("knowledge-management/articles/integration.feature", "TEN_ART_INT_E2E_001"),
  ];
  const filters = { status: "all", tag: "all", search: "" };
  assert.deepEqual(filterScenarios(scenarios, { ...filters, scopePath: "case-management/cases" }), scenarios.slice(0, 2));
  assert.deepEqual(filterScenarios(scenarios, { ...filters, scopePath: "case-management/cases/integration" }), [scenarios[1]]);
  assert.deepEqual(filterScenarios(scenarios, { ...filters, search: "integration" }), [scenarios[1], scenarios[3]]);
  assert.deepEqual(filterScenarios(scenarios, { ...filters, search: "case-management/cases/integration" }), [scenarios[1]]);
  assert.deepEqual(filterScenarios(scenarios, filters), []);
  assert.equal(groupFlows(scenarios).length, 4, "same flow names retain separate file identities");
});

test("nested routes and PRDs retain their parent menu identity", () => {
  assert.equal(scenarioPath("case-management", "case-management/cases/integration/work-orders.feature"),
    "/case-management/cases/integration/work-orders");
  assert.equal(scenarioPath("case-management", "case-management/cases"), "/case-management/cases");
  assert.equal(scenarioMenu("case-management", "case-management/cases/integration/work-orders.feature"), "cases");
  assert.equal(scenarioMenu("case-management", "case-management/cases.feature"), "cases");
  assert.equal(scenarioMenu("knowledge-management", "case-management/cases.feature"), undefined);
  assert.equal(isMenuScope("case-management", "case-management/cases"), true);
  assert.equal(isMenuScope("case-management", "case-management/cases/integration"), false);
  assert.equal(isMenuScope("case-management", "case-management/cases/integration/work-orders"), false);
  assert.equal(isMenuScope("knowledge-management", "case-management/cases"), false);
  assert.equal(scenarioPath("a module", "a module/a menu/child group.feature"), "/a%20module/a%20menu/child%20group");
});
