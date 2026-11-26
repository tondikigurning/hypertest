import { and, eq } from "drizzle-orm";
import { database } from "../../database.mjs";
import { decryptAgentSecret, encryptAgentSecret } from "../agent/agent-crypto.mjs";
import { workspaceGithubCredentials, workspaceSessions, workspaceUsers } from "../results/schema.mjs";
import { hashPassword, normalizeUsername, verifyPassword } from "./password.mjs";
import { createWorkspaceSession } from "./session-store.mjs";

export async function createViewer(username, password, db = database()) {
  const normalized = normalizeUsername(username);
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(workspaceUsers)
    .values({
      role: "viewer",
      displayName: normalized,
      username: normalized,
      passwordHash,
      mustChangePassword: true,
    })
    .returning({ id: workspaceUsers.id, role: workspaceUsers.role, username: workspaceUsers.username });
  return user;
}

export async function resetViewerPassword(userId, password, db = database()) {
  const passwordHash = await hashPassword(password);
  return db.transaction(async (tx) => {
    const [user] = await tx
      .update(workspaceUsers)
      .set({ passwordHash, mustChangePassword: true })
      .where(and(eq(workspaceUsers.id, userId), eq(workspaceUsers.role, "viewer")))
      .returning({ id: workspaceUsers.id });
    if (!user) return false;
    await tx.delete(workspaceSessions).where(eq(workspaceSessions.userId, userId));
    return true;
  });
}

export async function disableViewer(userId, db = database()) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .update(workspaceUsers)
      .set({ status: "disabled" })
      .where(and(eq(workspaceUsers.id, userId), eq(workspaceUsers.role, "viewer")))
      .returning({ id: workspaceUsers.id });
    if (!user) return false;
    await tx.delete(workspaceSessions).where(eq(workspaceSessions.userId, userId));
    return true;
  });
}

export async function saveGithubCredential(
  userId,
  { accessToken, refreshToken, expiresAt, refreshExpiresAt },
  db = database(),
) {
  const values = {
    userId,
    encryptedAccessToken: encryptAgentSecret(accessToken),
    encryptedRefreshToken: refreshToken ? encryptAgentSecret(refreshToken) : null,
    expiresAt: expiresAt || null,
    refreshExpiresAt: refreshExpiresAt || null,
    updatedAt: new Date(),
  };
  await db
    .insert(workspaceGithubCredentials)
    .values(values)
    .onConflictDoUpdate({ target: workspaceGithubCredentials.userId, set: values });
}

export async function getGithubCredential(userId, db = database()) {
  const [row] = await db
    .select()
    .from(workspaceGithubCredentials)
    .where(eq(workspaceGithubCredentials.userId, userId))
    .limit(1);
  if (!row) return undefined;
  return {
    accessToken: decryptAgentSecret(row.encryptedAccessToken),
    refreshToken: row.encryptedRefreshToken ? decryptAgentSecret(row.encryptedRefreshToken) : undefined,
    expiresAt: row.expiresAt,
    refreshExpiresAt: row.refreshExpiresAt,
  };
}

export async function saveGithubIdentity(identity, db = database()) {
  if (
    !/^[1-9][0-9]*$/.test(identity.githubId || "") ||
    typeof identity.displayName !== "string" ||
    !identity.displayName ||
    identity.displayName.length > 256
  )
    throw new Error("Invalid GitHub identity.");
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(workspaceUsers)
      .values({ role: "engineer", githubId: identity.githubId, displayName: identity.displayName })
      .onConflictDoUpdate({ target: workspaceUsers.githubId, set: { displayName: identity.displayName } })
      .returning({
        id: workspaceUsers.id,
        role: workspaceUsers.role,
        status: workspaceUsers.status,
        displayName: workspaceUsers.displayName,
        mustChangePassword: workspaceUsers.mustChangePassword,
      });
    if (user.status !== "active" || user.role !== "engineer") throw new Error("Account unavailable.");
    await saveGithubCredential(user.id, identity, tx);
    return user;
  });
}

export async function changeViewerPassword(userId, currentPassword, newPassword, db = database()) {
  const passwordHash = await hashPassword(newPassword);
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(workspaceUsers)
      .where(and(eq(workspaceUsers.id, userId), eq(workspaceUsers.role, "viewer"), eq(workspaceUsers.status, "active")))
      .for("update");
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return false;
    await tx
      .update(workspaceUsers)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(workspaceUsers.id, userId));
    await tx.delete(workspaceSessions).where(eq(workspaceSessions.userId, userId));
    return true;
  });
}

export async function loginViewer(username, password, db = database()) {
  let normalized;
  try {
    normalized = normalizeUsername(username);
  } catch {
    normalized = undefined;
  }
  return db.transaction(async (tx) => {
    const [user] = normalized
      ? await tx
          .select()
          .from(workspaceUsers)
          .where(and(eq(workspaceUsers.role, "viewer"), eq(workspaceUsers.username, normalized)))
          .for("update")
      : [];
    const fallback = "scrypt$32768$8$3$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const valid = await verifyPassword(password, user?.passwordHash || fallback);
    if (!valid || !user || user.status !== "active") return undefined;
    const session = await createWorkspaceSession(user.id, tx);
    return {
      session,
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        displayName: user.displayName,
        mustChangePassword: user.mustChangePassword,
      },
    };
  });
}
