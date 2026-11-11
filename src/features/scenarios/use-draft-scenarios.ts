import { useEffect, useMemo, useState } from "react";
import { agentFetch, getActiveDraftId } from "../agent/agent-api";
import type { Scenario } from "./scenario";

type Source = Pick<
  Scenario,
  | "key"
  | "line"
  | "id"
  | "hasId"
  | "title"
  | "feature"
  | "module"
  | "file"
  | "tags"
  | "background"
  | "steps"
  | "outline"
  | "category"
  | "type"
  | "method"
  | "catalogTags"
  | "expect"
>;
interface Change {
  kind: "added" | "changed" | "deleted";
  identityAmbiguous?: boolean;
  before?: Source;
  after?: Source;
}

export function useDraftScenarios(official: Array<Scenario>) {
  const [changes, setChanges] = useState<Array<Change>>([]);
  const [draftError, setDraftError] = useState("");
  const [activeDraftId, setActiveDraftId] = useState(() => getActiveDraftId());
  useEffect(() => {
    const update = () => setActiveDraftId(getActiveDraftId());
    window.addEventListener("automation-agent-draft-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("automation-agent-draft-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  useEffect(() => {
    setChanges([]);
    setDraftError("");
    if (!activeDraftId) return;
    const controller = new AbortController();
    let timer: number;
    const poll = async () => {
      try {
        const response = await agentFetch("/api/agent/draft", {
          cache: "no-store",
          signal: controller.signal,
          headers: { "X-Automation-Draft-Id": activeDraftId },
        });
        const body = await response.json();
        if (!response.ok || !Array.isArray(body)) throw new Error(body.error || "Drafts are temporarily unavailable.");
        if (!controller.signal.aborted) {
          setChanges(body);
          setDraftError("");
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setDraftError(error instanceof Error ? error.message : "Drafts are temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(poll, 2000);
      }
    };
    void poll();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeDraftId]);
  const scenarios = useMemo(() => {
    const result = [...official];
    for (const change of changes) {
      const source = change.after || change.before;
      if (!source) continue;
      const idMatches = source.hasId ? result.flatMap((item, index) => (item.id === source.id ? [index] : [])) : [];
      const semanticMatches =
        !source.hasId && change.kind === "deleted"
          ? result.flatMap((item, index) =>
              item.file === source.file &&
              item.title === source.title &&
              item.feature === source.feature &&
              JSON.stringify(item.tags) === JSON.stringify(source.tags) &&
              JSON.stringify(item.background) === JSON.stringify(source.background) &&
              JSON.stringify(item.steps) === JSON.stringify(source.steps) &&
              item.outline === source.outline
                ? [index]
                : [],
            )
          : [];
      const matches = source.hasId && change.kind !== "added" ? idMatches : semanticMatches;
      const index = matches.length === 1 && result[matches[0]].file === source.file ? matches[0] : -1;
      const existing = index < 0 ? undefined : result[index];
      const identityMismatch =
        change.identityAmbiguous ||
        (change.kind === "added" && idMatches.length > 0) ||
        (change.kind !== "added" && !existing);
      const item: Scenario = {
        ...source,
        key: existing?.key || `draft:${source.key}`,
        category: source.category || "Uncategorized",
        type: source.type,
        method: source.method,
        catalogTags: source.catalogTags,
        expect: source.expect,
        status: "Not run",
        lastRun: "",
        duration: "",
        evidenceLabel: "",
        evidenceUrl: "",
        availability: "unavailable",
        availabilityReasons: [
          ...(!source.hasId ? ["A stable scenario ID is required for selection."] : []),
          ...(identityMismatch ? ["The draft scenario cannot be matched to one unique scenario identity."] : []),
          ...(change.kind === "deleted" ? ["This scenario is marked for deletion."] : []),
        ],
        draft: change.kind,
        draftBefore: change.kind === "changed" ? change.before : undefined,
      };
      if (index < 0) result.push(item);
      else result[index] = item;
    }
    return result;
  }, [official, changes]);
  return { scenarios, draftError };
}
