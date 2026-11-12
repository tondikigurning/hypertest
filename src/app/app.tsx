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
import { useRunEnvironment } from "../features/runs/use-run-environment";
import { RunStatus } from "../features/scenarios/components/run-status";
import { ScenarioDetails } from "../features/scenarios/components/scenario-details";
import { ClearFiltersButton, ScenarioListState } from "../features/scenarios/components/scenario-list-state";
import { ScenarioMetadata } from "../features/scenarios/components/scenario-metadata";
import { ScenarioNavigation } from "../features/scenarios/components/scenario-navigation";
import {
  clearScenarioFilterParams,
  type ScenarioFilterKey,
  scenarioFiltersFromSearchParams,
  scenarioPath,
  scenarioSubmodule,
  updateScenarioFilterParams,
} from "../features/scenarios/navigation";
import { category, featureTitle, label, type Scenario } from "../features/scenarios/scenario";
import { filterScenarios, groupFlows, groupModules } from "../features/scenarios/selectors";
import { useDraftScenarios } from "../features/scenarios/use-draft-scenarios";
import { useScenarioCatalog } from "../features/scenarios/use-scenario-catalog";

export function App() {
  const matches = useMatches();
  const route = matches.at(-1);
  const routeModule = route?.params.module;
  const routeSubmodule = route?.params.submodule;
  const isHome = route?.id === "home";
  const isSubmodule = route?.id === "scenario";
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = scenarioFiltersFromSearchParams(searchParams);
  const { search, status, priority, type } = filters;
  const isPrdView = isSubmodule && searchParams.get("view") === "prd";
  const prds = usePrds();
  const prdButton = useRef<HTMLButtonElement>(null);
  const activeRun = useActiveRun(true);
  const { config, environment, setEnvironment } = useRunEnvironment();
  const target = config?.environments.find((item) => item.id === environment)?.target;
  useEffect(() => {
    if (!activeRun || activeRun.done || !config) return;
    const runningEnvironment = config.environments.find((item) => item.target === activeRun.target);
    if (runningEnvironment) setEnvironment(runningEnvironment.id);
  }, [activeRun, config, setEnvironment]);
  const [previewOpen, setPreviewOpen] = useState(false);
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
  const modules = useMemo(() => {
    const groups = groupModules(scenarios);
    for (const prd of [...prds.checkout.items, ...prds.draftPrds.items]) {
      let group = groups.find((item) => item.name === prd.module);
      if (!group) {
        group = { name: prd.module, features: [] };
        groups.push(group);
      }
      const file = `${prd.module}/${prd.submodule}.feature`;
      if (!group.features.some((item) => item.file === file))
        group.features.push({ file, title: label(prd.submodule), count: 0 });
    }
    return groups
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((group) => ({ ...group, features: group.features.sort((a, b) => a.title.localeCompare(b.title)) }));
  }, [scenarios, prds.checkout.items, prds.draftPrds.items]);
  const types = useMemo(() => [...new Set(scenarios.map((s) => s.type).filter(Boolean))].sort(), [scenarios]);
  const priorities = useMemo(
    () =>
      [
        ...new Set(scenarios.flatMap((s) => s.tags.filter((t) => t.startsWith("@priority:")).map((t) => t.slice(10)))),
      ].sort(),
    [scenarios],
  );
  const statuses = useMemo(
    () => [...new Set(scenarios.map((scenario) => activeStatus(scenario)?.trim() || "Not run"))].sort(),
    [scenarios, activeStatus],
  );
  const feature = useMemo(
    () =>
      scenarios.find(
        (scenario) =>
          scenario.module === routeModule &&
          routeSubmodule !== undefined &&
          scenarioSubmodule(scenario.module, scenario.file) === routeSubmodule,
      ),
    [scenarios, routeModule, routeSubmodule],
  );
  const featureFile = feature?.file;
  const navigateToScenario = useCallback(
    (module: string, file: string, params = searchParams, replace = false) => {
      const next = new URLSearchParams(params);
      next.delete("module");
      next.delete("submodule");
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
        category: item.category,
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
    () => filterScenarios(filterableScenarios, { featureFile, status, priority, type, search }),
    [filterableScenarios, featureFile, status, priority, type, search],
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
      next.delete(`${scenario.file}:${category(scenario)}`);
      return next;
    });
    setSelected(scenario.key);
  };
  const flows = useMemo(() => groupFlows(filtered), [filtered]);
  const hasFilters = Boolean(search.trim() || status !== "all" || priority !== "all" || type !== "all");
  const featureCount = feature ? scenarios.filter((item) => item.file === feature.file).length : 0;
  const clearFilters = () => setSearchParams(clearScenarioFilterParams(searchParams), { replace: true });
  const goHome = () => {
    const params = clearScenarioFilterParams(searchParams);
    params.delete("module");
    params.delete("submodule");
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
          featureFile={routeModule && routeSubmodule ? `${routeModule}/${routeSubmodule}.feature` : featureFile}
          collapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          onToggleModule={toggleModule}
          onSelectFeature={(module, file) => {
            if (window.matchMedia("(max-width: 650px)").matches) setSidebarCollapsed(true);
            setOpenModules((previous) => new Set([...previous, module]));
            const next = updateScenarioFilterParams(searchParams, "search", "");
            next.delete("view");
            navigateToScenario(module, file, next);
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
                      {search.trim() ? "Scenario explorer" : feature ? label(feature.module) : "Scenario explorer"}
                    </span>
                    <h2>
                      {search.trim()
                        ? "Search results"
                        : feature
                          ? featureTitle(feature)
                          : routeSubmodule
                            ? label(routeSubmodule)
                            : "Feature not found"}
                    </h2>
                    <p aria-live="polite">
                      {search.trim()
                        ? `${filtered.length} ${filtered.length === 1 ? "scenario" : "scenarios"} found across all features`
                        : feature
                          ? `${filtered.length} of ${featureCount} ${featureCount === 1 ? "scenario" : "scenarios"} shown`
                          : routeModule && routeSubmodule
                            ? "No scenarios found for this submodule."
                            : "Choose a feature from the sidebar to continue."}
                    </p>
                  </div>
                  <div className="list-heading-actions">
                    {isSubmodule && routeModule && routeSubmodule && (
                      <button
                        ref={prdButton}
                        type="button"
                        className="open-prd-button"
                        title={`View PRD for ${label(routeModule)} / ${label(routeSubmodule)}`}
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
                    {feature && !search.trim() && (
                      <GroupRun
                        key={feature.file}
                        selection={{ kind: "feature", file: feature.file }}
                        name={featureTitle(feature)}
                        items={scenarios.filter((s) => s.file === feature.file)}
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
                    label="Filter by priority"
                    value={priority}
                    onChange={(value) => updateFilter("priority", value)}
                    options={[
                      { value: "all", label: "All priorities" },
                      ...priorities.map((p) => ({ value: p, label: p })),
                    ]}
                  />
                  <SelectInput
                    label="Filter by type"
                    value={type}
                    onChange={(value) => updateFilter("type", value)}
                    options={[
                      { value: "all", label: "All types" },
                      ...types.map((t) => ({ value: t, label: label(t) })),
                    ]}
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
                {!loading && !error && feature && filtered.length === 0 && (
                  <ScenarioListState kind="empty" onClear={clearFilters} />
                )}
                {flows.map(([flowKey, entries]) => {
                  const categoryName = category(entries[0]);
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
                            {search.trim() && <span className="flow-feature">{featureTitle(entries[0])} / </span>}
                            {categoryName}
                            <span className="flow-count">{entries.length}</span>
                          </span>
                        </button>
                        <GroupRun
                          selection={{ kind: "category", file: flowFile, category: categoryName }}
                          name={categoryName}
                          items={scenarios.filter((s) => s.file === flowFile && category(s) === categoryName)}
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
                                  {s.availability === "unavailable" && (
                                    <span className="scenario-badge unavailable">Unavailable</span>
                                  )}
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
          {isPrdView && routeModule && routeSubmodule && (
            <PrdCatalog
              key={`${routeModule}/${routeSubmodule}`}
              module={routeModule}
              submodule={routeSubmodule}
              checkout={prds.checkout}
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
                  "automation-prd-start",
                  `Help me create or import a PRD for ${routeModule} / ${routeSubmodule}`,
                );
                goHome();
              }}
              onEdit={() => {
                sessionStorage.setItem(
                  "automation-prd-start",
                  `Help me edit or refresh the active PRD for ${routeModule} / ${routeSubmodule}`,
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
                      : activeRun.cancelRequested
                        ? "Stopping run"
                        : "Preparing your run")}
                </span>
              </span>
              <span className="floating-run-action">
                View <span aria-hidden="true">&#8599;</span>
              </span>
            </button>
          )}
          {previewOpen && activeRun && <LiveRun run={activeRun} onClose={() => setPreviewOpen(false)} />}
          <AgentWidget
            home={isHome}
            feature={feature ? { module: feature.module, file: feature.file, title: featureTitle(feature) } : undefined}
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
