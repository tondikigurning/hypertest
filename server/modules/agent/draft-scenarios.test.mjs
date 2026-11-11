import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { draftScenarios } from "./draft-scenarios.mjs";

test("drafts compare feature intent with base and include new, edited, and deleted scenarios", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "automation-draft-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "pipe" }).toString().trim();
  git("init");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.invalid");
  git("config", "commit.gpgsign", "false");
  const dir = join(root, "e2e/tests/bdd/features/reports");
  await mkdir(dir, { recursive: true });
  const file = join(dir, "templates.feature");
  const scenario = (id, title) => `@TEN_TMP_LST_E2E_${id}\nScenario: ${title}\n  Given a page\n`;
  await writeFile(file, `Feature: Templates\n${scenario("001", "Original")}${scenario("002", "Removed")}`);
  git("add", "--all");
  git("commit", "-m", "base");
  const base = git("rev-parse", "HEAD");
  assert.deepEqual(await draftScenarios(root, base), []);
  await writeFile(file, `Feature: Templates\n${scenario("001", "Edited")}${scenario("003", "New")}`);
  assert.deepEqual(
    (await draftScenarios(root, base)).map((item) => [item.kind, (item.after || item.before).id]),
    [
      ["changed", "TEN_TMP_LST_E2E_001"],
      ["added", "TEN_TMP_LST_E2E_003"],
      ["deleted", "TEN_TMP_LST_E2E_002"],
    ],
  );
  await writeFile(file, `Feature: Templates\n${scenario("001", "One")}${scenario("001", "Duplicate")}`);
  await assert.rejects(draftScenarios(root, base), /duplicate scenario IDs/);
});
