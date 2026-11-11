import type { ReactNode } from "react";

export function CollapsibleRegion({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  return (
    <div className={expanded ? "collapse-region open" : "collapse-region"} aria-hidden={!expanded} inert={!expanded}>
      <div className="collapse-inner">{children}</div>
    </div>
  );
}
