import { asc } from "drizzle-orm";
import express, { Router } from "express";
import { database } from "../../database.mjs";
import { workspaceUsers } from "../results/schema.mjs";
import { workspacePrincipal } from "./auth-routes.mjs";
import { createViewer, disableViewer, resetViewerPassword } from "./identity-store.mjs";
import { requireLocalSameOrigin } from "./request-guard.mjs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createMembersRouter() {
  const router = Router();
  router.use(requireLocalSameOrigin);
  router.use(express.json({ limit: "16kb" }));
  router.use(async (req, res, next) => {
    try {
      const user = await workspacePrincipal(req);
      if (!user) return res.status(401).json({ error: "Sign in required." });
      if (user.role !== "engineer" || user.mustChangePassword) return res.status(403).json({ error: "Not permitted." });
      return next();
    } catch (error) {
      return next(error);
    }
  });
  router.get("/", async (_req, res, next) => {
    try {
      const users = await database()
        .select({
          id: workspaceUsers.id,
          role: workspaceUsers.role,
          status: workspaceUsers.status,
          displayName: workspaceUsers.displayName,
          username: workspaceUsers.username,
        })
        .from(workspaceUsers)
        .orderBy(asc(workspaceUsers.createdAt));
      res.json({ users });
    } catch (error) {
      next(error);
    }
  });
  router.post("/", async (req, res) => {
    try {
      return res.status(201).json({ user: await createViewer(req.body?.username, req.body?.password) });
    } catch (error) {
      return res
        .status(400)
        .json({ error: error?.code === "23505" ? "Username is unavailable." : "Invalid username or password." });
    }
  });
  router.post("/:id/password", async (req, res) => {
    if (!uuid.test(req.params.id)) return res.status(404).json({ error: "Viewer not found." });
    try {
      if (!(await resetViewerPassword(req.params.id, req.body?.password)))
        return res.status(404).json({ error: "Viewer not found." });
      return res.status(204).end();
    } catch {
      return res.status(400).json({ error: "Invalid password." });
    }
  });
  router.post("/:id/disable", async (req, res, next) => {
    if (!uuid.test(req.params.id)) return res.status(404).json({ error: "Viewer not found." });
    try {
      if (!(await disableViewer(req.params.id))) return res.status(404).json({ error: "Viewer not found." });
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });
  return router;
}
