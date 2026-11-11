import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSession } from "./agent-session.mjs";

test("detached workspace creates no branch until reviewed changes are committed", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "automation-agent-detached-"));
  const workspace = join(dir, "workspace");
  await mkdir(workspace);
  const git = (...args) => execFileSync("git", args, { cwd: workspace, stdio: "pipe" }).toString().trim();
  git("init");
  git("switch", "-c", "integration-base");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.invalid");
  git("config", "commit.gpgsign", "false");
  await writeFile(join(workspace, ".gitignore"), "node_modules/\n");
  await writeFile(join(workspace, "readme.md"), "old\n");
  git("add", "--all");
  git("commit", "-m", "base");
  const baseCommit = git("rev-parse", "HEAD");
  git("switch", "--detach");
  let attempts = 0;
  const session = createSession({
    prepareWorkspace: async () => ({ workspace, baseCommit }),
    stateFile: join(dir, "session.json"),
    publish: async () => {
      attempts++;
      if (attempts === 1) throw new Error("GitHub unavailable");
      return { number: 42, url: "https://github.com/example/repo/pull/42" };
    },
  });
  t.after(async () => {
    await session.reset();
    await rm(dir, { recursive: true, force: true });
  });
  await session.contextFiles("");
  assert.equal(git("branch", "--show-current"), "");
  assert.equal(git("branch", "--list").split("\n").length, 2); // integration base plus detached HEAD marker
  await writeFile(join(workspace, "readme.md"), "new\n");
  const review = await session.diff();
  assert.equal(git("branch", "--show-current"), "");
  const result = await session.commitChanges("Review changes", review.digest);
  assert.match(result.branch, /^automation\/agent-/);
  assert.equal(git("branch", "--show-current"), result.branch);
  const ready = await session.diff();
  await assert.rejects(session.finalize("Reviewed work", ready.digest), /GitHub unavailable/);
  assert.equal(session.snapshot().branch, result.branch);
  const completed = await session.finalize("Reviewed work", ready.digest);
  assert.equal(completed.pullRequest.number, 42);
  assert.equal(completed.session.branch, undefined);
  assert.equal(completed.session.history[0].number, 42);
  assert.equal(createSession({ stateFile: join(dir, "session.json") }).snapshot().history[0].number, 42);
});
