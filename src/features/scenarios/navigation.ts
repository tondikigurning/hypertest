export interface ScenarioFilters {
  search: string;
  status: string;
  tag: string;
}

export type ScenarioFilterKey = keyof ScenarioFilters;

const filterQueryKeys: Record<ScenarioFilterKey, string> = {
  search: "q",
  status: "status",
  tag: "tag",
};

const defaultFilters: ScenarioFilters = {
  search: "",
  status: "all",
  tag: "all",
};

export function scenarioPath(module: string, file: string) {
  const prefix = `${module}/`;
  const relativeFile = file.startsWith(prefix) ? file.slice(prefix.length) : file;
  const scope = relativeFile.replace(/\.feature$/i, "");
  const segments = scope === module ? [module] : [module, ...scope.split("/")];
  return `/${segments.map(encodeURIComponent).join("/")}`;
}

export function scenarioMenu(module: string, file: string) {
  const prefix = `${module}/`;
  if (!file.startsWith(prefix)) return undefined;
  return file
    .slice(prefix.length)
    .split("/")[0]
    .replace(/\.feature$/i, "");
}

export function isMenuScope(module: string, scope: string) {
  const menu = scenarioMenu(module, scope);
  return Boolean(menu && scope === `${module}/${menu}`);
}

export function scenarioFiltersFromSearchParams(params: URLSearchParams): ScenarioFilters {
  return {
    search: params.get(filterQueryKeys.search) ?? defaultFilters.search,
    status: params.get(filterQueryKeys.status) ?? defaultFilters.status,
    tag: params.get(filterQueryKeys.tag) ?? defaultFilters.tag,
  };
}

export function updateScenarioFilterParams(params: URLSearchParams, key: ScenarioFilterKey, value: string) {
  const next = new URLSearchParams(params);
  next.delete("priority");
  next.delete("sort");
  next.delete("flow");
  next.delete("type");
  const queryKey = filterQueryKeys[key];
  const defaultValue = defaultFilters[key];
  const normalized = value;
  if (normalized === defaultValue || (key === "search" && normalized === "")) next.delete(queryKey);
  else next.set(queryKey, normalized);
  return next;
}

export function clearScenarioFilterParams(params: URLSearchParams) {
  const next = new URLSearchParams(params);
  next.delete("priority");
  next.delete("sort");
  for (const key of Object.values(filterQueryKeys)) next.delete(key);
  next.delete("type");
  next.delete("flow");
  return next;
}
