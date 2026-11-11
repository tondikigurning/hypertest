import { type ReactNode, useCallback, useEffect, useState } from "react";
import { agentFetch, getActiveDraftId } from "../agent/agent-api";
import { type DraftRunState, saveDraftRun } from "./draft-evidence-store";
import { DraftRunsContext } from "./draft-runs-state";
import { readVariables } from "./run-variables";

export function DraftRunsProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<DraftRunState | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
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
    if (!activeDraftId) {
      setRun(null);
      setError("");
      return;
    }
    const controller = new AbortController();
    const headers = { "X-Automation-Draft-Id": activeDraftId };
    let timer: number;
    const poll = async () => {
      try {
        const response = await agentFetch("/api/agent/draft-run", {
          signal: controller.signal,
          cache: "no-store",
          headers,
        });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json"))
          throw new Error("Draft runner unavailable.");
        const current = (await response.json()) as DraftRunState | null;
        if (controller.signal.aborted) return;
        setRun(current);
        if (current?.done) {
          const evidence = [];
          for (const test of current.tests)
            for (const attachment of test.attachments) {
              const query = new URLSearchParams({
                run: current.id,
                test: test.testId,
                index: String(attachment.index),
              });
              const file = await agentFetch(`/api/agent/draft-run-evidence?${query}`, {
                signal: controller.signal,
                headers,
              });
              if (controller.signal.aborted) return;
              if (!file.ok) throw new Error("Could not download draft evidence. It remains available for retry.");
              evidence.push({
                key: `${test.testId}:${attachment.index}`,
                contentType: attachment.contentType,
                title: test.title,
                blob: await file.blob(),
              });
            }
          await saveDraftRun({
            id: current.id,
            taskId: current.taskId,
            scenarioId: current.scenarioId,
            target: current.target,
            digest: current.digest,
            status: current.status,
            error: current.error,
            savedAt: new Date().toISOString(),
            evidence,
          });
          if (controller.signal.aborted) return;
          const clear = await agentFetch("/api/agent/draft-run/clear", {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: "{}",
            signal: controller.signal,
          });
          if (!clear.ok) throw new Error("Draft evidence was saved, but the temporary run could not be cleared.");
          setRun(null);
          setRevision((value) => value + 1);
        }
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Draft evidence could not be saved.");
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(poll, 2500);
      }
    };
    void poll();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeDraftId]);
  const start = useCallback(async (scenarioId: string, environment: string) => {
    const draftId = getActiveDraftId();
    if (!draftId) throw new Error("Select a local draft before running a draft scenario.");
    const headers = { "X-Automation-Draft-Id": draftId };
    setStarting(true);
    try {
      const review = await agentFetch("/api/agent/diff", { cache: "no-store", headers });
      const snapshot = await review.json();
      if (!review.ok || !snapshot.digest || !snapshot.patch)
        throw new Error(snapshot.error || "Review the draft before running it.");
      const response = await agentFetch("/api/agent/draft-run", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          scenarioId,
          environment,
          variables: readVariables(),
          digest: snapshot.digest,
          safetyAcknowledged: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start the draft run.");
      setRun(result);
      setError("");
    } finally {
      setStarting(false);
    }
  }, []);
  const cancel = useCallback(async () => {
    const response = await agentFetch("/api/agent/draft-run/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new Error("Could not cancel the draft run.");
  }, []);
  const discard = useCallback(async () => {
    const response = await agentFetch("/api/agent/draft-run/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new Error("Could not clear the draft run.");
    setRun(null);
    setError("");
  }, []);
  return (
    <DraftRunsContext.Provider value={{ run, starting, error, revision, start, cancel, discard }}>
      {children}
    </DraftRunsContext.Provider>
  );
}
