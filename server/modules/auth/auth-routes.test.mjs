import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import { eq } from "drizzle-orm";
import express from "express";
import { closeDatabase, database } from "../../database.mjs";
import { workspaceGithubCredentials, workspaceSessions, workspaceUsers } from "../results/schema.mjs";
import { createAuthRouter } from "./auth-routes.mjs";
import { createViewer } from "./identity-store.mjs";
import { createMembersRouter } from "./members-routes.mjs";

test("local login, OAuth callback, logout and forced password change", async () => {
  const db = database();
  const priorKey = process.env.AGENT_ENCRYPTION_KEY;
  process.env.AGENT_ENCRYPTION_KEY = randomBytes(32).toString("base64url");
  const githubId = String(BigInt(`0x${randomBytes(6).toString("hex")}`) + 1n);
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const app = express();
  app.use(
    "/api/auth",
    createAuthRouter({
      oauthFactory: () => ({
        start: () => ({ state, verifier, url: "https://github.com/" }),
        exchange: async () => ({ githubId, displayName: viewer.username, accessToken: "test-token" }),
      }),
    }),
  );
  app.use("/api/members", createMembersRouter());
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = `http://127.0.0.1:${server.address().port}`;
  const priorPort = process.env.WEB_PORT;
  process.env.WEB_PORT = String(server.address().port);
  const request = (path, options = {}) =>
    fetch(`${address}${path}`, {
      redirect: "manual",
      ...options,
      headers: { ...options.headers },
    });
  let viewer;
  let createdViewer;
  try {
    viewer = await createViewer(`test-${randomUUID()}`, "temporary password", db);
    const origin = address;
    const post = (path, body, cookie, suppliedOrigin = origin) =>
      request(path, {
        method: "POST",
        headers: { origin: suppliedOrigin, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      });
    assert.equal((await post("/api/auth/login", { username: viewer.username, password: "bad" })).status, 401);
    assert.equal(
      (
        await post(
          "/api/auth/login",
          { username: viewer.username, password: "temporary password" },
          undefined,
          "http://evil.test",
        )
      ).status,
      403,
    );
    const login = await post("/api/auth/login", { username: viewer.username, password: "temporary password" });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).user.mustChangePassword, true);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    assert.equal((await request("/api/members", { headers: { cookie } })).status, 403);
    const session = await request("/api/auth/session", { headers: { cookie } });
    assert.equal((await session.json()).user.id, viewer.id);
    assert.equal(
      (
        await post(
          "/api/auth/password",
          { currentPassword: "temporary password", newPassword: "new secure password" },
          cookie,
        )
      ).status,
      200,
    );
    assert.equal((await (await request("/api/auth/session", { headers: { cookie } })).json()).user, null);
    const start = await request("/api/auth/github");
    const oauthCookie = start.headers.get("set-cookie").split(";")[0];
    assert.equal(
      (
        await request(`/api/auth/github/callback?state=wrong&code=test`, { headers: { cookie: oauthCookie } })
      ).headers.get("location"),
      "/auth/login?error=github",
    );
    const callback = await request(`/api/auth/github/callback?state=${state}&code=test`, {
      headers: { cookie: oauthCookie },
    });
    assert.equal(callback.headers.get("location"), "/?auth=github");
    const githubCookie = callback.headers
      .getSetCookie()
      .find((value) => value.startsWith("automation_session="))
      .split(";")[0];
    assert.equal(
      (await (await request("/api/auth/session", { headers: { cookie: githubCookie } })).json()).user.role,
      "engineer",
    );
    const repeatStart = await request("/api/auth/github");
    const repeatCookie = repeatStart.headers.get("set-cookie").split(";")[0];
    const repeat = await request(`/api/auth/github/callback?state=${state}&code=test`, {
      headers: { cookie: repeatCookie },
    });
    assert.equal(repeat.headers.get("location"), "/?auth=github");
    const githubUsers = await db.select().from(workspaceUsers).where(eq(workspaceUsers.githubId, githubId));
    assert.equal(githubUsers.length, 1);
    assert.notEqual(githubUsers[0].id, viewer.id);
    const list = await request("/api/members", { headers: { cookie: githubCookie } });
    assert.equal(list.status, 200);
    const created = await post(
      "/api/members",
      { username: `test-${randomUUID()}`, password: "temporary password" },
      githubCookie,
    );
    assert.equal(created.status, 201);
    createdViewer = (await created.json()).user;
    assert.equal(
      (await post(`/api/members/${createdViewer.id}/password`, { password: "new temporary password" }, githubCookie))
        .status,
      204,
    );
    const engineer = (await (await request("/api/auth/session", { headers: { cookie: githubCookie } })).json()).user;
    assert.equal((await post(`/api/members/${engineer.id}/disable`, {}, githubCookie)).status, 404);
    assert.equal((await post(`/api/members/${createdViewer.id}/disable`, {}, githubCookie)).status, 204);
    assert.equal((await post("/api/auth/logout", {}, githubCookie)).status, 204);
    assert.equal((await (await request("/api/auth/session", { headers: { cookie: githubCookie } })).json()).user, null);
  } finally {
    server.close();
    if (priorPort === undefined) delete process.env.WEB_PORT;
    else process.env.WEB_PORT = priorPort;
    const users = await db.select().from(workspaceUsers).where(eq(workspaceUsers.githubId, githubId));
    for (const id of [viewer?.id, createdViewer?.id, ...users.map((user) => user.id)].filter(Boolean)) {
      await db.delete(workspaceSessions).where(eq(workspaceSessions.userId, id));
      await db.delete(workspaceGithubCredentials).where(eq(workspaceGithubCredentials.userId, id));
      await db.delete(workspaceUsers).where(eq(workspaceUsers.id, id));
    }
    if (priorKey === undefined) delete process.env.AGENT_ENCRYPTION_KEY;
    else process.env.AGENT_ENCRYPTION_KEY = priorKey;
    await closeDatabase();
  }
});
