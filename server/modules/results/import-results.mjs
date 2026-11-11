import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { mergeRunResults } from "../runs/merge-run-results.mjs";
import { createRunEventReader } from "../runs/run-event-reader.mjs";
import { createResultJournal, pendingDirectory } from "./result-journal.mjs";
import { createResultStore } from "./result-store.mjs";

const [environment, runId, resultPath, eventPath, phase] = process.argv.slice(2);
if (
  !/^[a-z0-9-]+$/.test(environment || "") ||
  !runId ||
  !resultPath ||
  !eventPath ||
  !["before", "after", "failed"].includes(phase)
)
  throw new Error("Invalid result import arguments.");
if (!process.env.AUTOMATION_DATABASE_URL) throw new Error("AUTOMATION_DATABASE_URL is required for direct BDD import.");
const pool = new pg.Pool({ connectionString: process.env.AUTOMATION_DATABASE_URL });
try {
  const journal = createResultJournal(
    createResultStore(() => drizzle(pool)),
    pendingDirectory(fileURLToPath(new URL("../../../", import.meta.url))),
  );
  await journal.recover();
  let results = JSON.parse(readFileSync(resultPath, "utf8"));
  if (phase === "before") {
    const progress = createRunEventReader(eventPath)(true, new Date().toISOString());
    const merged = mergeRunResults(results, progress);
    if (merged.length !== results.length) throw new Error("Some scenarios did not finish; results were not imported.");
    results = merged;
    writeFileSync(resultPath, JSON.stringify(results, null, 2));
  }
  await journal.save(
    environment,
    runId,
    results,
    phase === "failed" ? "failed" : phase === "after" ? "uploaded" : "unavailable",
  );
} finally {
  await pool.end();
}
