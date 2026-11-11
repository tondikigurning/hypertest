import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
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
const configuredTarget = process.env.BASE_URL || configured.BASE_URL;
const environments = [
  { id: "dev", label: "DEV", target: "https://converge.dev.hyperscal.com/" },
  { id: "stt", label: "STT", target: "https://converge.stt.hyperscal.com/" },
  { id: "stt1", label: "STT1", target: "https://converge.stt1.hyperscal.com/" },
  { id: "pp", label: "PP", target: "https://converge.pp.hyperscal.com/" },
];
const defaultEnvironment = "stt1";
if (configuredTarget) {
  const match = environments.find((item) => {
    try {
      return new URL(item.target).origin === new URL(configuredTarget).origin;
    } catch {
      return false;
    }
  });
  if (match) {
    match.target = configuredTarget;
  } else {
    let identity = configuredTarget;
    try {
      identity = new URL(configuredTarget).origin;
    } catch {
      /* Validation happens before execution. */
    }
    const id = `configured-${createHash("sha256").update(identity).digest("hex").slice(0, 12)}`;
    environments.push({ id, label: "Configured", target: configuredTarget });
  }
}
const bddgen = join(dirname(require.resolve("playwright-bdd/package.json")), "dist/cli/index.js");
const playwright = join(dirname(require.resolve("@playwright/test")), "cli.js");
const tsx = require.resolve("tsx/cli");
const evidenceCli = join(repoRoot, "packages/internal/test-utils/src/export/evidence-cli.ts");

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
  onFinished = async () => {},
  resultStore,
} = {}) {
  const workspaceE2e = join(workspaceRoot, "e2e");
  const journal = resultStore ? createResultJournal(resultStore, pendingDirectory(workspaceRoot)) : null;
  const recovery = journal?.recover().catch(() => {});
  let run;
  let generatedFingerprint;
  const collections = new Map();

  function events() {
    return run ? run.readEvents(run.done, run.finishedAt) : createRunProgress();
  }

  function publicRun() {
    if (!run) return null;
    const progress = events();
    return {
      id: run.id,
      scenarioId: run.scenarioId,
      scenarioIds: run.scenarioIds,
      selection: run.selection,
      target: run.target,
      stage: run.stage,
      done: run.done,
      error: run.error,
      evidenceUpload: run.evidenceUpload,
      status: run.cancelRequested ? (run.done ? "cancelled" : "cancelling") : progress.status,
      cancelRequested: Boolean(run.cancelRequested),
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

  function command(script, args, env, cwd = e2eWorkspace) {
    return new Promise((resolvePromise) => {
      const child = spawnProcess(process.execPath, [script, ...args], { cwd, env, stdio: "ignore", windowsHide: true });
      run.child = child;
      child.on("error", () => resolvePromise(false));
      child.on("close", (code) => {
        if (run.child === child) run.child = undefined;
        resolvePromise(code === 0);
      });
    });
  }

  async function execute(environment) {
    const auth = join(run.dir, "auth.json");
    const env = {
      ...process.env,
      BASE_URL: run.target,
      ...environment,
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
      if (generatedFingerprint !== fingerprintForRun) {
        collections.clear();
        generatedFingerprint = undefined;
        if (!(await command(bddgen, [`--config=${configFile}`], env, workspaceE2e))) {
          if (run.cancelRequested) return;
          run.error = "Unable to generate BDD tests. Check the local runner configuration.";
          return;
        }
        generatedFingerprint = fingerprint();
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
      try {
        rmSync(auth, { force: true });
      } catch {
        run.error ||= "The run finished, but temporary authentication state could not be removed.";
      }
      await onFinished().catch(() => {
        run.error ||= "Could not clean the isolated draft workspace.";
      });
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
    const environmentId = environments.find((item) => item.target === run.target)?.id;
    if (!environmentId) throw new Error("Unknown evidence environment.");
    const uploaded = await command(
      tsx,
      [evidenceCli, "--push", "--auto", "--results", resultsPath, "--environment", environmentId, "--run-id", run.id],
      env,
      repoRoot,
    );
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
      done: false,
    };
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
