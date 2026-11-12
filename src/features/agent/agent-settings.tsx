import { type ReactNode, useEffect, useMemo, useState } from "react";
import { FormField, SelectInput, TextInput } from "../../components";
import { agentFetch } from "./agent-api";
import {
  AgentAlert,
  AgentReviewHeading,
  AgentReviewStatus,
  AgentWorkspaceButton,
} from "./components/agent-review-controls";

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
  defaultBaseUrl?: string;
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
  credentials: Array<{ provider: string; configured: boolean; baseUrl?: string; apiKey?: string }>;
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
function isLoopbackEndpoint(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

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

export function AgentSettings({
  onSessionSaved,
  available,
  unavailableReason,
  agentBusy,
}: {
  onSessionSaved: (session: AgentSession) => void;
  available: boolean;
  unavailableReason: string;
  agentBusy: boolean;
}) {
  const [settings, setSettings] = useState<SettingsSnapshot>();
  const [providerModels, setProviderModels] = useState<Array<ProviderInfo>>([]);
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [modelId, setModelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [keyVisible, setKeyVisible] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [discoveredModels, setDiscoveredModels] = useState<Array<string>>([]);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelLoadAttempt, setModelLoadAttempt] = useState(0);
  const [modelLoadFailed, setModelLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const providerInfo = useMemo(
    () => providerModels.find((item) => item.id === selectedProvider),
    [providerModels, selectedProvider],
  );
  const savedCredential = settings?.credentials.find((item) => item.provider === selectedProvider);
  const isCompatible = providerInfo?.compatibleEndpoint === true;
  const localEndpoint = isCompatible && isLoopbackEndpoint(baseUrl);
  const unsavedCredential = savedCredential
    ? apiKey !== (savedCredential.apiKey || "") || Boolean(isCompatible && baseUrl !== savedCredential.baseUrl)
    : Boolean(apiKey);
  const setupStep = !settings?.encryptionConfigured
    ? "First, set up encryption to protect your API key."
    : !savedCredential
      ? "Choose a provider and save its connection."
      : unsavedCredential
        ? "Save your changes to continue."
        : !discoveredModels.length
          ? loadingModels
            ? "Loading available models..."
            : "No models available. Check your provider connection."
          : !modelId
            ? "Choose a model to continue."
            : settings.provider !== selectedProvider || settings.model !== modelId
              ? "Checking your selected model for this chat."
              : "";

  const refresh = async (provider = selectedProvider) => {
    setError("");
    const [nextSettings, nextModels] = await Promise.all([
      readJson<SettingsSnapshot>(`${endpoint}/settings`, { cache: "no-store" }),
      readJson<ModelSnapshot>(`${endpoint}/models?provider=${encodeURIComponent(provider)}`, { cache: "no-store" }),
    ]);
    setSettings(nextSettings);
    setProviderModels((current) =>
      current.map((item) => nextModels.providers.find((updated) => updated.id === item.id) || item),
    );
    const currentProvider = nextModels.providers[0];
    setApiKey(nextSettings.credentials.find((item) => item.provider === provider)?.apiKey || "");
    setBaseUrl(
      nextSettings.credentials.find((item) => item.provider === provider)?.baseUrl ||
        currentProvider?.defaultBaseUrl ||
        "",
    );
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retrying reloads both settings and models.
  useEffect(() => {
    if (!available) return;
    let current = true;
    void Promise.all([
      readJson<SettingsSnapshot>(`${endpoint}/settings`, { cache: "no-store" }),
      readJson<ModelSnapshot>(`${endpoint}/models`, { cache: "no-store" }),
    ])
      .then(([nextSettings, nextModels]) => {
        if (!current) return;
        setSettings(nextSettings);
        setProviderModels(nextModels.providers);
        const provider =
          nextModels.provider || nextSettings.provider || nextSettings.credentials[0]?.provider || "openai";
        const activeProvider = nextModels.providers.find((item) => item.id === provider);
        setSelectedProvider(provider);
        setModelId(nextModels.model || nextSettings.model || "");
        setDiscoveredModels([]);
        setApiKey(nextSettings.credentials.find((item) => item.provider === provider)?.apiKey || "");
        setBaseUrl(
          nextSettings.credentials.find((item) => item.provider === provider)?.baseUrl ||
            activeProvider?.defaultBaseUrl ||
            "",
        );
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
  }, [loadAttempt, available]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry and saved connection changes reload the provider models.
  useEffect(() => {
    if (!available || !savedCredential) {
      setDiscoveredModels([]);
      setLoadingModels(false);
      return;
    }
    const controller = new AbortController();
    setLoadingModels(true);
    setModelLoadFailed(false);
    setDiscoveredModels([]);
    void readJson<{ models: Array<string> }>(`${endpoint}/discover-models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: selectedProvider }),
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setDiscoveredModels(result.models);
        setModelId((current) => (result.models.includes(current) ? current : ""));
        if (!result.models.length) setNotice("This provider returned no available models.");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setModelLoadFailed(true);
        setError(cause instanceof Error ? cause.message : "Could not load models.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingModels(false);
      });
    return () => controller.abort();
  }, [available, selectedProvider, savedCredential, modelLoadAttempt]);

  const changeProvider = (value: string) => {
    setKeyVisible(false);
    setSelectedProvider(value);
    setModelId(settings?.provider === value ? settings.model || "" : "");
    setApiKey(settings?.credentials.find((item) => item.provider === value)?.apiKey || "");
    setBaseUrl(
      settings?.credentials.find((item) => item.provider === value)?.baseUrl ||
        providerModels.find((item) => item.id === value)?.defaultBaseUrl ||
        "",
    );
    setDiscoveredModels([]);
    setError("");
    setNotice("");
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
      setDiscoveredModels([]);
      setModelId("");
      await refresh(selectedProvider);
      setModelLoadAttempt((attempt) => attempt + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this provider key.");
    } finally {
      setSaving(false);
    }
  };

  const refreshSettingsOnly = async () => {
    try {
      setSettings(await readJson<SettingsSnapshot>(`${endpoint}/settings`, { cache: "no-store" }));
    } catch {
      // Keep the current settings visible if a usage refresh fails.
    }
  };

  const setupEncryption = async () => {
    setSaving(true);
    setError("");
    try {
      await readJson(`${endpoint}/encryption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      await refreshSettingsOnly();
      setNotice("Local key encryption is ready.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not set up local key encryption.");
    } finally {
      setSaving(false);
    }
  };

  const selectModel = async (nextModel: string) => {
    setModelId(nextModel);
    setSelecting(true);
    setError("");
    setNotice("");
    let checked = false;
    try {
      await readJson(`${endpoint}/model-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, model: nextModel }),
      });
      checked = true;
      const session = await readJson<AgentSession>(`${endpoint}/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, model: nextModel }),
      });
      onSessionSaved(session);
      setNotice(`${nextModel} is ready for this chat. Tool support was checked successfully.`);
      await refreshSettingsOnly();
    } catch (cause) {
      setModelId(settings?.provider === selectedProvider ? settings.model || "" : "");
      const detail = cause instanceof Error ? cause.message : "Please try again.";
      setError(checked ? `Model checked, but could not be selected. ${detail}` : `Could not use this model. ${detail}`);
      await refreshSettingsOnly();
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
      setDiscoveredModels([]);
      await refresh(selectedProvider);
      setNotice("Provider settings removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this provider key.");
    } finally {
      setSaving(false);
    }
  };

  if (!available)
    return (
      <AgentSettingsPanel label="AI provider settings">
        <AgentReviewStatus>{unavailableReason}</AgentReviewStatus>
      </AgentSettingsPanel>
    );
  if (loading)
    return (
      <AgentSettingsPanel busy>
        <AgentReviewStatus>Loading provider settings…</AgentReviewStatus>
      </AgentSettingsPanel>
    );

  if (!settings)
    return (
      <AgentSettingsPanel label="AI provider settings">
        <h2>AI provider and usage</h2>
        <AgentAlert>
          {error || "Could not load provider settings. Check that the local Automation API is running."}
        </AgentAlert>
        <AgentSettingsActions>
          <AgentWorkspaceButton
            type="button"
            onClick={() => {
              setLoading(true);
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            Retry
          </AgentWorkspaceButton>
        </AgentSettingsActions>
      </AgentSettingsPanel>
    );

  const settingsBusy = saving || selecting || loadingModels || agentBusy;

  return (
    <AgentSettingsPanel label="AI provider settings">
      <AgentReviewHeading
        title="AI provider"
        description="Connect a provider and choose a model for your agent."
        badge={settings.authenticated ? "Authenticated account" : "Local preview identity"}
      />

      {!settings?.encryptionConfigured && (
        <div className="agent-settings-note" role="status">
          <p>Protect your API key with local encryption before connecting.</p>
          <AgentWorkspaceButton type="button" disabled={settingsBusy} onClick={() => void setupEncryption()}>
            Set up encryption
          </AgentWorkspaceButton>
        </div>
      )}

      {(settings.encryptionConfigured || agentBusy) && setupStep && (
        <p className="agent-settings-step" role="status">
          <strong>{agentBusy ? "Please wait" : "Next step"}</strong>
          <span>{agentBusy ? "The agent is working. You can update settings when it finishes." : setupStep}</span>
        </p>
      )}

      {selecting && (
        <p className="agent-settings-progress" role="status">
          Checking tool support and selecting your model. This may take a moment.
        </p>
      )}
      {error && <AgentAlert className="agent-settings-feedback">{error}</AgentAlert>}
      {notice && (
        <p className="agent-settings-success" role="status">
          {notice}
        </p>
      )}

      <section className="agent-settings-card" aria-labelledby="agent-connection-heading">
        <div className="agent-card-heading">
          <span className="agent-step-number">1</span>
          <div>
            <h3 id="agent-connection-heading">Connect a provider</h3>
            <p>Choose a provider and enter its connection details.</p>
          </div>
        </div>
        <FormField htmlFor="agent-provider" label="Provider">
          <SelectInput
            label="Provider"
            id="agent-provider"
            value={selectedProvider}
            disabled={settingsBusy}
            onChange={changeProvider}
            options={providerModels.map((provider) => ({ value: provider.id, label: provider.label }))}
          />
        </FormField>

        {isCompatible && (
          <FormField htmlFor="agent-endpoint-url" label="Endpoint URL">
            <TextInput
              id="agent-endpoint-url"
              type="url"
              disabled={settingsBusy}
              value={baseUrl}
              onValueChange={(value) => {
                setBaseUrl(value);
                setError("");
                setNotice("");
              }}
              placeholder="https://openrouter.ai/api/v1 or http://127.0.0.1:20128/v1"
              autoComplete="url"
            />
          </FormField>
        )}

        <div className="agent-key-field">
          <FormField htmlFor="agent-api-key" label="API key">
            <TextInput
              id="agent-api-key"
              type={keyVisible ? "text" : "password"}
              disabled={settingsBusy}
              value={apiKey}
              onValueChange={(value) => {
                setApiKey(value);
                setError("");
                setNotice("");
              }}
              autoComplete="new-password"
              spellCheck={false}
              placeholder="Paste provider API key"
            />
          </FormField>
          <AgentWorkspaceButton
            className="agent-key-toggle"
            aria-controls="agent-api-key"
            aria-pressed={keyVisible}
            disabled={settingsBusy}
            onClick={() => setKeyVisible((visible) => !visible)}
          >
            {keyVisible ? "Hide key" : "Show key"}
          </AgentWorkspaceButton>
        </div>
        <AgentSettingsActions>
          <AgentWorkspaceButton
            type="button"
            onClick={() => void saveCredential()}
            className="agent-primary-action"
            disabled={settingsBusy || (!apiKey && !localEndpoint) || !settings.encryptionConfigured}
          >
            {saving ? "Saving…" : "Save provider"}
          </AgentWorkspaceButton>
          {savedCredential && (
            <AgentWorkspaceButton type="button" onClick={() => void removeCredential()} disabled={settingsBusy}>
              Remove provider
            </AgentWorkspaceButton>
          )}
        </AgentSettingsActions>
      </section>
      <section className="agent-settings-card" aria-labelledby="agent-model-heading">
        <div className="agent-card-heading">
          <span className="agent-step-number">2</span>
          <div>
            <h3 id="agent-model-heading">Choose a model</h3>
            <p>We'll check tool support when you use a model.</p>
          </div>
        </div>
        <FormField htmlFor="agent-provider-model" label="Model">
          <SelectInput
            label="Model"
            id="agent-provider-model"
            value={modelId}
            disabled={settingsBusy || !savedCredential || unsavedCredential || discoveredModels.length === 0}
            onChange={(value) => void selectModel(value)}
            placeholder={
              !savedCredential
                ? "Configure the provider first"
                : unsavedCredential
                  ? "Save provider changes first"
                  : loadingModels
                    ? "Loading models…"
                    : discoveredModels.length
                      ? "Choose a model"
                      : "No models available"
            }
            options={discoveredModels.map((id) => ({ value: id, label: id }))}
          />
        </FormField>
        <AgentSettingsActions>
          {modelLoadFailed && (
            <AgentWorkspaceButton
              type="button"
              onClick={() => {
                setError("");
                setModelLoadAttempt((attempt) => attempt + 1);
              }}
              disabled={settingsBusy || !savedCredential || unsavedCredential}
            >
              Retry loading models
            </AgentWorkspaceButton>
          )}
        </AgentSettingsActions>
      </section>
      {settings?.usage && (
        <details className="agent-usage">
          <summary>Token usage</summary>
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
        </details>
      )}
    </AgentSettingsPanel>
  );
}
