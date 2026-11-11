import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { createResultStore } from "./result-store.mjs";

test("PostgreSQL isolates environment results and rejects older updates", {
  skip: !process.env.AUTOMATION_TEST_DATABASE_URL,
}, async () => {
  const client = new pg.Client({ connectionString: process.env.AUTOMATION_TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    const store = createResultStore(() => drizzle(client));
    const run = "123e4567-e89b-12d3-a456-426614174000";
    const item = (status, executedAt) => ({
      meta: { id: "AUTOMATION_INTEGRATION_TEST" },
      status,
      executedAt,
      durationMs: 42,
    });
    await store.save("test-dev", run, [item("failed", "2026-01-02T00:00:00Z")], "unavailable");
    await store.save("test-stt", run, [item("passed", "2026-01-02T00:00:00Z")], "unavailable");
    await store.save("test-dev", run, [item("passed", "2026-01-01T00:00:00Z")], "unavailable");
    assert.equal(
      (await store.list("test-dev")).find((row) => row.scenarioId === "AUTOMATION_INTEGRATION_TEST").status,
      "failed",
    );
    assert.equal(
      (await store.list("test-stt")).find((row) => row.scenarioId === "AUTOMATION_INTEGRATION_TEST").status,
      "passed",
    );
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});

test("direct BDD importer saves combined examples to PostgreSQL", {
  skip: !process.env.AUTOMATION_TEST_DATABASE_URL,
}, async () => {
  const directory = await mkdtemp(join(tmpdir(), "automation-import-test-"));
  const environment = `test-${randomUUID()}`;
  const resultPath = join(directory, "results.json");
  const eventPath = join(directory, "events.jsonl");
  const id = "TEN_TEST_E2E_001";
  const events = [
    {
      type: "run-started",
      at: "2026-01-01T00:00:00Z",
      tests: [
        { testId: "a", scenarioId: id, title: "A" },
        { testId: "b", scenarioId: id, title: "B" },
      ],
    },
    {
      type: "test-finished",
      at: "2026-01-01T00:00:01Z",
      testId: "a",
      status: "passed",
      durationMs: 3,
      attachments: [],
    },
    {
      type: "test-finished",
      at: "2026-01-01T00:00:02Z",
      testId: "b",
      status: "failed",
      durationMs: 4,
      attachments: [],
    },
    { type: "run-finished", at: "2026-01-01T00:00:03Z", status: "failed" },
  ];
  await writeFile(
    resultPath,
    JSON.stringify([{ meta: { id }, status: "passed", executedAt: "2026-01-01T00:00:00Z", durationMs: 3 }]),
  );
  await writeFile(eventPath, `${events.map((item) => JSON.stringify(item)).join("\n")}\n`);
  const client = new pg.Client({ connectionString: process.env.AUTOMATION_TEST_DATABASE_URL });
  await client.connect();
  try {
    execFileSync(
      process.execPath,
      [
        fileURLToPath(new URL("./import-results.mjs", import.meta.url)),
        environment,
        randomUUID(),
        resultPath,
        eventPath,
        "before",
      ],
      { env: { ...process.env, AUTOMATION_DATABASE_URL: process.env.AUTOMATION_TEST_DATABASE_URL }, stdio: "pipe" },
    );
    const { rows } = await client.query(
      "SELECT status, examples FROM automation_latest_results WHERE environment_id = $1 AND scenario_id = $2",
      [environment, id],
    );
    assert.equal(rows[0].status, "failed");
    assert.deepEqual(
      rows[0].examples.map((item) => item.status),
      ["passed", "failed"],
    );
  } finally {
    await client.query("DELETE FROM automation_latest_results WHERE environment_id = $1 AND scenario_id = $2", [
      environment,
      id,
    ]);
    await client.end();
    await rm(directory, { recursive: true, force: true });
  }
});
