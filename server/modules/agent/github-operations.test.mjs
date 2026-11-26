import assert from "node:assert/strict";
import test from "node:test";
import { createGithubOperations, githubToken, parseGithubRemote } from "./github-operations.mjs";

test("GitHub operations use the active account token without putting it in arguments", async () => {
  const calls = [];
  const requests = [];
  const run = async (command, args, options) => {
    calls.push({ command, args, options });
    return { stdout: args[0] === "remote" ? "git@github.com:owner/repo.git\n" : "" };
  };
  const request = async (url, options) => {
    requests.push({ url, options });
    if (options.method === "POST")
      return {
        ok: true,
        json: async () => ({ number: 4, html_url: "https://github.com/owner/repo/pull/4", state: "open" }),
      };
    return { ok: true, json: async () => [] };
  };
  const adapter = createGithubOperations("alice", { run, request, token: async (user) => `token-${user}` });
  const result = await adapter.publish({
    workspace: "workspace",
    branch: "draft/local/test-12345678",
    baseBranch: "development",
    title: "test",
  });
  assert.equal(result.number, 4);
  for (const call of calls) assert.equal(JSON.stringify(call.args).includes("token-alice"), false);
  const push = calls.find((call) => call.args[0] === "push");
  assert.ok(push.args.includes("--no-verify"));
  assert.ok(push.options.env.GIT_CONFIG_VALUE_4.includes(Buffer.from("x-access-token:token-alice").toString("base64")));
  assert.equal(requests[0].options.headers.Authorization, "Bearer token-alice");
  assert.throws(() => parseGithubRemote("https://evil.test/owner/repo"));
  assert.deepEqual(parseGithubRemote("https://github.com/owner/repo.git"), {
    owner: "owner",
    repo: "repo",
    url: "https://github.com/owner/repo.git",
  });
});

test("expired GitHub token refreshes and stores the replacement", async () => {
  const oldId = process.env.GITHUB_CLIENT_ID,
    oldSecret = process.env.GITHUB_CLIENT_SECRET;
  process.env.GITHUB_CLIENT_ID = "fixture";
  process.env.GITHUB_CLIENT_SECRET = "fixture-secret";
  let saved;
  try {
    const result = await githubToken("fixture", {
      load: async () => ({ accessToken: "old", refreshToken: "refresh", expiresAt: new Date(0) }),
      request: async () => ({
        ok: true,
        json: async () => ({ access_token: "new", refresh_token: "next", expires_in: 3600 }),
      }),
      save: async (_id, value) => {
        saved = value;
      },
    });
    assert.equal(result, "new");
    assert.equal(saved.refreshToken, "next");
    await assert.rejects(githubToken("missing", { load: async () => undefined }), /Sign in/);
  } finally {
    if (oldId === undefined) delete process.env.GITHUB_CLIENT_ID;
    else process.env.GITHUB_CLIENT_ID = oldId;
    if (oldSecret === undefined) delete process.env.GITHUB_CLIENT_SECRET;
    else process.env.GITHUB_CLIENT_SECRET = oldSecret;
  }
});

test("GitHub operations keep user credentials separate and surface revoked access", async () => {
  const calls = [];
  const run = async (_command, args, options) => {
    if (args[0] !== "remote") calls.push({ args, options });
    return { stdout: args[0] === "remote" ? "https://github.com/owner/repo.git" : "" };
  };
  const token = async (user) => `token-${user}`;
  await createGithubOperations("first", { run, token }).fetchTarget({
    workspace: "workspace",
    targetBranch: "development",
  });
  await createGithubOperations("second", { run, token }).fetchTarget({
    workspace: "workspace",
    targetBranch: "development",
  });
  const fetches = calls.filter((call) => call.args[0] === "fetch");
  assert.equal(fetches.length, 2);
  assert.notEqual(fetches[0].options.env.GIT_CONFIG_VALUE_4, fetches[1].options.env.GIT_CONFIG_VALUE_4);
  assert.ok(calls.every((call) => !JSON.stringify(call.args).includes("token-")));
  const denied = createGithubOperations("first", { run, token, request: async () => ({ ok: false, status: 403 }) });
  await assert.rejects(
    denied.publish({
      workspace: "workspace",
      branch: "draft/local/test-12345678",
      baseBranch: "development",
      title: "Test",
    }),
    /Sign in|repository access/i,
  );
  assert.equal(
    calls.some((call) => call.args[0] === "push"),
    false,
  );
});

test("each engineer publishes using their own GitHub authorization", async () => {
  const authorizations = [];
  const pushes = [];
  const run = async (_command, args, options) => {
    if (args[0] === "push") pushes.push(options.env.GIT_CONFIG_VALUE_4);
    return { stdout: args[0] === "remote" ? "https://github.com/owner/repo.git" : "" };
  };
  const request = async (_url, options) => {
    authorizations.push(options.headers.Authorization);
    return {
      ok: true,
      json: async () =>
        options.method === "POST" ? { number: 7, html_url: "https://github.com/owner/repo/pull/7", state: "open" } : [],
    };
  };
  for (const user of ["alice", "bob"]) {
    await createGithubOperations(user, { run, request, token: async (id) => `token-${id}` }).publish({
      workspace: "workspace",
      branch: "draft/local/test-12345678",
      baseBranch: "development",
      title: "Fixture",
    });
  }
  assert.deepEqual(authorizations, [
    "Bearer token-alice",
    "Bearer token-alice",
    "Bearer token-bob",
    "Bearer token-bob",
  ]);
  assert.notEqual(pushes[0], pushes[1]);
});

test("repository authorization headers cannot silently override the signed-in user", async () => {
  let tokenRead = false;
  const adapter = createGithubOperations("engineer", {
    run: async (_command, args) => ({
      stdout: args[0] === "config" ? "http.https://github.com/.extraheader\n" : "https://github.com/owner/repo.git",
    }),
    token: async () => {
      tokenRead = true;
      return "unused";
    },
  });
  await assert.rejects(
    adapter.fetchTarget({ workspace: "workspace", targetBranch: "development" }),
    /Remove repository-specific/,
  );
  assert.equal(tokenRead, false);
});
