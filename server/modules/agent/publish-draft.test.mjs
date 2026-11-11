import assert from "node:assert/strict";
import test from "node:test";
import { publishDraft } from "./publish-draft.mjs";

test("finalize retries PR lookup after an uncertain creation without duplicating the PR", async () => {
  const calls = [];
  let created = false;
  const run = async (file, args) => {
    calls.push([file, ...args]);
    if (file === "gh" && args[1] === "list")
      return {
        stdout: JSON.stringify(
          created ? [{ number: 42, url: "https://github.com/example/repo/pull/42", state: "OPEN" }] : [],
        ),
      };
    if (file === "gh" && args[1] === "create") {
      created = true;
      throw new Error("connection lost");
    }
    return { stdout: "" };
  };
  const options = {
    workspace: ".",
    branch: "automation/agent-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    baseBranch: "integration-base",
    title: "QA changes",
  };
  assert.equal((await publishDraft(options, run)).number, 42);
  assert.equal((await publishDraft(options, run)).number, 42);
  assert.equal(calls.filter((entry) => entry[0] === "gh" && entry[2] === "create").length, 1);
  assert.equal(calls.filter((entry) => entry[0] === "git" && entry[1] === "push").length, 2);
  assert.ok(calls.some((entry) => entry[0] === "gh" && entry.includes("integration-base")));
});

test("does not push a stale draft", async () => {
  const calls = [];
  const run = async (file, args) => {
    calls.push([file, ...args]);
    if (args[0] === "merge-base") throw new Error("stale");
    return { stdout: "" };
  };
  await assert.rejects(
    publishDraft(
      {
        workspace: ".",
        branch: "automation/agent-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        baseBranch: "integration-base",
        title: "Draft",
      },
      run,
    ),
    /latest destination base branch/,
  );
  assert.equal(
    calls.some((entry) => entry[1] === "push"),
    false,
  );
});
