import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { database } from "../../database.mjs";
import { workspaceSessions, workspaceUsers } from "../results/schema.mjs";

const sessionLifetimeMs = 8 * 60 * 60 * 1000;

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createWorkspaceSession(userId, db = database()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  await db.insert(workspaceSessions).values({ tokenHash: tokenHash(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function findWorkspaceSession(token, db = database()) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined;
  const [row] = await db
    .select({
      id: workspaceUsers.id,
      role: workspaceUsers.role,
      displayName: workspaceUsers.displayName,
      username: workspaceUsers.username,
      mustChangePassword: workspaceUsers.mustChangePassword,
    })
    .from(workspaceSessions)
    .innerJoin(workspaceUsers, eq(workspaceSessions.userId, workspaceUsers.id))
    .where(
      and(
        eq(workspaceSessions.tokenHash, tokenHash(token)),
        gt(workspaceSessions.expiresAt, new Date()),
        eq(workspaceUsers.status, "active"),
      ),
    )
    .limit(1);
  return row;
}

export async function revokeWorkspaceSession(token, db = database()) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await db.delete(workspaceSessions).where(eq(workspaceSessions.tokenHash, tokenHash(token)));
}

export async function revokeUserSessions(userId, db = database()) {
  await db.delete(workspaceSessions).where(eq(workspaceSessions.userId, userId));
}
