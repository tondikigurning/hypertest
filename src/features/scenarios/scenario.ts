export interface Scenario {
  draft?: "added" | "changed" | "deleted";
  draftBefore?: { title: string; steps: Array<string>; background: Array<string> };
  key: string;
  line: number;
  id: string;
  hasId: boolean;
  title: string;
  feature: string;
  module: string;
  file: string;
  tags: Array<string>;
  catalogTags: Array<string>;
  steps: Array<string>;
  background: Array<string>;
  outline: boolean;
  flow: string;
  type: string;
  method: string;
  expect: string;
  status?: string;
  lastRun: string;
  duration: string;
  evidenceLabel: string;
  evidenceUrl: string;
  examples?: Array<{ id: string; title: string; status: string; durationMs: number; evidenceNames: Array<string> }>;
  availability: "unknown" | "unavailable";
  availabilityReasons: Array<string>;
}
export const label = (value: string) =>
  value
    .replace(/^_/, "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const flow = (s: Scenario) => s.flow || "Unassigned flow";
export const scenarioTagLabels = (scenario: Scenario) => {
  const visibleTags = scenario.tags.filter(
    (tag) =>
      !/^@(flow|expect|type|ref):/.test(tag) &&
      !/^@[A-Z]{2,4}_[A-Z0-9_]+_E2E_\d{3,4}$/.test(tag) &&
      !["@smoke", "@regression", "@quarantine", "@fixme", "@mock"].includes(tag),
  );
  return [
    ...scenario.catalogTags.map(label),
    ...(scenario.type ? [label(scenario.type)] : []),
    ...(scenario.tags.includes("@mock") ? ["Mock"] : []),
    ...(scenario.tags.includes("@quarantine") ? ["Quarantined"] : []),
    ...(scenario.tags.includes("@fixme") ? ["Fixme"] : []),
    ...visibleTags.map((tag) => label(tag.slice(1))),
  ];
};
const normalizeStepText = (value: string) =>
  value
    .trim()
    .replace(/^(?:given|when|then|and|but)\s+/i, "")
    .replace(/[.!?]+$/, "")
    .toLowerCase();
export const hasDistinctExpectedResult = (scenario: Scenario) => {
  if (!scenario.expect.trim()) return false;
  const steps = new Set(scenario.steps.map(normalizeStepText));
  return scenario.expect.split(";").some((part) => part.trim() && !steps.has(normalizeStepText(part)));
};
export const featureTitle = (scenario: Scenario) => {
  const parts = scenario.feature.split(/\s+[—–-]\s+/);
  return parts.length > 1 && parts[0].toLowerCase() === label(scenario.module).toLowerCase()
    ? parts.slice(1).join(" — ")
    : scenario.feature;
};
