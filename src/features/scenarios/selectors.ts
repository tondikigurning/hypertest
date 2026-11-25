import { flow, label, type Scenario, scenarioTagLabels } from "./scenario";

export interface ScenarioFilters {
  scopePath?: string;
  status: string;
  tag: string;
  search: string;
}

export interface ScenarioGroup {
  path: string;
  title: string;
  count: number;
  file?: string;
  children: Array<ScenarioGroup>;
}

export interface ScenarioModule {
  name: string;
  menus: Array<ScenarioGroup>;
  rootMenu?: ScenarioGroup;
}

/** A menu's flat feature and descendant feature files form one selectable scope. */
export function isScenarioInScope(file: string, scopePath: string) {
  return file === `${scopePath}.feature` || file.startsWith(`${scopePath}/`);
}

export function groupModules(
  scenarios: Array<Scenario>,
  prds: Array<{ module: string; menu: string }> = [],
): Array<ScenarioModule> {
  const modules = new Map<string, ScenarioModule>();
  function ensureGroup(module: string, segments: Array<string>, increment: number) {
    let group = modules.get(module);
    if (!group) {
      group = { name: module, menus: [] };
      modules.set(module, group);
    }
    let children = group.menus;
    let path = module;
    let node: ScenarioGroup | undefined;
    for (const segment of segments) {
      path += `/${segment}`;
      node = children.find((item) => item.path === path);
      if (!node) {
        node = { path, title: label(segment), count: 0, children: [] };
        children.push(node);
      }
      node.count += increment;
      children = node.children;
    }
    return node;
  }
  for (const scenario of scenarios) {
    const segments = scenario.file
      .slice(scenario.module.length + 1)
      .replace(/\.feature$/i, "")
      .split("/");
    const node = ensureGroup(scenario.module, segments, 1);
    if (node) node.file = scenario.file;
  }
  const rootMenus = new Set<string>();
  for (const prd of prds) {
    if (prd.menu === prd.module) {
      rootMenus.add(prd.module);
      ensureGroup(prd.module, [], 0);
    } else ensureGroup(prd.module, [prd.menu], 0);
  }
  function sortGroups(groups: Array<ScenarioGroup>) {
    groups.sort((a, b) => a.title.localeCompare(b.title));
    for (const group of groups) sortGroups(group.children);
  }
  for (const module of modules.values()) sortGroups(module.menus);
  for (const name of rootMenus) {
    const module = modules.get(name);
    if (!module) continue;
    module.rootMenu = {
      path: name,
      title: label(name),
      count: module.menus.reduce((count, menu) => count + menu.count, 0),
      children: module.menus,
    };
  }
  return [...modules.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function findScenarioGroup(modules: Array<ScenarioModule>, path: string | undefined) {
  if (!path) return undefined;
  const [module, ...segments] = path.split("/");
  const currentModule = modules.find((item) => item.name === module);
  if (segments.length === 0) return currentModule?.rootMenu;
  let children = currentModule?.menus;
  let currentPath = module;
  let group: ScenarioGroup | undefined;
  for (const segment of segments) {
    currentPath += `/${segment}`;
    group = children?.find((item) => item.path === currentPath);
    if (!group) return undefined;
    children = group.children;
  }
  return group;
}

export function filterScenarios(scenarios: Array<Scenario>, filters: ScenarioFilters) {
  const search = filters.search.trim().toLowerCase();
  return scenarios.filter(
    (scenario) =>
      (search ? true : Boolean(filters.scopePath && isScenarioInScope(scenario.file, filters.scopePath))) &&
      (filters.status === "all" || (scenario.status?.trim() || "Not run") === filters.status) &&
      (filters.tag === "all" || scenarioTagLabels(scenario).includes(filters.tag)) &&
      `${scenario.id} ${scenario.title} ${scenario.feature} ${scenario.module} ${scenario.file} ${label(scenario.file)} ${scenario.flow} ${scenario.catalogTags.join(" ")} ${scenario.tags.join(" ")}`
        .toLowerCase()
        .includes(search),
  );
}

export function groupFlows(scenarios: Array<Scenario>) {
  const groups = new Map<string, Array<Scenario>>();
  for (const scenario of scenarios) {
    const key = `${scenario.file}:${flow(scenario)}`;
    const entries = groups.get(key);
    if (entries) entries.push(scenario);
    else groups.set(key, [scenario]);
  }
  return [...groups.entries()];
}
