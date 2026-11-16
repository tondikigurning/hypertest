import { category, label, type Scenario } from "./scenario";

export interface ScenarioFilters {
  scopePath?: string;
  status: string;
  priority: string;
  type: string;
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
  submodules: Array<ScenarioGroup>;
}

/** A flat submodule file and its descendants share one menu identity. */
export function isScenarioInScope(file: string, scopePath: string) {
  return file === `${scopePath}.feature` || file.startsWith(`${scopePath}/`);
}

export function groupModules(
  scenarios: Array<Scenario>,
  prds: Array<{ module: string; submodule: string }> = [],
): Array<ScenarioModule> {
  const modules = new Map<string, ScenarioModule>();
  function ensureGroup(module: string, segments: Array<string>, increment: number) {
    let group = modules.get(module);
    if (!group) {
      group = { name: module, submodules: [] };
      modules.set(module, group);
    }
    let children = group.submodules;
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
  for (const prd of prds) ensureGroup(prd.module, [prd.submodule], 0);
  function sortGroups(groups: Array<ScenarioGroup>) {
    groups.sort((a, b) => a.title.localeCompare(b.title));
    for (const group of groups) sortGroups(group.children);
  }
  for (const module of modules.values()) sortGroups(module.submodules);
  return [...modules.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function findScenarioGroup(modules: Array<ScenarioModule>, path: string | undefined) {
  if (!path) return undefined;
  const [module, ...segments] = path.split("/");
  let children = modules.find((item) => item.name === module)?.submodules;
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
      (filters.priority === "all" || scenario.tags.includes(`@priority:${filters.priority}`)) &&
      (filters.type === "all" || scenario.type === filters.type) &&
      `${scenario.id} ${scenario.title} ${scenario.feature} ${scenario.module} ${scenario.file} ${label(scenario.file)} ${scenario.category} ${scenario.catalogTags.join(" ")} ${scenario.tags.join(" ")}`
        .toLowerCase()
        .includes(search),
  );
}

export function groupFlows(scenarios: Array<Scenario>) {
  const groups = new Map<string, Array<Scenario>>();
  for (const scenario of scenarios) {
    const key = `${scenario.file}:${category(scenario)}`;
    const entries = groups.get(key);
    if (entries) entries.push(scenario);
    else groups.set(key, [scenario]);
  }
  return [...groups.entries()];
}
