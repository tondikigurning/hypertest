import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const git = promisify(execFile);

test("workspace startup uses the cached target when origin is unreachable", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "qrex-local-target-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const moduleDir = join(root, "server/modules/agent");
  await mkdir(moduleDir, { recursive: true });
  await copyFile(new URL("./draft-workspace.mjs", import.meta.url), join(moduleDir, "draft-workspace.mjs"));
  const cwd = { cwd: root };
  await git("git", ["init", "--quiet"], cwd);
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
      "--allow-empty",
      "-qm",
      "base",
    ],
    cwd,
  );
  const head = (await git("git", ["rev-parse", "HEAD"], cwd)).stdout.trim();
  await git("git", ["remote", "add", "origin", join(root, "missing-origin.git")], cwd);
  await git("git", ["update-ref", "refs/remotes/origin/development", head], cwd);
  const { createDraftWorkspace, refreshDraftForTurn } = await import(
    pathToFileURL(join(moduleDir, "draft-workspace.mjs")).href
  );
  const result = await createDraftWorkspace({
    userId: randomUUID(),
    draftId: randomUUID(),
    branch: "draft/local/test-1234abcd",
    targetBranch: "development",
  });
  assert.equal(result.baseCommit, head);
  await writeFile(join(result.workspace, "exploration.md"), "Existing exploration evidence\n");
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
      "--allow-empty",
      "-qm",
      "source change",
    ],
    cwd,
  );
  const refreshed = await refreshDraftForTurn(result);
  assert.equal(refreshed.sourceChanged, true);
  assert.equal(refreshed.baseCommit, head);
  assert.equal((await git("git", ["rev-parse", "HEAD"], { cwd: result.workspace })).stdout.trim(), head);
  assert.equal(await readFile(join(result.workspace, "exploration.md"), "utf8"), "Existing exploration evidence\n");
});
