import { useEffect, useState } from "react";
import { SelectInput } from "../../../components";
import { agentFetch, getActiveDraftId } from "../agent-api";

export function AgentModelSelect({
  draftId,
  provider,
  model,
  disabled,
  onSelecting,
  onSelected,
}: {
  draftId: string;
  provider: string;
  model: string;
  disabled: boolean;
  onSelecting: (selecting: boolean) => void;
  onSelected: (model: string) => void;
}) {
  const [models, setModels] = useState<Array<string>>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry reloads the model list.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void agentFetch("/api/agent/discover-models", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Automation-Draft-Id": draftId },
      body: JSON.stringify({ provider }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as { models?: Array<string>; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load models.");
        if (!controller.signal.aborted) setModels(result.models || []);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load models.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [draftId, provider, attempt]);

  const selectModel = async (nextModel: string) => {
    if (nextModel === model || selecting) return;
    setSelecting(true);
    onSelecting(true);
    setError("");
    try {
      for (const path of ["model-test", "model"]) {
        if (getActiveDraftId() !== draftId) return;
        const response = await agentFetch(`/api/agent/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Automation-Draft-Id": draftId },
          body: JSON.stringify({ provider, model: nextModel }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error || "Could not select this model.");
      }
      if (getActiveDraftId() === draftId) onSelected(nextModel);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not select this model.");
    } finally {
      setSelecting(false);
      onSelecting(false);
    }
  };

  const options = models.includes(model) ? models : [model, ...models];
  return (
    <div className="agent-header-model">
      <SelectInput
        label={`Model for ${provider}`}
        value={model}
        disabled={disabled || loading || selecting || models.length === 0}
        onChange={(value) => void selectModel(value)}
        options={options.map((id) => ({ value: id, label: id }))}
      />
      {selecting && <span role="status">Checking model…</span>}
      {error && (
        <span className="agent-header-model-error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry loading
          </button>
        </span>
      )}
    </div>
  );
}
