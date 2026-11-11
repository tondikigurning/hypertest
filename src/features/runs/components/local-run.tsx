import { Icon } from "@hyperscal/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CloseButton, Modal, PrimaryButton, Spinner } from "../../../components";
import { readVariables, storageKey } from "../run-variables";
import type { Run, RunSelection } from "../types";
import { activeRunKey, useActiveRun } from "../use-active-run";
import { useRunEnvironment } from "../use-run-environment";
import { useRunMonitor } from "../use-run-monitor";
import { LiveRun } from "./live-run";

export function EnvironmentVariables({ disabled = false }: { disabled?: boolean }) {
  const { config, variablesOpen, setVariablesOpen } = useRunEnvironment();
  const [values, setValues] = useState<Record<string, string>>({});
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (variablesOpen) setValues(readVariables());
  }, [variablesOpen]);
  useEffect(() => {
    if (disabled && variablesOpen) setVariablesOpen(false);
  }, [disabled, variablesOpen, setVariablesOpen]);
  if (!config) return null;
  return (
    <>
      <button
        type="button"
        className="environment-trigger"
        ref={trigger}
        disabled={disabled}
        title={disabled ? "Variables are locked while a run is active" : undefined}
        onClick={() => {
          setVariablesOpen(true);
        }}
      >
        Variables
      </button>
      {variablesOpen && (
        <Modal
          className="group-run-dialog environment-dialog"
          labelledBy="environment-title"
          onClose={() => setVariablesOpen(false)}
          returnFocus={trigger}
        >
          <div className="group-run-heading">
            <div className="group-run-heading-copy">
              <h2 id="environment-title">Variables</h2>
              <p>Used for every run.</p>
            </div>
            <CloseButton onClick={() => setVariablesOpen(false)} label="Close environment variables" />
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sessionStorage.setItem(storageKey, JSON.stringify(values));
              setVariablesOpen(false);
            }}
          >
            {config.variables.map((variable) => (
              <label key={variable.name}>
                {variable.label.replace(/^E2E\s+/i, "").replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase())}
                <input
                  required
                  type={variable.secret ? "password" : "text"}
                  autoComplete="off"
                  value={values[variable.name] || ""}
                  onChange={(event) => setValues({ ...values, [variable.name]: event.target.value })}
                />
              </label>
            ))}
            <PrimaryButton type="submit">Save variables</PrimaryButton>
          </form>
        </Modal>
      )}
    </>
  );
}

function PlayIcon() {
  return <Icon name="player-play-filled" aria-hidden="true" className="play-icon" />;
}

export function LocalRun({
  scenarioId,
  selection,
  scopeLabel,
  unavailable = false,
}: {
  scenarioId?: string;
  selection?: RunSelection;
  scopeLabel?: string;
  unavailable?: boolean;
}) {
  const { config, environment, variablesOpen, setVariablesOpen } = useRunEnvironment();
  const run = useActiveRun();
  const { setMonitoring } = useRunMonitor();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showLive, setShowLive] = useState(false);
  useEffect(() => {
    if (!variablesOpen && config) {
      const values = readVariables();
      if (config.variables.every(({ name }) => values[name]?.trim())) {
        setError((current) => (current === "Set the environment variables before starting a run." ? "" : current));
      }
    }
  }, [config, variablesOpen]);
  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const variables = readVariables();
    if (config?.variables.some(({ name }) => !variables[name]?.trim())) {
      setError("Set the environment variables before starting a run.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/automation/api/local/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection: selection || { kind: "scenario", scenarioId }, variables, environment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start the run.");
      await queryClient.cancelQueries({ queryKey: activeRunKey });
      queryClient.setQueryData<Run>(activeRunKey, data);
      setMonitoring(true);
      setShowLive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the run.");
    } finally {
      setSubmitting(false);
    }
  };
  const current =
    run &&
    (selection
      ? JSON.stringify(run.selection) === JSON.stringify(selection)
      : run.scenarioIds?.includes(scenarioId || ""))
      ? run
      : null;
  const activeRun = run && !run.done ? run : null;
  const currentRun = current && !current.done ? current : null;
  if (!config) return <p className="muted">Local execution is available from the development server.</p>;
  if (!scenarioId && !selection) return <p className="muted">This scenario has no valid ID for selection.</p>;
  return (
    <div className="local-run">
      <form onSubmit={start}>
        <PrimaryButton
          type="submit"
          className={selection ? "group-run-submit" : "scenario-run-button"}
          disabled={unavailable || submitting || Boolean(activeRun)}
        >
          {submitting || currentRun ? (
            <>
              <Spinner variant="play" />
              {submitting ? "Starting..." : "Running..."}
            </>
          ) : (
            <>
              <PlayIcon />
              <span>{scopeLabel || "Run scenario"}</span>
            </>
          )}
        </PrimaryButton>
      </form>
      {error && (
        <p className="run-form-error" role="alert">
          {error}
          {error === "Set the environment variables before starting a run." && (
            <>
              {" "}
              <button type="button" className="run-error-action" onClick={() => setVariablesOpen(true)}>
                Open settings
              </button>
            </>
          )}
        </p>
      )}
      {showLive && current && <LiveRun run={current} onClose={() => setShowLive(false)} />}
    </div>
  );
}

interface RunItem {
  key: string;
  id: string;
  title: string;
  availability: "unknown" | "unavailable";
}

export function GroupRun({ selection, name, items }: { selection: RunSelection; name: string; items: Array<RunItem> }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
  };
  const unavailable = items.filter((item) => item.availability === "unavailable").length;
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="group-run-button"
        onClick={() => setOpen(true)}
        aria-label={`Run ${selection.kind} ${name}`}
        title={`Run ${selection.kind}`}
      >
        <PlayIcon />
      </button>
      {open && (
        <Modal className="group-run-dialog" labelledBy="group-run-title" onClose={close} returnFocus={trigger}>
          <div className="group-run-heading">
            <div className="group-run-heading-copy">
              <span className="group-run-kicker">
                <Icon name="player-play-filled" aria-hidden="true" /> RUN {selection.kind.toUpperCase()}
              </span>
              <h2 id="group-run-title">{name}</h2>
              <p>
                {selection.kind === "category"
                  ? "Run every scenario in this category"
                  : "Run every scenario in this feature"}
              </p>
            </div>
            <CloseButton onClick={close} label="Close run form" />
          </div>
          <details className="group-scenario-list">
            <summary>
              Scenarios in this run <span>{items.length}</span>
            </summary>
            <ul>
              {items.map((item) => (
                <li key={item.key}>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.id || "ID unavailable"}</small>
                  </span>
                  {item.availability === "unavailable" && <span className="group-unavailable">Unavailable</span>}
                </li>
              ))}
            </ul>
          </details>
          {unavailable > 0 && (
            <p className="group-run-warning" role="status">
              {unavailable} {unavailable === 1 ? "scenario is" : "scenarios are"} unavailable. The run cannot start
              until the selection is resolved.
            </p>
          )}
          <LocalRun selection={selection} scopeLabel={`Run ${selection.kind}`} unavailable={unavailable > 0} />
        </Modal>
      )}
    </>
  );
}
