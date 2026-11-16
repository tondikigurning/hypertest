import type { ReactNode } from "react";

export type ScenarioListStateProps =
  | { kind: "loading" }
  | { kind: "unwritten" }
  | { kind: "empty"; onClear: () => void };

export function ClearFiltersButton({
  children,
  className,
  onClear,
}: {
  children: ReactNode;
  className?: string;
  onClear: () => void;
}) {
  return (
    <button type="button" className={className} onClick={onClear}>
      {children}
    </button>
  );
}

export function ScenarioListState(props: ScenarioListStateProps) {
  if (props.kind === "loading") {
    return (
      <div className="empty" role="status">
        Loading scenarios&hellip;
      </div>
    );
  }

  if (props.kind === "unwritten") {
    return (
      <div className="empty">
        <strong>No scenarios yet</strong>
        <span>View this submodule's PRD to review its requirements or start authoring scenarios with Q-Rex.</span>
      </div>
    );
  }

  return (
    <div className="empty">
      <span className="empty-symbol" aria-hidden="true">
        ⌕
      </span>
      <strong>No matching scenarios</strong>
      <span>Try a different search or adjust your filters.</span>
      <ClearFiltersButton className="clear-filters" onClear={props.onClear}>
        Clear filters
      </ClearFiltersButton>
    </div>
  );
}
