import type { ReactNode } from "react";

export function AgentWorkspaceTab({
  current,
  disabled = false,
  onSelect,
  children,
}: {
  current: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-current={current ? "page" : undefined} disabled={disabled} onClick={onSelect}>
      {children}
    </button>
  );
}
