import assert from "node:assert/strict";
import test from "node:test";
import { mergeRunResults } from "./merge-run-results.mjs";

test("combines example outcomes and associates each attachment with its example", () => {
  const results = [{ meta: { id: "TC_1" }, status: "passed", executedAt: "2026-01-01T00:00:00Z", durationMs: 3 }];
  const tests = {
    a: {
      testId: "a",
      scenarioId: "TC_1",
      title: "First",
      status: "passed",
      durationMs: 4,
      attachments: [{ path: "a.png", contentType: "image/png" }],
    },
    b: {
      testId: "b",
      scenarioId: "TC_1",
      title: "Second",
      status: "failed",
      durationMs: 7,
      attachments: [{ path: "b.png", contentType: "image/png" }],
    },
  };
  const [combined] = mergeRunResults(results, { tests });
  assert.equal(combined.status, "failed");
  assert.equal(combined.durationMs, 11);
  assert.deepEqual(
    combined.examples.map((item) => item.status),
    ["passed", "failed"],
  );
  assert.deepEqual(
    combined.evidenceAttachments.map((item) => item.exampleId),
    ["a", "b"],
  );
  tests.b.status = "interrupted";
  assert.deepEqual(mergeRunResults(results, { tests }), []);
});
