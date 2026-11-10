import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { createLocalRunService } from "./local-run-service.mjs";
import { sendLiveFrame } from "./run-controller.mjs";
import { createRunEventReader } from "./run-event-reader.mjs";
import { runnerFingerprint } from "./runner-fingerprint.mjs";

test("reuses feature discovery, rejects missing IDs and invalidates preparation after source changes", async (t) => {
  const calls = [];
  const dirs = new Set();
  let revision = "first";
  const service = createLocalRunService({
    fingerprint: () => revision,
    spawnProcess(_executable, args, { env }) {
      calls.push({ args, target: env.BASE_URL });
      dirs.add(dirname(env.AUTOMATION_EVENTS_FILE));
      const child = new EventEmitter();
      queueMicrotask(() => {
        if (args.includes("--list")) {
          writeFileSync(
            env.PLAYWRIGHT_JSON_OUTPUT_NAME,
            JSON.stringify({ suites: [{ specs: [{ tags: ["TEN_EX_E2E_001", "TEN_EX_E2E_002"] }] }] }),
          );
        } else if (args.includes("test")) {
          writeFileSync(
            env.AUTOMATION_EVENTS_FILE,
            `${JSON.stringify({ type: "run-finished", status: "passed", at: "now" })}\n`,
          );
        }
        child.emit("close", 0);
      });
      return child;
    },
  });
  t.after(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });
  const run = async (id = "TEN_EX_E2E_001", target = "https://converge.stt.hyperscal.com/") => {
    service.start(
      { selection: { kind: "scenario", scenarioId: id }, ids: [id], files: ["a.feature"] },
      { E2E_USERNAME: "user", E2E_PASSWORD: "password" },
      target,
    );
    while (service.active()) await new Promise((resolve) => setImmediate(resolve));
  };
  await run();
  assert.equal(calls.length, 3);
  assert.equal(calls[2].target, "https://converge.stt.hyperscal.com/");
  await run();
  assert.equal(calls.length, 4, "unchanged repeat only launches execution");
  await run("TEN_EX_E2E_002");
  assert.equal(calls.length, 5, "another scenario in the same feature reuses discovery");
  await run("TEN_EX_E2E_003");
  assert.equal(calls.length, 5, "an uncollected ID never launches execution");
  assert.match(service.publicRun().error, /Not registered/);
  revision = "edited";
  await run();
  assert.equal(calls.length, 8, "changed sources regenerate and recheck");
  await run("TEN_EX_E2E_001", "https://converge.dev.hyperscal.com/");
  assert.equal(calls.length, 10, "a different target is collected separately");
  assert.equal(calls[9].target, "https://converge.dev.hyperscal.com/");
  assert.equal(service.publicRun().target, "https://converge.dev.hyperscal.com/");
});

test("fingerprints detect same-size edits, added files and deleted generated output", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "automation-fingerprint-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, "feature");
  writeFileSync(source, "first");
  const snapshot = () => runnerFingerprint({ directories: [dir], files: [] });
  const first = snapshot();
  assert.equal(snapshot(), first);
  writeFileSync(source, "other");
  assert.notEqual(snapshot(), first);
  const edited = snapshot();
  const generated = join(dir, "generated.spec.js");
  writeFileSync(generated, "test");
  assert.notEqual(snapshot(), edited);
  rmSync(generated);
  assert.equal(snapshot(), edited);
});

test("incremental events retain split UTF-8 lines, avoid replay and interrupt unfinished work", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "automation-events-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "events.jsonl");
  const read = createRunEventReader(file);
  assert.equal(read().status, "pending");
  const line = Buffer.from(`${JSON.stringify({ type: "run-started", tests: [{ testId: "one", title: "café" }] })}\n`);
  const split = line.indexOf(Buffer.from("é")) + 1;
  writeFileSync(file, line.subarray(0, split));
  assert.deepEqual(read().tests, {});
  appendFileSync(file, line.subarray(split));
  const state = read();
  assert.equal(state.tests.one.title, "café");
  assert.equal(read(), state, "idle polls reuse reduced state");
  assert.equal(read(true, "now").tests.one.status, "interrupted");
});

test("preview sends new frames, omits unchanged image bytes and tolerates missing frames", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "automation-frame-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const frame = join(dir, "live.jpg");
  const request = async (etag) => {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
      end(body) {
        this.body = body;
      },
    };
    await sendLiveFrame(frame, { headers: { "if-none-match": etag } }, res);
    return res;
  };
  assert.equal((await request()).statusCode, 204);
  writeFileSync(frame, "jpeg");
  const first = await request();
  assert.equal(first.body.toString(), "jpeg");
  const unchanged = await request(first.headers.ETag);
  assert.equal(unchanged.statusCode, 304);
  assert.equal(unchanged.body, undefined);
  writeFileSync(frame, "another-jpeg");
  const changed = await request(first.headers.ETag);
  assert.equal(changed.statusCode, 200);
  assert.equal(changed.body.toString(), "another-jpeg");
});
