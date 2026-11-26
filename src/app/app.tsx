import { Icon } from "@hyperscal/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useMatches, useNavigate, useNavigationType, useSearchParams } from "react-router";
import { CollapsibleRegion, SelectInput, TextInput } from "../components";
import { AgentWidget } from "../features/agent/agent-widget";
import { PrdDocumentIcon } from "../features/prds/components/prd-document-icon";
import { PrdCatalog } from "../features/prds/prd-catalog";
import { usePrds } from "../features/prds/use-prds";
import { LiveRun } from "../features/runs/components/live-run";
import { EnvironmentVariables, GroupRun } from "../features/runs/components/local-run";
import { useActiveRun } from "../features/runs/use-active-run";
import { useDraftRuns } from "../features/runs/use-draft-runs";
import { useRunEnvironment } from "../features/runs/use-run-environment";
import { RunStatus } from "../features/scenarios/components/run-status";
import { ScenarioDetails } from "../features/scenarios/components/scenario-details";
import { ClearFiltersButton, ScenarioListState } from "../features/scenarios/components/scenario-list-state";
import { ScenarioMetadata } from "../features/scenarios/components/scenario-metadata";
import { ScenarioNavigation } from "../features/scenarios/components/scenario-navigation";
import {
  clearScenarioFilterParams,
  isMenuScope,
  type ScenarioFilterKey,
  scenarioFiltersFromSearchParams,
  scenarioMenu,
  scenarioPath,
  updateScenarioFilterParams,
} from "../features/scenarios/navigation";
import { featureTitle, flow, label, type Scenario, scenarioTagLabels } from "../features/scenarios/scenario";
import {
  filterScenarios,
  findScenarioGroup,
  groupFlows,
  groupModules,
  isScenarioInScope,
} from "../features/scenarios/selectors";
import { useDraftScenarios } from "../features/scenarios/use-draft-scenarios";
import { useScenarioCatalog } from "../features/scenarios/use-scenario-catalog";

export function App() {
  const matches = useMatches();
  const route = matches.at(-1);
  const prds = usePrds();
  const routeModule = route?.params.module;
  const isScenarioRoute = route?.id === "scenario" || route?.id === "scenario-root";
  const routeScope = routeModule
    ? route?.params.menu
      ? `${routeModule}/${route.params.menu}${route.params["*"] ? `/${route.params["*"]}` : ""}`
      : routeModule
    : undefined;
  const routeMenu =
    routeModule && routeScope
      ? routeScope === routeModule
        ? routeModule
        : scenarioMenu(routeModule, routeScope)
      : undefined;
  const hasRootPrd = Boolean(
    routeModule && prds.draftPrds.items.some((prd) => prd.module === routeModule && prd.menu === routeModule),
  );
  const isHome = route?.id === "home";
  const isMenu = Boolean(
    isScenarioRoute &&
      routeModule &&
      routeModule !== "_components" &&
      routeScope &&
      (hasRootPrd ? routeScope === routeModule : routeScope !== routeModule && isMenuScope(routeModule, routeScope)),
  );
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = scenarioFiltersFromSearchParams(searchParams);
  const { search, status, tag } = filters;
  const isPrdView = isMenu && searchParams.get("view") === "prd";
  useEffect(() => {
    if (!isScenarioRoute || isMenu || searchParams.get("view") !== "prd" || !routeModule || !routeMenu) return;
    if (prds.draftPrds.loading) return;
    if (routeModule === "_components") {
      const next = new URLSearchParams(searchParams);
      next.delete("view");
      navigate({ pathname: location.pathname, search: next.toString() }, { replace: true });
      return;
    }
    navigate(
      {
        pathname: scenarioPath(routeModule, hasRootPrd ? routeModule : `${routeModule}/${routeMenu}`),
        search: location.search,
      },
      { replace: true },
    );
  }, [
    hasRootPrd,
    isMenu,
    isScenarioRoute,
    location.pathname,
    location.search,
    navigate,
    prds.draftPrds.loading,
    routeModule,
    routeMenu,
    searchParams,
  ]);
  const prdButton = useRef<HTMLButtonElement>(null);
  const activeRun = useActiveRun(true);
  const { run: activeDraftRun } = useDraftRuns();
  const { config, environment, setEnvironment } = useRunEnvironment();
  const target = config?.environments.find((item) => item.id === environment)?.target;
  useEffect(() => {
    if (!activeRun || activeRun.done || !config) return;
    const runningEnvironment = config.environments.find((item) => item.target === activeRun.target);
    if (runningEnvironment) setEnvironment(runningEnvironment.id);
  }, [activeRun, config, setEnvironment]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draftPreviewOpen, setDraftPreviewOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.matchMedia("(max-width: 650px)").matches);
  const isRunning = useCallback(
    (scenario: Scenario) =>
      Boolean(activeRun && !activeRun.done && scenario.hasId && activeRun.scenarioIds?.includes(scenario.id)),
    [activeRun],
  );
  const activeStatus = useCallback(
    (scenario: Scenario) =>
      isRunning(scenario)
        ? activeRun?.tests.some((test) => test.scenarioId === scenario.id && test.status === "running")
          ? "Running"
          : "In run"
        : scenario.status,
    [activeRun, isRunning],
  );
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [closedFlows, setClosedFlows] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string>();
  const {
    scenarios: officialScenarios,
    error,
    loading,
  } = useScenarioCatalog(activeRun?.done ? activeRun.id : undefined, environment);
  const { scenarios, draftError } = useDraftScenarios(officialScenarios);
  useEffect(() => {
    if (navigationType === "POP") {
      setSelected(undefined);
      setOpenModules(location.pathname === "/" || !routeModule ? new Set() : new Set([routeModule]));
    } else if (routeModule) {
      setOpenModules((previous) => new Set([...previous, routeModule]));
    }
  }, [location.pathname, navigationType, routeModule]);
  const modules = useMemo(() => groupModules(scenarios, prds.draftPrds.items), [scenarios, prds.draftPrds.items]);
  useEffect(() => {
    if (!isScenarioRoute || !routeModule || (route?.id !== "scenario-root" && routeMenu !== routeModule)) return;
    if (loading || prds.draftPrds.loading) return;
    const module = modules.find((item) => item.name === routeModule);
    if (module?.rootMenu) {
      if (route?.id !== "scenario-root") {
        navigate({ pathname: scenarioPath(routeModule, routeModule), search: location.search }, { replace: true });
      }
      return;
    }
    const firstMenu = module?.menus[0];
    if (firstMenu) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.delete("view");
      const search = searchParams.toString();
      navigate(
        { pathname: scenarioPath(routeModule, firstMenu.path), search: search ? `?${search}` : "" },
        { replace: true },
      );
    } else {
      navigate({ pathname: "/", search: location.search }, { replace: true });
    }
  }, [
    isScenarioRoute,
    loading,
    location.search,
    modules,
    navigate,
    prds.draftPrds.loading,
    route?.id,
    routeMenu,
    routeModule,
  ]);
  const selectedGroup = useMemo(() => findScenarioGroup(modules, routeScope), [modules, routeScope]);
  const scopedScenarios = useMemo(
    () => (selectedGroup ? scenarios.filter((item) => isScenarioInScope(item.file, selectedGroup.path)) : []),
    [scenarios, selectedGroup],
  );
  const scopeTitle = selectedGroup
    ? selectedGroup.path === routeModule
      ? selectedGroup.title
      : selectedGroup.path.split("/").slice(1).map(label).join(" / ")
    : undefined;
  const tags = useMemo(
    () =>
      selectedGroup?.file && !selectedGroup.children.length
        ? [...new Set(scopedScenarios.flatMap(scenarioTagLabels))].sort()
        : [],
    [scopedScenarios, selectedGroup],
  );
  const statuses = useMemo(
    () => [...new Set(scenarios.map((scenario) => activeStatus(scenario)?.trim() || "Not run"))].sort(),
    [scenarios, activeStatus],
  );
  const feature = selectedGroup?.file && !selectedGroup.children.length ? scopedScenarios[0] : undefined;
  const navigateToScenario = useCallback(
    (module: string, file: string, params = searchParams, replace = false) => {
      const next = new URLSearchParams(params);
      next.delete("module");
      next.delete("menu");
      const query = next.toString();
      navigate({ pathname: scenarioPath(module, file), search: query ? `?${query}` : "" }, { replace });
    },
    [navigate, searchParams],
  );
  const updateFilter = useCallback(
    (key: ScenarioFilterKey, value: string) => {
      setSearchParams(updateScenarioFilterParams(searchParams, key, value), { replace: true });
    },
    [searchParams, setSearchParams],
  );
  const agentContextScenarios = useMemo(
    () =>
      scenarios.map((item) => ({
        key: item.key,
        title: item.title,
        id: item.id,
        file: item.file,
        module: item.module,
        feature: featureTitle(item),
        flow: item.flow,
        steps: item.steps,
        tags: item.tags,
      })),
    [scenarios],
  );
  const filterableScenarios = useMemo(
    () => scenarios.map((scenario) => ({ ...scenario, status: activeStatus(scenario) })),
    [scenarios, activeStatus],
  );
  const filtered = useMemo(
    () => filterScenarios(filterableScenarios, { scopePath: selectedGroup?.path, status, tag, search }),
    [filterableScenarios, selectedGroup, status, tag, search],
  );
  const chosen = scenarios.find((s) => s.key === selected);
  const references = useMemo(
    () =>
      chosen?.tags
        .filter((t) => t.startsWith("@ref:"))
        .map((tag) => {
          const id = tag.slice(5);
          return { id, matches: scenarios.filter((s) => s.id === id) };
        }) ?? [],
    [chosen, scenarios],
  );
  const openReference = (scenario: Scenario) => {
    setOpenModules((previous) => new Set([...previous, scenario.module]));
    navigateToScenario(scenario.module, scenario.file, clearScenarioFilterParams(searchParams));
    setClosedFlows((previous) => {
      const next = new Set(previous);
      next.delete(`${scenario.file}:${flow(scenario)}`);
      return next;
    });
    setSelected(scenario.key);
  };
  const flows = useMemo(() => groupFlows(filtered), [filtered]);
  const hasFilters = Boolean(search.trim() || status !== "all" || tag !== "all");
  const featureCount = scopedScenarios.length;
  const clearFilters = () => setSearchParams(clearScenarioFilterParams(searchParams), { replace: true });
  const goHome = () => {
    const params = clearScenarioFilterParams(searchParams);
    params.delete("module");
    params.delete("menu");
    params.delete("view");
    const query = params.toString();
    navigate({ pathname: "/", search: query ? `?${query}` : "" });
    setSelected(undefined);
  };
  const toggleModule = (name: string) => {
    setOpenModules((previous) => {
      const next = new Set(previous);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };
  const toggleFlow = (key: string) =>
    setClosedFlows((previous) => {
      const next = new Set(previous);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  return (
    <div className="app-shell">
      <nav className="topbar" aria-label="HyperTest">
        <button
          type="button"
          className="topbar-title"
          onClick={goHome}
          aria-label="HyperTest home"
          aria-current={isHome ? "page" : undefined}
        >
          <img className="topbar-icon" src={new URL("../assets/hyperscal-icon.svg", import.meta.url).href} alt="" />
          <span>HyperTest</span>
        </button>
        <div className="topbar-meta topbar-details">
          {target && (
            <span className="topbar-target" title={target}>
              Target: {target}
            </span>
          )}
          <span className="topbar-count">{scenarios.length} scenarios</span>
        </div>
        <div className="topbar-actions">
          {config && (
            <div
              className="environment-select"
              title={activeRun && !activeRun.done ? "Environment cannot be changed during a run" : undefined}
            >
              <SelectInput
                label="Select environment"
                value={environment}
                onChange={setEnvironment}
                disabled={Boolean(activeRun && !activeRun.done)}
                options={config.environments.map((item) => ({ value: item.id, label: item.label.toUpperCase() }))}
              />
            </div>
          )}
          <EnvironmentVariables disabled={Boolean(activeRun && !activeRun.done)} />
        </div>
      </nav>
      <div className="app-body">
        <ScenarioNavigation
          modules={modules}
          openModules={openModules}
          scopePath={selectedGroup?.path}
          collapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          onToggleModule={toggleModule}
          prdError={prds.draftPrds.error}
          onSelectGroup={(module, path) => {
            if (window.matchMedia("(max-width: 650px)").matches) setSidebarCollapsed(true);
            setOpenModules((previous) => new Set([...previous, module]));
            const next = updateScenarioFilterParams(searchParams, "search", "");
            next.delete("view");
            navigateToScenario(module, path, next);
            setSelected(undefined);
          }}
        />
        <main className={isHome ? "workspace workspace-home" : "workspace"}>
          <div className="layout" style={isHome ? { display: "none" } : undefined}>
            <section className="content" aria-label="Scenario list">
              <div className="list-header">
                <div className="list-heading">
                  <div>
                    <span className="list-eyebrow">
                      {search.trim() ? "Scenario explorer" : routeModule ? label(routeModule) : "Scenario explorer"}
                    </span>
                    <h2>
                      {search.trim()
                        ? "Search results"
                        : selectedGroup
                          ? scopeTitle
                          : routeMenu
                            ? label(routeMenu)
                            : "Feature not found"}
                    </h2>
                    <p aria-live="polite">
                      {search.trim()
                        ? `${filtered.length} ${filtered.length === 1 ? "scenario" : "scenarios"} found across all features`
                        : selectedGroup
                          ? `${filtered.length} of ${featureCount} ${featureCount === 1 ? "scenario" : "scenarios"} shown`
                          : routeModule && routeMenu
                            ? "This test group is not in the current catalog."
                            : "Choose a menu from the sidebar to continue."}
                    </p>
                  </div>
                  <div className="list-heading-actions">
                    {isMenu && routeModule && routeMenu && (
                      <button
                        ref={prdButton}
                        type="button"
                        className="open-prd-button"
                        title={`View PRD for ${label(routeModule)} / ${label(routeMenu)}`}
                        onClick={() => {
                          const next = new URLSearchParams(searchParams);
                          next.set("view", "prd");
                          setSearchParams(next);
                        }}
                      >
                        <PrdDocumentIcon />
                        <span>View PRD</span>
                      </button>
                    )}
                    {selectedGroup && scopedScenarios.length > 0 && !search.trim() && (
                      <GroupRun
                        key={selectedGroup.path}
                        selection={
                          selectedGroup.path === routeModule
                            ? { kind: "module", path: selectedGroup.path }
                            : selectedGroup.file && !selectedGroup.children.length
                              ? { kind: "feature", file: selectedGroup.file }
                              : { kind: "group", path: selectedGroup.path }
                        }
                        name={scopeTitle || selectedGroup.title}
                        items={scopedScenarios}
                      />
                    )}
                  </div>
                </div>
                <div className="toolbar">
                  <label className="search" htmlFor="scenario-search">
                    <Icon name="search" aria-hidden="true" className="search-icon" />
                    <TextInput
                      id="scenario-search"
                      aria-label="Search scenarios"
                      placeholder="Search all scenarios"
                      value={search}
                      onValueChange={(value) => updateFilter("search", value)}
                    />
                  </label>
                  <SelectInput
                    label="Filter by tag"
                    value={tag}
                    onChange={(value) => updateFilter("tag", value)}
                    options={[{ value: "all", label: "All tags" }, ...tags.map((value) => ({ value, label: value }))]}
                  />
                  <SelectInput
                    label="Filter by status"
                    value={status}
                    onChange={(value) => updateFilter("status", value)}
                    options={[
                      { value: "all", label: "All statuses" },
                      ...statuses.map((value) => ({ value, label: value })),
                    ]}
                  />
                </div>
                {hasFilters && (
                  <div className="filter-summary">
                    <span>Filters applied</span>
                    <ClearFiltersButton onClear={clearFilters}>Clear all</ClearFiltersButton>
                  </div>
                )}
              </div>
              <div className="scenario-list">
                {error && <p role="alert">{error}</p>}
                {draftError && <p role="alert">Drafts: {draftError}</p>}
                {loading && <ScenarioListState kind="loading" />}
                {!loading &&
                  !error &&
                  selectedGroup &&
                  filtered.length === 0 &&
                  (scopedScenarios.length === 0 && !search.trim() ? (
                    <ScenarioListState kind="unwritten" />
                  ) : (
                    <ScenarioListState kind="empty" onClear={clearFilters} />
                  ))}
                {flows.map(([flowKey, entries]) => {
                  const flowName = flow(entries[0]);
                  const flowFile = entries[0].file;
                  const expanded = !closedFlows.has(flowKey);
                  return (
                    <div className="flow-group" key={flowKey}>
                      <div className="flow-title-row">
                        <button
                          type="button"
                          className="flow-title"
                          aria-expanded={expanded}
                          onClick={() => toggleFlow(flowKey)}
                        >
                          <span className="flow-name">
                            <span className="disclosure" aria-hidden="true">
                              &#9656;
                            </span>
                            {(search.trim() || Boolean(selectedGroup?.children.length)) && (
                              <span className="flow-feature">
                                {entries[0].file
                                  .split("/")
                                  .slice(1)
                                  .map((part) => label(part.replace(/\.feature$/, "")))
                                  .join(" / ")}{" "}
                                /{" "}
                              </span>
                            )}
                            {flowName}
                            <span className="flow-count">{entries.length}</span>
                          </span>
                        </button>
                        <GroupRun
                          selection={{ kind: "flow", file: flowFile, flow: flowName }}
                          name={flowName}
                          items={scenarios.filter((s) => s.file === flowFile && flow(s) === flowName)}
                        />
                      </div>
                      <CollapsibleRegion expanded={expanded}>
                        {entries.map((s) => (
                          <div
                            className={["scenario-row", selected === s.key && "selected", isRunning(s) && "active"]
                              .filter(Boolean)
                              .join(" ")}
                            key={s.key}
                          >
                            <button
                              type="button"
                              className={selected === s.key ? "scenario selected" : "scenario"}
                              onClick={() => {
                                setSelected(s.key);
                                setOpenModules((previous) => new Set([...previous, s.module]));
                                navigateToScenario(s.module, s.file);
                                if (window.matchMedia("(max-width: 1100px)").matches)
                                  requestAnimationFrame(() =>
                                    document
                                      .querySelector(".detail")
                                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                                  );
                              }}
                            >
                              <span className="scenario-icon" aria-hidden="true">
                                &#9671;
                              </span>
                              <span className="scenario-text">
                                <strong>{s.title}</strong>
                                <span className="scenario-info">
                                  <small>{s.hasId ? s.id : "ID unavailable"}</small>
                                  <ScenarioMetadata scenario={s} />
                                  <RunStatus status={activeStatus(s)} />
                                </span>
                              </span>
                              <span className="chevron" aria-hidden="true">
                                &#8250;
                              </span>
                            </button>
                          </div>
                        ))}
                      </CollapsibleRegion>
                    </div>
                  );
                })}
              </div>
            </section>
            <ScenarioDetails
              scenario={chosen}
              status={chosen ? activeStatus(chosen) : undefined}
              references={references}
              onClose={() => setSelected(undefined)}
              onOpenReference={openReference}
            />
          </div>
          {isPrdView && routeModule && routeMenu && (
            <PrdCatalog
              key={`${routeModule}/${routeMenu}`}
              module={routeModule}
              menu={routeMenu}
              draftPrds={prds.draftPrds}
              draft={prds.draft}
              returnFocus={prdButton}
              onClose={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("view");
                setSearchParams(next, { replace: true });
              }}
              onCreate={() => {
                sessionStorage.setItem(
                  "automation-prd-context",
                  JSON.stringify({ module: routeModule, menu: routeMenu }),
                );
                sessionStorage.setItem(
                  "automation-prd-start",
                  `Help me create or import the menu PRD for ${routeModule} / ${routeMenu}, covering its child test groups and files.`,
                );
                goHome();
              }}
              onEdit={() => {
                sessionStorage.setItem(
                  "automation-prd-context",
                  JSON.stringify({ module: routeModule, menu: routeMenu }),
                );
                sessionStorage.setItem(
                  "automation-prd-start",
                  `Help me edit or refresh the menu PRD for ${routeModule} / ${routeMenu}, covering its child test groups and files.`,
                );
                goHome();
              }}
            />
          )}
          {activeRun && !activeRun.done && (
            <button
              type="button"
              className="floating-run"
              onClick={() => setPreviewOpen(true)}
              aria-label="Open live run preview"
            >
              <span className="floating-run-indicator" aria-hidden="true">
                <span />
              </span>
              <span className="floating-run-copy">
                <strong>Scenario run in progress</strong>
                <span>
                  {activeRun.tests.find((test) => test.status === "running")?.title ||
                    (activeRun.stage === "uploading evidence"
                      ? "Uploading evidence"
                      : activeRun.stage === "saving results"
                        ? "Saving results"
                        : activeRun.cancelRequested
                          ? "Stopping run"
                          : activeRun.executionDone
                            ? "Finishing run"
                            : "Preparing your run")}
                </span>
              </span>
              <span className="floating-run-action">
                View <span aria-hidden="true">&#8599;</span>
              </span>
            </button>
          )}
          {previewOpen && activeRun && <LiveRun run={activeRun} onClose={() => setPreviewOpen(false)} />}
          {activeDraftRun && !activeDraftRun.done && (
            <button
              type="button"
              className={activeRun && !activeRun.done ? "floating-run floating-run-secondary" : "floating-run"}
              onClick={() => setDraftPreviewOpen(true)}
              aria-label="Open live draft run preview"
            >
              <span className="floating-run-indicator">
                <span />
              </span>
              <span className="floating-run-copy">
                <strong>Draft scenario run in progress</strong>
                <span>
                  {activeDraftRun.tests.find((test) => test.status === "running")?.title || activeDraftRun.stage}
                </span>
              </span>
              <span className="floating-run-action">
                View <span aria-hidden="true">&#8599;</span>
              </span>
            </button>
          )}
          {draftPreviewOpen && activeDraftRun && (
            <LiveRun run={activeDraftRun} draft onClose={() => setDraftPreviewOpen(false)} />
          )}
          <AgentWidget
            home={isHome}
            feature={
              feature
                ? { module: feature.module, file: feature.file, title: scopeTitle || featureTitle(feature) }
                : undefined
            }
            group={
              selectedGroup && !feature
                ? { path: selectedGroup.path, title: scopeTitle || selectedGroup.title }
                : undefined
            }
            contextScenarios={agentContextScenarios}
            scenario={
              chosen
                ? {
                    key: chosen.key,
                    title: chosen.title,
                    id: chosen.id,
                    file: chosen.file,
                    module: chosen.module,
                    feature: chosen.feature,
                    steps: chosen.steps,
                    tags: chosen.tags,
                  }
                : undefined
            }
          />
        </main>
      </div>
    </div>
  );
}
