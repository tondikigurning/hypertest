import type { ReactNode } from "react";
import { TextInput } from "../../../components";

interface AgentContextSearchProps {
  value: string;
  placeholder: string;
  label: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function AgentContextSearch({ value, placeholder, label, onChange, maxLength }: AgentContextSearchProps) {
  return (
    <TextInput
      className="agent-context-search"
      value={value}
      maxLength={maxLength}
      onValueChange={onChange}
      placeholder={placeholder}
      aria-label={label}
    />
  );
}

export function AgentContextOption({
  title,
  description,
  onSelect,
}: {
  title: ReactNode;
  description?: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect}>
      <strong>{title}</strong>
      {description && <small>{description}</small>}
    </button>
  );
}

export function AgentContextResults({ children }: { children: ReactNode }) {
  return <div className="agent-context-results">{children}</div>;
}

export function AgentContextError({ children }: { children: ReactNode }) {
  return (
    <p className="agent-context-error" role="alert">
      {children}
    </p>
  );
}

export function AgentContextAction({ children, onSelect }: { children: ReactNode; onSelect: () => void }) {
  return (
    <button type="button" className="agent-context-edit" onClick={onSelect}>
      {children}
    </button>
  );
}
