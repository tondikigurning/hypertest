import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function pendingDirectory(root) {
  const url = process.env.AUTOMATION_DATABASE_URL || "postgresql://automation:automation@127.0.0.1:55432/automation";
  return join(root, ".cache/automation-results-pending", createHash("sha256").update(url).digest("hex").slice(0, 24));
}

/** Keep completed results until their database write succeeds; replay is idempotent. */
export function createResultJournal(store, directory) {
  async function persist(entry, file) {
    await store.save(entry.environment, entry.runId, entry.results, entry.uploadStatus);
    await rm(file, { force: true });
  }
  return {
    async save(environment, runId, results, uploadStatus) {
      await mkdir(directory, { recursive: true });
      const entry = {
        environment,
        runId,
        uploadStatus,
        results: results.map((item) => ({
          meta: { id: item.meta.id },
          status: item.status,
          executedAt: item.executedAt,
          durationMs: item.durationMs,
          evidenceUrl: item.evidenceUrl,
          examples: item.examples,
        })),
      };
      const file = join(directory, `${randomUUID()}.json`);
      const temporary = `${file}.tmp`;
      await writeFile(temporary, JSON.stringify(entry), { mode: 0o600, flag: "wx" });
      await rename(temporary, file);
      await persist(entry, file);
    },
    async recover() {
      let files;
      try {
        files = await readdir(directory);
      } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
      }
      for (const name of files.filter((item) => /^[\da-f-]{36}\.json$/.test(item)).sort()) {
        const file = join(directory, name);
        await persist(JSON.parse(await readFile(file, "utf8")), file);
      }
    },
  };
}
