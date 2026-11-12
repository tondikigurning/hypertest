import type { ButtonHTMLAttributes, ReactNode } from "react";

export function AgentWorkspaceButton({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type={type} className={["agent-workspace-button", className].filter(Boolean).join(" ")} />;
}

export function AgentReviewHeading({
  title,
  description,
  actionLabel,
  disabled = false,
  onAction,
  badge,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  disabled?: boolean;
  onAction?: () => void;
  badge?: ReactNode;
}) {
  return (
    <div className="agent-review-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actionLabel && onAction && (
        <AgentWorkspaceButton disabled={disabled} onClick={onAction}>
          {actionLabel}
        </AgentWorkspaceButton>
      )}
      {badge && <span className="agent-heading-badge">{badge}</span>}
    </div>
  );
}

export function AgentReviewNote({
  title,
  children,
  as = "p",
}: {
  title: string;
  children: ReactNode;
  as?: "div" | "p";
}) {
  const Element = as;
  return (
    <Element className="agent-review-note">
      <strong>{title}</strong>
      <span>{children}</span>
    </Element>
  );
}

export function AgentAlert({
  children,
  as = "p",
  className,
}: {
  children: ReactNode;
  as?: "div" | "p";
  className?: string;
}) {
  const Element = as;
  return (
    <Element className={["agent-error", className].filter(Boolean).join(" ")} role="alert">
      {children}
    </Element>
  );
}

export function AgentReviewStatus({ children }: { children: ReactNode }) {
  return (
    <p className="agent-review-empty" role="status">
      {children}
    </p>
  );
}

export function AgentModelButton({
  children,
  title,
  onClick,
}: {
  children: ReactNode;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button className="agent-model-fallback" type="button" title={title} onClick={onClick}>
      {children}
    </button>
  );
}

export function PullRequestLink({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
