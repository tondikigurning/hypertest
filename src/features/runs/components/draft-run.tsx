import { useEffect, useState } from "react";
import { agentFetch, getActiveDraftId } from "../../agent/agent-api";
import type { Scenario } from "../../scenarios/scenario";
import { listDraftRuns, type SavedDraftRun } from "../draft-evidence-store";
import { useDraftRuns } from "../use-draft-runs";
import { useRunEnvironment } from "../use-run-environment";
import { RunPanel } from "./run-panel";

export function DraftRun({ scenario }: { scenario: Scenario }) {
  const { run, error, revision, start, cancel, discard } = useDraftRuns();
  const { config, environment } = useRunEnvironment();
  const [saved, setSaved] = useState<Array<SavedDraftRun>>([]);
  const [actionError, setActionError] = useState("");
  const [starting, setStarting] = useState(false);
  const [currentDigest, setCurrentDigest] = useState("");
  const [activeDraftId, setActiveDraftId] = useState(() => getActiveDraftId());
  const target = config?.environments.find((entry) => entry.id === environment)?.target;
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
    if (
      !window.confirm(
        `Run “${scenario.title}” on ${target}?\n\nI reviewed the scenario, its setup and implementation. I will use only E2E-owned data, following search, create, then skip if suitable data is unavailable.`,
      )
    )
      return;
    setStarting(true);
    setActionError("");
    try {
      await start(scenario.id, environment);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Could not start the draft run.");
    } finally {
      setStarting(false);
    }
  };
  return (
    <RunPanel>
      <p>Draft results and evidence stay in this browser and do not update official run results.</p>
      <button
        type="button"
        className="scenario-run-button"
        onClick={() => void execute()}
        disabled={!scenario.hasId || identityUnavailable || !target || starting || Boolean(run)}
      >
        {starting ? "Preparing draft..." : "Run draft scenario"}
      </button>
      {!target && <p>Select a browser environment before running this draft scenario.</p>}
      {identityUnavailable && <p>This draft scenario does not have one unique runnable identity.</p>}
      {run && (
        <p role="status">
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
      {(actionError || error) && <p role="alert">{actionError || error}</p>}
      {run?.done && error && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Discard this run's temporary evidence?"))
              void discard().catch((cause) => setActionError(cause.message));
          }}
        >
          Discard temporary evidence
        </button>
      )}
      {saved.length > 0 && (
        <section>
          <h3>Draft run results on this browser</h3>
          {saved.map((item) => (
            <p key={item.id}>
              {item.status} · {new Date(item.savedAt).toLocaleString()} · {item.target}
              {item.error && ` · ${item.error}`}
              {item.digest !== currentDigest && " · Earlier draft version"}
            </p>
          ))}
          {links.length ? (
            <ul>
              {links.map((link) => (
                <li key={link.key}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.title} · {link.type.startsWith("video/") ? "Video" : "Screenshot"}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No screenshots or videos were recorded.</p>
          )}
        </section>
      )}
    </RunPanel>
  );
}
