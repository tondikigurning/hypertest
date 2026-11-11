import { type ReactNode, useCallback, useEffect, useState } from "react";
import { agentFetch } from "../agent/agent-api";
import { type DraftRunState, saveDraftRun } from "./draft-evidence-store";
import { DraftRunsContext } from "./draft-runs-state";
import { readVariables } from "./run-variables";

export function DraftRunsProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<DraftRunState | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    const poll = async () => {
      try {
        const response = await agentFetch("/automation/api/agent/draft-run", {
          signal: controller.signal,
          cache: "no-store",
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
              const file = await agentFetch(`/automation/api/agent/draft-run-evidence?${query}`, {
                signal: controller.signal,
              });
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
          const clear = await agentFetch("/automation/api/agent/draft-run/clear", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
  }, []);
  const start = useCallback(async (scenarioId: string, environment: string) => {
    const review = await agentFetch("/automation/api/agent/diff", { cache: "no-store" });
    const snapshot = await review.json();
    if (!review.ok || !snapshot.digest || !snapshot.patch)
      throw new Error(snapshot.error || "Review the draft before running it.");
    const response = await agentFetch("/automation/api/agent/draft-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  }, []);
  const cancel = useCallback(async () => {
    const response = await agentFetch("/automation/api/agent/draft-run/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new Error("Could not cancel the draft run.");
  }, []);
  const discard = useCallback(async () => {
    const response = await agentFetch("/automation/api/agent/draft-run/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new Error("Could not clear the draft run.");
    setRun(null);
    setError("");
  }, []);
  return (
    <DraftRunsContext.Provider value={{ run, error, revision, start, cancel, discard }}>
      {children}
    </DraftRunsContext.Provider>
  );
}
