import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { createLocalRunService } from "./local-run-service.mjs";

test("local runner passes selected variables without exposing server credentials", async () => {
  const previous = process.env.GITHUB_CLIENT_SECRET;
  process.env.GITHUB_CLIENT_SECRET = "test-server-secret";
  let childEnvironment;
  let finish;
  const finished = new Promise((resolve) => {
    finish = resolve;
  });
  const service = createLocalRunService({
    safeProcessEnvironment: true,
    fingerprint: () => "fixture",
    onFinished: async () => finish(),
    spawnProcess: (_command, _args, options) => {
      childEnvironment = options.env;
      const child = new EventEmitter();
      process.nextTick(() => child.emit("close", 1));
      return child;
    },
  });
  try {
    service.start(
      { selection: { kind: "scenario", scenarioId: "fixture" }, ids: ["fixture"], files: ["fixture.feature"] },
      { E2E_USERNAME: "fixture-user", E2E_PASSWORD: "fixture-password" },
    );
    await finished;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(childEnvironment.E2E_PASSWORD, "fixture-password");
    assert.equal(childEnvironment.GITHUB_CLIENT_SECRET, undefined);
  } finally {
    service.dispose();
    if (previous === undefined) delete process.env.GITHUB_CLIENT_SECRET;
    else process.env.GITHUB_CLIENT_SECRET = previous;
  }
});
