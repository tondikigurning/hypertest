import { label, type Scenario } from "../scenario";

export function ScenarioMetadata({ scenario }: { scenario: Scenario }) {
  const priority = scenario.tags.find((tag) => tag.startsWith("@priority:"))?.slice(10);
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
