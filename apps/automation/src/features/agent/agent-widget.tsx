import { Icon } from "@hyperscal/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloseButton, FilterSelect } from "../../components";
import { readVariables } from "../runs/run-variables";
import { useActiveRun } from "../runs/use-active-run";
import { useRunEnvironment } from "../runs/use-run-environment";
import { label as displayLabel } from "../scenarios/scenario";
import { agentFetch } from "./agent-api";
import { Testasaurus, type TestasaurusMood } from "./testasaurus";
import "./agent.css";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
  itemId?: string;
  contexts?: Array<{ id: string; kind: ContextKind; label: string; source: string }>;
  skill?: string;
}
type ContextKind = "scenario" | "feature" | "category" | "flow" | "file" | "run" | "note" | "upload";
interface ContextScenario {
  key: string;
  title: string;
  id: string;
  file: string;
  module: string;
  feature?: string;
  category?: string;
  steps: Array<string>;
  tags?: Array<string>;
}
interface ContextAttachment {
  id: string;
  kind: ContextKind;
  ref: string;
  label: string;
  auto?: boolean;
  value?: ContextScenario | { file: string; module: string; title: string };
  module?: string;
  title?: string;
  text?: string;
  data?: string;
  size?: number;
  mime?: string;
}
interface Session {
  messages: Array<Message>;
  history?: Array<{ title: string; url: string; number: number; status: string; createdAt: string }>;
  busy: boolean;
  error: string;
  mode: string;
  model?: string;
  effort?: string;
  baseCommit?: string;
  branch?: string;
  requestedSkill?: string;
  canCancel?: boolean;
  userRequest?: { id: string | number; questions: Array<AgentQuestion> };
  approvalRequest?: { id: string | number; kind: "command" | "file"; reason: string; command: string };
}
interface AgentModel {
  id: string;
  name: string;
  isDefault: boolean;
  efforts: Array<string>;
  defaultEffort?: string;
}
interface AgentQuestion {
  id: string;
  header: string;
  question: string;
  isSecret: boolean;
  options: Array<{ label: string; description: string }> | null;
}
interface DraftFeature {
  file: string;
  deleted?: boolean;
  scenarios: Array<{ id: string; title: string; line: number; steps: Array<string> }>;
}
const endpoint = "/automation/api/agent";

const contextStorageKey = "automation-agent-contexts";
const commands = [
  { name: "ask-qa", description: "Ask about testing or investigate a scenario." },
  { name: "write-e2e-scenarios", description: "Discover, write or review E2E scenarios." },
  { name: "write-e2e-code", description: "Implement or repair E2E test code." },
];

function contextId() {
  return globalThis.crypto?.randomUUID?.() ?? `context-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isContextAttachment(item: unknown): item is ContextAttachment {
  if (!item || typeof item !== "object") return false;
  const candidate = item as ContextAttachment;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.ref === "string" &&
    typeof candidate.label === "string" &&
    ["scenario", "feature", "category", "flow", "file", "run", "note"].includes(candidate.kind) &&
    (candidate.kind !== "note" || (typeof candidate.text === "string" && typeof candidate.title === "string"))
  );
}

function readContexts(): Array<ContextAttachment> | undefined {
  try {
    const raw = localStorage.getItem(contextStorageKey);
    if (raw === null) return undefined;
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isContextAttachment).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function contextDisplayLabel(item: ContextAttachment) {
  if ((item.kind === "feature" || item.kind === "scenario") && item.value?.title) return item.value.title;
  if (item.kind === "category") {
    try {
      const identity = JSON.parse(item.ref);
      if (Array.isArray(identity) && typeof identity[2] === "string") return identity[2];
    } catch {
      return item.label;
    }
  }
  return item.label;
}

function selectionAttachment(scenario?: ContextScenario, feature?: { module: string; file: string; title: string }) {
  if (scenario) {
    return {
      id: "current-selection",
      kind: "scenario" as const,
      ref: scenario.key,
      label: scenario.title,
      auto: true,
      value: scenario,
    };
  }
  if (feature) {
    return {
      id: "current-selection",
      kind: "feature" as const,
      ref: feature.file,
      label: feature.title,
      auto: true,
      value: feature,
    };
  }
  return undefined;
}

function initialContexts(scenario?: ContextScenario, feature?: { module: string; file: string; title: string }) {
  const stored = readContexts();
  if (!stored) {
    const selected = selectionAttachment(scenario, feature);
    return selected ? [selected] : [];
  }
  const selected = selectionAttachment(scenario, feature);
  const validStored = stored.filter(
    (item) => !item.auto || (selected && item.ref === selected.ref && item.kind === selected.kind),
  );
  return validStored;
}

export function AgentWidget({
  scenario,
  feature,
  contextScenarios,
  home,
}: {
  home: boolean;
  scenario?: ContextScenario;
  feature?: { module: string; file: string; title: string };
  contextScenarios: Array<ContextScenario>;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<"chat" | "changes">("chat");
  const [message, setMessage] = useState("");
  const [waves, setWaves] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<string>();
  const [contexts, setContexts] = useState<Array<ContextAttachment>>(() => initialContexts(scenario, feature));
  const [contextPicker, setContextPicker] = useState<
    "menu" | "scenario" | "feature" | "category" | "flow" | "file" | "run" | "note" | null
  >(null);
  const [contextSearch, setContextSearch] = useState("");
  const [contextFiles, setContextFiles] = useState<Array<string>>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextPreview, setContextPreview] = useState<string>();
  const [editingNote, setEditingNote] = useState<string>();
  const [editingContextId, setEditingContextId] = useState<string>();
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [contextError, setContextError] = useState("");
  const [skillsOpen, setSkillsOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [readingFile, setReadingFile] = useState(false);
  const contextRef = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if ((contextPicker || contextPreview) && contextRef.current) {
      contextRef.current.scrollTop = contextRef.current.scrollHeight;
    }
  }, [contextPicker, contextPreview]);
  useEffect(() => {
    if (home && contextPicker && contextPicker !== "menu" && contextPicker !== "feature") {
      setContextPicker("menu");
      setEditingContextId(undefined);
    }
  }, [home, contextPicker]);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const latestRun = useActiveRun(true);
  const selectionSignature = scenario ? `scenario:${scenario.key}` : feature ? `feature:${feature.file}` : "";
  const previousSelection = useRef(selectionSignature);
  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };
  const selectPrompt = (value: string) => {
    const match = value.match(/^\/(ask-qa|write-e2e-scenarios|write-e2e-code)\s*/);
    if (match) {
      setSelectedSkill(match[1]);
      setMessage(value.slice(match[0].length));
    } else setMessage(value);
    setSkillsOpen(false);
    composerRef.current?.focus();
  };
  useEffect(() => {
    if (!open || home) return;
    composerRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, home]);
  const [session, setSession] = useState<Session>();
  const [modelInfo, setModelInfo] = useState<string>();
  const [effortInfo, setEffortInfo] = useState<string>();
  const [modelOptions, setModelOptions] = useState<Array<AgentModel>>([]);
  const [modelError, setModelError] = useState("");
  const [changingSettings, setChangingSettings] = useState(false);
  // Recalculate after text changes and whenever the conditionally rendered composer returns.
  // biome-ignore lint/correctness/useExhaustiveDependencies: These values control the textarea's content and presence.
  useEffect(() => {
    const resizeComposer = () => {
      const composer = composerRef.current;
      if (!composer) return;
      composer.style.height = "auto";
      composer.style.height = `${composer.scrollHeight}px`;
    };
    resizeComposer();
    window.addEventListener("resize", resizeComposer);
    return () => window.removeEventListener("resize", resizeComposer);
  }, [message, open, home, view, expanded, session?.userRequest]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [patch, setPatch] = useState<string>();
  const [reviewDigest, setReviewDigest] = useState<string>();
  const [scenarioReview, setScenarioReview] = useState<{
    hasChanges: boolean;
    approved: boolean;
    hasImplementation: boolean;
  }>();
  const [preview, setPreview] = useState<Array<DraftFeature>>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const requestNumber = useRef(0);
  const latestResponse = useRef(0);
  const messagesRef = useRef<HTMLDivElement>(null);
  const followMessages = useRef(true);

  useEffect(() => {
    if (selectionSignature === previousSelection.current) return;
    previousSelection.current = selectionSignature;
    const selected = selectionAttachment(scenario, feature);
    setContexts((current) => {
      const manual = current.filter((item) => !item.auto);
      const alreadyAttached =
        selected && manual.some((item) => item.kind === selected.kind && item.ref === selected.ref);
      return [...manual, ...(selected && !alreadyAttached && manual.length < 8 ? [selected] : [])];
    });
  }, [selectionSignature, scenario, feature]);

  useEffect(() => {
    try {
      localStorage.setItem(contextStorageKey, JSON.stringify(contexts.filter((item) => item.kind !== "upload")));
    } catch {
      setContextError("Context changes could not be saved in this browser.");
    }
  }, [contexts]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== contextStorageKey || !event.newValue) return;
      try {
        const value = JSON.parse(event.newValue);
        if (Array.isArray(value)) setContexts(value.filter(isContextAttachment).slice(0, 8));
      } catch {
        setContextError("Context from another tab could not be loaded.");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if ((contextPicker !== "file" && contextPicker !== "flow") || contextSearch.trim().length < 2) {
      setContextFiles([]);
      setContextLoading(false);
      return;
    }
    const controller = new AbortController();
    setContextFiles([]);
    setContextError("");
    setContextLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await agentFetch(`${endpoint}/context-files?query=${encodeURIComponent(contextSearch)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as Array<string> & { error?: string };
        if (!response.ok) throw new Error(result.error || "Could not search project files.");
        setContextFiles(result);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setContextFiles([]);
          setContextError(cause instanceof Error ? cause.message : "Could not search project files.");
        }
      } finally {
        if (!controller.signal.aborted) setContextLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [contextPicker, contextSearch]);

  const featureOptions = useMemo(() => {
    const features = new Map<string, { module: string; file: string; title: string }>();
    for (const item of contextScenarios) {
      if (!features.has(item.file))
        features.set(item.file, {
          module: item.module,
          file: item.file,
          title: item.feature || item.file.replace(/\.feature$/, ""),
        });
    }
    return [...features.values()];
  }, [contextScenarios]);

  const categoryOptions = useMemo(() => {
    const groups = new Map<string, { file: string; module: string; category: string; feature: string }>();
    for (const item of contextScenarios) {
      if (feature && item.file !== feature.file) continue;
      const name = item.category || "Uncategorized";
      const key = JSON.stringify([item.module, item.file, name]);
      groups.set(key, { file: item.file, module: item.module, category: name, feature: item.feature || item.file });
    }
    return [...groups.values()];
  }, [contextScenarios, feature]);

  const selectedContextRefs = useMemo(() => new Set(contexts.map((item) => `${item.kind}:${item.ref}`)), [contexts]);

  const scenarioOptions = useMemo(() => {
    const query = contextSearch.trim().toLowerCase();
    return contextScenarios
      .filter((item) => !selectedContextRefs.has(`scenario:${item.key}`))
      .filter((item) => !query || `${item.id} ${item.title} ${item.file} ${item.module}`.toLowerCase().includes(query))
      .slice(0, 30);
  }, [contextScenarios, contextSearch, selectedContextRefs]);

  const applySnapshot = useCallback((snapshot: Session, sequence: number) => {
    if (sequence < latestResponse.current) return;
    latestResponse.current = sequence;
    setSession(snapshot);
  }, []);

  useEffect(() => {
    if (!open && !home) return;
    const controller = new AbortController();
    const refresh = async () => {
      const sequence = ++requestNumber.current;
      try {
        const response = await agentFetch(`${endpoint}/session`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error();
        const snapshot = (await response.json()) as Session;
        if (!controller.signal.aborted) {
          applySnapshot(snapshot, sequence);
          setConnectionError(false);
        }
      } catch {
        if (!controller.signal.aborted) setConnectionError(true);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [open, home, applySnapshot]);

  useEffect(() => {
    if ((!open && !home) || modelOptions.length) return;
    const controller = new AbortController();
    const refreshModel = async () => {
      try {
        const response = await agentFetch(`${endpoint}/models`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as {
          model?: string;
          effort?: string;
          models?: Array<AgentModel>;
        };
        if (!controller.signal.aborted) {
          if (Array.isArray(result.models)) setModelOptions(result.models);
          if (typeof result.model === "string") setModelInfo(result.model);
          if (typeof result.effort === "string") setEffortInfo(result.effort);
        }
      } catch {
        // The model label is optional while Codex is unavailable.
      }
    };
    void refreshModel();
    return () => {
      controller.abort();
    };
  }, [open, home, modelOptions.length]);

  const changeModel = async (value: string) => {
    setModelError("");
    setChangingSettings(true);
    try {
      const response = await agentFetch(`${endpoint}/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: value }),
      });
      const result = (await response.json()) as Session & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not change the model.");
      applySnapshot(result, ++requestNumber.current);
      setModelInfo(value);
      setEffortInfo(result.effort);
    } catch (cause) {
      setModelError(cause instanceof Error ? cause.message : "Could not change the model.");
    } finally {
      setChangingSettings(false);
    }
  };

  const changeEffort = async (value: string) => {
    setModelError("");
    setChangingSettings(true);
    try {
      const response = await agentFetch(`${endpoint}/effort`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ effort: value }),
      });
      const result = (await response.json()) as Session & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not change the reasoning effort.");
      applySnapshot(result, ++requestNumber.current);
      setEffortInfo(value);
    } catch (cause) {
      setModelError(cause instanceof Error ? cause.message : "Could not change the reasoning effort.");
    } finally {
      setChangingSettings(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll when conversation content or visibility changes.
  useEffect(() => {
    const container = messagesRef.current;
    if (container && followMessages.current && session?.messages.length) container.scrollTop = container.scrollHeight;
  }, [session?.messages, session?.busy, open]);

  const addContext = (item: ContextAttachment) => {
    setContextError("");
    if (editingContextId) {
      if (
        contexts.some(
          (existing) => existing.id !== editingContextId && existing.kind === item.kind && existing.ref === item.ref,
        )
      ) {
        setContextError("That context is already attached.");
        return;
      }
      setContexts((current) =>
        current.map((existing) => (existing.id === editingContextId ? { ...item, id: editingContextId } : existing)),
      );
      setEditingContextId(undefined);
      setContextPicker(null);
      setContextSearch("");
      return;
    }
    if (contexts.some((existing) => existing.kind === item.kind && existing.ref === item.ref)) {
      setContextError("That context is already attached.");
      return;
    }
    if (contexts.length >= 8) {
      setContextError("Attach up to 8 context items per message.");
      return;
    }
    setContexts((current) => [...current, item]);
    setContextPicker(null);
    setContextSearch("");
  };

  const removeContext = (id: string) => {
    setContexts((current) => current.filter((item) => item.id !== id));
    setContextPreview(undefined);
  };

  const editContext = (item: ContextAttachment) => {
    setContextError("");
    setContextPreview(item.id);
    setEditingContextId(item.id);
    if (item.kind === "note") openNoteEditor(item);
    else if (item.kind !== "upload") {
      setContextSearch("");
      setContextPicker(item.kind);
    }
  };

  const addScenarioContext = (item: ContextScenario) =>
    addContext({
      id: contextId(),
      kind: "scenario",
      ref: item.key,
      label: item.title,
      value: item,
    });

  const addFeatureContext = (item: { module: string; file: string; title: string }) =>
    addContext({
      id: contextId(),
      kind: "feature",
      ref: item.file,
      label: item.title,
      value: item,
    });

  const addCategoryContext = (item: { file: string; module: string; category: string }) =>
    addContext({
      id: contextId(),
      kind: "category",
      ref: JSON.stringify([item.module, item.file, item.category]),
      label: item.category,
    });

  const addFlowContext = (registryPath?: string) => {
    const selected = scenario ? { module: scenario.module, file: scenario.file } : feature;
    const flowFile = registryPath
      ? registryPath.replace(/^apps\/tenants\/tests\/bdd\/features\//, "").replace(/\.flows\.md$/, ".feature")
      : selected?.file;
    if (!flowFile) return;
    const module =
      contextScenarios.find((item) => item.file === flowFile)?.module ?? selected?.module ?? flowFile.split("/")[0];
    addContext({
      id: contextId(),
      kind: "flow",
      ref: flowFile,
      module,
      label: `Flow registry · ${flowFile.replace(/\.feature$/, "")}`,
    });
  };

  const saveNote = () => {
    if (!noteText.trim()) {
      setContextError("Add a short note before attaching it.");
      return;
    }
    const updated = contexts.find((item) => item.id === editingNote);
    const id = updated?.id ?? contextId();
    const item: ContextAttachment = {
      id,
      kind: "note",
      ref: id,
      label: noteTitle.trim() || "User note",
      title: noteTitle.trim() || "User note",
      text: noteText.trim(),
    };
    if (updated) setContexts((current) => current.map((entry) => (entry.id === updated.id ? item : entry)));
    else addContext(item);
    setEditingNote(undefined);
    setEditingContextId(undefined);
    setNoteTitle("");
    setNoteText("");
    setContextPicker(null);
    setContextPreview(id);
  };

  const openNoteEditor = (item?: ContextAttachment) => {
    setEditingNote(item?.id);
    setEditingContextId(item?.id);
    setNoteTitle(item?.title || "");
    setNoteText(item?.text || "");
    setContextPicker("note");
    setContextError("");
  };

  const { environment } = useRunEnvironment();

  const submit = async () => {
    if (
      !message.trim() ||
      sending ||
      changingSettings ||
      readingFile ||
      reviewing ||
      !session ||
      connectionError ||
      session.busy
    )
      return;
    setSending(true);
    followMessages.current = true;
    setError("");
    setPatch(undefined);
    setReviewDigest(undefined);
    setScenarioReview(undefined);
    setPreview([]);
    const sequence = ++requestNumber.current;
    try {
      const response = await agentFetch(`${endpoint}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          skill: selectedSkill,
          contexts,
          environment,
          variables: (selectedSkill || session.requestedSkill) === "write-e2e-scenarios" ? readVariables() : undefined,
        }),
      });
      const result = (await response.json()) as Session & { error: string };
      if (!response.ok) throw new Error(result.error);
      applySnapshot(result, sequence);
      setMessage("");
      setContexts((items) => items.filter((item) => item.kind !== "upload"));
      setSelectedSkill(undefined);
      setSkillsOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const decideApproval = async (decision: "accept" | "decline") => {
    if (!session?.approvalRequest || sending) return;
    setSending(true);
    setError("");
    const sequence = ++requestNumber.current;
    try {
      const response = await agentFetch(`${endpoint}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: session.approvalRequest.id, decision }),
      });
      const result = (await response.json()) as Session & { error: string };
      if (!response.ok) throw new Error(result.error);
      applySnapshot(result, sequence);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send decision.");
    } finally {
      setSending(false);
    }
  };

  const reviewDiff = async () => {
    if (reviewing || sending) return;
    setView("changes");
    setReviewing(true);
    setError("");
    try {
      const response = await agentFetch(`${endpoint}/diff`, { cache: "no-store" });
      const result = (await response.json()) as {
        patch?: string;
        digest?: string;
        scenarioDigest?: string;
        scenarioApproved?: boolean;
        hasImplementation?: boolean;
        preview?: Array<DraftFeature>;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error);
      setPatch(result.patch || "No changes in this workspace.");
      setReviewDigest(result.patch ? result.digest : undefined);
      setScenarioReview({
        hasChanges: Boolean(result.scenarioDigest),
        approved: Boolean(result.scenarioApproved),
        hasImplementation: Boolean(result.hasImplementation),
      });
      setPreview(result.preview ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load changes.");
    } finally {
      setReviewing(false);
    }
  };

  const approveScenarios = async () => {
    if (!reviewDigest || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await agentFetch(`${endpoint}/approve-scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest: reviewDigest }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error);
      setScenarioReview((current) => current && { ...current, approved: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not approve scenario changes.");
    } finally {
      setSending(false);
    }
  };

  const finalize = async () => {
    if (!reviewDigest || !commitMessage.trim() || sending) return;
    if (!window.confirm("Finalize these reviewed changes and create a pull request?")) return;
    setSending(true);
    setError("");
    try {
      const response = await agentFetch(`${endpoint}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMessage, digest: reviewDigest }),
      });
      const result = (await response.json()) as { pullRequest?: { url: string }; session?: Session; error?: string };
      if (!response.ok) throw new Error(result.error);
      if (result.session) applySnapshot(result.session, ++requestNumber.current);
      setPatch("Your changes were submitted for manual review. See your change history below.");
      setReviewDigest(undefined);
      setScenarioReview(undefined);
      setPreview([]);
      setCommitMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not finalize changes.");
    } finally {
      setSending(false);
    }
  };

  const submitAnswers = async () => {
    if (!session?.userRequest || sending) return;
    setSending(true);
    setError("");
    const sequence = ++requestNumber.current;
    try {
      const response = await agentFetch(`${endpoint}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: session.userRequest.id, answers }),
      });
      const result = (await response.json()) as Session & { error: string };
      if (!response.ok) throw new Error(result.error);
      applySnapshot(result, sequence);
      setAnswers({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send answer.");
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    setSending(true);
    setError("");
    const sequence = ++requestNumber.current;
    try {
      const response = await agentFetch(`${endpoint}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Could not start a new conversation.");
      applySnapshot((await response.json()) as Session, sequence);
      setAnswers({});
      setConfirmReset(false);
      setView("chat");
      setMessage("");
      setSelectedSkill(undefined);
      {
        const selected = selectionAttachment(scenario, feature);
        setContexts(selected ? [selected] : []);
      }
      setContextPicker(null);
      setContextPreview(undefined);
      setEditingContextId(undefined);
      setPatch(undefined);
      setReviewDigest(undefined);
      setScenarioReview(undefined);
      setPreview([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start a new conversation.");
    } finally {
      setSending(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    setError("");
    const sequence = ++requestNumber.current;
    try {
      const response = await agentFetch(`${endpoint}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = (await response.json()) as Session & { error: string };
      if (!response.ok) throw new Error(result.error);
      applySnapshot(result, sequence);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not stop the agent.");
    } finally {
      setCancelling(false);
    }
  };

  const mood: TestasaurusMood = connectionError
    ? "offline"
    : !session
      ? "connecting"
      : session.approvalRequest || session.userRequest
        ? "waiting"
        : session.busy || sending || reviewing
          ? "working"
          : message.trim()
            ? "listening"
            : "idle";
  const statusLabel = {
    offline: "Reconnecting",
    connecting: "Connecting",
    waiting: "Needs your input",
    working: reviewing ? "Loading changes" : "Working",
    listening: "Ready for your request",
    idle: "Ready",
  }[mood];
  const sendBlockedReason = sending
    ? "Sending your message…"
    : changingSettings
      ? "Updating settings…"
      : readingFile
        ? "Reading the attached file…"
        : reviewing
          ? "Loading workspace changes…"
          : !session || connectionError
            ? "Connecting to Testasaurus…"
            : session.busy
              ? "The agent is working. Stop it before sending another message."
              : !message.trim()
                ? "Enter a message."
                : undefined;
  const selectedModel = modelOptions.find((option) => option.id === (session?.model || modelInfo)) || modelOptions[0];
  const currentEffort = session?.effort || effortInfo;
  const selectedEffort = selectedModel?.efforts.includes(currentEffort || "")
    ? currentEffort || selectedModel.defaultEffort || selectedModel.efforts[0]
    : selectedModel?.defaultEffort || selectedModel?.efforts[0];

  return (
    <div className={home ? "agent-widget agent-home" : "agent-widget"}>
      {(open || home) && (
        <section
          id="agent-panel"
          className={expanded ? "agent-panel agent-expanded" : "agent-panel"}
          aria-label="Testasaurus"
        >
          <header className="agent-header">
            <div className="agent-heading">
              <button
                className="agent-mascot-button"
                type="button"
                onClick={() => setWaves((count) => count + 1)}
                aria-label="Wave to Testasaurus"
                title="Wave to Testasaurus"
              >
                <span key={waves} className={waves ? "agent-mascot-wave" : undefined}>
                  <Testasaurus mood={mood} />
                </span>
                {waves > 0 && (
                  <span className="agent-mascot-hello" aria-hidden="true">
                    Hi!
                  </span>
                )}
              </button>
              <span className="agent-sr-only" aria-live="polite">
                {waves > 0 && <span key={waves}>Testasaurus waves back!</span>}
              </span>
              <strong>Testasaurus</strong>
              <span title="This local preview identity is not authentication">Local preview user</span>
              <span
                role="status"
                data-mood={mood}
                className={connectionError ? "agent-status offline" : "agent-status"}
              >
                <i aria-hidden="true" />
                {statusLabel}
              </span>
            </div>
            {selectedModel && (
              <div className="agent-model-settings" title="Choose settings for the next Codex message">
                <div className="agent-model-setting">
                  <span>Model</span>
                  <FilterSelect
                    label="Testasaurus model"
                    value={selectedModel.id}
                    disabled={Boolean(session?.busy || sending || changingSettings)}
                    onChange={(value) => void changeModel(value)}
                    options={modelOptions.map((option) => ({
                      value: option.id,
                      label: `${option.name}${option.isDefault ? " (default)" : ""}`,
                    }))}
                  />
                </div>
                {selectedModel.efforts.length > 0 && (
                  <div className="agent-model-setting">
                    <span>Effort</span>
                    <FilterSelect
                      label="Testasaurus reasoning effort"
                      value={selectedEffort || selectedModel.efforts[0]}
                      disabled={Boolean(session?.busy || sending || changingSettings)}
                      onChange={(value) => void changeEffort(value)}
                      options={selectedModel.efforts.map((effort) => ({
                        value: effort,
                        label: `${effort[0].toUpperCase()}${effort.slice(1)}`,
                      }))}
                    />
                  </div>
                )}
                {modelError && (
                  <span className="agent-model-error" role="alert">
                    {modelError}
                  </span>
                )}
              </div>
            )}
            {!selectedModel && modelError && <span className="agent-model-error">{modelError}</span>}
            {!modelOptions.length && (session?.model || modelInfo) && (
              <span className="agent-model-fallback">
                Model: {session?.model || modelInfo}
                {session?.effort || effortInfo ? ` · ${session?.effort || effortInfo} effort` : ""}
              </span>
            )}
            <div className="agent-header-actions">
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                disabled={sending || reviewing || session?.busy}
                className="agent-new-chat"
                title="Start a new conversation"
              >
                <Icon name="plus" aria-hidden="true" /> <span>New chat</span>
              </button>
              {!home && (
                <button
                  className="agent-expand"
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  aria-label={expanded ? "Restore panel size" : "Expand Testasaurus"}
                  aria-pressed={expanded}
                  title={expanded ? "Restore panel size" : "Expand panel"}
                >
                  <Icon name={expanded ? "arrows-diagonal-minimize-2" : "arrows-diagonal"} aria-hidden="true" />
                </button>
              )}
              {!home && <CloseButton label="Close Testasaurus" onClick={close} className="agent-close" />}
            </div>
          </header>
          {confirmReset && (
            <div className="agent-reset" role="alert">
              <p>Start a new chat? The current conversation will be replaced. Its worktree and branch are retained.</p>
              <div>
                <button type="button" onClick={() => setConfirmReset(false)}>
                  Keep chat
                </button>
                <button type="button" disabled={sending} onClick={() => void reset()}>
                  Start new chat
                </button>
              </div>
            </div>
          )}
          <nav className="agent-tabs" aria-label="Agent workspace">
            <button type="button" aria-current={view === "chat" ? "page" : undefined} onClick={() => setView("chat")}>
              Conversation
            </button>
            <button
              type="button"
              aria-current={view === "changes" ? "page" : undefined}
              disabled={!session?.branch || session.busy || sending || reviewing}
              onClick={() => void reviewDiff()}
            >
              {reviewing ? "Loading changes..." : "Workspace changes"}{" "}
              {reviewDigest && (
                <>
                  <span className="agent-change-dot" aria-hidden="true" />
                  <span className="agent-sr-only">Changes ready for review</span>
                </>
              )}
            </button>
          </nav>
          {view === "chat" && (
            <div
              className="agent-messages"
              ref={messagesRef}
              onScroll={(event) => {
                const el = event.currentTarget;
                followMessages.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
              }}
              aria-live="polite"
              aria-relevant="additions text"
            >
              {!session?.messages.length && (
                <div className="agent-welcome">
                  <Testasaurus mood={mood} large />
                  <span className="agent-eyebrow">YOUR QA SIDEKICK</span>
                  <h2>Small arms. Big test coverage.</h2>
                  <p>I’m Testasaurus. Let’s explore, design, and improve your tests.</p>
                  <div className="agent-starters">
                    <button
                      type="button"
                      onClick={() =>
                        selectPrompt(
                          scenario
                            ? "Explain this scenario and identify gaps in its coverage."
                            : "Help me understand our QA workflows and test coverage.",
                        )
                      }
                    >
                      <span>
                        <strong>Understand & investigate</strong>
                        <small>Understand coverage and find gaps</small>
                      </span>
                      <span aria-hidden="true">&#8599;</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPrompt("/write-e2e-scenarios Help me draft scenarios for ")}
                    >
                      <span>
                        <strong>Design a scenario</strong>
                        <small>Draft a test for review</small>
                      </span>
                      <span aria-hidden="true">&#8599;</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPrompt("/write-e2e-code Help me repair the implementation of ")}
                    >
                      <span>
                        <strong>Work on test code</strong>
                        <small>Implement or repair a test</small>
                      </span>
                      <span aria-hidden="true">&#8599;</span>
                    </button>
                  </div>
                </div>
              )}

              {session?.messages.map((item) => (
                <div className={`agent-message ${item.role}`} key={item.id}>
                  <strong>
                    {item.role === "user" ? "You" : item.role === "tool" ? "HyperTest runner" : "Testasaurus"}
                  </strong>
                  {(item.skill || item.contexts?.length) && (
                    <div className="agent-message-contexts">
                      {item.skill && <span className="agent-message-skill">/{item.skill}</span>}
                      {item.contexts?.map((context) => (
                        <span key={context.id} title={context.source}>
                          {context.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <p>{item.text}</p>
                </div>
              ))}
              {session?.busy && !session.userRequest && !session.approvalRequest && (
                <div className="agent-working" role="status">
                  <Testasaurus mood={mood} />
                  <span>
                    Working through your request
                    <span className="agent-working-dots" aria-hidden="true">
                      {" "}
                      ...
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
          {view === "changes" && (
            <section className="agent-diff" aria-label="Workspace changes">
              <div className="agent-review-heading">
                <div>
                  <h2>Workspace changes</h2>
                  <p>Review your changes before submitting them for manual review.</p>
                </div>
                <button type="button" onClick={() => void reviewDiff()} disabled={reviewing || sending}>
                  Refresh
                </button>
              </div>
              {session?.branch && (
                <div className="agent-branch">
                  <span>Local branch</span>
                  <code>{session.branch}</code>
                  {session.baseCommit && <small>Based on {session.baseCommit.slice(0, 7)}</small>}
                </div>
              )}
              <div className="agent-review-note">
                <strong>Verification not recorded</strong>
                <span>Check the conversation for test results. Submitting changes does not mean tests passed.</span>
              </div>
              {reviewing ? (
                <p className="agent-review-empty" role="status">
                  Loading workspace changes...
                </p>
              ) : reviewDigest ? (
                <details className="agent-review-section">
                  <summary>View technical file changes</summary>
                  <pre className="agent-patch">
                    {patch?.split("\n").map((line, index) => (
                      <span
                        className={
                          line.startsWith("+")
                            ? "addition"
                            : line.startsWith("-")
                              ? "deletion"
                              : line.startsWith("@@")
                                ? "hunk"
                                : undefined
                        }
                        key={String(index)}
                      >
                        {`${line}\n`}
                      </span>
                    ))}
                  </pre>
                </details>
              ) : (
                <p className="agent-review-empty" role="status">
                  {patch || "No changes in this workspace."}
                </p>
              )}
              {!reviewing && preview.length > 0 && (
                <details className="agent-scenario-preview" open>
                  <summary>
                    Scenario draft preview{" "}
                    <span>
                      {preview.length} {preview.length === 1 ? "feature" : "features"}
                    </span>
                  </summary>
                  <p>Shows every scenario in changed features, including unchanged scenarios.</p>
                  {preview.map((feature) => (
                    <div className="agent-preview-feature" key={feature.file}>
                      <strong>{feature.file}</strong>
                      {feature.deleted ? (
                        <p>Feature deleted</p>
                      ) : (
                        feature.scenarios.map((draft) => (
                          <div className="agent-preview-scenario" key={draft.line}>
                            <p>
                              {draft.id || `Line ${draft.line}`}: {draft.title}
                            </p>
                            <pre>{draft.steps.join("\n")}</pre>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </details>
              )}
              {!reviewing && scenarioReview?.hasChanges && (
                <div className="agent-review-section agent-scenario-review">
                  <h3>Scenario review</h3>
                  {scenarioReview.approved ? (
                    <p>Approved for this version.</p>
                  ) : scenarioReview.hasImplementation ? (
                    <p>
                      Approval is blocked by E2E implementation changes in this draft. Preserve them separately and
                      remove them from the draft before approving scenarios.
                    </p>
                  ) : (
                    <>
                      <p>Review the scenario changes above before approving this version.</p>
                      <button type="button" disabled={sending} onClick={() => void approveScenarios()}>
                        Approve scenario changes
                      </button>
                    </>
                  )}
                </div>
              )}
              {!reviewing && reviewDigest && (
                <form
                  className="agent-commit"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void finalize();
                  }}
                >
                  <div className="agent-section-heading">
                    <h3>Finalize changes</h3>
                    <span>
                      Pull request submission is temporarily unavailable while the draft workflow is being verified.
                    </span>
                  </div>
                  <label htmlFor="agent-commit-message">Change title</label>
                  <input
                    id="agent-commit-message"
                    value={commitMessage}
                    onChange={(event) => setCommitMessage(event.target.value)}
                    maxLength={200}
                    placeholder="Describe these changes"
                  />
                  {scenarioReview?.hasChanges && !scenarioReview.approved && (
                    <p>Approve scenario changes before finalizing.</p>
                  )}
                  <button type="submit" disabled>
                    Finalize and create pull request
                  </button>
                </form>
              )}
              {Boolean(session?.history?.length) && (
                <section className="agent-review-section">
                  <h3>Your change history</h3>
                  {session?.history?.map((item) => (
                    <p key={item.url}>
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.title} ? PR #{item.number}
                      </a>{" "}
                      <span>Submitted for review</span>
                    </p>
                  ))}
                </section>
              )}
            </section>
          )}
          {session?.canCancel && (
            <div className="agent-stop-bar">
              <span>Agent is working in its local workspace</span>
              <button type="button" onClick={() => void cancel()} disabled={cancelling}>
                {cancelling ? "Stopping..." : "Stop agent"}
              </button>
            </div>
          )}
          {(error || session?.error || connectionError) && (
            <p className="agent-error" role="alert">
              {error || session?.error || "Cannot connect to the local Automation API. Retrying..."}
            </p>
          )}
          {session?.approvalRequest ? (
            <fieldset className="agent-form agent-approval">
              <legend>{session.approvalRequest.kind === "command" ? "Command permission" : "File permission"}</legend>
              {session.approvalRequest.reason && <p>{session.approvalRequest.reason}</p>}
              {session.approvalRequest.command && <pre>{session.approvalRequest.command}</pre>}
              <div>
                <button type="button" disabled={sending} onClick={() => void decideApproval("decline")}>
                  Decline
                </button>{" "}
                <button type="button" disabled={sending} onClick={() => void decideApproval("accept")}>
                  Allow
                </button>
              </div>
            </fieldset>
          ) : session?.userRequest ? (
            <form
              className="agent-form agent-questions"
              onSubmit={(event) => {
                event.preventDefault();
                void submitAnswers();
              }}
            >
              {session.userRequest.questions.map((question) => (
                <fieldset key={question.id}>
                  <legend>{question.question}</legend>
                  {!question.isSecret &&
                    question.options?.map((option) => (
                      <label key={option.label}>
                        <input
                          type="radio"
                          name={question.id}
                          checked={answers[question.id] === option.label}
                          onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.label }))}
                        />
                        {option.label}
                        <small>{option.description}</small>
                      </label>
                    ))}
                  {question.isSecret ? (
                    <div className="agent-secret-answer">
                      <p>
                        Secret values are never sent to Testasaurus. Add this value in HyperTest Variables, then
                        continue without sharing it.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAnswers((current) => ({ ...current, [question.id]: "withheld" }))}
                      >
                        Continue without sharing secret
                      </button>
                    </div>
                  ) : (
                    <input
                      aria-label={`Your answer: ${question.question}`}
                      type="text"
                      placeholder={question.options?.length ? "Or type your answer" : "Type your answer"}
                      value={
                        question.options?.some((option) => option.label === answers[question.id])
                          ? ""
                          : (answers[question.id] ?? "")
                      }
                      onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                    />
                  )}
                </fieldset>
              ))}
              <button
                type="submit"
                disabled={sending || session.userRequest.questions.some((question) => !answers[question.id]?.trim())}
              >
                Send answers
              </button>
            </form>
          ) : view === "chat" ? (
            <form
              className="agent-form agent-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <label className="agent-sr-only" htmlFor="agent-message">
                Message Testasaurus
              </label>
              <fieldset className="agent-composer-context" ref={contextRef}>
                <legend className="agent-sr-only">Message context</legend>
                <div className="agent-context-chips">
                  {selectedSkill && (
                    <span className="agent-skill-chip">
                      <span>Skill</span>
                      <strong>/{selectedSkill}</strong>
                      <button
                        type="button"
                        aria-label="Clear selected skill"
                        onClick={() => setSelectedSkill(undefined)}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {contexts.map((item) => (
                    <span className="agent-context-chip" key={item.id}>
                      <button
                        type="button"
                        className="agent-context-chip-main"
                        onClick={() => setContextPreview(contextPreview === item.id ? undefined : item.id)}
                      >
                        <span className="agent-context-kind">
                          {item.kind === "feature" ? "menu" : item.kind === "upload" ? "file" : item.kind}
                        </span>
                        <span className="agent-context-chip-label">{contextDisplayLabel(item)}</span>
                      </button>
                      {item.kind === "note" && (
                        <button
                          type="button"
                          className="agent-context-chip-action"
                          aria-label={`Edit ${item.label}`}
                          onClick={() => editContext(item)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="agent-context-chip-remove"
                        aria-label={`Remove ${item.label}`}
                        onClick={() => removeContext(item.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="agent-context-add agent-attach-button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach an image, document or spreadsheet"
                    disabled={readingFile || contexts.length >= 8}
                  >
                    <Icon name="paperclip" aria-hidden="true" /> {readingFile ? "Adding file..." : "Attach file"}
                  </button>
                  <input
                    ref={fileInputRef}
                    className="agent-sr-only"
                    type="file"
                    tabIndex={-1}
                    aria-hidden="true"
                    accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.xlsx,.txt,.md,.csv,.json,.xml,.yaml,.yml,.feature,.ts,.tsx,.js,.mjs,.log"
                    onChange={async (event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (!file) return;
                      const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
                      const allowed = [
                        ".png",
                        ".jpg",
                        ".jpeg",
                        ".webp",
                        ".gif",
                        ".pdf",
                        ".docx",
                        ".xlsx",
                        ".txt",
                        ".md",
                        ".csv",
                        ".json",
                        ".xml",
                        ".yaml",
                        ".yml",
                        ".feature",
                        ".ts",
                        ".tsx",
                        ".js",
                        ".mjs",
                        ".log",
                      ];
                      const total = contexts.reduce((sum, item) => sum + (item.size || 0), 0);
                      if (!extension || !allowed.includes(extension)) {
                        setContextError("This file type is not supported. Use an image, PDF, DOCX, XLSX or text file.");
                        return;
                      }
                      if (
                        !file.size ||
                        file.size > 4_000_000 ||
                        total + file.size > 8_000_000 ||
                        file.name.length > 180
                      ) {
                        setContextError("Choose a non-empty file up to 4 MB; attachments can total up to 8 MB.");
                        return;
                      }
                      setReadingFile(true);
                      try {
                        const dataUrl = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () =>
                            typeof reader.result === "string"
                              ? resolve(reader.result)
                              : reject(new Error("Could not read file."));
                          reader.onerror = () => reject(new Error("Could not read file."));
                          reader.readAsDataURL(file);
                        });
                        setContexts((items) => [
                          ...items,
                          {
                            id: contextId(),
                            kind: "upload",
                            ref: file.name,
                            label: file.name,
                            title: file.name,
                            data: dataUrl.split(",")[1],
                            mime: file.type,
                            size: file.size,
                          },
                        ]);
                        setContextError("");
                      } catch (cause) {
                        setContextError(cause instanceof Error ? cause.message : "Could not read file.");
                      } finally {
                        setReadingFile(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="agent-context-add"
                    onClick={() => {
                      setContextError("");
                      setSkillsOpen(false);
                      setContextPicker(contextPicker === "menu" ? null : "menu");
                      setContextSearch("");
                    }}
                    aria-expanded={contextPicker !== null}
                  >
                    + Add context <span>{contexts.length}/8</span>
                  </button>
                  {contexts.length > 0 && (
                    <button
                      type="button"
                      className="agent-context-clear"
                      onClick={() => {
                        setContexts([]);
                        setContextPreview(undefined);
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {contextPreview &&
                  (() => {
                    const item = contexts.find((candidate) => candidate.id === contextPreview);
                    if (!item) return null;
                    return (
                      <div className="agent-context-preview">
                        <div>
                          <strong>{contextDisplayLabel(item)}</strong>
                          <button
                            type="button"
                            onClick={() => setContextPreview(undefined)}
                            aria-label="Close context details"
                          >
                            ×
                          </button>
                        </div>
                        {!["feature", "category", "scenario"].includes(item.kind) && (
                          <small>
                            {item.kind === "note"
                              ? "Custom note"
                              : item.kind === "upload"
                                ? "Attachment | sent with your next message"
                                : item.ref}
                          </small>
                        )}
                        {item.kind === "upload" ? (
                          <div className="agent-file-details">
                            {item.mime?.startsWith("image/") && item.data && (
                              <img src={`data:${item.mime};base64,${item.data}`} alt={`Preview of ${item.label}`} />
                            )}
                            <span>
                              {item.size ? `${(item.size / 1000).toFixed(1)} KB` : "File ready"} | Ready to send
                            </span>
                          </div>
                        ) : item.kind === "note" ? (
                          <p>{item.text}</p>
                        ) : (
                          <p>Source content is loaded from the selected QA workspace when you send this message.</p>
                        )}
                        {item.kind !== "run" && item.kind !== "upload" && (
                          <button type="button" className="agent-context-edit" onClick={() => editContext(item)}>
                            Change context
                          </button>
                        )}
                        <button type="button" className="agent-context-edit" onClick={() => removeContext(item.id)}>
                          Remove
                        </button>
                      </div>
                    );
                  })()}
                {contextPicker && (
                  <section className="agent-context-picker" aria-label="Add context to message">
                    <div className="agent-context-picker-heading">
                      <strong>
                        {contextPicker === "menu"
                          ? "Add context"
                          : contextPicker === "note"
                            ? editingNote
                              ? "Edit note"
                              : "Add a note"
                            : `Add ${contextPicker === "feature" ? "menu" : contextPicker === "file" ? "source file" : contextPicker}`}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          setContextPicker(null);
                          setEditingContextId(undefined);
                          setEditingNote(undefined);
                        }}
                        aria-label="Close context picker"
                      >
                        ×
                      </button>
                    </div>
                    {contextPicker === "menu" ? (
                      <div className="agent-context-options">
                        <button type="button" onClick={() => setContextPicker("feature")}>
                          Menu
                        </button>
                        {!home && (
                          <>
                            <button type="button" onClick={() => setContextPicker("category")}>
                              Category
                            </button>
                            <button type="button" onClick={() => setContextPicker("scenario")}>
                              Scenario
                            </button>
                          </>
                        )}
                      </div>
                    ) : contextPicker === "note" ? (
                      <div className="agent-context-note-form">
                        <label>
                          Label
                          <input
                            value={noteTitle}
                            maxLength={80}
                            placeholder="Acceptance criteria"
                            onChange={(event) => setNoteTitle(event.target.value)}
                          />
                        </label>
                        <label>
                          Note
                          <textarea
                            value={noteText}
                            maxLength={4000}
                            rows={3}
                            placeholder="Add only context relevant to this QA task."
                            onChange={(event) => setNoteText(event.target.value)}
                          />
                        </label>
                        <small>Do not put passwords, tokens, or credentials in a note.</small>
                        <button type="button" onClick={saveNote}>
                          {editingNote ? "Save changes" : "Attach note"}
                        </button>
                      </div>
                    ) : contextPicker === "scenario" ? (
                      <>
                        <input
                          className="agent-context-search"
                          value={contextSearch}
                          maxLength={160}
                          onChange={(event) => setContextSearch(event.target.value)}
                          placeholder="Search scenarios"
                          aria-label="Search scenarios to attach"
                        />
                        <div className="agent-context-results">
                          {scenarioOptions.map((item) => (
                            <button type="button" key={item.key} onClick={() => addScenarioContext(item)}>
                              <strong>{item.title}</strong>
                              <small>{item.feature || displayLabel(item.module)}</small>
                            </button>
                          ))}
                          {scenarioOptions.length === 0 && <p>No matching scenarios.</p>}
                        </div>
                      </>
                    ) : contextPicker === "feature" ? (
                      <>
                        <input
                          className="agent-context-search"
                          value={contextSearch}
                          maxLength={160}
                          onChange={(event) => setContextSearch(event.target.value)}
                          placeholder="Search menus"
                          aria-label="Search menus to attach"
                        />
                        <div className="agent-context-results">
                          {featureOptions
                            .filter((item) => !selectedContextRefs.has(`feature:${item.file}`))
                            .filter((item) =>
                              `${item.module} ${item.title} ${item.file}`
                                .toLowerCase()
                                .includes(contextSearch.trim().toLowerCase()),
                            )
                            .slice(0, 30)
                            .map((item) => (
                              <button type="button" key={item.file} onClick={() => addFeatureContext(item)}>
                                <strong>{item.title}</strong>
                                <small>{displayLabel(item.module)}</small>
                              </button>
                            ))}
                        </div>
                      </>
                    ) : contextPicker === "category" ? (
                      <>
                        <input
                          className="agent-context-search"
                          value={contextSearch}
                          maxLength={160}
                          onChange={(event) => setContextSearch(event.target.value)}
                          placeholder="Search categories"
                          aria-label="Search categories to attach"
                        />
                        <div className="agent-context-results">
                          {categoryOptions
                            .filter(
                              (item) =>
                                !selectedContextRefs.has(
                                  `category:${JSON.stringify([item.module, item.file, item.category])}`,
                                ),
                            )
                            .filter((item) =>
                              `${item.category} ${item.feature} ${item.module}`
                                .toLowerCase()
                                .includes(contextSearch.trim().toLowerCase()),
                            )
                            .slice(0, 30)
                            .map((item) => (
                              <button
                                type="button"
                                key={JSON.stringify([item.module, item.file, item.category])}
                                onClick={() => addCategoryContext(item)}
                              >
                                <strong>{item.category}</strong>
                                <small>{item.feature}</small>
                              </button>
                            ))}
                          {categoryOptions.every((item) =>
                            selectedContextRefs.has(
                              `category:${JSON.stringify([item.module, item.file, item.category])}`,
                            ),
                          ) && <p>No categories available.</p>}
                        </div>
                      </>
                    ) : contextPicker === "flow" ? (
                      <>
                        <input
                          className="agent-context-search"
                          value={contextSearch}
                          onChange={(event) => setContextSearch(event.target.value)}
                          placeholder="Search flow registries by feature"
                          aria-label="Search flow registries"
                        />
                        <div className="agent-context-results">
                          {contextFiles
                            .filter((path) => path.endsWith(".flows.md"))
                            .map((path) => (
                              <button type="button" key={path} onClick={() => addFlowContext(path)}>
                                <strong>{path}</strong>
                                <small>Flow inventory and review state</small>
                              </button>
                            ))}
                          {contextLoading && <p>Searching flow registries...</p>}
                          {contextSearch.trim().length < 2 && (
                            <p>Type at least 2 characters to search flow registries.</p>
                          )}
                          {!contextLoading &&
                            !contextError &&
                            contextSearch.trim().length >= 2 &&
                            contextFiles.filter((path) => path.endsWith(".flows.md")).length === 0 && (
                              <p>No flow registry found for that search.</p>
                            )}
                        </div>
                      </>
                    ) : contextPicker === "file" ? (
                      <>
                        <input
                          className="agent-context-search"
                          value={contextSearch}
                          onChange={(event) => setContextSearch(event.target.value)}
                          placeholder="Search project source files"
                          aria-label="Search source files to attach"
                        />
                        <div className="agent-context-results">
                          {contextFiles.map((path) => (
                            <button
                              type="button"
                              key={path}
                              onClick={() => addContext({ id: contextId(), kind: "file", ref: path, label: path })}
                            >
                              <strong>{path.split("/").at(-1)}</strong>
                              <small>{path}</small>
                            </button>
                          ))}
                          {contextLoading && <p>Searching project sources...</p>}
                          {contextSearch.trim().length < 2 && (
                            <p>Type at least 2 characters to search safe project sources.</p>
                          )}
                          {!contextLoading &&
                            !contextError &&
                            contextSearch.trim().length >= 2 &&
                            contextFiles.length === 0 && <p>No matching source files.</p>}
                        </div>
                      </>
                    ) : (
                      <div className="agent-context-results">
                        {latestRun?.done && (
                          <button
                            type="button"
                            onClick={() =>
                              addContext({
                                id: contextId(),
                                kind: "run",
                                ref: latestRun.id,
                                label: `Run result · ${latestRun.scenarioId} · ${latestRun.status}`,
                              })
                            }
                          >
                            <strong>
                              {latestRun.status} · {latestRun.scenarioId}
                            </strong>
                            <small>{latestRun.target}</small>
                          </button>
                        )}
                      </div>
                    )}
                    {contextError && (
                      <p className="agent-context-error" role="alert">
                        {contextError}
                      </p>
                    )}
                  </section>
                )}
                {contextError && !contextPicker && (
                  <p className="agent-context-error" role="alert">
                    {contextError}
                  </p>
                )}
              </fieldset>
              <textarea
                id="agent-message"
                className="agent-message-input"
                ref={composerRef}
                value={message}
                aria-describedby="agent-message-hint"
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                  if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    const input = event.currentTarget;
                    const start = input.selectionStart;
                    const end = input.selectionEnd;
                    const next = `${message.slice(0, start)}\n${message.slice(end)}`;
                    if (next.length > 8000) return;
                    setMessage(next);
                    requestAnimationFrame(() => input.setSelectionRange(start + 1, start + 1));
                  } else if (!event.shiftKey && !event.altKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder={scenario ? "Ask about this scenario..." : "Ask a question or describe a testing task..."}
                rows={2}
                maxLength={8000}
              />
              <div className="agent-composer-toolbar">
                <button
                  className="agent-skill-button"
                  type="button"
                  onClick={() => {
                    setContextPicker(null);
                    setSkillsOpen(!skillsOpen);
                  }}
                  title="Choose a QA skill"
                  aria-expanded={skillsOpen}
                >
                  / <span>Skills</span>
                </button>
                {skillsOpen && (
                  <fieldset className="agent-commands">
                    <legend className="agent-sr-only">Available QA skills</legend>
                    {commands.map((command) => (
                      <button
                        type="button"
                        key={command.name}
                        onClick={() => {
                          setSelectedSkill(command.name);
                          setSkillsOpen(false);
                        }}
                      >
                        <strong>/{command.name}</strong>
                        <small>{command.description}</small>
                      </button>
                    ))}
                  </fieldset>
                )}
                <span className="agent-keyboard-hint" id="agent-message-hint">
                  {sendBlockedReason || "Enter to send · Ctrl / ⌘ + Enter for a new line"}
                </span>
                <button type="submit" disabled={Boolean(sendBlockedReason)} title={sendBlockedReason}>
                  {sending ? "Sending..." : "Send"} <span aria-hidden="true">&#8593;</span>
                </button>
              </div>
            </form>
          ) : null}
        </section>
      )}
      {!home && (
        <button
          ref={toggleRef}
          className={open ? "agent-toggle is-open" : "agent-toggle"}
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="agent-panel"
        >
          <span className="agent-toggle-avatar" aria-hidden="true">
            <Testasaurus mood={mood} />
          </span>
          <span className="agent-toggle-copy">
            <strong>{open ? "Minimize chat" : "Chat with Testasaurus"}</strong>
            <span className="agent-toggle-status" data-mood={mood}>
              <i aria-hidden="true" /> {statusLabel}
            </span>
          </span>
          <span className="agent-toggle-arrow" aria-hidden="true">
            {open ? "↓" : "↗"}
          </span>
        </button>
      )}
    </div>
  );
}
