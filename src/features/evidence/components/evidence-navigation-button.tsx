export function EvidenceNavigationButton({
  direction,
  disabled,
  onSelect,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onSelect: () => void;
}) {
  const previous = direction === "previous";
  return (
    <button type="button" onClick={onSelect} disabled={disabled} aria-label={previous ? "Previous file" : "Next file"}>
      {previous ? "\u2190" : "\u2192"}
    </button>
  );
}
