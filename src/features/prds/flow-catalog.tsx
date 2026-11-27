import { type RefObject, useEffect, useState } from "react";
import { CloseButton, Modal, SectionEyebrow, Spinner } from "../../components";
import { agentFetch } from "../agent/agent-api";
import { label } from "../scenarios/scenario";
import { PrdDocumentIcon } from "./components/prd-document-icon";
import { PrdMarkdown } from "./components/prd-markdown";
import "./prd.css";

interface DocumentResult {
  content: string | null;
  error: string;
  changed?: boolean;
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
  const [current, setCurrent] = useState<DocumentResult>();
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ module, menu });
    async function load(path: string): Promise<DocumentResult> {
      try {
        const response = await agentFetch(`/api/agent/${path}?${query}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !(typeof data.content === "string" || data.content === null))
          throw new Error(data.error || "Could not load flows.");
        return { content: data.content, error: "", changed: data.changed };
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
        setCurrent(draftDocument?.error || draftDocument?.changed ? draftDocument : checkout);
      }
    }
    void loadDocuments();
    return () => controller.abort();
  }, [module, menu, draft]);
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
      <div className="prd-dialog-body" aria-busy={!current}>
        {!current ? (
          <div className="prd-state" role="status">
            <span className="prd-state-icon">
              <Spinner />
            </span>
            <h3>Loading flows</h3>
            <p>Getting the latest document.</p>
          </div>
        ) : current.error ? (
          <div className="prd-state" role="alert">
            <span className="prd-state-icon" aria-hidden="true">
              !
            </span>
            <h3>Could not load flows</h3>
            <p>{current.error}</p>
          </div>
        ) : current.content === null ? (
          <div className="prd-state">
            <span className="prd-state-icon" aria-hidden="true">
              <PrdDocumentIcon />
            </span>
            <h3>No flows yet</h3>
            <p>This menu has no flow document yet.</p>
          </div>
        ) : (
          <div className="prd-reader">
            <div className="prd-reader-heading">
              <h3>{label(menu)} flows</h3>
            </div>
            <PrdMarkdown content={content} />
          </div>
        )}
      </div>
    </Modal>
  );
}
