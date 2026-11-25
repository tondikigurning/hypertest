import { Icon } from "@hyperscal/icons";
import { useEffect, useState } from "react";
import { Modal, PrimaryButton, Spinner } from "../../../components";
import { agentFetch, getActiveDraftId } from "../../agent/agent-api";
import { readAgentVariables } from "../../agent/agent-variables";
import { RunStatus } from "../../scenarios/components/run-status";
import type { Scenario } from "../../scenarios/scenario";
import { listDraftRuns, type SavedDraftRun } from "../draft-evidence-store";
import { useDraftRuns } from "../use-draft-runs";
import { useRunEnvironment } from "../use-run-environment";
import { RunPanel } from "./run-panel";

export function DraftRun({ scenario }: { scenario: Scenario }) {
  const { run, error, revision, start, cancel, discard } = useDraftRuns();
  const { config, environment, setVariablesOpen } = useRunEnvironment();
  const [saved, setSaved] = useState<Array<SavedDraftRun>>([]);
  const [actionError, setActionError] = useState("");
  const [starting, setStarting] = useState(false);
  const [confirmation, setConfirmation] = useState<"run" | "discard">();
  const [currentDigest, setCurrentDigest] = useState("");
  const [activeDraftId, setActiveDraftId] = useState(() => getActiveDraftId());
  const target = config?.environments.find((entry) => entry.id === environment)?.target;
  const environmentLabel = config?.environments.find((entry) => entry.id === environment)?.label || environment;
  const identityUnavailable = scenario.availabilityReasons.some((reason) =>
    reason.startsWith("The draft scenario cannot be matched to one unique scenario identity."),
  );
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
    void revision; // Reload locally persisted results after the background monitor saves a run.
    setSaved([]);
    setCurrentDigest("");
    if (!activeDraftId) return;
    let cancelled = false;
    const controller = new AbortController();
    const headers = { "X-Automation-Draft-Id": activeDraftId };
    const load = async () => {
      try {
        const session = await agentFetch("/api/agent/session", {
          cache: "no-store",
          headers,
          signal: controller.signal,
        });
        const info = (await session.json()) as { taskId?: string };
        if (!info.taskId) {
          if (!cancelled) setSaved([]);
          return;
        }
        const [results, review] = await Promise.all([
          listDraftRuns(info.taskId, scenario.id),
          agentFetch("/api/agent/diff", { cache: "no-store", headers, signal: controller.signal }).then(
            (response) => response.json() as Promise<{ digest?: string }>,
          ),
        ]);
        if (!cancelled) {
          setSaved(results);
          setCurrentDigest(review.digest || "");
        }
      } catch {
        if (!cancelled) setActionError("Saved draft evidence is unavailable in this browser.");
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [scenario.id, revision, activeDraftId]);
  const [links, setLinks] = useState<Array<{ key: string; title: string; url: string; type: string }>>([]);
  useEffect(() => {
    const urls = saved.flatMap((item) =>
      item.evidence.map((file) => ({
        key: `${item.id}:${file.key}`,
        title: file.title,
        type: file.contentType,
        url: URL.createObjectURL(file.blob),
      })),
    );
    setLinks(urls);
    return () => {
      for (const link of urls) URL.revokeObjectURL(link.url);
    };
  }, [saved]);
  const execute = async () => {
    if (!scenario.hasId || identityUnavailable || !target || starting || run) return;
    setStarting(true);
    setActionError("");
    try {
      await start(scenario.id, scenario.file, environment);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not start the draft run.");
    } finally {
      setStarting(false);
    }
  };
  return (
    <>
      <RunPanel>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const variables = readAgentVariables();
            if (!variables.E2E_USERNAME?.trim() || !variables.E2E_PASSWORD?.trim()) {
              setActionError("Set E2E username and password in Variables before running.");
              return;
            }
            setActionError("");
            setConfirmation("run");
          }}
        >
          <PrimaryButton
            type="submit"
            className="scenario-run-button"
            disabled={!activeDraftId || !scenario.hasId || identityUnavailable || !target || starting || Boolean(run)}
          >
            {starting ? (
              <>
                <Spinner variant="play" />
                Starting...
              </>
            ) : (
              <>
                <Icon name="player-play-filled" aria-hidden="true" className="play-icon" />
                <span>Run draft scenario</span>
              </>
            )}
          </PrimaryButton>
        </form>
        {(!activeDraftId || !scenario.hasId || !target || identityUnavailable) && (
          <div className="draft-run-blockers" role="status">
            {!activeDraftId && <p>Select a local draft to continue.</p>}
            {!scenario.hasId && <p>This scenario needs a unique ID to run.</p>}
            {!target && <p>Select an environment to continue.</p>}
            {identityUnavailable && <p>This scenario cannot be matched to a unique draft identity.</p>}
          </div>
        )}
        {run && (
          <p className="draft-run-progress" role="status">
            {run.scenarioId === scenario.id
              ? `Draft run: ${run.stage}`
              : "Another draft run is in progress or awaiting saved evidence."}
            {!run.done && (
              <button type="button" onClick={() => void cancel().catch((cause) => setActionError(cause.message))}>
                Stop
              </button>
            )}
          </p>
        )}
        {(actionError || error) && (
          <p className="draft-run-error" role="alert">
            {actionError || error}
            {actionError === "Set E2E username and password in Variables before running." && (
              <>
                {" "}
                <button type="button" className="run-error-action" onClick={() => setVariablesOpen(true)}>
                  Open Variables
                </button>
              </>
            )}
          </p>
        )}
        {run?.done && error && (
          <button type="button" onClick={() => setConfirmation("discard")}>
            Discard temporary evidence
          </button>
        )}
        {saved.length > 0 && (
          <section className="draft-run-results">
            <h3>Draft results</h3>
            <p className="draft-run-results-note">Saved in this browser; official results are unchanged.</p>
            {saved.map((item) => (
              <article className="draft-run-result" key={item.id}>
                <div className="draft-run-result-top">
                  <RunStatus status={item.status} />
                  <time dateTime={item.savedAt}>{new Date(item.savedAt).toLocaleString()}</time>
                </div>
                <p>
                  {item.target}
                  {currentDigest && item.digest !== currentDigest && " · Earlier draft version"}
                </p>
                {item.error && <p>{item.error}</p>}
                {item.evidence.length ? (
                  <ul>
                    {links
                      .filter((link) => link.key.startsWith(`${item.id}:`))
                      .map((link) => (
                        <li key={link.key}>
                          <a href={link.url} target="_blank" rel="noreferrer">
                            {link.title} ·{" "}
                            {link.type.startsWith("video/")
                              ? "Video"
                              : link.type.startsWith("image/")
                                ? "Screenshot"
                                : "Evidence"}
                          </a>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>No evidence recorded for this run.</p>
                )}
              </article>
            ))}
          </section>
        )}
      </RunPanel>
      {confirmation && (
        <Modal
          className="draft-run-confirm-dialog"
          labelledBy="draft-run-confirm-title"
          onClose={() => setConfirmation(undefined)}
        >
          <h2 id="draft-run-confirm-title">
            {confirmation === "run" ? "Run draft scenario?" : "Discard temporary evidence?"}
          </h2>
          {confirmation === "run" ? (
            <>
              <p>Confirm the scenario and target before starting the isolated run.</p>
              <div className="draft-run-confirm-details">
                <span>Scenario</span>
                <strong>{scenario.title}</strong>
                <span>Environment</span>
                <strong>{environmentLabel}</strong>
                <small>{target}</small>
              </div>
              <p className="draft-run-confirm-safety">
                By running, I confirm that I reviewed the scenario, setup and implementation and will use only E2E-owned
                data: search, create, then skip if suitable data is unavailable.
              </p>
            </>
          ) : (
            <p>This removes the temporary evidence for this draft run.</p>
          )}
          <div className="draft-run-confirm-actions">
            <button type="button" onClick={() => setConfirmation(undefined)}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const action = confirmation;
                setConfirmation(undefined);
                if (action === "run") void execute();
                else void discard().catch((cause) => setActionError(cause.message));
              }}
            >
              {confirmation === "run" ? "Run scenario" : "Discard evidence"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
