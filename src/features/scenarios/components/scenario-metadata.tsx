import { label, type Scenario } from "../scenario";

export function ScenarioMetadata({ scenario }: { scenario: Scenario }) {
  const priority = scenario.tags.find((tag) => tag.startsWith("@priority:"))?.slice(10);
  const visibleTags = scenario.tags.filter(
    (tag) =>
      !/^@(flow|expect|type|ref|priority):/.test(tag) &&
      !/^@[A-Z]{2,4}_[A-Z0-9_]+_E2E_\d{3,4}$/.test(tag) &&
      !["@smoke", "@regression", "@quarantine", "@fixme", "@mock"].includes(tag),
  );
  const badges = [
    ...(scenario.draft
      ? [
          {
            text: `Draft ? ${scenario.draft === "added" ? "New" : scenario.draft === "changed" ? "Changed" : "Deleted"}`,
            tone: "attention",
          },
        ]
      : []),
    ...(priority ? [{ text: priority, tone: priority === "P0" ? "priority-high" : "neutral" }] : []),
    ...scenario.catalogTags.map((tag) => ({ text: label(tag), tone: "suite" })),
    ...(scenario.type ? [{ text: label(scenario.type), tone: "neutral" }] : []),
    ...(scenario.tags.includes("@mock") ? [{ text: "Mock", tone: "neutral" }] : []),
    ...(scenario.tags.includes("@quarantine") ? [{ text: "Quarantined", tone: "attention" }] : []),
    ...(scenario.tags.includes("@fixme") ? [{ text: "Fixme", tone: "attention" }] : []),
    ...visibleTags.map((tag) => ({ text: label(tag.slice(1)), tone: "neutral" })),
  ];
  return (
    <span className="scenario-meta">
      {badges.map((badge, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Duplicate labels are possible and badges have no state.
        <span className={`scenario-badge ${badge.tone}`} key={`${badge.tone}-${badge.text}-${index}`}>
          {badge.text}
        </span>
      ))}
    </span>
  );
}
