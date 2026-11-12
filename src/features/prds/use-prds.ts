import { useEffect, useState } from "react";
import { agentFetch, getActiveDraftId } from "../agent/agent-api";

export interface Prd {
  module: string;
  submodule: string;
  status: string;
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
  const [checkout, setCheckout] = useState<PrdResult>({ ...empty, loading: true });
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
    async function load(url: string, update: (result: PrdResult) => void, draftId?: string) {
      update({ ...empty, loading: true });
      try {
        const response = await agentFetch(url, {
          signal: controller.signal,
          cache: "no-store",
          ...(draftId ? { headers: { "X-Automation-Draft-Id": draftId } } : {}),
        });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result)) throw new Error(result.error || "Could not load PRDs.");
        if (!controller.signal.aborted) update({ items: result, error: "", loading: false });
      } catch (error) {
        if (!controller.signal.aborted)
          update({ items: [], error: error instanceof Error ? error.message : "Could not load PRDs.", loading: false });
      }
    }
    void load("/api/agent/checkout-prds", setCheckout);
    if (draft) void load("/api/agent/prds", setDraftPrds, draft);
    else setDraftPrds(empty);
    return () => controller.abort();
  }, [draft]);
  return { checkout, draftPrds, draft };
}
