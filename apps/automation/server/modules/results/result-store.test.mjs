import assert from "node:assert/strict";
import test from "node:test";
import { createResultStore } from "./result-store.mjs";

test("stores only executed results in a single environment-scoped upsert", async () => {
  let values;
  let conflict;
  const store = createResultStore(() => ({
    insert() {
      return {
        values(rows) {
          values = rows;
          return {
            async onConflictDoUpdate(config) {
              conflict = config;
            },
          };
        },
      };
    },
  }));
  await store.save(
    "dev",
    "123e4567-e89b-12d3-a456-426614174000",
    [
      {
        meta: { id: "TC_1" },
        status: "passed",
        executedAt: "2026-01-01T00:00:00Z",
        durationMs: 123,
        evidenceUrl: "drive",
      },
      { meta: { id: "TC_2" }, status: "passed" },
    ],
    "uploaded",
  );
  assert.equal(values.length, 1);
  assert.equal(values[0].environmentId, "dev");
  assert.equal(values[0].scenarioId, "TC_1");
  assert.equal(values[0].uploadStatus, "uploaded");
  assert.deepEqual(
    conflict.target.map((column) => column.name),
    ["environment_id", "scenario_id"],
  );
  assert.ok(conflict.setWhere);
});
