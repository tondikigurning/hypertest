import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { isAbsolute, join, relative, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { startIsolatedDraftRun } from "./agent-sandbox.mjs";
import { workspaceDiff } from "./agent-session.mjs";

const git = promisify(execFile);
const root = resolve(import.meta.dirname, "../../..");
const workspacesRoot = join(root, ".cache/automation-agent/workspaces");

// Explicit Docker smoke command. No tenant setup, credentials, official results or evidence uploads.
test("Docker generates, collects and executes one new draft with isolated evidence", {
  timeout: 20 * 60 * 1000,
}, async (t) => {
  await mkdir(workspacesRoot, { recursive: true });
  const workspace = await mkdtemp(join(workspacesRoot, "q-rex-runner-smoke-"));
  const baseCommit = (await git("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  await git("git", ["worktree", "add", "--detach", workspace, baseCommit], { cwd: root, timeout: 120000 });
  const fixture = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<h1>Q-Rex runner fixture</h1>");
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  let run;
  t.after(async () => {
    if (run?.active()) await run.cancel();
    await run?.dispose();
    fixture.closeAllConnections();
    await new Promise((done) => fixture.close(done));
    const scope = relative(await realpath(workspacesRoot), await realpath(workspace));
    assert.ok(scope.startsWith("q-rex-runner-smoke-") && !scope.startsWith("..") && !isAbsolute(scope));
    await git("git", ["worktree", "remove", "--force", workspace], { cwd: root, timeout: 120000 });
  });
  const files = {
    "e2e/tests/bdd/features/q-rex-smoke/local.feature":
      "Feature: Q-Rex runner fixture\n  @TEN_QRX_SMO_E2E_001 @flow:SMOKE\n  Scenario: Read a local fixture\n    Given the isolated local fixture is open\n    Then the isolated local fixture is visible\n",
    "e2e/tests/bdd/steps/q-rex-smoke.steps.ts": `import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
const { Given, Then } = createBdd();
Given('the isolated local fixture is open', async ({ page }) => { await page.goto('/'); });
Then('the isolated local fixture is visible', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Q-Rex runner fixture' })).toBeVisible();
});
`,
    "e2e/playwright.bdd.config.ts": `import { defineConfig } from '@playwright/test';
import { defineBddProject } from 'playwright-bdd';
import { resolve } from 'node:path';
export default defineConfig({
  workers: 1, retries: 0, timeout: 30000,
  outputDir: process.env.AUTOMATION_OUTPUT_DIR,
  reporter: [[resolve(import.meta.dirname, '../server/modules/runs/playwright-reporter.mjs')]],
  use: { baseURL: process.env.BASE_URL, headless: true, screenshot: 'on',
    proxy: { server: process.env.AUTOMATION_AGENT_PROXY! },
    launchOptions: { args: ['--proxy-bypass-list=<-loopback>'] } },
  projects: [defineBddProject({ name: 'q-rex-smoke', features: 'tests/bdd/features/q-rex-smoke/local.feature', steps: ['tests/bdd/steps/q-rex-smoke.steps.ts'] })],
});
`,
  };
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(workspace, path);
    await mkdir(resolve(absolute, ".."), { recursive: true });
    await writeFile(absolute, content);
  }
  t.diagnostic("Preparing the committed-base Docker sandbox; the first build may download dependencies and Chromium.");
  run = await startIsolatedDraftRun({
    workspace,
    scenarioId: "TEN_QRX_SMO_E2E_001",
    target: `http://host.docker.internal:${fixture.address().port}`,
    variables: { E2E_USERNAME: "synthetic-fixture-user", E2E_PASSWORD: "synthetic-fixture-password" },
    baseCommit,
    patch: await workspaceDiff(workspace, baseCommit),
    signal: t.signal,
  });
  let previousStage;
  while (run.active()) {
    const current = run.publicRun();
    if (current.stage !== previousStage) {
      t.diagnostic(`Sandbox stage: ${current.stage}`);
      previousStage = current.stage;
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  const result = run.publicRun();
  assert.equal(result.error, undefined, JSON.stringify(result));
  assert.equal(result.status, "passed", JSON.stringify(result));
  assert.equal(result.tests.length, 1);
  assert.equal(result.tests[0].scenarioId, "TEN_QRX_SMO_E2E_001");
  assert.equal(result.evidenceUpload.status, "unavailable");
  const evidence = run.attachment(result.tests[0].testId, 0);
  assert.ok(evidence && existsSync(evidence.path), "Draft screenshot must resolve to an accessible isolated artifact");
});
