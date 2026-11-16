import { useEffect, useId, useState } from "react";
import { CollapsibleRegion } from "../../../components";
import { label } from "../scenario";
import type { ScenarioGroup, ScenarioModule } from "../selectors";

function NavigationGroup({
  group,
  scopePath,
  openGroups,
  onToggleGroup,
  onSelect,
}: {
  group: ScenarioGroup;
  scopePath?: string;
  openGroups: Set<string>;
  onToggleGroup: (path: string) => void;
  onSelect: (path: string) => void;
}) {
  const regionId = useId();
  const hasChildren = group.children.length > 0;
  const expanded = openGroups.has(group.path);
  const active = scopePath === group.path;
  const containsActive = scopePath?.startsWith(`${group.path}/`);
  return (
    <div className="navigation-group">
      <div className={["navigation-group-row", containsActive && "contains-active"].filter(Boolean).join(" ")}>
        <button
          type="button"
          className={["nav-item feature-nav-item", active && "active"].filter(Boolean).join(" ")}
          aria-current={active ? "page" : undefined}
          onClick={() => onSelect(group.path)}
        >
          <span>{group.title}</span>
          <span>{group.count}</span>
        </button>
        {hasChildren && (
          <button
            type="button"
            className="navigation-group-toggle"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${group.title}`}
            aria-expanded={expanded}
            aria-controls={regionId}
            onClick={() => onToggleGroup(group.path)}
          >
            <svg className="module-chevron" aria-hidden="true" viewBox="0 0 16 16" fill="none">
              <path d="m6 4 4 4-4 4" />
            </svg>
          </button>
        )}
      </div>
      {hasChildren && (
        <div id={regionId}>
          <CollapsibleRegion expanded={expanded}>
            <div className="feature-nav nested-feature-nav">
              {group.children.map((child) => (
                <NavigationGroup
                  key={child.path}
                  group={child}
                  scopePath={scopePath}
                  openGroups={openGroups}
                  onToggleGroup={onToggleGroup}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </CollapsibleRegion>
        </div>
      )}
    </div>
  );
}

export function ScenarioNavigation({
  modules,
  openModules,
  scopePath,
  collapsed,
  onToggleSidebar,
  onToggleModule,
  onSelectGroup,
  prdError,
}: {
  modules: Array<ScenarioModule>;
  openModules: Set<string>;
  scopePath?: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
  onToggleModule: (name: string) => void;
  onSelectGroup: (module: string, path: string) => void;
  prdError?: string;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!scopePath) return;
    const parts = scopePath.split("/");
    setOpenGroups((previous) => {
      const next = new Set(previous);
      for (let length = 2; length <= parts.length; length++) next.add(parts.slice(0, length).join("/"));
      return next;
    });
  }, [scopePath]);
  const toggleGroup = (path: string) => {
    setOpenGroups((previous) => {
      const next = new Set(previous);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };
  return (
    <aside
      className={["sidebar", collapsed && "sidebar-collapsed"].filter(Boolean).join(" ")}
      aria-label="Automation navigation"
    >
      <div className="sidebar-top">
        {!collapsed && <span className="sidebar-heading">Modules</span>}
        <button
          type="button"
          className="sidebar-collapse"
          onClick={onToggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
          title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
          aria-expanded={!collapsed}
          aria-controls="sidebar-modules"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2" />
            <path d="M7.5 4v12M11 8l2 2-2 2" className={collapsed ? "" : "collapse-arrow"} />
          </svg>
        </button>
      </div>
      <div id="sidebar-modules" className="sidebar-modules" hidden={collapsed}>
        {prdError && <p role="alert">Could not refresh PRDs: {prdError}</p>}
        {modules.map((group) => (
          <div className="module-group" key={group.name}>
            <button
              type="button"
              className={["module-toggle", scopePath?.startsWith(`${group.name}/`) && "has-active-feature"]
                .filter(Boolean)
                .join(" ")}
              aria-expanded={openModules.has(group.name)}
              onClick={() => onToggleModule(group.name)}
            >
              <span className="module-name">{label(group.name)}</span>
              <svg className="module-chevron" aria-hidden="true" viewBox="0 0 16 16" fill="none">
                <path d="m6 4 4 4-4 4" />
              </svg>
            </button>
            <CollapsibleRegion expanded={openModules.has(group.name)}>
              <div className="feature-nav">
                {group.submodules.map((item) => (
                  <NavigationGroup
                    key={item.path}
                    group={item}
                    scopePath={scopePath}
                    openGroups={openGroups}
                    onToggleGroup={toggleGroup}
                    onSelect={(path) => onSelectGroup(group.name, path)}
                  />
                ))}
              </div>
            </CollapsibleRegion>
          </div>
        ))}
      </div>
    </aside>
  );
}
