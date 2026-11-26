import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import AutomationReporter from "./playwright-reporter.mjs";

test("run event output redacts browser passwords in nested data", async () => {
  const directory = await mkdtemp(join(tmpdir(), "automation-event-redaction-"));
  const priorFile = process.env.EVENTS_FILE;
  const priorPassword = process.env.E2E_PASSWORD;
  const output = join(directory, "events.jsonl");
  process.env.EVENTS_FILE = output;
  process.env.E2E_PASSWORD = 'fixture-"secret"';
  try {
    const reporter = new AutomationReporter();
    reporter.emit({
      error: `Login failed: ${process.env.E2E_PASSWORD}`,
      nested: [{ title: process.env.E2E_PASSWORD }],
    });
    const data = JSON.parse((await readFile(output, "utf8")).trim());
    assert.equal(data.error, "Login failed: [REDACTED]");
    assert.equal(data.nested[0].title, "[REDACTED]");
  } finally {
    if (priorFile === undefined) delete process.env.EVENTS_FILE;
    else process.env.EVENTS_FILE = priorFile;
    if (priorPassword === undefined) delete process.env.E2E_PASSWORD;
    else process.env.E2E_PASSWORD = priorPassword;
    await rm(directory, { recursive: true, force: true });
  }
});
