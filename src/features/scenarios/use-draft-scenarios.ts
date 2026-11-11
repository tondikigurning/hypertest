import { useEffect, useMemo, useState } from "react";
import { agentFetch } from "../agent/agent-api";
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
>;
interface Change {
  kind: "added" | "changed" | "deleted";
  before?: Source;
  after?: Source;
}

export function useDraftScenarios(official: Array<Scenario>) {
  const [changes, setChanges] = useState<Array<Change>>([]);
  const [draftError, setDraftError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    const poll = async () => {
      try {
        const response = await agentFetch("/automation/api/agent/draft", {
          cache: "no-store",
          signal: controller.signal,
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
  }, []);
  const scenarios = useMemo(() => {
    const result = [...official];
    for (const change of changes) {
      const source = change.after || change.before;
      if (!source) continue;
      const index = source.hasId ? result.findIndex((item) => item.file === source.file && item.id === source.id) : -1;
      const existing = index < 0 ? undefined : result[index];
      const item: Scenario = {
        ...source,
        key: existing?.key || `draft:${source.file}:${source.id || source.line}`,
        category: existing?.category || "Draft scenarios",
        type: source.tags.find((tag) => tag.startsWith("@type:"))?.slice(6) || existing?.type || "",
        method: existing?.method || "",
        catalogTags: source.tags.filter((tag) => tag === "@smoke" || tag === "@regression").map((tag) => tag.slice(1)),
        expect: "",
        status: "Not run",
        lastRun: "",
        duration: "",
        evidenceLabel: "",
        evidenceUrl: "",
        availability: "unavailable",
        availabilityReasons: [
          change.kind === "deleted"
            ? "This scenario is marked for deletion."
            : "Run draft scenarios individually after review.",
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
