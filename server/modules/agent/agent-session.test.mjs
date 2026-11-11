import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PassThrough, Writable } from "node:stream";
import test from "node:test";
import {
  createSession,
  selectCategoryContext,
  selectFeatureContext,
  selectScenarioContext,
  validateAnswers,
  workspaceDiff,
} from "./agent-session.mjs";

test("scenario context rejects stale or ambiguous source identity", () => {
  const selected = { key: "feature:1", id: "E2E-1", title: "First", file: "feature", steps: ["Given a user"] };
  assert.deepEqual(selectScenarioContext([selected], selected), {
    id: "E2E-1",
    title: "First",
    file: "feature",
    steps: ["Given a user"],
  });
  assert.throws(() => selectScenarioContext([selected], { ...selected, id: "E2E-2" }), /unavailable or ambiguous/);
  assert.throws(() => selectScenarioContext([selected], { ...selected, steps: ["Given an admin"] }), /unavailable/);
  assert.throws(() => selectScenarioContext([selected, selected], selected), /ambiguous/);
});

test("feature context must exist in the committed catalog", () => {
  const catalog = [{ module: "auth", file: "auth/login.feature" }];
  assert.deepEqual(selectFeatureContext(catalog, { module: "auth", file: "auth/login.feature" }), {
    ...catalog[0],
    title: "auth/login",
  });
  assert.throws(() => selectFeatureContext(catalog, { module: "other", file: "auth/login.feature" }), /unavailable/);
  assert.throws(() => selectFeatureContext(catalog, { module: "auth" }), /invalid/);
});

test("category context includes only scenarios in the selected menu and category", () => {
  const catalog = [
    { module: "users", file: "users.feature", category: "Create", id: "1", title: "Create user", steps: [], tags: [] },
    { module: "users", file: "users.feature", category: "Delete", id: "2" },
    { module: "roles", file: "roles.feature", category: "Create", id: "3" },
  ];
  const selected = selectCategoryContext(catalog, JSON.stringify(["users", "users.feature", "Create"]));
  assert.deepEqual(
    selected.scenarios.map((item) => item.id),
    ["1"],
  );
  assert.throws(
    () => selectCategoryContext(catalog, JSON.stringify(["users", "users.feature", "Edit"])),
    /unavailable/,
  );
  assert.throws(() => selectCategoryContext(catalog, "bad"), /invalid/);
});

test("structured questions require an answer for every question and retain their IDs", () => {
  const questions = [{ id: "scope" }, { id: "data" }];
  assert.deepEqual(validateAnswers(questions, { scope: "  User groups ", data: "E2E records" }), {
    scope: { answers: ["User groups"] },
    data: { answers: ["E2E records"] },
  });
  assert.throws(() => validateAnswers(questions, { scope: "User groups" }), /each question/);
  assert.throws(() => validateAnswers(questions, { scope: " ", data: "ok" }), /each question/);
});

test("agent forwards structured questions and permission decisions to Codex", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "automation-agent-test-"));
  assert.ok(resolve(dir).startsWith(resolve(tmpdir())));
  const workspace = join(dir, "workspace");
  const skillDir = join(workspace, ".agents", "skills", "ask-qa");
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, "SKILL.md"), "test");
  const codeSkillDir = join(workspace, ".agents", "skills", "write-e2e-code");
  await mkdir(codeSkillDir, { recursive: true });
  await writeFile(join(codeSkillDir, "SKILL.md"), "test");
  await writeFile(join(workspace, ".gitignore"), "node_modules/\n");
  const git = (...args) => execFileSync("git", args, { cwd: workspace, stdio: "pipe" });
  git("init");
  git("switch", "-c", "test");
  git("config", "user.name", "Automation Test");
  git("config", "user.email", "automation-test@example.invalid");
  git("config", "commit.gpgsign", "false");
  git("add", "--all");
  git("commit", "-m", "baseline");
  const failedStartState = join(dir, "failed-start.json");
  const failedStart = createSession({
    prepareWorkspace: async () => ({
      workspace,
      branch: "test",
      baseCommit: git("rev-parse", "HEAD").toString().trim(),
    }),
    resolveCommand: () => {
      throw new Error("Codex unavailable");
    },
    stateFile: failedStartState,
  });
  await assert.rejects(failedStart.send("Help with QA", undefined, undefined, [], "ask-qa"), /Unable to start/);
  const recoveredWorkspace = createSession({ stateFile: failedStartState }).snapshot();
  assert.equal(recoveredWorkspace.branch, "test");
  assert.match(recoveredWorkspace.error, /workspace was created/);
  assert.ok(recoveredWorkspace.messages.some((message) => message.text === "Help with QA"));
  const proc = new EventEmitter();
  proc.stdout = new PassThrough();
  proc.stderr = new PassThrough();
  proc.kill = () => {};
  const sent = [];
  const emit = (event) => proc.stdout.write(`${JSON.stringify(event)}\n`);
  proc.stdin = new Writable({
    write(chunk, _encoding, callback) {
      const item = JSON.parse(chunk.toString());
      sent.push(item);
      if (item.method === "initialize") emit({ id: item.id, result: {} });
      if (item.method === "thread/start") emit({ id: item.id, result: { thread: { id: "thread-1" } } });
      if (item.method === "turn/start") {
        emit({ id: item.id, result: { turn: { id: "turn-1" } } });
        if (sent.filter((request) => request.method === "turn/start").length === 1)
          setTimeout(
            () =>
              emit({
                id: 100,
                method: "item/tool/requestUserInput",
                params: {
                  threadId: "thread-1",
                  questions: [
                    {
                      id: "scope",
                      question: "Which scope?",
                      isSecret: false,
                      options: [{ label: "1. Reports (Recommended)", description: "Matches the request" }],
                    },
                  ],
                },
              }),
            1,
          );
      }
      callback();
    },
  });
  const session = createSession({
    prepareWorkspace: async () => ({
      workspace,
      branch: "test",
      baseCommit: git("rev-parse", "HEAD").toString().trim(),
    }),
    spawnProcess: () => proc,
    resolveCommand: () => ({ file: "fake", args: [] }),
    stateFile: join(dir, "session.json"),
  });
  t.after(async () => {
    await session.reset();
    await rm(dir, { recursive: true, force: true });
  });
  await session.send("Help with QA", undefined, undefined, [], "ask-qa", {
    label: "STT",
    target: "https://example.invalid/",
  });
  const turn = sent.find((item) => item.method === "turn/start");
  assert.equal(turn.params.sandboxPolicy.networkAccess, true);
  assert.ok(turn.params.input[0].text.includes("https://example.invalid/"));
  assert.equal(session.snapshot().requestedSkill, "ask-qa");
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  assert.equal(session.snapshot().userRequest.questions[0].id, "scope");
  const interruptedQuestion = createSession({ stateFile: join(dir, "session.json") }).snapshot();
  assert.match(interruptedQuestion.error, /awaiting an answer/);
  assert.ok(
    interruptedQuestion.messages.some((message) =>
      message.text.includes("1. Reports (Recommended) — Matches the request"),
    ),
  );
  assert.equal(interruptedQuestion.userRequest, undefined);
  session.answer(100, { scope: "users" });
  assert.deepEqual(sent.find((item) => item.id === 100).result, { answers: { scope: { answers: ["users"] } } });
  emit({
    id: 101,
    method: "item/commandExecution/requestApproval",
    params: { threadId: "thread-1", command: "safe-command" },
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  assert.equal(session.snapshot().approvalRequest.command, "safe-command");
  const interruptedPermission = createSession({ stateFile: join(dir, "session.json") }).snapshot();
  assert.match(interruptedPermission.error, /awaiting permission/);
  assert.equal(interruptedPermission.approvalRequest, undefined);
  session.decideApproval(101, "decline");
  assert.deepEqual(sent.find((item) => item.id === 101).result, { decision: "decline" });
  emit({ method: "turn/completed", params: { threadId: "thread-1", turn: { status: "completed" } } });
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  assert.equal(session.snapshot().busy, false);
  await session.send("Continue the interview");
  assert.equal(session.snapshot().requestedSkill, "ask-qa");
  assert.match(
    sent.filter((item) => item.method === "turn/start").at(-1).params.input[0].text,
    /use the available user-input tool/,
  );
  emit({ method: "turn/completed", params: { threadId: "thread-1", turn: { status: "completed" } } });
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  await writeFile(join(workspace, "new.feature"), "first\n");
  const reviewed = await session.diff();
  await writeFile(join(workspace, "new.feature"), "changed\n");
  await assert.rejects(session.commitChanges("Add test", reviewed.digest), /changed since review/);
  const current = await session.diff();
  const committed = await session.commitChanges("Add test", current.digest);
  assert.equal(committed.branch, "test");
  assert.equal(git("status", "--porcelain").toString().trim(), "");
  const features = join(workspace, "e2e", "tests", "bdd", "features");
  const steps = join(workspace, "e2e", "tests", "bdd", "steps");
  await mkdir(features, { recursive: true });
  await mkdir(steps, { recursive: true });
  await writeFile(join(steps, "repair.steps.ts"), "// technical repair\n");
  const repair = await session.diff();
  assert.equal(repair.hasImplementation, true);
  assert.equal(repair.scenarioDigest, undefined);
  await session.commitChanges("Repair existing step", repair.digest);
  await writeFile(join(features, "example.feature"), "Feature: example\n  Scenario: draft\n    Given a test user\n");
  await writeFile(join(steps, "example.steps.ts"), "// implementation\n");
  const unapproved = await session.diff();
  assert.equal(unapproved.preview[0].scenarios[0].title, "draft");
  await assert.rejects(session.send("/write-e2e-code Implement"), /approve the scenario/);
  await assert.rejects(session.commitChanges("Implement scenario", unapproved.digest), /approve the scenario/);
  await assert.rejects(session.approveScenarios(unapproved.digest), /already contains E2E implementation changes/);
  await rm(join(steps, "example.steps.ts"));
  await session.approveScenarios((await session.diff()).digest);
  await writeFile(join(steps, "example.steps.ts"), "// implementation\n");
  await writeFile(join(features, "example.feature"), "Feature: changed after approval\n");
  const changedScenario = await session.diff();
  assert.equal(changedScenario.scenarioApproved, false);
  await assert.rejects(session.commitChanges("Implement scenario", changedScenario.digest), /approve the scenario/);
  await assert.rejects(session.approveScenarios(changedScenario.digest), /already contains E2E implementation changes/);
  await rm(join(steps, "example.steps.ts"));
  await session.approveScenarios((await session.diff()).digest);
  await writeFile(join(steps, "example.steps.ts"), "// implementation\n");
  await session.commitChanges("Implement scenario", (await session.diff()).digest);
  emit({
    id: 102,
    method: "item/commandExecution/requestApproval",
    params: { threadId: "thread-1", command: "safe-command" },
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  proc.emit("error", new Error("process failed"));
  proc.emit("exit");
  const resumedProc = new EventEmitter();
  resumedProc.stdout = new PassThrough();
  resumedProc.stderr = new PassThrough();
  resumedProc.kill = () => {};
  const resumedMethods = [];
  resumedProc.stdin = new Writable({
    write(chunk, _encoding, callback) {
      const item = JSON.parse(chunk.toString());
      resumedMethods.push(item.method);
      if (item.method === "initialize") resumedProc.stdout.write(`${JSON.stringify({ id: item.id, result: {} })}\n`);
      if (item.method === "thread/resume")
        resumedProc.stdout.write(`${JSON.stringify({ id: item.id, result: { thread: { id: "thread-1" } } })}\n`);
      if (item.method === "turn/start")
        resumedProc.stdout.write(`${JSON.stringify({ id: item.id, result: { turn: { id: "turn-2" } } })}\n`);
      if (item.method === "turn/interrupt") {
        resumedProc.stdout.write(`${JSON.stringify({ id: item.id, result: {} })}\n`);
        resumedProc.stdout.write(
          `${JSON.stringify({ method: "turn/completed", params: { threadId: "thread-1", turn: { status: "interrupted" } } })}\n`,
        );
      }
      callback();
    },
  });
  const resumed = createSession({
    spawnProcess: () => resumedProc,
    resolveCommand: () => ({ file: "fake", args: [] }),
    stateFile: join(dir, "session.json"),
  });
  assert.equal(resumed.snapshot().branch, "test");
  assert.equal(resumed.snapshot().requestedSkill, "ask-qa");
  assert.match(resumed.snapshot().error, /Codex stopped while awaiting permission/);
  assert.ok(resumed.snapshot().messages.some((message) => message.text === "Help with QA"));
  await resumed.send("Continue", undefined, undefined, [], "ask-qa");
  assert.ok(resumedMethods.includes("thread/resume"));
  await resumed.cancel();
  assert.ok(resumedMethods.includes("turn/interrupt"));
  await resumed.reset();
});

test("workspace review includes tracked edits and new files", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "automation-agent-test-"));
  assert.ok(resolve(dir).startsWith(resolve(tmpdir())));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
  git("init");
  git("config", "user.name", "Automation Test");
  git("config", "user.email", "automation-test@example.invalid");
  git("config", "commit.gpgsign", "false");
  await writeFile(join(dir, "existing.feature"), "before\n");
  git("add", "existing.feature");
  git("commit", "-m", "baseline");
  await writeFile(join(dir, "existing.feature"), "after\n");
  await writeFile(join(dir, "new.steps.ts"), "new step\n");
  const patch = await workspaceDiff(dir);
  assert.match(patch, /existing\.feature/);
  assert.match(patch, /\+after/);
  assert.match(patch, /new\.steps\.ts/);
  assert.match(patch, /\+new step/);
});

test("workspace review distinguishes changes to binary files", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "automation-agent-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
  git("init");
  git("config", "user.name", "Automation Test");
  git("config", "user.email", "automation-test@example.invalid");
  git("config", "commit.gpgsign", "false");
  await writeFile(join(dir, "tracked.bin"), Buffer.from([0, 1, 2]));
  git("add", "tracked.bin");
  git("commit", "-m", "baseline");
  await writeFile(join(dir, "tracked.bin"), Buffer.from([0, 3, 4]));
  await writeFile(join(dir, "new.bin"), Buffer.from([0, 5, 6]));
  const first = await workspaceDiff(dir);
  assert.match(first, /GIT binary patch/);
  await writeFile(join(dir, "tracked.bin"), Buffer.from([0, 7, 8]));
  const changedTracked = await workspaceDiff(dir);
  assert.notEqual(changedTracked, first);
  await writeFile(join(dir, "new.bin"), Buffer.from([0, 9, 10]));
  assert.notEqual(await workspaceDiff(dir), changedTracked);
});
