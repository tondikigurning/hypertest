import { useEffect, useState } from "react";
import { agentFetch } from "../agent/agent-api";

export interface PrdVersion {
  id: string;
  name: string;
  status: string;
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PrdVersionsResult {
  items: Array<PrdVersion>;
  activeVersionId: string;
  error: string;
  loading: boolean;
}

const empty: PrdVersionsResult = { items: [], activeVersionId: "", error: "", loading: false };

export function usePrdVersions(module: string, submodule: string, draft: string) {
  const [result, setResult] = useState<PrdVersionsResult>({ ...empty, loading: Boolean(draft) });

  useEffect(() => {
    if (!draft) {
      setResult(empty);
      return;
    }
    const controller = new AbortController();
    async function load() {
      setResult({ ...empty, loading: true });
      try {
        const query = new URLSearchParams({ module, submodule });
        const response = await agentFetch(`/api/agent/prd-versions?${query}`, {
          signal: controller.signal,
          cache: "no-store",
          headers: { "X-Automation-Draft-Id": draft },
        });
        const value = await response.json();
        if (!response.ok || !Array.isArray(value.items)) throw new Error(value.error || "Could not load PRD versions.");
        if (!controller.signal.aborted) {
          setResult({
            items: value.items,
            activeVersionId: typeof value.activeVersionId === "string" ? value.activeVersionId : "",
            error: "",
            loading: false,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            ...empty,
            error: error instanceof Error ? error.message : "Could not load PRD versions.",
          });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [draft, module, submodule]);

  async function mutate(path: string, method: "POST" | "PUT" | "DELETE", body?: Record<string, unknown>) {
    if (!draft) throw new Error("Select an active draft to manage PRD versions.");
    const response = await agentFetch(path, {
      method,
      headers: {
        "X-Automation-Draft-Id": draft,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Could not update PRD versions.");
    const result = value as PrdVersionsResult;
    setResult({ ...result, error: "", loading: false });
    return result;
  }

  return {
    ...result,
    create: (name: string, initialContent: string) =>
      mutate("/api/agent/prd-versions", "POST", { module, submodule, name, initialContent }),
    update: (versionId: string, name: string, content?: string) =>
      mutate(`/api/agent/prd-versions/${encodeURIComponent(versionId)}`, "PUT", {
        module,
        submodule,
        name,
        ...(content === undefined ? {} : { content }),
      }),
    activate: (versionId: string) =>
      mutate(`/api/agent/prd-versions/${encodeURIComponent(versionId)}/activate`, "POST", { module, submodule }),
    remove: (versionId: string) => {
      const query = new URLSearchParams({ module, submodule });
      return mutate(`/api/agent/prd-versions/${encodeURIComponent(versionId)}?${query}`, "DELETE");
    },
  };
}
