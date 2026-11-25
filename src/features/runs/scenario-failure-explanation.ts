export function scenarioFailureExplanation(status: string, steps: Array<{ status: string }>): string | null {
  if (status !== "failed" || steps.length === 0 || !steps.every((step) => step.status === "passed")) return null;
  return "The scenario failed outside the displayed steps, possibly during setup or cleanup.";
}
