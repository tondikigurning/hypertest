import { CollapsibleRegion } from "../../../components";
import { label } from "../scenario";

interface ScenarioModule {
  name: string;
  features: Array<{ file: string; title: string; count: number }>;
}

export function ScenarioNavigation({
  modules,
  openModules,
  featureFile,
  collapsed,
  onToggleSidebar,
  onToggleModule,
  onSelectFeature,
}: {
  modules: Array<ScenarioModule>;
  openModules: Set<string>;
  featureFile?: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
  onToggleModule: (name: string) => void;
  onSelectFeature: (module: string, file: string) => void;
}) {
  return (
    <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}`} aria-label="Automation navigation">
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
        {modules.map((group) => (
          <div className="module-group" key={group.name}>
            <button
              type="button"
              className={`module-toggle${group.features.some((item) => item.file === featureFile) ? " has-active-feature" : ""}`}
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
                {group.features.map((item) => (
                  <button
                    type="button"
                    key={item.file}
                    className={
                      featureFile === item.file ? "nav-item feature-nav-item active" : "nav-item feature-nav-item"
                    }
                    aria-current={featureFile === item.file ? "page" : undefined}
                    onClick={() => onSelectFeature(group.name, item.file)}
                  >
                    <span>{item.title}</span>
                    <span>{item.count}</span>
                  </button>
                ))}
              </div>
            </CollapsibleRegion>
          </div>
        ))}
      </div>
    </aside>
  );
}
