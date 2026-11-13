import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { createSession } from "./agent-session.mjs";
import { refreshPullRequests } from "./publish-draft.mjs";

const git = promisify(execFile);

test("reset discards reviewed draft content including committed changes, but rejects a stale review", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "automation-agent-reset-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = join(root, "workspace");
  await mkdir(workspace);
  const options = { cwd: workspace };
  await git("git", ["init", "-q"], options);
  await writeFile(join(workspace, ".gitignore"), "node_modules/\n");
  await writeFile(join(workspace, "file.txt"), "base\n");
  await git("git", ["add", "."], options);
  await git(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-qm",
      "base",
    ],
    options,
  );
  const base = (await git("git", ["rev-parse", "HEAD"], options)).stdout.trim();
  const branch = (await git("git", ["branch", "--show-current"], options)).stdout.trim();
  const session = createSession({
    stateFile: join(root, "state.json"),
    prepareWorkspace: async () => ({ workspace, branch, baseCommit: base, baseBranch: branch, expectedHead: base }),
  });
  await session.prdVersions("sales", "orders");
  await writeFile(join(workspace, "file.txt"), "first\n");
  const stale = await session.diff();
  await writeFile(join(workspace, "file.txt"), "second\n");
  await assert.rejects(session.resetChanges(stale.digest), /changed since review/i);
  await git("git", ["add", "file.txt"], options);
  await git(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-qm",
      "draft",
    ],
    options,
  );
  const committed = (await git("git", ["rev-parse", "HEAD"], options)).stdout.trim();
  const syncedSession = createSession({
    stateFile: join(root, "synced.json"),
    prepareWorkspace: async () => ({
      workspace,
      branch,
      baseCommit: base,
      baseBranch: branch,
      expectedHead: committed,
    }),
  });
  await syncedSession.prdVersions("sales", "orders");
  await writeFile(join(workspace, "new.txt"), "new\n");
  const current = await syncedSession.diff();
  await syncedSession.resetChanges(current.digest);
  assert.equal((await readFile(join(workspace, "file.txt"), "utf8")).replaceAll("\r\n", "\n"), "base\n");
  await assert.rejects(readFile(join(workspace, "new.txt")), { code: "ENOENT" });
  assert.equal((await syncedSession.diff()).patch, "");
});

test("PR history accepts GitHub's MERGED state", async () => {
  const item = { number: 42, url: "https://github.com/example/repo/pull/42", status: "OPEN" };
  const result = await refreshPullRequests([item], async () => ({
    stdout: JSON.stringify({ ...item, state: "MERGED", mergedAt: "2026-01-01T00:00:00Z" }),
  }));
  assert.equal(result[0].status, "MERGED");
});
