import { join, resolve } from "node:path";
import { Router } from "express";
import { isLocalRequest } from "../../shared/local-request.mjs";
import { resolveAgentEnvironment, sendRunEvidence } from "../runs/run-controller.mjs";
import { agentSession, createSession } from "./agent-session.mjs";

const sessions = new Map();
const sessionsRoot = resolve(import.meta.dirname, "../../../../../.cache/automation-agent/users");

function sessionFor(id) {
  if (!id) return agentSession;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return undefined;
  if (!sessions.has(id)) sessions.set(id, createSession({ stateFile: join(sessionsRoot, id, "session.json") }));
  return sessions.get(id);
}

export function createAgentRouter({ resolveSession = sessionFor } = {}) {
  const router = Router();
  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isLocalRequest(req) || (req.method !== "GET" && req.headers.origin !== `http://${req.headers.host}`)) {
      return res.status(403).json({ error: "Local requests only." });
    }
    return next();
  });
  router.use((req, res, next) => {
    req.agentSession = resolveSession(req.get("X-Automation-Dummy-User"));
    if (!req.agentSession) return res.status(400).json({ error: "Invalid local preview identity." });
    return next();
  });
  router.use(
    Router().use((req, res, next) => {
      if (req.method !== "POST") return next();
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 12000000) req.destroy();
      });
      req.on("end", () => {
        try {
          req.body = JSON.parse(body);
          next();
        } catch {
          res.status(400).json({ error: "Invalid request." });
        }
      });
    }),
  );
  router.get("/session", (req, res) => res.json(req.agentSession.snapshot()));
  router.get("/model", async (req, res) => {
    try {
      res.json({ model: await req.agentSession.getModel() });
    } catch {
      res.status(503).json({ error: "Codex model information is unavailable." });
    }
  });
  router.get("/models", async (req, res) => {
    try {
      res.json({
        models: await req.agentSession.getModels(),
        model: await req.agentSession.getModel(),
        effort: req.agentSession.snapshot().effort,
      });
    } catch {
      res.status(503).json({ error: "Codex model information is unavailable." });
    }
  });
  router.post("/model", async (req, res) => {
    try {
      res.json(await req.agentSession.setModel(req.body?.model));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/effort", async (req, res) => {
    try {
      res.json(await req.agentSession.setEffort(req.body?.effort));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.get("/draft-run", (req, res) => res.json(req.agentSession.draftRun()));
  router.get("/draft-run-evidence", (req, res) => {
    const service = req.agentSession.draftEvidenceService();
    if (!service) return res.status(404).json({ error: "Evidence unavailable." });
    return sendRunEvidence(service, req, res);
  });
  router.post("/draft-run", async (req, res) => {
    try {
      const target = resolveAgentEnvironment(req.body?.environment);
      res.status(202).json(await req.agentSession.runDraft(req.body, target, req.body?.variables));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/draft-run/cancel", (req, res) => {
    try {
      res.json(req.agentSession.cancelDraftRun());
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  router.post("/draft-run/clear", (req, res) => {
    try {
      req.agentSession.discardDraftRun();
      res.json({ ok: true });
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });

  router.get("/draft", async (req, res) => {
    try {
      res.json(await req.agentSession.draft());
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  router.get("/diff", async (req, res) => {
    try {
      res.json(await req.agentSession.diff());
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  router.get("/context-files", async (req, res) => {
    try {
      res.json(await req.agentSession.contextFiles(new URL(req.url, "http://localhost").searchParams.get("query")));
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  router.post("/messages", async (req, res) => {
    try {
      if (req.body?.scenarioKey !== undefined)
        throw new Error("The selected scenario identity is incomplete. Refresh the app and select it again.");
      await req.agentSession.send(
        req.body?.message,
        req.body?.scenario,
        req.body?.feature,
        req.body?.contexts || [],
        req.body?.skill,
        req.body?.environment ? resolveAgentEnvironment(req.body.environment) : undefined,
        req.body?.variables,
      );
      res.status(202).json(req.agentSession.snapshot());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/reset", async (req, res) => {
    try {
      await req.agentSession.reset();
      res.json(req.agentSession.snapshot());
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  router.post("/cancel", async (req, res) => {
    try {
      await req.agentSession.cancel();
      res.json(req.agentSession.snapshot());
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  router.post("/answers", (req, res) => {
    try {
      req.agentSession.answer(req.body?.requestId, req.body?.answers);
      res.json(req.agentSession.snapshot());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/approval", (req, res) => {
    try {
      req.agentSession.decideApproval(req.body?.requestId, req.body?.decision);
      res.json(req.agentSession.snapshot());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/finalize", (_req, res) => {
    res
      .status(503)
      .json({ error: "Finalizing is temporarily unavailable while the draft workflow is being verified." });
  });
  router.post("/commit", async (req, res) => {
    try {
      res.json(await req.agentSession.commitChanges(req.body?.message, req.body?.digest));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/approve-scenarios", async (req, res) => {
    try {
      await req.agentSession.approveScenarios(req.body?.digest);
      res.json(req.agentSession.snapshot());
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  return router;
}
