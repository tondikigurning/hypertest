import { Icon } from "@hyperscal/icons";
import { useEffect, useId, useRef, useState } from "react";
import { Modal, SelectInput, TextInput } from "../../../components";
import { agentFetch, getActiveDraftId } from "../agent-api";

interface ProviderChoice {
  id: string;
  label: string;
  configured: boolean;
}

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
  onSelected: (selection: { provider: string; model: string }) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [providerMenuContainer, setProviderMenuContainer] = useState<HTMLDivElement | null>(null);
  const [providers, setProviders] = useState<Array<ProviderChoice>>([]);
  const [browsingProvider, setBrowsingProvider] = useState(provider);
  const [catalog, setCatalog] = useState<{ target: string; models: Array<string>; error?: string }>();
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const target = JSON.stringify([draftId, browsingProvider, attempt]);
  const current = catalog?.target === target ? catalog : undefined;
  const models = current?.models || [];
  const loading = open && !current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onSelecting(false);
    };
  }, [onSelecting]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setError("");
    setCatalog(undefined);
    void Promise.all([
      agentFetch("/api/agent/models", {
        headers: { "X-Automation-Draft-Id": draftId },
        signal: controller.signal,
        cache: "no-store",
      }).then(async (response) => {
        if (!response.ok) throw new Error("Could not load providers.");
        const catalog = (await response.json()) as { providers: Array<ProviderChoice> };
        if (!controller.signal.aborted) setProviders(catalog.providers.filter((item) => item.configured));
        return catalog;
      }),
      agentFetch("/api/agent/discover-models", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Automation-Draft-Id": draftId },
        body: JSON.stringify({ provider: browsingProvider }),
        signal: controller.signal,
      }).then(async (response) => {
        const result = (await response.json()) as { models?: Array<string>; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load models.");
        return result.models || [];
      }),
    ])
      .then(([, availableModels]) => {
        if (controller.signal.aborted) return;
        setCatalog({ target, models: availableModels });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setCatalog({ target, models: [], error: cause instanceof Error ? cause.message : "Could not load models." });
      });
    return () => controller.abort();
  }, [open, draftId, browsingProvider, target]);

  const selectModel = async (nextModel: string) => {
    if (selecting || disabled || !models.includes(nextModel)) return;
    if (browsingProvider === provider && nextModel === model) {
      setOpen(false);
      return;
    }
    setSelecting(true);
    onSelecting(true);
    setError("");
    try {
      for (const path of ["model-test", "model"]) {
        if (!mounted.current || getActiveDraftId() !== draftId) return;
        const response = await agentFetch(`/api/agent/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Automation-Draft-Id": draftId },
          body: JSON.stringify({ provider: browsingProvider, model: nextModel }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(result.error || "Could not select this model.");
      }
      if (mounted.current && getActiveDraftId() === draftId) {
        onSelected({ provider: browsingProvider, model: nextModel });
        setOpen(false);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not select this model.");
    } finally {
      if (mounted.current) {
        setSelecting(false);
        onSelecting(false);
      }
    }
  };

  const providerOptions = providers.some((item) => item.id === browsingProvider)
    ? providers
    : [{ id: browsingProvider, label: browsingProvider, configured: true }, ...providers];
  const filtered = models.filter((id) => id.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div className="agent-header-model">
      <button
        ref={trigger}
        type="button"
        className="agent-model-picker-trigger"
        disabled={disabled || selecting}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Choose AI model. Current: ${provider}, ${model}`}
        title={`${provider} · ${model}`}
        onClick={() => {
          setBrowsingProvider(provider);
          setSearch("");
          setOpen(true);
        }}
      >
        <span>{model}</span>
        <Icon name="chevron-down" aria-hidden="true" />
      </button>
      {open && (
        <Modal
          className="prd-confirm-dialog agent-confirm-dialog agent-model-dialog"
          labelledBy={titleId}
          returnFocus={trigger}
          onClose={() => {
            if (!selecting) setOpen(false);
          }}
        >
          <div className="agent-model-dialog-heading">
            <h2 id={titleId}>Choose AI model</h2>
            <button type="button" aria-label="Close model picker" disabled={selecting} onClick={() => setOpen(false)}>
              <Icon name="x" aria-hidden="true" />
            </button>
          </div>
          <p>Choose a connected provider and model. Each model remembers its own effort setting.</p>
          <div className="agent-model-provider" ref={setProviderMenuContainer}>
            <SelectInput
              portalContainer={providerMenuContainer}
              label="AI provider"
              value={browsingProvider}
              disabled={selecting}
              options={providerOptions.map((item) => ({ value: item.id, label: item.label }))}
              onChange={(value) => {
                setBrowsingProvider(value);
                setSearch("");
              }}
            />
          </div>
          <TextInput
            aria-label="Search models"
            placeholder="Search models…"
            value={search}
            onValueChange={setSearch}
            disabled={selecting}
          />
          <section className="agent-model-results" aria-label="Available models" aria-busy={loading || selecting}>
            {loading ? (
              <p role="status">Loading models…</p>
            ) : (
              filtered.map((id) => (
                <button
                  type="button"
                  key={id}
                  disabled={selecting || disabled}
                  aria-pressed={provider === browsingProvider && model === id}
                  onClick={() => void selectModel(id)}
                >
                  <span>{id}</span>
                  {provider === browsingProvider && model === id && <span>Selected</span>}
                </button>
              ))
            )}
            {!loading && !error && !current?.error && !filtered.length && (
              <p>{models.length ? "No models match your search." : "This provider returned no models."}</p>
            )}
          </section>
          {selecting && <p role="status">Checking model tool support…</p>}
          {(error || current?.error) && (
            <p className="agent-header-model-error" role="alert">
              {error || current?.error}{" "}
              <button type="button" disabled={selecting} onClick={() => setAttempt((value) => value + 1)}>
                Retry loading
              </button>
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
