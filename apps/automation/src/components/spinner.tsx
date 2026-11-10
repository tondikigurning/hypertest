export function Spinner({ variant = "evidence" }: { variant?: "evidence" | "play" }) {
  return <span className={variant === "play" ? "play-spinner" : "evidence-spinner"} aria-hidden="true" />;
}
