import { Icon } from "@hyperscal/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { SelectInput, TextAreaInput, TextInput } from "../../components";
import { readVariables } from "../runs/run-variables";
import { useActiveRun } from "../runs/use-active-run";
import { useDraftRuns } from "../runs/use-draft-runs";
import { useRunEnvironment } from "../runs/use-run-environment";
import { label as displayLabel } from "../scenarios/scenario";
import { agentFetch, getActiveDraftId, setActiveDraftId } from "./agent-api";
import { AgentSettings } from "./agent-settings";
import {
  AgentContextAction,
  AgentContextError,
  AgentContextOption,
  AgentContextResults,
  AgentContextSearch,
} from "./components/agent-context-controls";
import {
  AgentAlert,
  AgentModelButton,
  AgentReviewHeading,
  AgentReviewNote,
  AgentReviewStatus,
  AgentWorkspaceButton,
  PullRequestLink,
} from "./components/agent-review-controls";
import { AgentStarterButton } from "./components/agent-starter-button";
import { AgentWorkspaceTab } from "./components/agent-workspace-tab";
import { QRex, type QRexMood } from "./q-rex";
import { useWidgetDrag } from "./use-widget-drag";
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
  provider?: string;
  model?: string;
  baseCommit?: string;
  branch?: string;
  baseBranch?: string;
  syncConflicts?: Array<string>;
  requestedSkill?: string;
  canCancel?: boolean;
  userRequest?: { id: string | number; questions: Array<AgentQuestion> };
  approvalRequest?: {
    id: string | number;
    kind: "command" | "file" | "data-safety" | "prd-review" | "flow-review";
    reason: string;
    command: string;
  };
}
interface LocalDraft {
  id: string;
  title: string;
  branch?: string;
  targetBranch: string;
  status: "active" | "archived";
  lastActivityAt: string;
}
interface PullRequestRecord {
  title: string;
  url: string;
  number: number;
  branch: string;
  baseBranch: string;
  status: string;
  createdAt: string;
  mergedAt?: string;
  closedAt?: string;
}
interface AgentQuestion {
  id: string;
  header: string;
  question: string;
  isSecret: boolean;
  options: Array<{ label: string; description: string; recommended?: boolean }> | null;
}
interface DraftFeature {
  file: string;
  deleted?: boolean;
  scenarios: Array<{ id: string; title: string; line: number; steps: Array<string> }>;
}
const endpoint = "/api/agent";

const contextStorageKey = "automation-agent-contexts";
const commands = [
  { name: "ask-qa", description: "Ask about testing or investigate a scenario." },
  { name: "write-prd", description: "Import, explore, or review a sub-module PRD." },
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
  const navigate = useNavigate();
  const widgetDrag = useWidgetDrag(!home);
  const [view, setView] = useState<"chat" | "changes" | "history" | "settings">("chat");
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
  const { run: draftRun, starting: draftRunStarting } = useDraftRuns();
  const selectionSignature = scenario ? `scenario:${scenario.key}` : feature ? `feature:${feature.file}` : "";
  const previousSelection = useRef(selectionSignature);
  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };
  const selectPrompt = (value: string) => {
    const match = value.match(/^\/(ask-qa|write-prd|write-e2e-scenarios|write-e2e-code)\s*/);
    if (match) {
      setSelectedSkill(match[1]);
      setMessage(value.slice(match[0].length));
    } else setMessage(value);
    setSkillsOpen(false);
    composerRef.current?.focus();
  };
  useEffect(() => {
    if (home && sessionStorage.getItem("automation-prd-start")) {
      const prompt = sessionStorage.getItem("automation-prd-start") || "Help me create or import a PRD for ";
      sessionStorage.removeItem("automation-prd-start");
      setSelectedSkill("write-prd");
      setMessage(prompt);
      composerRef.current?.focus();
    }
  }, [home]);
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
  const [activeDraftId, setDraftIdState] = useState(() => getActiveDraftId());
  const [drafts, setDrafts] = useState<Array<LocalDraft>>([]);
  const [draftTargets, setDraftTargets] = useState<Array<string>>([]);
  const [defaultDraftTarget, setDefaultDraftTarget] = useState("");
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTarget, setDraftTarget] = useState("");
  const [draftError, setDraftError] = useState("");
  const [pullRequests, setPullRequests] = useState<Array<PullRequestRecord>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  useEffect(() => {
    const update = () => setDraftIdState(getActiveDraftId());
    window.addEventListener("automation-agent-draft-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("automation-agent-draft-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
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
  }, [message, open, home, view, session?.userRequest]);
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

  const selectDraft = useCallback(
    (draftId: string) => {
      if (draftRun || draftRunStarting || sending || reviewing || session?.busy) return;
      setActiveDraftId(draftId);
      setDraftIdState(draftId);
      setSession(undefined);
      setConnectionError(false);
      setError("");
      setPatch(undefined);
      setReviewDigest(undefined);
      setScenarioReview(undefined);
      setPreview([]);
      setView("chat");
    },
    [draftRun, draftRunStarting, reviewing, sending, session?.busy],
  );

  const loadDrafts = useCallback(async () => {
    setDraftsLoading(true);
    setDraftError("");
    try {
      const [draftResponse, targetResponse] = await Promise.all([
        agentFetch(`${endpoint}/drafts`, { cache: "no-store" }),
        agentFetch(`${endpoint}/draft-targets`, { cache: "no-store" }),
      ]);
      const [draftResult, targetResult] = await Promise.all([draftResponse.json(), targetResponse.json()]);
      if (!draftResponse.ok) throw new Error(draftResult.error || "Could not load local drafts.");
      if (!targetResponse.ok) throw new Error(targetResult.error || "Could not load target branches.");
      let nextDrafts = draftResult as Array<LocalDraft>;
      const targets = targetResult as { branches?: Array<string>; defaultBranch?: string };
      setDrafts(nextDrafts);
      setDraftTargets(targets.branches || []);
      setDefaultDraftTarget(targets.defaultBranch || "");
      setDraftTarget((current) => current || targets.defaultBranch || targets.branches?.[0] || "");

      let preferred = nextDrafts.find((draft) => draft.id === activeDraftId && draft.status === "active");
      if (!preferred) preferred = nextDrafts.find((draft) => draft.status === "active");
      if (!preferred) preferred = nextDrafts.find((draft) => draft.id === activeDraftId);
      if (!preferred) preferred = nextDrafts[0];
      if (!preferred && nextDrafts.length === 0 && targets.defaultBranch) {
        const createResponse = await agentFetch(`${endpoint}/drafts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Local draft", targetBranch: targets.defaultBranch }),
        });
        const created = (await createResponse.json()) as LocalDraft & { error?: string };
        if (!createResponse.ok) throw new Error(created.error || "Could not create a local draft.");
        nextDrafts = [created];
        setDrafts(nextDrafts);
        preferred = created;
      }
      if (preferred && preferred.id !== activeDraftId) {
        setActiveDraftId(preferred.id);
        setDraftIdState(preferred.id);
      } else if (!preferred && activeDraftId) {
        setActiveDraftId("");
        setDraftIdState("");
      }
      if (!preferred && nextDrafts.length === 0 && !targets.defaultBranch)
        setDraftError("Create a local target branch before starting a draft.");
    } catch (cause) {
      setDraftError(
        cause instanceof SyntaxError
          ? "Could not load local drafts. Check that the local Automation API is running."
          : cause instanceof Error
            ? cause.message
            : "Could not load local drafts.",
      );
    } finally {
      setDraftsLoading(false);
    }
  }, [activeDraftId]);

  const createDraft = async () => {
    if (drafts.length > 0 || sending || reviewing || session?.busy || draftRunStarting || draftRun) return;
    const title = draftTitle.trim() || "Local draft";
    const targetBranch = draftTarget || defaultDraftTarget;
    if (!targetBranch) {
      setDraftError("Choose a target branch before creating a draft.");
      return;
    }
    setSending(true);
    setDraftError("");
    try {
      const response = await agentFetch(`${endpoint}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, targetBranch }),
      });
      const result = (await response.json()) as LocalDraft & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not create a local draft.");
      setDrafts((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      setDraftTitle("");
      setShowDraftForm(false);
      selectDraft(result.id);
    } catch (cause) {
      setDraftError(cause instanceof Error ? cause.message : "Could not create a local draft.");
    } finally {
      setSending(false);
    }
  };

  const restoreDraft = async () => {
    const selected = drafts.find((draft) => draft.id === activeDraftId);
    if (!selected || selected.status !== "archived") return;
    setSending(true);
    setDraftError("");
    try {
      const response = await agentFetch(`${endpoint}/drafts/${selected.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const result = (await response.json()) as LocalDraft & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not restore this draft.");
      setDrafts((current) => current.map((draft) => (draft.id === result.id ? result : draft)));
      selectDraft(result.id);
    } catch (cause) {
      setDraftError(cause instanceof Error ? cause.message : "Could not restore this draft.");
    } finally {
      setSending(false);
    }
  };

  const loadPullRequests = useCallback(async (refresh = false) => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await agentFetch(`${endpoint}/pull-requests${refresh ? "/refresh" : ""}`, {
        method: refresh ? "POST" : "GET",
        ...(refresh ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {}),
        cache: "no-store",
      });
      const result = (await response.json()) as Array<PullRequestRecord> & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load PR history.");
      setPullRequests(result as Array<PullRequestRecord>);
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : "Could not load PR history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  useEffect(() => {
    if ((!open && !home) || view !== "history") return;
    void loadPullRequests();
  }, [open, home, view, loadPullRequests]);

  useEffect(() => {
    if (!activeDraftId) return;
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
  }, [activeDraftId, applySnapshot]);

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
      ? registryPath.replace(/^e2e\/tests\/bdd\/features\//, "").replace(/\.flows\.md$/, ".feature")
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
      readingFile ||
      reviewing ||
      !session ||
      connectionError ||
      !session.provider ||
      !session.model ||
      !drafts.some((draft) => draft.id === activeDraftId && draft.status === "active") ||
      session.busy ||
      draftRunStarting ||
      draftRun
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
          variables: readVariables(),
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

  const reviewDiff = async (force = false) => {
    if (reviewing || (sending && !force)) return;
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
      setPatch(undefined);
      setReviewDigest(undefined);
      setScenarioReview(undefined);
      setPreview([]);
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

  const syncDraft = async () => {
    if (!reviewDigest || !commitMessage.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await agentFetch(`${endpoint}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMessage, digest: reviewDigest }),
      });
      const result = (await response.json()) as {
        status?: string;
        conflicts?: Array<string>;
        digest?: string;
        error?: string;
        sync?: { status?: string; conflicts?: Array<string> };
      };
      if (!response.ok) {
        if (result.sync?.conflicts)
          setSession((current) => current && { ...current, syncConflicts: result.sync?.conflicts });
        throw new Error(result.error || "Could not synchronize the draft.");
      }
      const conflicts = result.conflicts || [];
      setSession((current) => current && { ...current, syncConflicts: conflicts });
      if (result.status === "conflicts") {
        setError(`Resolve target-branch conflicts in the draft workspace: ${conflicts.join(", ")}`);
        return;
      }
      setSending(false);
      await reviewDiff(true);
      setError(
        result.status === "updated" || result.status === "merge-ready"
          ? "The draft is synchronized. Review the updated changes before finalizing."
          : "The draft is up to date with its target branch.",
      );
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : "Could not synchronize the draft.";
      setError(error);
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
      const result = (await response.json()) as {
        pullRequest?: { url: string };
        session?: Session;
        error?: string;
        sync?: { status?: string; conflicts?: Array<string> };
      };
      if (!response.ok) {
        if (result.sync) {
          setSession((current) => current && { ...current, syncConflicts: result.sync?.conflicts });
          if (result.sync.status !== "conflicts") {
            setSending(false);
            await reviewDiff(true);
          }
        }
        throw new Error(result.error);
      }
      if (result.session) applySnapshot(result.session, ++requestNumber.current);
      const draftsResponse = await agentFetch(`${endpoint}/drafts`, { cache: "no-store" });
      const remainingDrafts = (await draftsResponse.json()) as Array<LocalDraft>;
      setDrafts(remainingDrafts);
      const nextDraft = remainingDrafts.find((draft) => draft.status === "active") || remainingDrafts[0];
      if (nextDraft) {
        setActiveDraftId(nextDraft.id);
        setDraftIdState(nextDraft.id);
        setSession(undefined);
      } else {
        setActiveDraftId("");
        setDraftIdState("");
        setSession(undefined);
      }
      setReviewDigest(undefined);
      setScenarioReview(undefined);
      setPreview([]);
      setCommitMessage("");
      setView("history");
      void loadPullRequests();
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

  const selectedDraft = drafts.find((draft) => draft.id === activeDraftId);
  const mood: QRexMood =
    connectionError || (Boolean(draftError) && !selectedDraft && !draftsLoading)
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
  const needsProvider = Boolean(session && !connectionError && (!session.provider || !session.model));
  const canShowReview = Boolean(
    session?.branch && !connectionError && !session.busy && !draftRunStarting && !draftRun && !reviewing,
  );
  const statusLabel =
    selectedDraft?.status === "archived" && mood !== "offline"
      ? "Draft archived"
      : (draftRunStarting || draftRun) && mood !== "offline"
        ? "Draft run in progress"
        : needsProvider && mood !== "waiting" && mood !== "working" && mood !== "offline"
          ? "AI setup needed"
          : {
              offline: connectionError ? "Reconnecting" : "Unavailable",
              connecting: "Connecting",
              waiting: "Needs your input",
              working: reviewing ? "Loading changes" : "Working",
              listening: "Ready for your request",
              idle: "Ready",
            }[mood];
  const sendBlockedReason = sending
    ? "Sending your message…"
    : draftRunStarting || draftRun
      ? "Wait for the draft scenario run and evidence capture to finish."
      : draftsLoading && !selectedDraft
        ? "Loading local drafts…"
        : draftError && !selectedDraft
          ? "Retry loading local drafts before chatting."
          : !selectedDraft
            ? "Create a local draft before chatting."
            : selectedDraft.status === "archived"
              ? "Restore this archived draft before continuing."
              : readingFile
                ? "Reading the attached file…"
                : reviewing
                  ? "Loading workspace changes…"
                  : !session || connectionError
                    ? "Connecting to Q-Rex…"
                    : session.busy
                      ? "The agent is working. Stop it before sending another message."
                      : !session.provider || !session.model
                        ? "Configure and select a tested provider model in Provider settings."
                        : !message.trim()
                          ? "Enter a message."
                          : undefined;
  return (
    <div ref={widgetDrag.ref} style={widgetDrag.style} className={home ? "agent-widget agent-home" : "agent-widget"}>
      {(open || home) && (
        <section id="agent-panel" className="agent-panel" aria-label="Q-Rex">
          <header className="agent-header" {...(!home ? widgetDrag.handleProps : {})}>
            <div className="agent-heading">
              <button
                className="agent-mascot-button"
                type="button"
                onClick={() => setWaves((count) => count + 1)}
                aria-label="Wave to Q-Rex"
                title="Wave to Q-Rex"
              >
                <span key={waves} className={waves ? "agent-mascot-wave" : undefined}>
                  <QRex mood={mood} />
                </span>
                {waves > 0 && (
                  <span className="agent-mascot-hello" aria-hidden="true">
                    Hi!
                  </span>
                )}
              </button>
              <span className="agent-sr-only" aria-live="polite">
                {waves > 0 && <span key={waves}>Q-Rex waves back!</span>}
              </span>
              <span className="agent-heading-copy">
                <strong>Q-Rex</strong>
                <span
                  role="status"
                  data-mood={mood}
                  className={mood === "offline" ? "agent-status offline" : "agent-status"}
                >
                  <i aria-hidden="true" />
                  {statusLabel}
                </span>
              </span>
            </div>
            {session?.provider && session.model ? (
              <AgentModelButton onClick={() => setView("settings")} title="Change the provider or model">
                {session.provider} · {session.model}
              </AgentModelButton>
            ) : (
              <AgentModelButton onClick={() => setView("settings")}>Configure AI provider</AgentModelButton>
            )}
            {(!selectedDraft || selectedDraft.status === "archived") && (
              <div className="agent-draft-toolbar">
                {!selectedDraft && (
                  <button
                    type="button"
                    disabled={
                      sending ||
                      reviewing ||
                      session?.busy ||
                      draftsLoading ||
                      draftRunStarting ||
                      Boolean(draftRun) ||
                      draftTargets.length === 0
                    }
                    onClick={() => setShowDraftForm(!showDraftForm)}
                  >
                    New draft
                  </button>
                )}
                {selectedDraft?.status === "archived" && (
                  <button type="button" disabled={sending} onClick={() => void restoreDraft()}>
                    Restore draft
                  </button>
                )}
                <small className="agent-sr-only">
                  Stored in this local preview. The browser identity is not sign-in.
                </small>
              </div>
            )}
            <div className="agent-header-actions">
              {!home && (
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="agent-expand"
                  aria-label="Open Q-Rex fullscreen"
                  title="Open Q-Rex fullscreen"
                >
                  <Icon name="arrows-diagonal" aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                disabled={sending || reviewing || session?.busy || draftRunStarting || Boolean(draftRun)}
                className="agent-new-chat"
                aria-label="New chat"
                title="Start a new conversation"
              >
                <Icon name="plus" aria-hidden="true" /> <span>New chat</span>
              </button>
              {!home && (
                <button
                  type="button"
                  onClick={close}
                  className="agent-close"
                  aria-label="Close Q-Rex"
                  title="Close chat"
                >
                  <Icon name="x" aria-hidden="true" />
                </button>
              )}
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
          {showDraftForm && !selectedDraft && (
            <form
              className="agent-draft-form"
              onSubmit={(event) => {
                event.preventDefault();
                void createDraft();
              }}
            >
              <label htmlFor="agent-draft-title">Draft name</label>
              <TextInput
                id="agent-draft-title"
                value={draftTitle}
                maxLength={80}
                onValueChange={setDraftTitle}
                placeholder="e.g. Improve user management scenarios"
              />
              <label htmlFor="agent-draft-target">Target branch</label>
              <SelectInput
                label="Target branch"
                id="agent-draft-target"
                value={draftTarget}
                onChange={setDraftTarget}
                options={draftTargets.map((branch) => ({ value: branch, label: branch }))}
              />
              <div>
                <button
                  type="submit"
                  disabled={
                    sending || reviewing || session?.busy || draftRunStarting || Boolean(draftRun) || !draftTarget
                  }
                >
                  Create draft
                </button>
                <button type="button" disabled={sending} onClick={() => setShowDraftForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          {draftError && (
            <AgentAlert as="div" className="agent-draft-error">
              <span>{draftError}</span>
              <button type="button" disabled={draftsLoading} onClick={() => void loadDrafts()}>
                Retry
              </button>
            </AgentAlert>
          )}
          {selectedDraft?.status === "archived" && (
            <p className="agent-archive-note" role="status">
              This draft was archived after 30 days without activity. Its local branch and worktree were kept.
            </p>
          )}
          <nav className="agent-tabs" aria-label="Agent workspace">
            <AgentWorkspaceTab current={view === "chat"} onSelect={() => setView("chat")}>
              Chat
            </AgentWorkspaceTab>
            <AgentWorkspaceTab
              current={view === "changes"}
              onSelect={() => {
                setView("changes");
                setError("");
                if (session?.branch && !session.busy && !sending && !reviewing && !draftRunStarting && !draftRun)
                  void reviewDiff();
              }}
            >
              {reviewing ? "Loading..." : "Changes"}{" "}
              {reviewDigest && (
                <>
                  <span className="agent-change-dot" aria-hidden="true" />
                  <span className="agent-sr-only">Changes ready for review</span>
                </>
              )}
            </AgentWorkspaceTab>
            <AgentWorkspaceTab current={view === "history"} onSelect={() => setView("history")}>
              PR history
            </AgentWorkspaceTab>
            <AgentWorkspaceTab current={view === "settings"} onSelect={() => setView("settings")}>
              Provider
            </AgentWorkspaceTab>
          </nav>
          {view === "settings" && (
            <AgentSettings
              key={`${activeDraftId}:${Boolean(selectedDraft && session && !connectionError && selectedDraft.status === "active")}`}
              available={Boolean(selectedDraft && session && !connectionError && selectedDraft.status === "active")}
              unavailableReason={
                connectionError
                  ? "Reconnect to the local API to manage provider settings."
                  : selectedDraft?.status === "archived"
                    ? "Restore this draft to manage provider settings."
                    : "Create a draft to manage provider settings."
              }
              agentBusy={Boolean(session?.busy || sending || draftRunStarting || draftRun)}
              onSessionSaved={(saved) => {
                setSession((current) => current && { ...current, provider: saved.provider, model: saved.model });
              }}
            />
          )}
          {view === "history" && (
            <section className="agent-pr-history" aria-label="Pull request history" aria-busy={historyLoading}>
              <AgentReviewHeading
                title="Pull request history"
                description="Pull requests created from your drafts, in one place."
                actionLabel={historyLoading ? "Refreshing…" : "Refresh status"}
                disabled={historyLoading}
                onAction={() => void loadPullRequests(true)}
              />
              <AgentReviewNote title="Local preview status">
                Status updates on refresh using the GitHub CLI account on this computer.
              </AgentReviewNote>
              {historyLoading ? (
                <AgentReviewStatus>Loading pull requests…</AgentReviewStatus>
              ) : historyError ? (
                <AgentAlert>{historyError} Try refreshing the history again.</AgentAlert>
              ) : pullRequests.length ? (
                <ul className="agent-pr-list">
                  {pullRequests.map((pullRequest) => (
                    <li key={pullRequest.url}>
                      <div className="agent-pr-main">
                        <span className="agent-pr-number">PR #{pullRequest.number}</span>
                        <PullRequestLink url={pullRequest.url}>{pullRequest.title}</PullRequestLink>
                        <small>
                          <code>{pullRequest.branch}</code> → <code>{pullRequest.baseBranch}</code>
                        </small>
                      </div>
                      <span className="agent-pr-status" data-status={pullRequest.status.toLowerCase()}>
                        {pullRequest.status.toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <AgentReviewStatus>
                  No pull requests yet. Finalize a reviewed draft to see it here. History belongs to this browser's
                  local preview identity.
                </AgentReviewStatus>
              )}
            </section>
          )}
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
              {needsProvider && selectedDraft?.status === "active" && (
                <div
                  className={session?.messages.length ? "agent-readiness" : "agent-readiness agent-readiness-empty"}
                  role="status"
                >
                  {!session?.messages.length && <QRex mood={mood} large />}
                  <div>
                    <strong>Set up an AI provider to start chatting</strong>
                    <p>Save a provider key and choose a model for this chat.</p>
                  </div>
                  <button type="button" onClick={() => setView("settings")}>
                    Open provider settings
                  </button>
                </div>
              )}
              {!selectedDraft && !draftsLoading && !draftError && (
                <p className="agent-review-empty" role="status">
                  Create a local draft to start chatting.
                </p>
              )}
              {draftsLoading && !selectedDraft && (
                <p className="agent-review-empty" role="status">
                  Loading local drafts…
                </p>
              )}
              {!session && !connectionError && selectedDraft && (
                <p className="agent-review-empty" role="status">
                  Connecting to the agent…
                </p>
              )}
              {session &&
                !session.messages.length &&
                !needsProvider &&
                !error &&
                !session.error &&
                !connectionError &&
                selectedDraft?.status === "active" &&
                !session.busy &&
                !session.userRequest &&
                !session.approvalRequest &&
                !draftRunStarting &&
                !draftRun && (
                  <div className="agent-welcome">
                    <QRex mood={mood} large />
                    <span className="agent-eyebrow">YOUR QA SIDEKICK</span>
                    <h2>Small arms. Big test coverage.</h2>
                    <p>I’m Q-Rex. Let’s explore, design, and improve your tests.</p>
                    <div className="agent-starters">
                      <AgentStarterButton
                        title="Understand & investigate"
                        description="Understand coverage and find gaps"
                        onSelect={() =>
                          selectPrompt(
                            scenario
                              ? "Explain this scenario and identify gaps in its coverage."
                              : "Help me understand our QA workflows and test coverage.",
                          )
                        }
                      />
                      <AgentStarterButton
                        title="Create a sub-module PRD"
                        description="Import a document or explore a module"
                        onSelect={() => selectPrompt("/write-prd Help me create or import a PRD for ")}
                      />
                      <AgentStarterButton
                        title="Design a scenario"
                        description="Draft a test for review"
                        onSelect={() => selectPrompt("/write-e2e-scenarios Help me draft scenarios for ")}
                      />
                      <AgentStarterButton
                        title="Work on test code"
                        description="Implement or repair a test"
                        onSelect={() => selectPrompt("/write-e2e-code Help me repair the implementation of ")}
                      />
                    </div>
                  </div>
                )}

              {session?.messages.map((item) => (
                <div className={`agent-message ${item.role}`} key={item.id}>
                  <strong>{item.role === "user" ? "You" : item.role === "tool" ? "HyperTest runner" : "Q-Rex"}</strong>
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
                  <QRex mood={mood} />
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
            <section className="agent-diff" aria-label="Workspace changes" aria-busy={reviewing}>
              <AgentReviewHeading
                title="Workspace changes"
                description="Review the diff, sync with the target branch, then create a pull request."
                actionLabel={reviewing ? "Refreshing…" : "Refresh"}
                disabled={
                  !session?.branch ||
                  connectionError ||
                  reviewing ||
                  sending ||
                  session.busy ||
                  draftRunStarting ||
                  Boolean(draftRun)
                }
                onAction={() => void reviewDiff()}
              />
              {session?.branch && (
                <div className="agent-branch">
                  <span>Local branch</span>
                  <code>{session.branch}</code>
                  {session.baseBranch && (
                    <small>
                      Target: <code>{session.baseBranch}</code>
                    </small>
                  )}
                  {session.baseCommit && <small>Based on {session.baseCommit.slice(0, 7)}</small>}
                </div>
              )}
              {reviewing ? (
                <AgentReviewStatus>Loading workspace changes...</AgentReviewStatus>
              ) : !selectedDraft ? (
                <AgentReviewStatus>Create a draft to review its changes.</AgentReviewStatus>
              ) : connectionError || !session ? (
                <AgentReviewStatus>Connect to the local agent to load workspace changes.</AgentReviewStatus>
              ) : !session.branch ? (
                <AgentReviewStatus>
                  The workspace is created when the agent starts working on this draft.
                </AgentReviewStatus>
              ) : session.busy || draftRunStarting || draftRun ? (
                <AgentReviewStatus>Wait for the current work to finish, then refresh the changes.</AgentReviewStatus>
              ) : error && !patch ? (
                <AgentReviewStatus>Changes could not be loaded. Use Refresh to try again.</AgentReviewStatus>
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
                <AgentReviewStatus>{patch || "No changes in this workspace."}</AgentReviewStatus>
              )}
              {reviewDigest && canShowReview && (
                <AgentReviewNote as="div" title="Verification not recorded">
                  Check the conversation for test results. Submitting changes does not mean tests passed.
                </AgentReviewNote>
              )}
              {session?.syncConflicts && session.syncConflicts.length > 0 && (
                <div className="agent-review-section agent-sync-conflicts" role="alert">
                  <h3>Resolve target-branch conflicts</h3>
                  <p>Ask the Agent to resolve these files, or resolve them in the local worktree, then sync again.</p>
                  <ul>
                    {session.syncConflicts.map((file) => (
                      <li key={file}>
                        <code>{file}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {canShowReview && preview.length > 0 && (
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
              {canShowReview && scenarioReview?.hasChanges && (
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
                      <AgentWorkspaceButton type="button" disabled={sending} onClick={() => void approveScenarios()}>
                        Approve scenario changes
                      </AgentWorkspaceButton>
                    </>
                  )}
                </div>
              )}
              {canShowReview && reviewDigest && (
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
                      Sync with the target first. Pull requests use the GitHub CLI account configured on this computer.
                    </span>
                  </div>
                  <label htmlFor="agent-commit-message">Change title</label>
                  <TextInput
                    id="agent-commit-message"
                    value={commitMessage}
                    onValueChange={setCommitMessage}
                    maxLength={200}
                    placeholder="Describe these changes"
                  />
                  {scenarioReview?.hasChanges && !scenarioReview.approved && (
                    <p>Approve scenario changes before finalizing.</p>
                  )}
                  <AgentWorkspaceButton
                    type="button"
                    disabled={
                      sending || draftRunStarting || Boolean(draftRun) || !reviewDigest || !commitMessage.trim()
                    }
                    onClick={() => void syncDraft()}
                  >
                    {sending ? "Syncing…" : "Sync with target branch"}
                  </AgentWorkspaceButton>
                  <AgentWorkspaceButton
                    type="submit"
                    disabled={
                      sending || draftRunStarting || Boolean(draftRun) || !reviewDigest || !commitMessage.trim()
                    }
                  >
                    Finalize and create pull request
                  </AgentWorkspaceButton>
                </form>
              )}
              {Boolean(session?.history?.length) && (
                <section className="agent-review-section">
                  <h3>Your change history</h3>
                  {session?.history?.map((item) => (
                    <p key={item.url}>
                      <PullRequestLink url={item.url}>
                        {item.title} ? PR #{item.number}
                      </PullRequestLink>{" "}
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
          {view !== "history" && (error || session?.error || connectionError) && (
            <AgentAlert>
              {error || session?.error || "Cannot connect to the local Automation API. Retrying..."}
            </AgentAlert>
          )}
          {session?.approvalRequest ? (
            <fieldset className="agent-form agent-approval">
              <legend>
                {session.approvalRequest.kind === "data-safety"
                  ? "Live data-safety approval"
                  : session.approvalRequest.kind === "prd-review"
                    ? "PRD review"
                    : session.approvalRequest.kind === "flow-review"
                      ? "Confirm business flows"
                      : session.approvalRequest.kind === "command"
                        ? "Command permission"
                        : "File permission"}
              </legend>
              {session.approvalRequest.reason && <p>{session.approvalRequest.reason}</p>}
              {session.approvalRequest.command && <pre>{session.approvalRequest.command}</pre>}
              <div>
                <button type="button" disabled={sending} onClick={() => void decideApproval("decline")}>
                  Decline
                </button>{" "}
                <button type="button" disabled={sending} onClick={() => void decideApproval("accept")}>
                  {session.approvalRequest.kind === "data-safety"
                    ? "Approve this action"
                    : session.approvalRequest.kind === "prd-review"
                      ? "Approve this PRD version"
                      : session.approvalRequest.kind === "flow-review"
                        ? "Confirm these flows"
                        : "Allow"}
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
                        <small>
                          {option.recommended ? "Recommended. " : ""}
                          {option.description}
                        </small>
                      </label>
                    ))}
                  {question.isSecret ? (
                    <div className="agent-secret-answer">
                      <p>
                        Secret values are never sent to Q-Rex. Add this value in HyperTest Variables, then continue
                        without sharing it.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAnswers((current) => ({ ...current, [question.id]: "withheld" }))}
                      >
                        Continue without sharing secret
                      </button>
                    </div>
                  ) : (
                    <TextInput
                      aria-label={`Your answer: ${question.question}`}
                      type="text"
                      placeholder={question.options?.length ? "Or type your answer" : "Type your answer"}
                      value={
                        question.options?.some((option) => option.label === answers[question.id])
                          ? ""
                          : (answers[question.id] ?? "")
                      }
                      onValueChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
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
          ) : view === "chat" && !needsProvider ? (
            <form
              className="agent-form agent-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <label className="agent-sr-only" htmlFor="agent-message">
                Message Q-Rex
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
                          <AgentContextAction onSelect={() => editContext(item)}>Change context</AgentContextAction>
                        )}
                        <AgentContextAction onSelect={() => removeContext(item.id)}>Remove</AgentContextAction>
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
                        <label htmlFor="agent-note-title">
                          Label
                          <TextInput
                            id="agent-note-title"
                            value={noteTitle}
                            maxLength={80}
                            placeholder="Acceptance criteria"
                            onValueChange={setNoteTitle}
                          />
                        </label>
                        <label htmlFor="agent-note-text">
                          Note
                          <TextAreaInput
                            id="agent-note-text"
                            value={noteText}
                            maxLength={4000}
                            rows={3}
                            placeholder="Add only context relevant to this QA task."
                            onValueChange={setNoteText}
                          />
                        </label>
                        <small>Do not put passwords, tokens, or credentials in a note.</small>
                        <button type="button" onClick={saveNote}>
                          {editingNote ? "Save changes" : "Attach note"}
                        </button>
                      </div>
                    ) : contextPicker === "scenario" ? (
                      <>
                        <AgentContextSearch
                          value={contextSearch}
                          placeholder="Search scenarios"
                          label="Search scenarios to attach"
                          maxLength={160}
                          onChange={setContextSearch}
                        />
                        <AgentContextResults>
                          {scenarioOptions.map((item) => (
                            <AgentContextOption
                              key={item.key}
                              title={item.title}
                              description={item.feature || displayLabel(item.module)}
                              onSelect={() => addScenarioContext(item)}
                            />
                          ))}
                          {scenarioOptions.length === 0 && <p>No matching scenarios.</p>}
                        </AgentContextResults>
                      </>
                    ) : contextPicker === "feature" ? (
                      <>
                        <AgentContextSearch
                          value={contextSearch}
                          placeholder="Search menus"
                          label="Search menus to attach"
                          maxLength={160}
                          onChange={setContextSearch}
                        />
                        <AgentContextResults>
                          {featureOptions
                            .filter((item) => !selectedContextRefs.has(`feature:${item.file}`))
                            .filter((item) =>
                              `${item.module} ${item.title} ${item.file}`
                                .toLowerCase()
                                .includes(contextSearch.trim().toLowerCase()),
                            )
                            .slice(0, 30)
                            .map((item) => (
                              <AgentContextOption
                                key={item.file}
                                title={item.title}
                                description={displayLabel(item.module)}
                                onSelect={() => addFeatureContext(item)}
                              />
                            ))}
                        </AgentContextResults>
                      </>
                    ) : contextPicker === "category" ? (
                      <>
                        <AgentContextSearch
                          value={contextSearch}
                          placeholder="Search categories"
                          label="Search categories to attach"
                          maxLength={160}
                          onChange={setContextSearch}
                        />
                        <AgentContextResults>
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
                              <AgentContextOption
                                key={JSON.stringify([item.module, item.file, item.category])}
                                title={item.category}
                                description={item.feature}
                                onSelect={() => addCategoryContext(item)}
                              />
                            ))}
                          {categoryOptions.every((item) =>
                            selectedContextRefs.has(
                              `category:${JSON.stringify([item.module, item.file, item.category])}`,
                            ),
                          ) && <p>No categories available.</p>}
                        </AgentContextResults>
                      </>
                    ) : contextPicker === "flow" ? (
                      <>
                        <AgentContextSearch
                          value={contextSearch}
                          placeholder="Search flow registries by feature"
                          label="Search flow registries"
                          onChange={setContextSearch}
                        />
                        <AgentContextResults>
                          {contextFiles
                            .filter((path) => path.endsWith(".flows.md"))
                            .map((path) => (
                              <AgentContextOption
                                key={path}
                                title={path}
                                description="Flow inventory and review state"
                                onSelect={() => addFlowContext(path)}
                              />
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
                        </AgentContextResults>
                      </>
                    ) : contextPicker === "file" ? (
                      <>
                        <AgentContextSearch
                          value={contextSearch}
                          placeholder="Search project source files"
                          label="Search source files to attach"
                          onChange={setContextSearch}
                        />
                        <AgentContextResults>
                          {contextFiles.map((path) => (
                            <AgentContextOption
                              key={path}
                              title={path.split("/").at(-1)}
                              description={path}
                              onSelect={() => addContext({ id: contextId(), kind: "file", ref: path, label: path })}
                            />
                          ))}
                          {contextLoading && <p>Searching project sources...</p>}
                          {contextSearch.trim().length < 2 && (
                            <p>Type at least 2 characters to search safe project sources.</p>
                          )}
                          {!contextLoading &&
                            !contextError &&
                            contextSearch.trim().length >= 2 &&
                            contextFiles.length === 0 && <p>No matching source files.</p>}
                        </AgentContextResults>
                      </>
                    ) : (
                      <AgentContextResults>
                        {latestRun?.done && (
                          <AgentContextOption
                            title={
                              <>
                                {latestRun.status} · {latestRun.scenarioId}
                              </>
                            }
                            description={latestRun.target}
                            onSelect={() =>
                              addContext({
                                id: contextId(),
                                kind: "run",
                                ref: latestRun.id,
                                label: `Run result · ${latestRun.scenarioId} · ${latestRun.status}`,
                              })
                            }
                          />
                        )}
                        {!latestRun?.done && <p>No completed run is available to attach.</p>}
                      </AgentContextResults>
                    )}
                    {contextError && <AgentContextError>{contextError}</AgentContextError>}
                  </section>
                )}
                {contextError && !contextPicker && <AgentContextError>{contextError}</AgentContextError>}
              </fieldset>
              <TextAreaInput
                id="agent-message"
                className="agent-message-input"
                ref={composerRef}
                value={message}
                aria-describedby="agent-message-hint"
                onValueChange={setMessage}
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
                <span
                  className={
                    sendBlockedReason && sendBlockedReason !== "Enter a message."
                      ? "agent-keyboard-hint agent-send-reason"
                      : "agent-keyboard-hint"
                  }
                  id="agent-message-hint"
                >
                  {sendBlockedReason === "Enter a message."
                    ? "Enter to send · Shift + Enter for a new line"
                    : sendBlockedReason || "Enter to send · Shift + Enter for a new line"}
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
          onKeyDown={widgetDrag.onKeyDown}
          {...widgetDrag.handleProps}
          aria-expanded={open}
          aria-controls="agent-panel"
        >
          <span className="agent-toggle-avatar" aria-hidden="true">
            <QRex mood={mood} />
          </span>
          <span className="agent-toggle-copy">
            <strong>{open ? "Minimize chat" : "Chat with Q-Rex"}</strong>
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
