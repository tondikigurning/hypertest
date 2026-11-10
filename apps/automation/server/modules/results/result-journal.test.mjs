import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createResultJournal } from "./result-journal.mjs";

test("retains an unsuccessful write and replays it after the database recovers", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "automation-result-journal-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  let failing = true;
  const writes = [];
  const journal = createResultJournal(
    {
      async save(...args) {
        if (failing) throw new Error("offline");
        writes.push(args);
      },
    },
    dir,
  );
  const result = { meta: { id: "TC_1" }, status: "passed", durationMs: 1, executedAt: "2026-01-01T00:00:00Z" };
  await assert.rejects(journal.save("dev", "run-id", [result], "unavailable"), /offline/);
  assert.equal((await readdir(dir)).length, 1);
  failing = false;
  await journal.recover();
  assert.equal(writes[0][0], "dev");
  assert.equal(writes[0][2][0].meta.id, "TC_1");
  assert.deepEqual(await readdir(dir), []);
});
