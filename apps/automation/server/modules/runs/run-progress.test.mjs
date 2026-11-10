import assert from "node:assert/strict";
import { test } from "node:test";
import { applyRunEvent, createRunProgress, interruptRun } from "./run-progress.mjs";

test("tracks steps separately for each example and preserves them after completion", () => {
  let state = createRunProgress();
  for (const event of [
    { type: "run-started", tests: [{ testId: "a" }, { testId: "b" }] },
    { type: "test-started", testId: "a" },
    { type: "step-started", testId: "a", stepId: 1, title: "Given a page" },
    { type: "step-finished", testId: "a", stepId: 1, status: "passed", durationMs: 12 },
    { type: "step-started", testId: "a", stepId: 2, title: "Then it works" },
    { type: "test-finished", testId: "a", status: "failed" },
  ])
    state = applyRunEvent(state, event);
  assert.deepEqual(
    state.tests.a.steps.map((step) => step.status),
    ["passed", "interrupted"],
  );
  assert.equal(state.tests.a.steps[0].durationMs, 12);
  assert.equal(state.tests.b.steps, undefined);
  assert.equal(interruptRun(state).tests.b.status, "interrupted");
});
