import { Icon } from "@hyperscal/icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CollapsibleRegion, FilterSelect } from "../components";
import { AgentWidget } from "../features/agent/agent-widget";
import { LiveRun } from "../features/runs/components/live-run";
import { EnvironmentVariables, GroupRun } from "../features/runs/components/local-run";
import { useActiveRun } from "../features/runs/use-active-run";
import { useRunEnvironment } from "../features/runs/use-run-environment";
import { RunStatus } from "../features/scenarios/components/run-status";
import { ScenarioDetails } from "../features/scenarios/components/scenario-details";
import { ScenarioMetadata } from "../features/scenarios/components/scenario-metadata";
import { ScenarioNavigation } from "../features/scenarios/components/scenario-navigation";
import { navigationFromUrl, writeNavigationUrl } from "../features/scenarios/navigation";
import { category, featureTitle, label, type Scenario } from "../features/scenarios/scenario";
import { filterScenarios, groupFlows, groupModules } from "../features/scenarios/selectors";
import { useDraftScenarios } from "../features/scenarios/use-draft-scenarios";
import { useScenarioCatalog } from "../features/scenarios/use-scenario-catalog";

export function App() {
  const activeRun = useActiveRun(true);
  const { config, environment, setEnvironment } = useRunEnvironment();
  const target = config?.environments.find((item) => item.id === environment)?.target;
  useEffect(() => {
    if (!activeRun || activeRun.done || !config) return;
    const runningEnvironment = config.environments.find((item) => item.target === activeRun.target);
    if (runningEnvironment) setEnvironment(runningEnvironment.id);
  }, [activeRun, config, setEnvironment]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isHome, setIsHome] = useState(
    () =>
      ["/automation", "/automation/"].includes(window.location.pathname) &&
      !new URL(window.location.href).searchParams.has("module") &&
      !new URL(window.location.href).searchParams.has("submodule"),
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.matchMedia("(max-width: 650px)").matches);
  const isRunning = (scenario: Scenario) =>
    Boolean(activeRun && !activeRun.done && scenario.hasId && activeRun.scenarioIds?.includes(scenario.id));
  const activeStatus = (scenario: Scenario) =>
    isRunning(scenario)
      ? activeRun?.tests.some((test) => test.scenarioId === scenario.id && test.status === "running")
        ? "Running"
        : "In run"
      : scenario.status;
  const [search, setSearch] = useState("");
  const [featureFile, setFeatureFile] = useState<string>();
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [closedFlows, setClosedFlows] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string>();
  const [filter, setFilter] = useState("all");
  const [priority, setPriority] = useState("all");
  const [type, setType] = useState("all");
  const initializeNavigation = useCallback((catalog: Array<Scenario>) => {
    const navigation = navigationFromUrl(new URL(window.location.href), catalog);
    setFeatureFile(navigation.featureFile);
    setIsHome(navigation.isHome);
    setOpenModules(navigation.module ? new Set([navigation.module]) : new Set());
    if (navigation.featureFile) writeNavigationUrl(navigation.module, navigation.featureFile, true);
    else if (window.location.pathname !== "/automation" || window.location.search)
      writeNavigationUrl(undefined, undefined, true);
  }, []);
  const {
    scenarios: officialScenarios,
    error,
    loading,
  } = useScenarioCatalog(activeRun?.done ? activeRun.id : undefined, initializeNavigation, environment);
  const { scenarios, draftError } = useDraftScenarios(officialScenarios);
  useEffect(() => {
    if (!scenarios.length) return;
    const restoreNavigation = () => {
      const navigation = navigationFromUrl(new URL(window.location.href), scenarios);
      setFeatureFile(navigation.featureFile);
      setIsHome(navigation.isHome);
      setSelected(undefined);
      setOpenModules(navigation.module ? new Set([navigation.module]) : new Set());
      if (navigation.featureFile) writeNavigationUrl(navigation.module, navigation.featureFile, true);
      else if (window.location.pathname !== "/automation" || window.location.search)
        writeNavigationUrl(undefined, undefined, true);
    };
    window.addEventListener("popstate", restoreNavigation);
    return () => window.removeEventListener("popstate", restoreNavigation);
  }, [scenarios]);
  const modules = useMemo(() => groupModules(scenarios), [scenarios]);
  const types = useMemo(() => [...new Set(scenarios.map((s) => s.type).filter(Boolean))].sort(), [scenarios]);
  const priorities = useMemo(
    () =>
      [
        ...new Set(scenarios.flatMap((s) => s.tags.filter((t) => t.startsWith("@priority:")).map((t) => t.slice(10)))),
      ].sort(),
    [scenarios],
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
  const filtered = useMemo(
    () => filterScenarios(scenarios, { featureFile, suite: filter, priority, type, search }),
    [scenarios, featureFile, filter, priority, type, search],
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
    setFeatureFile(scenario.file);
    setIsHome(false);
    setOpenModules((previous) => new Set([...previous, scenario.module]));
    writeNavigationUrl(scenario.module, scenario.file);
    setClosedFlows((previous) => {
      const next = new Set(previous);
      next.delete(`${scenario.file}:${category(scenario)}`);
      return next;
    });
    setFilter("all");
    setPriority("all");
    setType("all");
    setSearch("");
    setSelected(scenario.key);
  };
  const feature = scenarios.find((s) => s.file === featureFile);
  const flows = useMemo(() => groupFlows(filtered), [filtered]);
  const hasFilters = Boolean(search.trim() || filter !== "all" || priority !== "all" || type !== "all");
  const featureCount = feature ? scenarios.filter((item) => item.file === feature.file).length : 0;
  const clearFilters = () => {
    setSearch("");
    setFilter("all");
    setPriority("all");
    setType("all");
  };
  const goHome = () => {
    writeNavigationUrl();
    setIsHome(true);
    setFeatureFile(undefined);
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
              <FilterSelect
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
          featureFile={featureFile}
          collapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
          onToggleModule={toggleModule}
          onSelectFeature={(module, file) => {
            if (window.matchMedia("(max-width: 650px)").matches) setSidebarCollapsed(true);
            setFeatureFile(file);
            setIsHome(false);
            setOpenModules((previous) => new Set([...previous, module]));
            writeNavigationUrl(module, file);
            setSearch("");
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
                    <h2>{search.trim() ? "Search results" : feature ? featureTitle(feature) : "Feature not found"}</h2>
                    <p aria-live="polite">
                      {search.trim()
                        ? `${filtered.length} ${filtered.length === 1 ? "scenario" : "scenarios"} found across all features`
                        : feature
                          ? `${filtered.length} of ${featureCount} ${featureCount === 1 ? "scenario" : "scenarios"} shown`
                          : "Choose a feature from the sidebar to continue."}
                    </p>
                  </div>
                  {feature && !search.trim() && (
                    <GroupRun
                      key={feature.file}
                      selection={{ kind: "feature", file: feature.file }}
                      name={featureTitle(feature)}
                      items={scenarios.filter((s) => s.file === feature.file)}
                    />
                  )}
                </div>
                <div className="toolbar">
                  <label className="search">
                    <Icon name="search" aria-hidden="true" className="search-icon" />
                    <input
                      aria-label="Search scenarios"
                      placeholder="Search all scenarios"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <FilterSelect
                    label="Filter by suite"
                    value={filter}
                    onChange={setFilter}
                    options={[
                      { value: "all", label: "All suites" },
                      { value: "smoke", label: "Smoke" },
                      { value: "regression", label: "Regression" },
                    ]}
                  />
                  <FilterSelect
                    label="Filter by priority"
                    value={priority}
                    onChange={setPriority}
                    options={[
                      { value: "all", label: "All priorities" },
                      ...priorities.map((p) => ({ value: p, label: p })),
                    ]}
                  />
                  <FilterSelect
                    label="Filter by type"
                    value={type}
                    onChange={setType}
                    options={[
                      { value: "all", label: "All types" },
                      ...types.map((t) => ({ value: t, label: label(t) })),
                    ]}
                  />
                </div>
                {hasFilters && (
                  <div className="filter-summary">
                    <span>Filters applied</span>
                    <button type="button" onClick={clearFilters}>
                      Clear all
                    </button>
                  </div>
                )}
              </div>
              <div className="scenario-list">
                {error && <p role="alert">{error}</p>}
                {draftError && <p role="alert">Drafts: {draftError}</p>}
                {loading && (
                  <div className="empty" role="status">
                    Loading scenarios&hellip;
                  </div>
                )}
                {!loading && !error && feature && filtered.length === 0 && (
                  <div className="empty">
                    <span className="empty-symbol" aria-hidden="true">
                      ⌕
                    </span>
                    <strong>No matching scenarios</strong>
                    <span>Try a different search or adjust your filters.</span>
                    <button type="button" className="clear-filters" onClick={clearFilters}>
                      Clear filters
                    </button>
                  </div>
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
                                setFeatureFile(s.file);
                                setOpenModules((previous) => new Set([...previous, s.module]));
                                writeNavigationUrl(s.module, s.file);
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
