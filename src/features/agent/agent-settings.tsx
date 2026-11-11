import { type ReactNode, useEffect, useMemo, useState } from "react";
import { SelectInput, TextInput } from "../../components";
import { agentFetch } from "./agent-api";
import { AgentAlert } from "./components/agent-review-controls";

interface AgentSession {
  provider?: string;
  model?: string;
}

interface ProviderModel {
  id: string;
  label: string;
  tested: boolean;
  checkedAt?: string;
}

interface ProviderInfo {
  id: string;
  label: string;
  configured: boolean;
  models: Array<ProviderModel>;
  compatibleEndpoint?: boolean;
  verifiedModels?: Array<string>;
}

interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface SettingsSnapshot {
  encryptionConfigured: boolean;
  authenticated: boolean;
  credentials: Array<{ provider: string; configured: boolean; baseUrl?: string }>;
  usage: { session: UsageTotals; user: UsageTotals };
  provider?: string;
  model?: string;
}

interface ModelSnapshot {
  providers: Array<ProviderInfo>;
  provider?: string;
  model?: string;
}

const endpoint = "/api/agent";
const providers = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google" },
  { id: "openai-compatible", label: "OpenAI-compatible endpoint" },
];

function AgentSettingsActions({ children }: { children: ReactNode }) {
  return <div className="agent-settings-actions">{children}</div>;
}

function AgentSettingsPanel({ children, label, busy }: { children: ReactNode; label?: string; busy?: boolean }) {
  return (
    <section className="agent-settings" aria-label={label} aria-busy={busy}>
      {children}
    </section>
  );
}

async function readJson<T>(path: string, init?: RequestInit) {
  const response = await agentFetch(path, init);
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Could not load AI provider settings.");
  return result;
}

export function AgentSettings({ onSessionSaved }: { onSessionSaved: (session: AgentSession) => void }) {
  const [settings, setSettings] = useState<SettingsSnapshot>();
  const [providerModels, setProviderModels] = useState<Array<ProviderInfo>>([]);
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [modelId, setModelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [verifiedModels, setVerifiedModels] = useState<Array<string>>([]);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const providerInfo = useMemo(
    () => providerModels.find((item) => item.id === selectedProvider),
    [providerModels, selectedProvider],
  );
  const savedCredential = settings?.credentials.find((item) => item.provider === selectedProvider);
  const isCompatible = selectedProvider === "openai-compatible";
  const modelInfo = providerInfo?.models.find((item) => item.id === modelId);
  const modelIsVerified = isCompatible ? verifiedModels.includes(modelId) : modelInfo?.tested === true;

  const refresh = async (provider = selectedProvider) => {
    setError("");
    const [nextSettings, nextModels] = await Promise.all([
      readJson<SettingsSnapshot>(`${endpoint}/settings`, { cache: "no-store" }),
      readJson<ModelSnapshot>(`${endpoint}/models?provider=${encodeURIComponent(provider)}`, { cache: "no-store" }),
    ]);
    setSettings(nextSettings);
    setProviderModels(nextModels.providers);
    const currentProvider = nextModels.providers[0];
    setVerifiedModels(currentProvider?.verifiedModels || []);
    if (currentProvider?.id === "openai-compatible" && !modelId && nextSettings.model) setModelId(nextSettings.model);
    else if (!modelId && currentProvider?.models.length) setModelId(currentProvider.models[0].id);
    setBaseUrl(nextSettings.credentials.find((item) => item.provider === provider)?.baseUrl || "");
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retrying reloads both settings and models.
  useEffect(() => {
    let current = true;
    void Promise.all([
      readJson<SettingsSnapshot>(`${endpoint}/settings`, { cache: "no-store" }),
      readJson<ModelSnapshot>(`${endpoint}/models`, { cache: "no-store" }),
    ])
      .then(([nextSettings, nextModels]) => {
        if (!current) return;
        setSettings(nextSettings);
        setProviderModels(nextModels.providers);
        const provider = nextModels.provider || nextSettings.provider || "openai";
        const activeProvider = nextModels.providers.find((item) => item.id === provider);
        setSelectedProvider(provider);
        setModelId(nextModels.model || nextSettings.model || activeProvider?.models[0]?.id || "");
        setVerifiedModels(activeProvider?.verifiedModels || []);
        setBaseUrl(nextSettings.credentials.find((item) => item.provider === provider)?.baseUrl || "");
      })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : "Could not load AI provider settings.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [loadAttempt]);

  const changeProvider = async (value: string) => {
    setLoadingModels(true);
    setSelectedProvider(value);
    setModelId("");
    setApiKey("");
    setVerifiedModels([]);
    setError("");
    setNotice("");
    try {
      const result = await readJson<ModelSnapshot>(`${endpoint}/models?provider=${encodeURIComponent(value)}`, {
        cache: "no-store",
      });
      setProviderModels(result.providers);
      setVerifiedModels(result.providers[0]?.verifiedModels || []);
      setModelId(result.providers[0]?.models[0]?.id || "");
      setBaseUrl(settings?.credentials.find((item) => item.provider === value)?.baseUrl || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load models.");
    } finally {
      setLoadingModels(false);
    }
  };

  const saveCredential = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await readJson<{
        encryptionConfigured: boolean;
        credentials: SettingsSnapshot["credentials"];
        session: AgentSession;
      }>(`${endpoint}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, apiKey, baseUrl }),
      });
      setSettings((current) => current && { ...current, credentials: result.credentials });
      onSessionSaved(result.session);
      setApiKey("");
      setVerifiedModels([]);
      setNotice("Key saved encrypted. The value is not shown again.");
      await refresh(selectedProvider);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this provider key.");
    } finally {
      setSaving(false);
    }
  };

  const testModel = async () => {
    setTesting(true);
    setError("");
    setNotice("");
    try {
      await readJson(`${endpoint}/model-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, model: modelId }),
      });
      setNotice("Tool-calling check passed. This model is available for the current local identity.");
      await refresh(selectedProvider);
      if (isCompatible) setVerifiedModels((current) => [...new Set([...current, modelId])]);
      await refreshSettingsOnly();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The tool-calling check failed.");
    } finally {
      setTesting(false);
    }
  };

  const refreshSettingsOnly = async () => {
    try {
      setSettings(await readJson<SettingsSnapshot>(`${endpoint}/settings`, { cache: "no-store" }));
    } catch {
      // Keep the current settings visible if a usage refresh fails.
    }
  };

  const selectModel = async () => {
    setSelecting(true);
    setError("");
    try {
      const session = await readJson<AgentSession>(`${endpoint}/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, model: modelId }),
      });
      onSessionSaved(session);
      setNotice("This provider and model are selected for the current chat.");
      await refreshSettingsOnly();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not select this model.");
    } finally {
      setSelecting(false);
    }
  };

  const removeCredential = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await readJson<{ session: AgentSession }>(
        `${endpoint}/credentials/${encodeURIComponent(selectedProvider)}`,
        { method: "DELETE" },
      );
      onSessionSaved(result.session);
      await refresh(selectedProvider);
      setNotice("Provider key removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this provider key.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AgentSettingsPanel busy>Loading provider settings…</AgentSettingsPanel>;

  if (!settings)
    return (
      <AgentSettingsPanel label="AI provider settings">
        <h2>AI provider and usage</h2>
        <AgentAlert>Could not load provider settings. Check that the local Automation API is running.</AgentAlert>
        <AgentSettingsActions>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            Retry
          </button>
        </AgentSettingsActions>
      </AgentSettingsPanel>
    );

  const settingsBusy = saving || testing || selecting || loadingModels;

  return (
    <AgentSettingsPanel label="AI provider settings">
      <div className="agent-settings-heading">
        <div>
          <h2>AI provider and usage</h2>
          <p>Keys stay in the local API and are encrypted before storage.</p>
        </div>
        <span>{settings?.authenticated ? "Authenticated account" : "Local preview identity"}</span>
      </div>

      {!settings?.encryptionConfigured && (
        <p className="agent-settings-note" role="status">
          Set AUTOMATION_AGENT_ENCRYPTION_KEY in the API environment before saving provider keys.
        </p>
      )}

      <label htmlFor="agent-provider">
        Provider
        <SelectInput
          label="Provider"
          id="agent-provider"
          value={selectedProvider}
          disabled={settingsBusy}
          onChange={(value) => void changeProvider(value)}
          options={providers.map((provider) => ({ value: provider.id, label: provider.label }))}
        />
      </label>

      {isCompatible && (
        <label htmlFor="agent-endpoint-url">
          HTTPS endpoint URL
          <TextInput
            id="agent-endpoint-url"
            type="url"
            disabled={settingsBusy}
            value={baseUrl}
            onValueChange={setBaseUrl}
            placeholder="https://openrouter.ai/api/v1"
            autoComplete="url"
          />
        </label>
      )}

      <label htmlFor="agent-api-key">
        {savedCredential ? "Replace API key" : "API key"}
        <TextInput
          id="agent-api-key"
          type="password"
          disabled={settingsBusy}
          value={apiKey}
          onValueChange={setApiKey}
          autoComplete="new-password"
          spellCheck={false}
          placeholder={savedCredential ? "Saved key is hidden" : "Paste provider API key"}
        />
      </label>
      <AgentSettingsActions>
        <button
          type="button"
          onClick={() => void saveCredential()}
          disabled={settingsBusy || !apiKey || !settings.encryptionConfigured}
        >
          {saving ? "Saving…" : savedCredential ? "Replace key" : "Save key"}
        </button>
        {savedCredential && (
          <button type="button" onClick={() => void removeCredential()} disabled={settingsBusy}>
            Remove key
          </button>
        )}
      </AgentSettingsActions>

      <label htmlFor={isCompatible ? "agent-compatible-model" : "agent-provider-model"}>
        Model
        {isCompatible ? (
          <TextInput
            id="agent-compatible-model"
            disabled={settingsBusy}
            value={modelId}
            onValueChange={setModelId}
            placeholder="Provider model ID"
            autoComplete="off"
          />
        ) : (
          <SelectInput
            label="Model"
            id="agent-provider-model"
            value={modelId}
            disabled={settingsBusy}
            onChange={setModelId}
            options={
              providerInfo?.models.map((model) => ({
                value: model.id,
                label: `${model.label}${model.tested ? " · tested" : " · needs test"}`,
              })) ?? []
            }
          />
        )}
      </label>
      <AgentSettingsActions>
        <button type="button" onClick={() => void testModel()} disabled={settingsBusy || !savedCredential || !modelId}>
          {testing ? "Testing tool-calling…" : "Test model"}
        </button>
        <button type="button" onClick={() => void selectModel()} disabled={settingsBusy || !modelIsVerified}>
          {selecting ? "Selecting…" : "Use for this chat"}
        </button>
      </AgentSettingsActions>
      {modelInfo?.checkedAt && <small>Last successful check: {new Date(modelInfo.checkedAt).toLocaleString()}</small>}

      {settings?.usage && (
        <section className="agent-usage" aria-label="Token usage">
          <div>
            <strong>This session</strong>
            <span>
              {settings.usage.session.inputTokens.toLocaleString()} in ·{" "}
              {settings.usage.session.outputTokens.toLocaleString()} out ·{" "}
              {settings.usage.session.totalTokens.toLocaleString()} total
            </span>
          </div>
          <div>
            <strong>This local user</strong>
            <span>
              {settings.usage.user.inputTokens.toLocaleString()} in ·{" "}
              {settings.usage.user.outputTokens.toLocaleString()} out ·{" "}
              {settings.usage.user.totalTokens.toLocaleString()} total
            </span>
          </div>
        </section>
      )}
      {error && <AgentAlert>{error}</AgentAlert>}
      {notice && (
        <p className="agent-settings-success" role="status">
          {notice}
        </p>
      )}
    </AgentSettingsPanel>
  );
}
