import { category, label, type Scenario } from "./scenario";

export interface ScenarioFilters {
  featureFile?: string;
  status: string;
  priority: string;
  type: string;
  search: string;
}

export function groupModules(scenarios: Array<Scenario>) {
  const groups = new Map<string, Map<string, { file: string; title: string; count: number }>>();
  for (const scenario of scenarios) {
    let features = groups.get(scenario.module);
    if (!features) {
      features = new Map();
      groups.set(scenario.module, features);
    }
    const existing = features.get(scenario.file);
    if (existing) existing.count++;
    else {
      features.set(scenario.file, {
        file: scenario.file,
        title: label(
          scenario.file
            .split("/")
            .slice(1)
            .join(" / ")
            .replace(/\.feature$/, ""),
        ),
        count: 1,
      });
    }
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, features]) => ({
      name,
      features: [...features.values()].sort((a, b) => a.title.localeCompare(b.title)),
    }));
}

export function filterScenarios(scenarios: Array<Scenario>, filters: ScenarioFilters) {
  const search = filters.search.trim().toLowerCase();
  return scenarios.filter(
    (scenario) =>
      (search ? true : scenario.file === filters.featureFile) &&
      (filters.status === "all" || (scenario.status?.trim() || "Not run") === filters.status) &&
      (filters.priority === "all" || scenario.tags.includes(`@priority:${filters.priority}`)) &&
      (filters.type === "all" || scenario.type === filters.type) &&
      `${scenario.id} ${scenario.title} ${scenario.feature} ${scenario.module} ${scenario.category} ${scenario.catalogTags.join(" ")} ${scenario.tags.join(" ")}`
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
