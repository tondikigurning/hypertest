import type { ReactNode } from "react";

export function RunPanel({ children }: { children: ReactNode }) {
  return <div className="local-run">{children}</div>;
}
