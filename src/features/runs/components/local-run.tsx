import { Icon } from "@hyperscal/icons";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { FormField, Modal, PrimaryButton, Spinner, TextInput } from "../../../components";
import type { RunConfig } from "../run-environment-state";
import { clearVariables, readVariables, writeVariables } from "../run-variables";
import type { Run, RunSelection } from "../types";
import { activeRunKey, useActiveRun } from "../use-active-run";
import { useRunEnvironment } from "../use-run-environment";
import { useRunMonitor } from "../use-run-monitor";
import { LiveRun } from "./live-run";
import { RunDialogHeading } from "./run-dialog-heading";
import { RunPanel } from "./run-panel";

function RunHint({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}

function defaultVariableValues(config?: RunConfig) {
  return Object.fromEntries(
    config?.variables.map(({ name, defaultValue }) => [name, defaultValue || ""] as const) || [],
  );
}

export function EnvironmentVariables({ disabled = false }: { disabled?: boolean }) {
  const { config, variablesOpen, setVariablesOpen } = useRunEnvironment();
  const [values, setValues] = useState<Record<string, string>>({});
  const trigger = useRef<HTMLButtonElement>(null);
  const initializedOpen = useRef(false);
  useEffect(() => {
    if (!variablesOpen) {
      initializedOpen.current = false;
      return;
    }
    if (!initializedOpen.current) {
      setValues(readVariables(defaultVariableValues(config)));
      initializedOpen.current = true;
    }
  }, [config, variablesOpen]);
  useEffect(() => {
    if (disabled && variablesOpen) {
      setValues({});
      setVariablesOpen(false);
    }
  }, [disabled, variablesOpen, setVariablesOpen]);
  if (!config) return null;
  const closeVariables = () => {
    setValues({});
    setVariablesOpen(false);
  };
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
          onClose={closeVariables}
          returnFocus={trigger}
        >
          <RunDialogHeading
            titleId="environment-title"
            title="Variables"
            description="Variables survive refreshes in this tab and are cleared after a run or agent request."
            closeLabel="Close environment variables"
            onClose={closeVariables}
          />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              writeVariables(values);
              setValues({});
              setVariablesOpen(false);
            }}
          >
            {config.variables.map((variable) => (
              <FormField
                key={variable.name}
                htmlFor={variable.name}
                label={variable.label
                  .replace(/^E2E\s+/i, "")
                  .replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase())}
              >
                <TextInput
                  id={variable.name}
                  required={variable.required}
                  type={variable.hidden ? "password" : "text"}
                  autoComplete="off"
                  value={values[variable.name] || ""}
                  onValueChange={(value) => setValues({ ...values, [variable.name]: value })}
                />
              </FormField>
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
      if (config.variables.every(({ name, required }) => !required || values[name]?.trim())) {
        setError((current) =>
          current === "Set the required environment variables before starting a run." ? "" : current,
        );
      }
    }
  }, [config, variablesOpen]);
  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const variables = readVariables(defaultVariableValues(config));
    if (config?.variables.some(({ name, required }) => required && !variables[name]?.trim())) {
      setError("Set the required environment variables before starting a run.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/local/run", {
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
      clearVariables();
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
  if (!config) return <RunHint>Local execution is available from the development server.</RunHint>;
  if (!scenarioId && !selection) return <RunHint>This scenario has no valid ID for selection.</RunHint>;
  return (
    <RunPanel>
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
          {error === "Set the required environment variables before starting a run." && (
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
    </RunPanel>
  );
}

interface RunItem {
  key: string;
  id: string;
  title: string;
  file?: string;
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
          <RunDialogHeading
            titleId="group-run-title"
            title={name}
            description={
              selection.kind === "flow"
                ? "Run every scenario in this flow"
                : selection.kind === "module"
                  ? "Run every scenario in this module"
                  : selection.kind === "group"
                    ? "Run every scenario in this group and its child files"
                    : "Run every scenario in this feature"
            }
            closeLabel="Close run form"
            onClose={close}
            kicker={
              <>
                <Icon name="player-play-filled" aria-hidden="true" /> RUN {selection.kind.toUpperCase()}
              </>
            }
          />
          <details className="group-scenario-list">
            <summary>
              Scenarios in this run <span>{items.length}</span>
            </summary>
            <ul>
              {items.map((item) => (
                <li key={item.key}>
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.id || "ID unavailable"}
                      {(selection.kind === "group" || selection.kind === "module") && item.file
                        ? ` · ${item.file}`
                        : ""}
                    </small>
                  </span>
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
