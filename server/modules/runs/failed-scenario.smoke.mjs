import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(import.meta.dirname, "../../..");
const require = createRequire(join(repoRoot, "e2e/package.json"));
const cli = join(dirname(require.resolve("@playwright/test")), "cli.js");
const sourcePath = (file) => JSON.stringify(join(repoRoot, file).replaceAll("\\", "/"));

// Real browser/trace regression; all requests are fulfilled locally, with no tenant or upload.
test("failed scenarios finalize large traces promptly in single and group runs", { timeout: 60_000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "automation-failed-scenario-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, "package.json"), JSON.stringify({ type: "module" }));
  let seed = 12345;
  const payload = Array.from({ length: 100_000 }, () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0).toString(36);
  }).join("");
  await writeFile(join(directory, "payload.txt"), payload);
  await writeFile(
    join(directory, "failure.spec.ts"),
    `import { readFileSync } from 'node:fs';
import { test, expect } from ${sourcePath("e2e/tests/bdd/fixtures/base.fixture.ts")};
test('failed scenario', { tag: '@TEN_REPRO_E2E_001' }, async ({ page }) => {
  const body = '<h1>Local trace regression</h1><!--' + readFileSync(import.meta.dirname + '/payload.txt', 'utf8') + '-->';
  await page.route('http://trace.test/**', route => route.fulfill({ contentType: 'text/html', body }));
  await page.goto('http://trace.test/');
  await test.step('intentional failure', async () => { expect(false).toBe(true); });
});
test('next scenario', { tag: '@TEN_REPRO_E2E_002' }, async ({ page }) => {
  await page.setContent('<h1>Next scenario</h1>');
});`,
  );
  await writeFile(
    join(directory, "playwright.config.ts"),
    `import config from ${sourcePath("e2e/playwright.bdd.config.ts")};
export default { ...config, testDir: import.meta.dirname, timeout: 8000,
  projects: [{ name: 'failure-repro', testMatch: 'failure.spec.ts' }],
  reporter: [['json', { outputFile: process.env.REPRO_RESULTS }],
    [${sourcePath("server/modules/runs/playwright-reporter.mjs")}]],
  outputDir: process.env.REPRO_OUTPUT,
};`,
  );
  for (const mode of ["single", "group"]) {
    await t.test(mode, async () => {
      const eventsFile = join(directory, `${mode}.jsonl`);
      const resultsFile = join(directory, `${mode}.json`);
      const args = [cli, "test", `--config=${join(directory, "playwright.config.ts")}`];
      if (mode === "single") args.push("--grep=failed scenario");
      const child = spawn(process.execPath, args, {
        cwd: repoRoot,
        windowsHide: true,
        stdio: "ignore",
        timeout: 25_000,
        env: {
          ...process.env,
          AUTOMATION_SELECTED_ENV: "stt1",
          AUTOMATION_EVENTS_FILE: eventsFile,
          AUTOMATION_LIVE_FRAME: join(directory, "live.jpg"),
          REPRO_RESULTS: resultsFile,
          REPRO_OUTPUT: join(directory, mode),
        },
      });
      const exitCode = await new Promise((resolvePromise, reject) => {
        child.on("error", reject);
        child.on("close", resolvePromise);
      });
      assert.equal(exitCode, 1, "only the intentional assertion should fail");
      const events = (await readFile(eventsFile, "utf8")).trim().split("\n").map(JSON.parse);
      const failedStep = events.find((event) => event.type === "step-finished" && event.status === "failed");
      const finished = events.find((event) => event.type === "test-finished");
      assert.ok(failedStep && finished, "failure and finalization must both be reported");
      const finalizationMs = Date.parse(finished.at) - Date.parse(failedStep.at);
      assert.ok(finalizationMs < 4000, `failed scenario finalization took ${finalizationMs}ms`);
      const report = JSON.parse(await readFile(resultsFile, "utf8"));
      const results = report.suites.flatMap((suite) =>
        suite.specs.flatMap((spec) => spec.tests.flatMap((item) => item.results)),
      );
      assert.equal(results[0].errors.length, 1, "teardown must not add a timeout error");
      const attachments = results[0].attachments;
      assert.ok(attachments.some((item) => item.contentType === "image/png"));
      assert.ok(attachments.some((item) => item.contentType === "video/webm"));
      const trace = attachments.find((item) => item.name === "trace");
      assert.ok(trace, "failed evidence must retain its trace");
      const zip = await readFile(trace.path);
      assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50, "trace ZIP must be complete");
      if (mode === "group") assert.equal(results[1].status, "passed", "the next scenario must execute");
      t.diagnostic(`${mode}: failed scenario finalized in ${finalizationMs}ms with screenshot, video and trace`);
    });
  }
});
