import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { createResultJournal, pendingDirectory } from "../results/result-journal.mjs";
import { mergeRunResults } from "./merge-run-results.mjs";
import { createRunEventReader } from "./run-event-reader.mjs";
import { createRunProgress } from "./run-progress.mjs";
import { featureFilePatterns, missingSelectedIds, selectionPattern } from "./run-selection.mjs";
import { runnerFingerprint } from "./runner-fingerprint.mjs";

const e2eWorkspace = resolve(import.meta.dirname, "../../../e2e");
const repoRoot = resolve(e2eWorkspace, "..");
const require = createRequire(join(e2eWorkspace, "package.json"));
const envFile = join(e2eWorkspace, ".env.local");
const configured = existsSync(envFile) ? require("dotenv").parse(readFileSync(envFile)) : {};
const configuredEnvironment = configured.ENV || "stt1";
if (!/^[a-z0-9-]+$/.test(configuredEnvironment)) throw new Error("Invalid ENV in e2e/.env.local.");
const environmentIds = [...new Set(["dev", "stt", "stt1", "pp", configuredEnvironment])];
const environments = environmentIds.map((id) => ({
  id,
  label: id.toUpperCase(),
  target: `https://converge.${id}.hyperscal.com/`,
}));
const defaultEnvironment = configuredEnvironment;
const bddgen = join(dirname(require.resolve("playwright-bdd/package.json")), "dist/cli/index.js");
const playwright = join(dirname(require.resolve("@playwright/test")), "cli.js");
const tsx = require.resolve("tsx/cli");
const evidenceCli = join(repoRoot, "packages/internal/test-utils/src/export/evidence-cli.ts");

function runnerBaseEnvironment() {
  const allowedNames = [
    "PATH",
    "PATHEXT",
    "SystemRoot",
    "WINDIR",
    "ComSpec",
    "TEMP",
    "TMP",
    "HOME",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "PLAYWRIGHT_BROWSERS_PATH",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "http_proxy",
    "https_proxy",
    "AUTOMATION_AGENT_PROXY",
    "CI",
  ];
  return Object.fromEntries(
    allowedNames.filter((name) => process.env[name] !== undefined).map((name) => [name, process.env[name]]),
  );
}

function fingerprintRunner() {
  const workspaceE2e = join(repoRoot, "e2e");
  return runnerFingerprint({
    directories: [
      join(workspaceE2e, "tests/bdd"),
      join(workspaceE2e, ".features-gen"),
      join(repoRoot, "packages/internal/test-utils/src"),
    ],
    files: [
      join(workspaceE2e, "playwright.bdd.config.ts"),
      join(workspaceE2e, "package.json"),
      join(workspaceE2e, "tsconfig.json"),
      envFile,
      join(repoRoot, "pnpm-lock.yaml"),
    ],
  });
}

export function createLocalRunService({
  spawnProcess = spawn,
  fingerprint = fingerprintRunner,
  workspaceRoot = repoRoot,
  configFile = "playwright.bdd.config.ts",
  skipEvidenceUpload = false,
  evidenceUploadTimeoutMs = 60_000,
  maxRuntimeMs,
  safeProcessEnvironment = false,
  onFinished = async () => {},
  resultStore,
} = {}) {
  const workspaceE2e = join(workspaceRoot, "e2e");
  const journal = resultStore ? createResultJournal(resultStore, pendingDirectory(workspaceRoot)) : null;
  const recovery = journal?.recover().catch(() => {});
  let run;
  let generatedFingerprint;
  let generatedFilesKey;
  const collections = new Map();

  function events() {
    return run ? run.readEvents(run.done, run.finishedAt) : createRunProgress();
  }

  function publicRun() {
    if (!run) return null;
    const progress = events();
    const tests = Object.values(progress.tests);
    const failedStepAwaitingTestEnd = tests.some(
      (test) => test.status === "running" && test.steps?.some((step) => step.status === "failed"),
    );
    const hasRunningTest = tests.some((test) => test.status === "running");
    const hasPendingTest = tests.some((test) => test.status === "pending");
    const stage =
      !run.executionDone && run.stage === "executing"
        ? failedStepAwaitingTestEnd
          ? "finishing scenario"
          : tests.length > 0 && !hasRunningTest
            ? hasPendingTest
              ? "starting scenario"
              : "finishing run"
            : run.stage
        : run.stage;
    return {
      id: run.id,
      scenarioId: run.scenarioId,
      scenarioIds: run.scenarioIds,
      selection: run.selection,
      target: run.target,
      stage,
      executionDone: Boolean(run.executionDone),
      done: run.done,
      error: run.error,
      evidenceUpload: run.evidenceUpload,
      status: run.timedOut
        ? run.done
          ? "timed out"
          : "stopping after the time limit"
        : run.cancelRequested
          ? run.done
            ? "cancelled"
            : "cancelling"
          : progress.status,
      cancelRequested: Boolean(run.cancelRequested),
      timedOut: Boolean(run.timedOut),
      tests: Object.values(progress.tests).map((test) => ({
        testId: test.testId,
        scenarioId: test.scenarioId,
        title: test.title,
        status: test.status,
        durationMs: test.durationMs,
        steps: test.steps || [],
        attachments: (test.attachments || []).map((attachment, index) => ({
          index,
          contentType: attachment.contentType,
        })),
      })),
    };
  }

  function command(script, args, env, cwd = e2eWorkspace, timeoutMs = 0) {
    return new Promise((resolvePromise) => {
      const child = spawnProcess(process.execPath, [script, ...args], { cwd, env, stdio: "ignore", windowsHide: true });
      run.child = child;
      let settled = false;
      let timedOut = false;
      let timeoutTimer;
      let forceKillTimer;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutTimer);
        clearTimeout(forceKillTimer);
        if (run.child === child) run.child = undefined;
        resolvePromise(ok);
      };
      child.on("error", () => finish(false));
      child.on("close", (code) => finish(!timedOut && code === 0));
      if (timeoutMs > 0) {
        timeoutTimer = setTimeout(() => {
          timedOut = true;
          forceKillTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
          forceKillTimer.unref?.();
          if (process.platform === "win32" && child.pid) {
            spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true }).on(
              "error",
              () => child.kill(),
            );
          } else child.kill("SIGTERM");
        }, timeoutMs);
      }
    });
  }

  async function execute(environment) {
    const auth = join(run.dir, "auth.json");
    const env = {
      ...(safeProcessEnvironment ? runnerBaseEnvironment() : process.env),
      ...environment,
      AUTOMATION_SELECTED_ENV: environments.find((item) => item.target === run.target)?.id || "",
      AUTOMATION_RUN_TARGET: run.target,
      AUTOMATION_BDD_FEATURES: JSON.stringify(run.files.map((file) => `tests/bdd/features/${file}`)),
      AUTOMATION_SETUP_AUTH_FILE: auth,
      AUTOMATION_OUTPUT_DIR: join(run.dir, "output"),
      AUTOMATION_REPORT_DIR: join(run.dir, "report"),
      AUTOMATION_EVENTS_FILE: run.events,
      AUTOMATION_LIVE_FRAME: join(run.dir, "live.jpg"),
      BDD_RESULTS_FILE: join(run.dir, "bdd.results.json"),
    };
    try {
      if (resultStore) {
        try {
          await recovery;
          await journal.recover();
          const environmentId = environments.find((item) => item.target === run.target)?.id;
          if (!environmentId) throw new Error("Unknown results environment.");
          await resultStore.list(environmentId);
        } catch {
          run.error = "PostgreSQL is unavailable or not migrated. No scenarios were run.";
          return;
        }
      }
      run.stage = "generating";
      const fingerprintForRun = fingerprint();
      const filesKey = JSON.stringify([...run.files].sort());
      if (generatedFingerprint !== fingerprintForRun || generatedFilesKey !== filesKey) {
        collections.clear();
        generatedFingerprint = undefined;
        generatedFilesKey = undefined;
        if (!(await command(bddgen, [`--config=${configFile}`], env, workspaceE2e))) {
          if (run.cancelRequested) return;
          run.error = "Unable to generate BDD tests. Check the local runner configuration.";
          return;
        }
        generatedFingerprint = fingerprint();
        generatedFilesKey = filesKey;
      }
      if (run.cancelRequested) return;
      run.stage = "checking collection";
      const selection = selectionPattern(run.scenarioIds);
      const files = featureFilePatterns(run.files);
      const collection = join(run.dir, "collection.json");
      const collectionKey = JSON.stringify([run.target, ...[...run.files].sort()]);
      let suites = collections.get(collectionKey);
      if (!suites) {
        if (
          !(await command(
            playwright,
            ["test", `--config=${configFile}`, ...files, "--list", "--reporter=json"],
            { ...env, PLAYWRIGHT_JSON_OUTPUT_NAME: collection },
            workspaceE2e,
          ))
        ) {
          if (run.cancelRequested) return;
          run.error = "Playwright could not collect this scenario. Check the test bindings and configuration.";
          return;
        }
        suites = JSON.parse(readFileSync(collection, "utf8")).suites;
        if (!Array.isArray(suites)) throw new Error("Invalid collection");
        // Bound memory while allowing different scenarios in a feature to share discovery.
        if (collections.size >= 32) collections.delete(collections.keys().next().value);
        collections.set(collectionKey, suites);
      }
      const missing = missingSelectedIds(run.scenarioIds, suites);
      if (missing.length) {
        run.error = `Not registered in Playwright or no executable examples: ${missing.join(", ")}. No scenarios were run.`;
        return;
      }
      if (run.cancelRequested) return;
      run.stage = "executing";
      const ok = await command(
        playwright,
        ["test", `--config=${configFile}`, ...files, `--grep=${selection}`],
        env,
        workspaceE2e,
      );
      run.executionDone = true;
      run.stage = "saving results";
      if (run.cancelRequested) return;
      const progress = events();
      if (existsSync(env.BDD_RESULTS_FILE)) {
        const original = JSON.parse(readFileSync(env.BDD_RESULTS_FILE, "utf8"));
        const merged = mergeRunResults(original, progress);
        if (merged.length !== original.length)
          run.error = "Some scenarios did not finish; their results were not saved.";
        writeFileSync(env.BDD_RESULTS_FILE, JSON.stringify(merged, null, 2));
      }
      if (!Object.keys(progress.tests).length)
        run.error = "No scenario result was recorded. Authentication setup or test collection may have failed.";
      else if (!ok && progress.status === "passed")
        run.error = "The runner exited unsuccessfully after reporting results.";
      const environmentId = environments.find((item) => item.target === run.target)?.id;
      if (resultStore && existsSync(env.BDD_RESULTS_FILE)) {
        try {
          await journal.save(
            environmentId,
            run.id,
            JSON.parse(readFileSync(env.BDD_RESULTS_FILE, "utf8")),
            "unavailable",
          );
        } catch {
          run.error =
            "Test execution finished, but results could not be saved to PostgreSQL; evidence upload was not started.";
          run.evidenceUpload = { status: "unavailable", scenarioIds: [] };
          return;
        }
      }
      if (!skipEvidenceUpload) await uploadEvidence(env);
      else run.evidenceUpload = { status: "unavailable", scenarioIds: [] };
      if (resultStore && existsSync(env.BDD_RESULTS_FILE)) {
        const results = JSON.parse(readFileSync(env.BDD_RESULTS_FILE, "utf8"));
        if (!environmentId) throw new Error("Unknown results environment.");
        try {
          await journal.save(environmentId, run.id, results, run.evidenceUpload.status);
        } catch {
          run.error = "Test execution finished, but results could not be saved to PostgreSQL.";
        }
      }
    } catch {
      run.error = "The local runner could not complete.";
    } finally {
      clearTimeout(run.timeoutTimer);
      try {
        rmSync(auth, { force: true });
      } catch {
        run.error ||= "The run finished, but temporary authentication state could not be removed.";
      }
      await onFinished().catch(() => {
        run.error ||= "Could not clean the isolated draft workspace.";
      });
      run.executionDone = true;
      run.done = true;
      run.finishedAt = new Date().toISOString();
      run.stage = "finished";
    }
  }

  async function uploadEvidence(env) {
    const resultsPath = env.BDD_RESULTS_FILE;
    if (!existsSync(resultsPath)) {
      run.evidenceUpload = { status: "unavailable", scenarioIds: [] };
      return;
    }

    run.stage = "uploading evidence";
    run.evidenceUpload = { status: "uploading", scenarioIds: [] };
    const environmentId = environments.find((item) => item.target === run.target)?.id;
    if (!environmentId) throw new Error("Unknown evidence environment.");
    let uploaded = false;
    try {
      uploaded = await command(
        tsx,
        [evidenceCli, "--push", "--auto", "--results", resultsPath, "--environment", environmentId, "--run-id", run.id],
        env,
        repoRoot,
        evidenceUploadTimeoutMs,
      );
    } catch {
      // Evidence failure must not change the test outcome or leave upload marked as active.
    }
    let results = [];
    try {
      results = JSON.parse(readFileSync(resultsPath, "utf8"));
    } catch {
      /* Keep the execution outcome if the evidence result file is unreadable. */
    }
    const scenarioIds = results.filter((result) => result.evidenceUrl).map((result) => result.meta.id);
    run.evidenceUpload = {
      status: !uploaded ? "failed" : scenarioIds.length ? "uploaded" : "unavailable",
      scenarioIds,
    };
  }

  function start(resolved, environment, target = environments.find((item) => item.id === defaultEnvironment).target) {
    const dir = mkdtempSync(join(tmpdir(), "hyperscal-automation-"));
    run = {
      id: randomUUID(),
      target,
      dir,
      events: join(dir, "events.jsonl"),
      readEvents: createRunEventReader(join(dir, "events.jsonl")),
      selection: resolved.selection,
      scenarioIds: resolved.ids,
      files: resolved.files,
      scenarioId: resolved.ids.length === 1 ? resolved.ids[0] : "",
      stage: "starting",
      executionDone: false,
      done: false,
    };
    if (Number.isFinite(maxRuntimeMs) && maxRuntimeMs > 0) {
      run.timeoutTimer = setTimeout(() => {
        if (run.done) return;
        run.timedOut = true;
        run.error = `This isolated run exceeded its ${Math.ceil(maxRuntimeMs / 60000)} minute limit.`;
        cancel();
      }, maxRuntimeMs);
      run.timeoutTimer.unref?.();
    }
    void execute(environment);
    return publicRun();
  }

  function cancel() {
    if (!run.cancelRequested) {
      run.cancelRequested = true;
      run.stage = "cancelling";
      if (run.child?.pid) {
        if (process.platform === "win32") {
          const child = run.child;
          spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true }).on(
            "error",
            () => child.kill(),
          );
        } else run.child.kill("SIGINT");
      }
    }
    return publicRun();
  }

  return {
    target: environments.find((item) => item.id === defaultEnvironment).target,
    environments,
    defaultEnvironment,
    variableDefaults: {
      E2E_CASE_CUSTOMER_ID: configured.E2E_CASE_CUSTOMER_ID || "",
    },
    active() {
      return Boolean(run && !run.done);
    },
    matches(id) {
      return Boolean(run && run.id === id);
    },
    framePath() {
      return join(run.dir, "live.jpg");
    },
    attachment(testId, index) {
      return events().tests[testId]?.attachments?.[index];
    },
    outputPath() {
      return join(run.dir, "output");
    },
    start,
    cancel,
    dispose() {
      if (run && !run.done) throw new Error("Wait for the run to finish.");
      if (run) {
        const rel = relative(resolve(tmpdir()), resolve(run.dir));
        if (!rel || rel.startsWith("..") || isAbsolute(rel) || !rel.startsWith("hyperscal-automation-"))
          throw new Error("Invalid temporary run directory.");
        rmSync(run.dir, { recursive: true, force: true });
      }
      run = undefined;
    },
    publicRun,
  };
}
