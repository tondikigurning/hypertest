import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(appDir, "..");
const args = process.argv.slice(2);

function run(command, commandArgs, cwd, env = process.env) {
  return spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
}

const generate = run("pnpm", ["exec", "bddgen", "--config=playwright.bdd.config.ts"], appDir);
if (generate.error) throw generate.error;
if (generate.status !== 0) process.exit(generate.status ?? 1);

const sourceResults = path.join(repoRoot, "temp/test-results/tenants/bdd.results.json");
const runResults = path.join(appDir, "test-results", `bdd-evidence-${process.pid}-${Date.now()}.results.json`);
const environment = process.env.AUTOMATION_ENVIRONMENT_ID;
if (environment && (!/^[a-z0-9-]+$/.test(environment) || !process.env.AUTOMATION_DATABASE_URL))
  throw new Error("Set a valid AUTOMATION_ENVIRONMENT_ID and AUTOMATION_DATABASE_URL together.");
const runId = randomUUID();
const eventsPath = `${runResults}.events`;
const importScript = path.join(repoRoot, "server/modules/results/import-results.mjs");
const importResults = (phase) => spawnSync(process.execPath, [importScript, environment, runId, runResults, eventsPath, phase], {
  cwd: repoRoot, stdio: "inherit", env: process.env, windowsHide: true,
});
const playwright = run(
  "pnpm",
  ["exec", "playwright", "test", "--config=playwright.bdd.config.ts", ...args],
  appDir,
  { ...process.env, AGGREGATE_REPORT: process.env.AGGREGATE_REPORT || "1", BDD_RESULTS_FILE: runResults,
    ...(environment ? { AUTOMATION_EVENTS_FILE: eventsPath } : {}) },
);
if (playwright.error) throw playwright.error;
const testExitCode = playwright.status ?? 1;

let evidenceExitCode = 0;
if (fs.existsSync(runResults)) {
  let importExitCode = 0;
  if (environment) importExitCode = importResults("before").status ?? 1;
  const evidence = importExitCode === 0
    ? run("pnpm", ["test:evidence", "--push", "--auto", "--results", runResults, ...(environment ? ["--environment", environment, "--run-id", runId] : [])], repoRoot)
    : { status: 1 };
  if (evidence.error) throw evidence.error;
  evidenceExitCode = evidence.status ?? 1;
  if (environment && importExitCode === 0) {
    const imported = importResults(evidenceExitCode ? "failed" : "after");
    if (imported.status !== 0) evidenceExitCode = 1;
  }
  fs.copyFileSync(runResults, sourceResults);
  if (evidenceExitCode === 0) fs.rmSync(runResults, { force: true });
  if (environment && evidenceExitCode === 0) fs.rmSync(eventsPath, { force: true });
} else {
  console.warn("BDD did not produce a results file; evidence upload was skipped.");
}

if (testExitCode !== 0) process.exit(testExitCode);
if (evidenceExitCode !== 0) process.exit(evidenceExitCode);
