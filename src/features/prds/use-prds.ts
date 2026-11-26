import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { agentFetch, getActiveDraftId } from "../agent/agent-api";

export interface Prd {
  module: string;
  menu: string;
  content: string;
}

interface PrdResult {
  items: Array<Prd>;
  error: string;
  loading: boolean;
}

const empty: PrdResult = { items: [], error: "", loading: false };

export function usePrds() {
  const [draft, setDraft] = useState(getActiveDraftId);
  const [draftPrds, setDraftPrds] = useState<PrdResult>(empty);
  useEffect(() => {
    const update = () => setDraft(getActiveDraftId());
    window.addEventListener("automation-agent-draft-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("automation-agent-draft-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;
    async function load(url: string, update: Dispatch<SetStateAction<PrdResult>>, draftId?: string) {
      try {
        const response = await agentFetch(url, {
          signal: controller.signal,
          cache: "no-store",
          ...(draftId ? { headers: { "X-Automation-Draft-Id": draftId } } : {}),
        });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result)) throw new Error(result.error || "Could not load PRDs.");
        if (!controller.signal.aborted)
          update((previous) =>
            !previous.loading && !previous.error && JSON.stringify(previous.items) === JSON.stringify(result)
              ? previous
              : { items: result, error: "", loading: false },
          );
      } catch (error) {
        if (!controller.signal.aborted)
          update((previous) => ({
            ...previous,
            error: error instanceof Error ? error.message : "Could not load PRDs.",
            loading: false,
          }));
      }
    }
    setDraftPrds({ ...empty, loading: true });
    {
      const poll = async () => {
        await load("/api/agent/prds", setDraftPrds, draft);
        if (!controller.signal.aborted) timer = window.setTimeout(poll, 2000);
      };
      void poll();
    }
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [draft]);
  return { draftPrds, draft };
}
