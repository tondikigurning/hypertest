import { Icon } from "@hyperscal/icons";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CloseButton, Modal, RetryButton, SectionEyebrow, Spinner } from "../../../components";
import type { Run } from "../../runs/types";
import { useRunEnvironment } from "../../runs/use-run-environment";
import { EvidenceNavigationButton } from "./evidence-navigation-button";

interface EvidenceFile {
  id: string;
  name: string;
  mimeType: string;
  url?: string;
  exampleTitle?: string;
}
type LoadState = "loading" | "ready" | "empty" | "error";

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("video/")) return <Icon name="video" aria-hidden="true" />;
  if (mimeType.startsWith("image/")) return <Icon name="photo-video" aria-hidden="true" />;
  return (
    <span aria-hidden="true" className="evidence-generic-icon">
      FILE
    </span>
  );
}

function EvidenceMediaMessage({ children, role }: { children: ReactNode; role?: "alert" | "status" }) {
  return (
    <div className="evidence-media-message" role={role}>
      {children}
    </div>
  );
}

export function EvidenceViewer({
  scenario,
  label,
  title,
  scenarioId,
}: {
  scenario: string;
  label: string;
  title: string;
  scenarioId: string;
}) {
  const { environment, config } = useRunEnvironment();
  const target = config?.environments.find((item) => item.id === environment)?.target;
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<Array<EvidenceFile>>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [attempt, setAttempt] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry reloads evidence when attempt changes.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setState("loading");
    setFiles([]);
    setSelectedIndex(0);
    const load = async () => {
      let current: Run | null = null;
      try {
        const response = await fetch("/api/local/run", { signal: controller.signal, cache: "no-store" });
        if (response.ok && response.headers.get("content-type")?.includes("application/json"))
          current = await response.json();
      } catch (error) {
        if (controller.signal.aborted) throw error;
      }
      const driveUploadComplete = Boolean(
        current?.target === target &&
          current?.done &&
          current.evidenceUpload?.status === "uploaded" &&
          current.evidenceUpload.scenarioIds.includes(scenarioId),
      );
      if (current?.target === target && current?.scenarioIds?.includes(scenarioId) && !driveUploadComplete) {
        const runId = current.id;
        const tests = current.tests.filter((test) => test.scenarioId === scenarioId);
        const localFiles = tests.flatMap((test, testIndex) =>
          test.attachments.map((attachment) => ({
            id: `${test.testId}-${attachment.index}`,
            name: `${tests.length > 1 ? `Example ${testIndex + 1} - ` : ""}${
              attachment.contentType.startsWith("image/")
                ? "Screenshot"
                : attachment.contentType.startsWith("video/")
                  ? "Video"
                  : "File"
            } ${attachment.index + 1}`,
            mimeType: attachment.contentType,
            url: `/api/local/evidence?${new URLSearchParams({ run: runId, test: test.testId, index: String(attachment.index) })}`,
          })),
        );
        if (localFiles.length) return localFiles;
        return [];
      }
      if (!environment) return [];
      const response = await fetch(`/api/evidence?${new URLSearchParams({ scenario, environment })}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json"))
        throw new Error("Evidence unavailable");
      return response.json();
    };
    load()
      .then((data: Array<EvidenceFile>) => {
        const sorted = [...data].sort(
          (a, b) =>
            Number(a.mimeType.startsWith("video/")) - Number(b.mimeType.startsWith("video/")) ||
            a.name.localeCompare(b.name),
        );
        setFiles(sorted);
        setState(sorted.length ? "ready" : "empty");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setState("error");
      });
    return () => controller.abort();
  }, [open, scenario, scenarioId, environment, target, attempt]);

  const selected = files[selectedIndex];
  const mediaUrl =
    selected && (selected.url || `/api/evidence?${new URLSearchParams({ scenario, environment, file: selected.id })}`);
  const close = () => {
    setOpen(false);
  };
  const move = (offset: number) => setSelectedIndex((index) => Math.max(0, Math.min(files.length - 1, index + offset)));
  return (
    <>
      <button type="button" ref={trigger} className="evidence-link" onClick={() => setOpen(true)}>
        <FileIcon mimeType="image/png" />
        {label || "View evidence"}
        <Icon name="arrow-right" aria-hidden="true" className="evidence-link-arrow" />
      </button>
      {open && (
        <Modal className="evidence-dialog" labelledBy="evidence-title" onClose={close} returnFocus={trigger}>
          <div className="evidence-header">
            <div className="evidence-heading">
              <SectionEyebrow>SCENARIO EVIDENCE</SectionEyebrow>
              <h2 id="evidence-title">{title}</h2>
              <span className="evidence-scenario-id">{scenarioId}</span>
            </div>
            <CloseButton onClick={close} label="Close evidence" />
          </div>
          {state !== "ready" ? (
            <div className="evidence-state" role={state === "error" ? "alert" : "status"}>
              <div className={`evidence-state-icon ${state === "loading" ? "spinning" : ""}`}>
                {state === "loading" ? "◌" : state === "error" ? "!" : <FileIcon mimeType="image/png" />}
              </div>
              <strong>
                {state === "loading"
                  ? "Loading evidence"
                  : state === "empty"
                    ? "No evidence available"
                    : "Couldn't load evidence"}
              </strong>
              <p>
                {state === "loading"
                  ? "Getting the files for this scenario…"
                  : state === "empty"
                    ? "There are no evidence files available for this scenario yet."
                    : "Check your connection and storage access, then try again."}
              </p>
              {state === "error" && <RetryButton onRetry={() => setAttempt((value) => value + 1)} />}
            </div>
          ) : (
            <div className="evidence-body">
              <div className="evidence-stage">
                <div className="evidence-stage-header">
                  <span>
                    {selected?.mimeType.startsWith("video/")
                      ? "VIDEO"
                      : selected?.mimeType.startsWith("image/")
                        ? "SCREENSHOT"
                        : "FILE"}
                  </span>
                  <span>
                    {selectedIndex + 1} / {files.length}
                  </span>
                </div>
                {selected && mediaUrl && (
                  <EvidenceMedia
                    key={selected.id}
                    file={selected}
                    url={mediaUrl}
                    onRefresh={() => setAttempt((value) => value + 1)}
                  />
                )}
                <div className="evidence-stage-footer">
                  <span title={selected?.name}>{selected?.name}</span>
                  <div className="evidence-navigation">
                    <EvidenceNavigationButton
                      direction="previous"
                      onSelect={() => move(-1)}
                      disabled={selectedIndex === 0}
                    />
                    <EvidenceNavigationButton
                      direction="next"
                      onSelect={() => move(1)}
                      disabled={selectedIndex === files.length - 1}
                    />
                  </div>
                </div>
              </div>
              <aside className="evidence-sidebar">
                <div className="evidence-sidebar-heading">
                  <div>
                    <strong>Files</strong>
                    <p>Select an item to preview</p>
                  </div>
                  <span>{files.length}</span>
                </div>
                <div className="evidence-files">
                  {files.map((file, index) => (
                    <button
                      type="button"
                      key={file.id}
                      className={selectedIndex === index ? "active" : ""}
                      aria-pressed={selectedIndex === index}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <span className="evidence-file-icon">
                        <FileIcon mimeType={file.mimeType} />
                      </span>
                      <span className="evidence-file-text">
                        <strong title={file.name}>{file.name}</strong>
                        <small>
                          {file.exampleTitle ? `${file.exampleTitle} · ` : ""}
                          {file.mimeType.startsWith("video/")
                            ? "Video"
                            : file.mimeType.startsWith("image/")
                              ? "Screenshot"
                              : "File"}
                        </small>
                      </span>
                      <span className="evidence-file-arrow" aria-hidden="true">
                        ›
                      </span>
                    </button>
                  ))}
                </div>
              </aside>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

function EvidenceMedia({ file, url, onRefresh }: { file: EvidenceFile; url: string; onRefresh: () => void }) {
  const previewable = file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(previewable ? "loading" : "ready");
  const [attempt, setAttempt] = useState(0);
  const source = attempt ? `${url}&retry=${attempt}` : url;
  return (
    <div className="evidence-media" data-status={status}>
      {status === "loading" && (
        <EvidenceMediaMessage role="status">
          <Spinner />
          Loading {file.mimeType.startsWith("image/") ? "image" : "video"}…
        </EvidenceMediaMessage>
      )}
      {status === "error" && (
        <EvidenceMediaMessage role="alert">
          <strong>Preview unavailable</strong>
          <span>This file couldn't be displayed.</span>
          <RetryButton
            onRetry={() => {
              setStatus("loading");
              if (url.startsWith("http")) onRefresh();
              else setAttempt((value) => value + 1);
            }}
          />
        </EvidenceMediaMessage>
      )}
      {file.mimeType.startsWith("image/") ? (
        <img
          key={attempt}
          src={source}
          alt={file.name}
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          hidden={status !== "ready"}
        />
      ) : file.mimeType.startsWith("video/") ? (
        // biome-ignore lint/a11y/useMediaCaption: Playwright evidence recordings do not include audio or captions.
        <video
          key={attempt}
          controls
          preload="metadata"
          src={source}
          onLoadedMetadata={() => setStatus("ready")}
          onError={() => setStatus("error")}
          hidden={status !== "ready"}
        >
          Video is unavailable.
        </video>
      ) : (
        <EvidenceMediaMessage>
          <strong>This file cannot be previewed here</strong>
          <a href={source}>Download {file.name}</a>
        </EvidenceMediaMessage>
      )}
    </div>
  );
}
