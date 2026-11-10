import { Icon } from "@hyperscal/icons";
import { useEffect, useState } from "react";
import { CloseButton, Modal, Spinner } from "../../../components";
import type { Run } from "../types";

const stageLabels: Record<string, string> = {
  starting: "Starting run",
  generating: "Generating tests",
  "checking collection": "Finding scenario",
  executing: "Running scenario",
  "uploading evidence": "Uploading evidence",
  finished: "Run finished",
  cancelling: "Stopping run",
};

export function LiveRun({ run, onClose }: { run: Run; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const cancel = async () => {
    setCancelling(true);
    setCancelError("");
    try {
      const response = await fetch(`/automation/api/local/cancel?${new URLSearchParams({ run: run.id })}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error((await response.json()).error || "Unable to stop the run.");
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "Unable to stop the run.");
      setCancelling(false);
    }
  };

  return (
    <Modal className={expanded ? "live-dialog expanded" : "live-dialog"} labelledBy="live-title" onClose={onClose}>
      <header className="live-header">
        <div>
          <span className="evidence-eyebrow">{run.selection?.kind === "scenario" ? "SCENARIO RUN" : "GROUP RUN"}</span>
          <h2 id="live-title">
            {run.scenarioId ||
              (run.selection?.kind === "category"
                ? run.selection.category
                : run.selection?.kind === "feature"
                  ? run.selection.file
                  : "Scenario run")}
          </h2>
        </div>
        <div className="live-header-actions">
          <span className={`live-badge ${run.done ? (run.error ? "failed" : run.status) : "running"}`}>
            <span />{" "}
            {run.cancelRequested
              ? run.done
                ? "Cancelled"
                : "Stopping"
              : run.done
                ? run.error
                  ? "Failed"
                  : run.status
                : "Live"}
          </span>
          {!run.done && run.stage !== "uploading evidence" && (
            <button
              type="button"
              className="live-action stop"
              onClick={cancel}
              disabled={cancelling || run.cancelRequested}
            >
              <span className="live-stop-icon" aria-hidden="true" />
              {cancelling || run.cancelRequested ? "Stopping…" : "Cancel run"}
            </button>
          )}
          <button
            type="button"
            className="evidence-close live-expand"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Exit full screen" : "Expand to full screen"}
            title={expanded ? "Exit full screen" : "Expand to full screen"}
          >
            <Icon name={expanded ? "arrows-diagonal-minimize-2" : "arrows-maximize"} aria-hidden="true" />
          </button>
          <CloseButton onClick={onClose} label="Close live run" />
        </div>
      </header>
      <div className="live-layout">
        <section className="live-browser">
          <div className="live-browser-bar">
            <span className="live-browser-dots" aria-hidden="true">
              ● ● ●
            </span>
            <span>Browser preview</span>
          </div>
          <BrowserPreview runId={run.id} done={run.done} stage={run.stage} />
        </section>
        <aside className="live-progress">
          <div className="live-progress-heading">
            <div>
              <strong>Run progress</strong>
              <p>{stageLabels[run.stage] || run.stage}</p>
            </div>
            {!run.done && <Spinner />}
          </div>
          {run.error && (
            <p className="live-error" role="alert">
              {run.error}
            </p>
          )}
          {cancelError && (
            <p className="live-error" role="alert">
              {cancelError}
            </p>
          )}
          {run.cancelRequested && (
            <p className="live-error" role="status">
              The runner was stopped. The current scenario may have been interrupted before cleanup completed.
            </p>
          )}
          {run.done && run.evidenceUpload?.status === "uploaded" && (
            <p className="live-empty" role="status">
              Drive evidence uploaded for {run.evidenceUpload.scenarioIds.length}{" "}
              {run.evidenceUpload.scenarioIds.length === 1 ? "scenario" : "scenarios"}.
            </p>
          )}
          {run.done && run.evidenceUpload?.status === "unavailable" && (
            <p className="live-empty" role="status">
              Evidence was not uploaded. Check the configured Drive credentials and whether this run produced
              screenshots or video.
            </p>
          )}
          {run.done && run.evidenceUpload?.status === "failed" && (
            <p className="live-error" role="alert">
              Evidence upload failed. The catalog keeps its previous Drive link.
            </p>
          )}
          {run.tests.length === 0 && <p className="live-empty">Steps will appear when the scenario starts.</p>}
          {run.tests.map((test) => (
            <div className="live-test" key={test.testId}>
              <div className="live-test-heading">
                <strong>
                  {test.title}
                  <small className="live-scenario-id">{test.scenarioId}</small>
                </strong>
                <span className={`live-test-status ${test.status}`}>{test.status}</span>
              </div>
              {(test.steps || []).length ? (
                <ol className="live-steps">
                  {test.steps.map((step) => (
                    <li key={step.id} className={step.status}>
                      <span className="live-step-icon">
                        {step.status === "passed" ? "✓" : step.status === "failed" ? "!" : "●"}
                      </span>
                      <span>{step.title}</span>
                      {typeof step.durationMs === "number" && <small>{(step.durationMs / 1000).toFixed(1)}s</small>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="live-empty">
                  {test.status === "pending"
                    ? "Waiting to start."
                    : test.status === "running"
                      ? "Preparing test…"
                      : "No step details were recorded."}
                </p>
              )}
            </div>
          ))}
        </aside>
      </div>
    </Modal>
  );
}

function BrowserPreview({ runId, done, stage }: { runId: string; done: boolean; stage: string }) {
  const [frame, setFrame] = useState<string>();
  useEffect(() => {
    if (done) return;
    let active = true;
    let objectUrl: string | undefined;
    let etag = "";
    let timer: number;
    const controller = new AbortController();
    const refresh = async () => {
      if (document.hidden) {
        timer = window.setTimeout(refresh, 1000);
        return;
      }
      try {
        const response = await fetch(`/automation/api/local/live?${new URLSearchParams({ run: runId })}`, {
          signal: controller.signal,
          cache: "no-store",
          headers: etag ? { "If-None-Match": etag } : {},
        });
        if (
          active &&
          response.ok &&
          response.status !== 204 &&
          response.headers.get("content-type")?.startsWith("image/")
        ) {
          const blob = await response.blob();
          if (active) {
            const next = URL.createObjectURL(blob);
            const decoded = new Image();
            decoded.src = next;
            await decoded.decode().catch(() => {});
            if (!active) {
              URL.revokeObjectURL(next);
              return;
            }
            etag = response.headers.get("etag") || "";
            setFrame(next);
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            objectUrl = next;
          }
        }
      } catch {
        /* The run can finish or the dialog can close between polls. */
      }
      if (active) timer = window.setTimeout(refresh, 250);
    };
    void refresh();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setFrame(undefined);
    };
  }, [runId, done]);
  return (
    <div className={frame && !done ? "live-screen has-frame" : "live-screen"}>
      {frame && !done ? (
        <img src={frame} alt="Live browser view" />
      ) : (
        <div className="live-placeholder">
          <span>{done ? "✓" : "◌"}</span>
          <strong>{done ? "Live preview ended" : stageLabels[stage] || "Starting browser"}</strong>
          <p>
            {done
              ? "See the run results and evidence in scenario details."
              : "The browser view appears when execution starts."}
          </p>
        </div>
      )}
    </div>
  );
}
