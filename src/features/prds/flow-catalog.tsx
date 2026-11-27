import { type RefObject, useEffect, useState } from "react";
import { CloseButton, Modal, SectionEyebrow, Spinner } from "../../components";
import { agentFetch } from "../agent/agent-api";
import { label } from "../scenarios/scenario";
import { PrdDocumentIcon } from "./components/prd-document-icon";
import { PrdMarkdown } from "./components/prd-markdown";
import "./prd.css";
import "./flow-catalog.css";

interface DocumentResult {
  content: string | null;
  error: string;
}

export function FlowCatalog({
  module,
  menu,
  draft,
  onClose,
  returnFocus,
}: {
  module: string;
  menu: string;
  draft: string;
  onClose: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const [documents, setDocuments] = useState<{ checkout: DocumentResult; draft?: DocumentResult }>();
  const [selected, setSelected] = useState<"checkout" | "draft">();
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ module, menu });
    async function load(path: string): Promise<DocumentResult> {
      try {
        const response = await agentFetch(`/api/agent/${path}?${query}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !(typeof data.content === "string" || data.content === null))
          throw new Error(data.error || "Could not load flows.");
        return { content: data.content, error: "" };
      } catch (error) {
        return { content: null, error: error instanceof Error ? error.message : "Could not load flows." };
      }
    }
    async function loadDocuments() {
      const [checkout, draftDocument] = await Promise.all([
        load("checkout-flow-document"),
        draft ? load("flow-document") : Promise.resolve(undefined),
      ]);
      if (!controller.signal.aborted) {
        setDocuments({ checkout, draft: draftDocument });
        setSelected(
          (previous) =>
            previous ??
            (draftDocument?.content !== null && draftDocument?.content !== undefined ? "draft" : "checkout"),
        );
      }
    }
    void loadDocuments();
    return () => controller.abort();
  }, [module, menu, draft]);
  const current = selected && documents?.[selected];
  const content = (current?.content ?? "").replace(/^#\s+([^\r\n]+)\r?\n/, (heading, title: string) =>
    title.trim().toLowerCase() === `${label(menu)} flows`.toLowerCase() ? "" : heading,
  );

  return (
    <Modal className="prd-dialog" labelledBy="flow-dialog-title" onClose={onClose} returnFocus={returnFocus}>
      <header className="prd-dialog-header">
        <div className="prd-dialog-heading">
          <span className="prd-document-icon">
            <PrdDocumentIcon />
          </span>
          <div>
            <SectionEyebrow className="prd-kicker">BUSINESS FLOWS</SectionEyebrow>
            <h2 id="flow-dialog-title">{label(menu)}</h2>
            <p>{label(module)}</p>
          </div>
        </div>
        <CloseButton label="Close flows" onClick={onClose} className="prd-close" />
      </header>
      <div className="prd-management-layout" aria-busy={!documents}>
        <aside className="prd-version-sidebar" aria-label="Flow sources">
          <div className="prd-version-sidebar-heading">
            <h3>Sources</h3>
          </div>
          <ul className="prd-version-list">
            {(draft ? (["checkout", "draft"] as const) : (["checkout"] as const)).map((source) => {
              const result = documents?.[source];
              return (
                <li key={source}>
                  <button
                    type="button"
                    className="prd-version-item flow-source-item"
                    data-selected={selected === source}
                    aria-pressed={selected === source}
                    onClick={() => setSelected(source)}
                  >
                    <span className="prd-version-item-icon" aria-hidden="true">
                      <PrdDocumentIcon />
                    </span>
                    <span className="prd-version-item-copy">
                      <strong>{source === "checkout" ? "Current checkout" : "Q-Rex draft"}</strong>
                      <small>
                        {!result
                          ? "Loading?"
                          : result.error
                            ? "Unavailable"
                            : result.content === null
                              ? "No document"
                              : "Flow document"}
                      </small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="flow-source-help">
            {draft ? "Choose a source to view its flow document." : "Flows from your current branch."}
          </p>
        </aside>
        <div className="prd-version-content">
          {!documents ? (
            <div className="prd-state" role="status">
              <span className="prd-state-icon">
                <Spinner />
              </span>
              <h3>Loading flows</h3>
              <p>Getting the latest document.</p>
            </div>
          ) : current?.error ? (
            <div className="prd-state" role="alert">
              <span className="prd-state-icon" aria-hidden="true">
                !
              </span>
              <h3>Could not load flows</h3>
              <p>{current.error}</p>
            </div>
          ) : current?.content === null ? (
            <div className="prd-state">
              <span className="prd-state-icon" aria-hidden="true">
                <PrdDocumentIcon />
              </span>
              <h3>No flows yet</h3>
              <p>
                This menu has no flow document in {selected === "draft" ? "the Q-Rex draft" : "the current checkout"}.
              </p>
            </div>
          ) : (
            <div className="prd-reader">
              <div className="prd-reader-heading flow-reader-heading">
                <div>
                  <h3>{label(menu)} flows</h3>
                  <p>{selected === "draft" ? "Q-Rex draft" : "Current checkout"}</p>
                </div>
              </div>
              <PrdMarkdown content={content} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
