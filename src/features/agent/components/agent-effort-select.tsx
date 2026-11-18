import { SelectInput } from "../../../components";
import { effortLevels } from "../agent-effort-preferences";
import type { useAgentEffort } from "../use-agent-effort";

export function AgentEffortSelect({
  control,
  disabled,
}: {
  control: ReturnType<typeof useAgentEffort>;
  disabled: boolean;
}) {
  return (
    <div
      className="agent-effort"
      title={control.googleAdapter ? "The Google adapter supports low, medium, and high." : "Reasoning effort"}
    >
      <SelectInput
        label="Reasoning effort"
        value={control.effort}
        disabled={disabled}
        onChange={control.select}
        options={effortLevels.map((value) => ({
          value,
          label: value,
          disabled: control.googleAdapter && value === "xhigh",
        }))}
      />
    </div>
  );
}
