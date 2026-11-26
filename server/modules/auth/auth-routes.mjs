import { timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import { createGithubOAuth } from "./github-oauth.mjs";
import { changeViewerPassword, loginViewer, saveGithubIdentity } from "./identity-store.mjs";
import { requireLocalSameOrigin } from "./request-guard.mjs";
import { createWorkspaceSession, findWorkspaceSession, revokeWorkspaceSession } from "./session-store.mjs";

const sessionCookie = "automation_session";
const oauthCookie = "automation_oauth";
const attempts = new Map();
function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((entry) => entry.trim().split("=", 2))
      .filter(([key, value]) => key && value),
  );
}
function cookieOptions(req, maxAge) {
  return { httpOnly: true, secure: req.secure, sameSite: "lax", path: "/", maxAge };
}
function validState(actual, expected) {
  if (
    typeof actual !== "string" ||
    typeof expected !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(actual) ||
    !/^[A-Za-z0-9_-]{43}$/.test(expected)
  )
    return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
function throttle(key) {
  const now = Date.now();
  for (const [address, record] of attempts) if (record.until <= now) attempts.delete(address);
  const record = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
  record.count += 1;
  attempts.set(key, record);
  return record.count <= 10;
}
export function createAuthRouter({
  oauthFactory = () =>
    createGithubOAuth({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL,
    }),
} = {}) {
  const router = Router();
  router.use(requireLocalSameOrigin);
  router.use(express.json({ limit: "16kb" }));
  async function establish(req, res, user) {
    await revokeWorkspaceSession(cookies(req)[sessionCookie]);
    const session = await createWorkspaceSession(user.id);
    res.cookie(sessionCookie, session.token, cookieOptions(req, session.expiresAt.getTime() - Date.now()));
  }
  router.get("/session", async (req, res, next) => {
    try {
      res.json({ user: (await findWorkspaceSession(cookies(req)[sessionCookie])) || null });
    } catch (error) {
      next(error);
    }
  });
  router.post("/login", async (req, res, next) => {
    try {
      if (!throttle(req.socket.remoteAddress))
        return res.status(429).json({ error: "Too many attempts. Try again later." });
      const result = await loginViewer(req.body?.username, req.body?.password);
      if (!result) return res.status(401).json({ error: "Invalid username or password." });
      attempts.delete(req.socket.remoteAddress);
      await revokeWorkspaceSession(cookies(req)[sessionCookie]);
      res.cookie(
        sessionCookie,
        result.session.token,
        cookieOptions(req, result.session.expiresAt.getTime() - Date.now()),
      );
      return res.json({ user: result.user });
    } catch (error) {
      return next(error);
    }
  });
  router.post("/logout", async (req, res, next) => {
    try {
      await revokeWorkspaceSession(cookies(req)[sessionCookie]);
      res.clearCookie(sessionCookie, cookieOptions(req));
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  router.post("/password", async (req, res, next) => {
    try {
      const user = await findWorkspaceSession(cookies(req)[sessionCookie]);
      if (!user) return res.status(401).json({ error: "Sign in required." });
      if (user.role !== "viewer") return res.status(403).json({ error: "Not permitted." });
      if (
        typeof req.body?.newPassword !== "string" ||
        req.body.newPassword.length < 12 ||
        Buffer.byteLength(req.body.newPassword, "utf8") > 1024
      )
        return res.status(400).json({ error: "Use a password of at least 12 characters and at most 1024 bytes." });
      if (!(await changeViewerPassword(user.id, req.body?.currentPassword, req.body?.newPassword)))
        return res.status(400).json({ error: "Current password is incorrect." });
      res.clearCookie(sessionCookie, cookieOptions(req));
      return res.json({ signedOut: true });
    } catch (error) {
      return next(error);
    }
  });
  router.get("/github", (req, res) => {
    try {
      const start = oauthFactory().start();
      res.cookie(oauthCookie, `${start.state}.${start.verifier}`, cookieOptions(req, 10 * 60 * 1000));
      return res.redirect(start.url);
    } catch {
      return res.status(503).json({ error: "GitHub sign-in is unavailable. Check the server configuration." });
    }
  });
  router.get("/github/callback", async (req, res) => {
    const [state, verifier, ...extra] = (cookies(req)[oauthCookie] || "").split(".");
    res.clearCookie(oauthCookie, cookieOptions(req));
    const stateMatches = validState(req.query.state, state);
    if (extra.length || !stateMatches || typeof req.query.code !== "string" || req.query.error) {
      const reason = req.query.error
        ? "provider_rejected"
        : extra.length
          ? "malformed_oauth_cookie"
          : !stateMatches
            ? "state_mismatch"
            : "missing_authorization_code";
      process.stderr.write(`[DEBUG-ghauth-26nov] callback rejected (${reason}).\n`);
      return res.redirect("/auth/login?error=github");
    }
    let stage = "token_exchange";
    try {
      const identity = await oauthFactory().exchange(req.query.code, verifier);
      stage = "identity_save";
      const user = await saveGithubIdentity(identity);
      stage = "session_create";
      await establish(req, res, user);
      return res.redirect("/?auth=github");
    } catch (error) {
      const category =
        error && typeof error === "object" && typeof error.code === "string"
          ? error.code
          : error instanceof Error
            ? error.name
            : "unknown";
      process.stderr.write(`[DEBUG-ghauth-26nov] callback failed during ${stage} (${category}).\n`);
      return res.redirect("/auth/login?error=github");
    }
  });
  return router;
}
export async function workspacePrincipal(req) {
  return findWorkspaceSession(cookies(req)[sessionCookie]);
}
