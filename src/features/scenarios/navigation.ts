export interface ScenarioFilters {
  search: string;
  status: string;
  priority: string;
  type: string;
}

export type ScenarioFilterKey = keyof ScenarioFilters;

const filterQueryKeys: Record<ScenarioFilterKey, string> = {
  search: "q",
  status: "status",
  priority: "priority",
  type: "type",
};

const defaultFilters: ScenarioFilters = {
  search: "",
  status: "all",
  priority: "all",
  type: "all",
};

export function scenarioPath(module: string, file: string) {
  const prefix = `${module}/`;
  const relativeFile = file.startsWith(prefix) ? file.slice(prefix.length) : file;
  const submodule = relativeFile.replace(/\.feature$/i, "");
  return `/${encodeURIComponent(module)}/${encodeURIComponent(submodule)}`;
}

export function scenarioSubmodule(module: string, file: string) {
  const prefix = `${module}/`;
  if (!file.startsWith(prefix)) return undefined;
  const submodule = file.slice(prefix.length).replace(/\.feature$/i, "");
  return submodule.includes("/") ? undefined : submodule;
}

export function scenarioFiltersFromSearchParams(params: URLSearchParams): ScenarioFilters {
  return {
    search: params.get(filterQueryKeys.search) ?? defaultFilters.search,
    status: params.get(filterQueryKeys.status) ?? defaultFilters.status,
    priority: params.get(filterQueryKeys.priority) ?? defaultFilters.priority,
    type: params.get(filterQueryKeys.type) ?? defaultFilters.type,
  };
}

export function updateScenarioFilterParams(params: URLSearchParams, key: ScenarioFilterKey, value: string) {
  const next = new URLSearchParams(params);
  next.delete("sort");
  next.delete("tag");
  next.delete("flow");
  const queryKey = filterQueryKeys[key];
  const defaultValue = defaultFilters[key];
  const normalized = value;
  if (normalized === defaultValue || (key === "search" && normalized === "")) next.delete(queryKey);
  else next.set(queryKey, normalized);
  return next;
}

export function clearScenarioFilterParams(params: URLSearchParams) {
  const next = new URLSearchParams(params);
  next.delete("sort");
  for (const key of Object.values(filterQueryKeys)) next.delete(key);
  next.delete("tag");
  next.delete("flow");
  return next;
}
