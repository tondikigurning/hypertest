import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import { eq } from "drizzle-orm";
import { createApp } from "../../app.mjs";
import { closeDatabase, database } from "../../database.mjs";
import { workspaceSessions, workspaceUsers } from "../results/schema.mjs";
import { createViewer } from "./identity-store.mjs";
import { createWorkspaceSession } from "./session-store.mjs";

test("application gates APIs and does not trust browser identity headers", async () => {
  const db = database();
  const viewer = await createViewer(`test-${randomUUID()}`, "temporary password", db);
  await db.update(workspaceUsers).set({ mustChangePassword: false }).where(eq(workspaceUsers.id, viewer.id));
  const session = await createWorkspaceSession(viewer.id, db);
  const app = createApp({ catalogHandler: (_req, res) => res.json([{ title: "fixture" }]) });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const priorPort = process.env.WEB_PORT;
  process.env.WEB_PORT = String(server.address().port);
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(
      (await fetch(`${origin}/api/scenarios`, { headers: { "X-Automation-Dummy-User": randomUUID() } })).status,
      401,
    );
    assert.equal((await fetch(`${origin}/api/scenarios/snapshot`)).status, 401);
    assert.equal((await fetch(`${origin}/API/scenarios`)).status, 401);
    assert.equal(
      (await fetch(`${origin}/API/agent/prd-versions`, { method: "POST", headers: { origin } })).status,
      401,
    );
    const headers = {
      cookie: `automation_session=${session.token}`,
      "X-Automation-Dummy-User": randomUUID(),
      "X-Automation-Draft-Id": randomUUID(),
    };
    assert.equal((await fetch(`${origin}/api/scenarios`, { headers })).status, 200);
    assert.equal((await fetch(`${origin}/api/scenarios/snapshot`, { headers })).status, 200);
    assert.equal((await fetch(`${origin}/api/agent/drafts`, { headers })).status, 403);
    assert.equal(
      (await fetch(`${origin}/api/agent/prd-versions`, { method: "POST", headers: { ...headers, origin } })).status,
      403,
    );
    assert.equal((await fetch(`${origin}/api/members`, { headers })).status, 403);
    await db.update(workspaceUsers).set({ mustChangePassword: true }).where(eq(workspaceUsers.id, viewer.id));
    assert.equal((await fetch(`${origin}/api/scenarios`, { headers })).status, 403);
  } finally {
    server.close();
    if (priorPort === undefined) delete process.env.WEB_PORT;
    else process.env.WEB_PORT = priorPort;
    await db.delete(workspaceSessions).where(eq(workspaceSessions.userId, viewer.id));
    await db.delete(workspaceUsers).where(eq(workspaceUsers.id, viewer.id));
    await closeDatabase();
  }
});

import { existsSync } from "node:fs";
import { rmdir, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createLocalDraft } from "../agent/draft-store.mjs";

test("authenticated draft access is bound to the session owner", async () => {
  const db = database();
  const firstId = randomUUID(),
    secondId = randomUUID();
  const directory = resolve(".cache/automation-agent/users", firstId);
  assert.equal(existsSync(directory), false);
  const users = await db
    .insert(workspaceUsers)
    .values([
      { id: firstId, role: "engineer", githubId: randomUUID(), displayName: "fixture-one" },
      { id: secondId, role: "engineer", githubId: randomUUID(), displayName: "fixture-two" },
    ])
    .returning();
  const first = await createWorkspaceSession(firstId, db),
    second = await createWorkspaceSession(secondId, db);
  const draft = createLocalDraft(firstId, { title: "fixture", targetBranch: "development" });
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const priorPort = process.env.WEB_PORT;
  process.env.WEB_PORT = String(server.address().port);
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const request = (token) =>
      fetch(`${origin}/api/agent/session?userId=${firstId}`, {
        headers: {
          cookie: `automation_session=${token}`,
          "X-Automation-Dummy-User": firstId,
          "X-Automation-Draft-Id": draft.id,
        },
      });
    assert.equal((await request(first.token)).status, 200);
    assert.equal((await request(second.token)).status, 404);
    const forged = await fetch(`${origin}/api/agent/approval?userId=${firstId}`, {
      method: "POST",
      headers: {
        cookie: `automation_session=${second.token}`,
        origin,
        "content-type": "application/json",
        "X-Automation-Draft-Id": draft.id,
        "X-Automation-Dummy-User": firstId,
      },
      body: JSON.stringify({ userId: firstId, draftId: draft.id, decision: "accept" }),
    });
    assert.equal(forged.status, 404);
  } finally {
    server.close();
    if (priorPort === undefined) delete process.env.WEB_PORT;
    else process.env.WEB_PORT = priorPort;
    for (const user of users) {
      await db.delete(workspaceSessions).where(eq(workspaceSessions.userId, user.id));
      await db.delete(workspaceUsers).where(eq(workspaceUsers.id, user.id));
    }
    await unlink(join(directory, "drafts.json"));
    await rmdir(directory);
    await closeDatabase();
  }
});
