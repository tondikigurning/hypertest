export function RunStatus({ status }: { status?: string }) {
  const label = status?.trim() || "Not run";
  const normalized = label.toLowerCase();
  const kind =
    normalized === "running" || normalized === "in run"
      ? "running"
      : normalized.includes("pass")
        ? "passed"
        : normalized.includes("fail")
          ? "failed"
          : normalized.includes("skip")
            ? "skipped"
            : normalized.includes("not run") || !normalized
              ? "not-run"
              : "unknown";
  const icon =
    kind === "passed" ? "✓" : kind === "failed" ? "×" : kind === "skipped" ? "↷" : kind === "not-run" ? "·" : "?";
  return (
    <span className={`run-status ${kind}`}>
      <span className="run-status-icon" aria-hidden="true">
        {kind !== "running" && icon}
      </span>
      {label}
    </span>
  );
}
