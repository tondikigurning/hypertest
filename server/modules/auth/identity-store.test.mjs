import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { closeDatabase, database } from "../../database.mjs";
import { workspaceGithubCredentials, workspaceSessions, workspaceUsers } from "../results/schema.mjs";
import {
  createViewer,
  disableViewer,
  getGithubCredential,
  loginViewer,
  resetViewerPassword,
  saveGithubCredential,
} from "./identity-store.mjs";
import { createWorkspaceSession, findWorkspaceSession, revokeWorkspaceSession } from "./session-store.mjs";

test("viewer sessions and encrypted credentials are revocable and isolated", async () => {
  const db = database();
  const username = `test-${randomUUID()}`;
  const priorKey = process.env.AGENT_ENCRYPTION_KEY;
  process.env.AGENT_ENCRYPTION_KEY = randomBytes(32).toString("base64url");
  let viewer;
  let engineer;
  try {
    viewer = await createViewer(username.toUpperCase(), "temporary password", db);
    assert.equal(viewer.username, username);
    assert.equal((await loginViewer(username, "temporary password", db)).user.mustChangePassword, true);
    assert.equal(await loginViewer(username, "incorrect password", db), undefined);
    const session = await createWorkspaceSession(viewer.id, db);
    const [saved] = await db.select().from(workspaceSessions).where(eq(workspaceSessions.userId, viewer.id));
    assert.notEqual(saved.tokenHash, session.token);
    assert.equal((await findWorkspaceSession(session.token, db)).id, viewer.id);
    await resetViewerPassword(viewer.id, "another temporary password", db);
    assert.equal(await findWorkspaceSession(session.token, db), undefined);
    const second = await createWorkspaceSession(viewer.id, db);
    await disableViewer(viewer.id, db);
    assert.equal(await findWorkspaceSession(second.token, db), undefined);
    assert.equal(await loginViewer(username, "another temporary password", db), undefined);
    [engineer] = await db
      .insert(workspaceUsers)
      .values({ role: "engineer", githubId: randomUUID(), displayName: "test" })
      .returning();
    assert.equal(await disableViewer(engineer.id, db), false);
    assert.equal(await resetViewerPassword(engineer.id, "another temporary password", db), false);
    await saveGithubCredential(
      engineer.id,
      { accessToken: "test-access-token", refreshToken: "test-refresh-token" },
      db,
    );
    const [credential] = await db
      .select()
      .from(workspaceGithubCredentials)
      .where(eq(workspaceGithubCredentials.userId, engineer.id));
    assert.notEqual(credential.encryptedAccessToken, "test-access-token");
    assert.equal((await getGithubCredential(engineer.id, db)).accessToken, "test-access-token");
    const expired = await createWorkspaceSession(engineer.id, db);
    await db
      .update(workspaceSessions)
      .set({ expiresAt: new Date(0) })
      .where(eq(workspaceSessions.userId, engineer.id));
    assert.equal(await findWorkspaceSession(expired.token, db), undefined);
    const third = await createWorkspaceSession(engineer.id, db);
    await revokeWorkspaceSession(third.token, db);
    assert.equal(await findWorkspaceSession(third.token, db), undefined);
  } finally {
    for (const id of [viewer?.id, engineer?.id].filter(Boolean)) {
      await db.delete(workspaceSessions).where(eq(workspaceSessions.userId, id));
      await db.delete(workspaceGithubCredentials).where(eq(workspaceGithubCredentials.userId, id));
      await db.delete(workspaceUsers).where(eq(workspaceUsers.id, id));
    }
    if (priorKey === undefined) delete process.env.AGENT_ENCRYPTION_KEY;
    else process.env.AGENT_ENCRYPTION_KEY = priorKey;
    await closeDatabase();
  }
});
