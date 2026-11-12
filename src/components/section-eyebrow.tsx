import type { ReactNode } from "react";

export function SectionEyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={["evidence-eyebrow", className].filter(Boolean).join(" ")}>{children}</span>;
}
