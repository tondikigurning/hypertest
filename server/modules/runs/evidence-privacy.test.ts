import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

test("Automation runs do not record password-bearing HTML reports or traces", async () => {
  const before = { setup: process.env.SETUP_AUTH_FILE, events: process.env.EVENTS_FILE, environment: process.env.SELECTED_ENV };
  process.env.SETUP_AUTH_FILE = resolve("fixture-auth.json");
  process.env.EVENTS_FILE = resolve("fixture-events.jsonl");
  process.env.SELECTED_ENV = "stt1";
  try {
    const config = (await import("../../../e2e/playwright.bdd.config.ts")).default;
    assert.equal(config.use?.trace, "off");
    assert.equal(Array.isArray(config.reporter) && config.reporter.some((item) => Array.isArray(item) && item[0] === "html"), false);
  } finally {
    for (const [key, value] of [["SETUP_AUTH_FILE", before.setup], ["EVENTS_FILE", before.events], ["SELECTED_ENV", before.environment]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
