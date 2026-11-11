import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { Router } from "express";
import { isLocalRequest } from "../../shared/local-request.mjs";
import { resolveAgentEnvironment, sendRunEvidence } from "../runs/run-controller.mjs";
import { isAgentEncryptionConfigured } from "./agent-crypto.mjs";
import { resolveLocalPreviewIdentity } from "./agent-identity.mjs";
import { agentProviders, createAgentLanguageModel, modelIsListed, verifyToolCalling } from "./agent-provider.mjs";
import { agentSession, createSession } from "./agent-session.mjs";
import {
  deleteProviderCredential,
  getProviderCredential,
  getUsageSummary,
  isModelVerified,
  listProviderCredentials,
  listVerifiedModels,
  recordAgentUsage,
  recordModelCheck,
  saveProviderCredential,
} from "./agent-store.mjs";
import {
  createLocalDraft,
  finalizeLocalDraft,
  getLocalDraft,
  listLocalDrafts,
  listLocalPullRequests,
  restoreLocalDraft,
  touchLocalDraft,
  updateLocalPullRequests,
} from "./draft-store.mjs";
import { createDraftWorkspace, listDraftTargets } from "./draft-workspace.mjs";
import { refreshPullRequests } from "./publish-draft.mjs";

const sessions = new Map();
const sessionsRoot = resolve(import.meta.dirname, "../../../.cache/automation-agent/users");
const agentVariableNames = new Set(["E2E_USERNAME", "E2E_PASSWORD"]);

function resolveAgentVariables(value) {
  if (value == null) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Provide browser credentials through the Variables panel.");
  if (Object.keys(value).some((name) => !agentVariableNames.has(name)))
    throw new Error("The agent accepts only E2E username and password from browser Variables.");
  const variables = {};
  for (const name of agentVariableNames) {
    if (value[name] === undefined) continue;
    if (typeof value[name] !== "string" || value[name].length > 4096)
      throw new Error("Browser variables must be text of up to 4096 characters.");
    variables[name] = value[name];
  }
  return variables;
}

function sessionFor(id, draftId, draft) {
  if (id === "local-preview-user" && draftId === "default") return agentSession;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return undefined;
  if (
    draftId !== "default" &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draftId || "")
  )
    return undefined;
  const key = `${id}:${draftId}`;
  if (!sessions.has(key)) {
    const stateFile =
      draftId === "default"
        ? join(sessionsRoot, id, "session.json")
        : join(sessionsRoot, id, "drafts", draftId, "session.json");
    sessions.set(
      key,
      createSession({
        userId: id,
        stateFile,
        ...(draftId !== "default" && draft
          ? {
              prepareWorkspace: () =>
                createDraftWorkspace({
                  userId: id,
                  draftId,
                  branch: draft.branch,
                  targetBranch: draft.targetBranch,
                }),
            }
          : {}),
      }),
    );
  }
  return sessions.get(key);
}

export function createAgentRouter({ resolveSession = sessionFor, resolveIdentity = resolveLocalPreviewIdentity } = {}) {
  const router = Router();
  router.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isLocalRequest(req) || (req.method !== "GET" && req.headers.origin !== `http://${req.headers.host}`)) {
      return res.status(403).json({ error: "Local requests only." });
    }
    return next();
  });
  router.use((req, res, next) => {
    try {
      req.agentIdentity = resolveIdentity(req);
      if (!req.agentIdentity?.userId) return res.status(400).json({ error: "Invalid local preview identity." });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    return next();
  });
  router.use(
    Router().use((req, res, next) => {
      if (req.method !== "POST" && req.method !== "PUT") return next();
      if (Number(req.headers["content-length"]) > 12000000)
        return res.status(413).json({ error: "Request body is too large." });
      const chunks = [];
      let bodyBytes = 0;
      let tooLarge = false;
      req.on("data", (chunk) => {
        if (tooLarge) return;
        bodyBytes += chunk.length;
        if (bodyBytes > 12000000) {
          tooLarge = true;
          res.status(413).json({ error: "Request body is too large." });
          return;
        }
        chunks.push(chunk);
      });
      req.on("end", () => {
        if (tooLarge) return;
        try {
          const body = Buffer.concat(chunks).toString("utf8");
          req.body = body ? JSON.parse(body) : {};
          next();
        } catch {
          res.status(400).json({ error: "Invalid request." });
        }
      });
    }),
  );
  router.get("/draft-targets", async (_req, res) => {
    try {
      res.json(await listDraftTargets());
    } catch {
      res.status(503).json({ error: "Could not read local Git branches." });
    }
  });
  router.get("/drafts", (req, res) => res.json(listLocalDrafts(req.agentIdentity.userId)));
  router.post("/drafts", async (req, res) => {
    try {
      const targets = await listDraftTargets();
      if (!targets.branches.includes(req.body?.targetBranch))
        throw new Error("Choose a target branch from this repository.");
      const draft = createLocalDraft(req.agentIdentity.userId, req.body || {});
      res.status(201).json(draft);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/drafts/:draftId/restore", (req, res) => {
    try {
      res.json(restoreLocalDraft(req.agentIdentity.userId, req.params.draftId));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.get("/pull-requests", (req, res) => res.json(listLocalPullRequests(req.agentIdentity.userId)));
  router.post("/pull-requests/refresh", async (req, res) => {
    try {
      const pullRequests = await refreshPullRequests(listLocalPullRequests(req.agentIdentity.userId));
      res.json(updateLocalPullRequests(req.agentIdentity.userId, pullRequests));
    } catch (error) {
      res.status(503).json({ error: error.message || "Could not refresh pull-request status from GitHub." });
    }
  });
  router.use((req, res, next) => {
    try {
      const draftId = req.get("X-Automation-Draft-Id") || "default";
      const draft = getLocalDraft(req.agentIdentity.userId, draftId);
      if (!draft) return res.status(404).json({ error: "Select or create a local draft first." });
      if (req.method === "POST" && draft.status !== "active")
        return res
          .status(409)
          .json({ error: "This draft is archived or finalized. Restore an archived draft to continue." });
      req.agentDraft = draft;
      req.agentSession = resolveSession(req.agentIdentity.userId, draftId, draft);
      if (!req.agentSession) return res.status(400).json({ error: "Invalid local draft identity." });
      req.agentDraftId = draftId;
      return next();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });
  router.get("/session", (req, res) => res.json({ ...req.agentSession.snapshot(), draft: req.agentDraft }));
  router.get("/model", async (req, res) => {
    const snapshot = req.agentSession.snapshot();
    res.json({ provider: snapshot.provider, model: snapshot.model });
  });
  router.get("/models", async (req, res) => {
    try {
      const requestedProvider = new URL(req.url, "http://localhost").searchParams.get("provider");
      const configured = new Set(
        (await listProviderCredentials(req.agentIdentity.userId)).map((item) => item.provider),
      );
      const providers = await Promise.all(
        agentProviders.map(async (provider) => {
          const checked = configured.has(provider.id)
            ? await listVerifiedModels(req.agentIdentity.userId, provider.id)
            : [];
          const checks = new Map(checked.map((item) => [item.modelId, item.checkedAt]));
          return {
            ...provider,
            configured: configured.has(provider.id),
            verifiedModels: checked.map((item) => item.modelId),
            models: provider.models.map((model) => ({
              ...model,
              tested: checks.has(model.id),
              checkedAt: checks.get(model.id)?.toISOString(),
            })),
          };
        }),
      );
      const snapshot = req.agentSession.snapshot();
      res.json({
        providers: requestedProvider ? providers.filter((item) => item.id === requestedProvider) : providers,
        provider: snapshot.provider,
        model: snapshot.model,
      });
    } catch {
      res.status(503).json({ error: "Provider settings are unavailable. Run the database migrations first." });
    }
  });
  router.get("/settings", async (req, res) => {
    try {
      const snapshot = req.agentSession.snapshot();
      const [credentials, usage] = await Promise.all([
        listProviderCredentials(req.agentIdentity.userId),
        getUsageSummary(req.agentIdentity.userId, snapshot.taskId),
      ]);
      res.json({
        encryptionConfigured: isAgentEncryptionConfigured(),
        authenticated: req.agentIdentity.authenticated === true,
        credentials,
        usage,
        provider: snapshot.provider,
        model: snapshot.model,
      });
    } catch {
      res.status(503).json({ error: "Provider settings are unavailable. Run the database migrations first." });
    }
  });
  router.put("/credentials", async (req, res) => {
    try {
      await saveProviderCredential(req.agentIdentity.userId, req.body || {});
      const session = await req.agentSession.clearProvider(req.body?.provider);
      res.json({
        encryptionConfigured: isAgentEncryptionConfigured(),
        credentials: await listProviderCredentials(req.agentIdentity.userId),
        session,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.delete("/credentials/:provider", async (req, res) => {
    try {
      const result = await deleteProviderCredential(req.agentIdentity.userId, req.params.provider);
      const session = await req.agentSession.clearProvider(req.params.provider);
      res.json({ ...result, session });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/model-test", async (req, res) => {
    const { provider, model: modelId } = req.body || {};
    try {
      if (!modelIsListed(provider, modelId)) throw new Error("Choose a supported model.");
      const credential = await getProviderCredential(req.agentIdentity.userId, provider);
      if (!credential) throw new Error("Save an API key for this provider first.");
      const model = createAgentLanguageModel({ provider, modelId, ...credential });
      const usage = await verifyToolCalling(model);
      const testSessionId = randomUUID();
      await Promise.all([
        recordModelCheck(req.agentIdentity.userId, provider, modelId, true),
        recordAgentUsage({
          userId: req.agentIdentity.userId,
          sessionId: testSessionId,
          provider,
          modelId,
          purpose: "model_test",
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        }),
      ]);
      res.json({ provider, model: modelId, tested: true, usage });
    } catch (error) {
      if (provider && modelId && modelIsListed(provider, modelId))
        await recordModelCheck(req.agentIdentity.userId, provider, modelId, false).catch(() => {});
      const knownSetupError = [
        "Choose a supported model.",
        "Save an API key for this provider first.",
        "The selected model did not complete the tool-calling check.",
      ].includes(error.message);
      res.status(400).json({
        error: knownSetupError
          ? error.message
          : "The model check failed. Confirm the provider key, endpoint, model access, and tool-calling support.",
      });
    }
  });
  router.post("/model", async (req, res) => {
    try {
      if (!(await isModelVerified(req.agentIdentity.userId, req.body?.provider, req.body?.model)))
        throw new Error("Test this model's tool-calling support before selecting it.");
      res.json(await req.agentSession.setModel(req.body?.provider, req.body?.model));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.get("/usage", async (req, res) => {
    try {
      res.json(await getUsageSummary(req.agentIdentity.userId, req.agentSession.snapshot().taskId));
    } catch {
      res.status(503).json({ error: "Token usage is unavailable. Run the database migrations first." });
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
      const run = await req.agentSession.runDraft(req.body, target, resolveAgentVariables(req.body?.variables));
      touchLocalDraft(req.agentIdentity.userId, req.agentDraftId);
      res.status(202).json(run);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/draft-run/cancel", (req, res) => {
    try {
      const run = req.agentSession.cancelDraftRun();
      touchLocalDraft(req.agentIdentity.userId, req.agentDraftId);
      res.json(run);
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  router.post("/draft-run/clear", async (req, res) => {
    try {
      await req.agentSession.discardDraftRun();
      touchLocalDraft(req.agentIdentity.userId, req.agentDraftId);
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
        resolveAgentVariables(req.body?.variables),
      );
      touchLocalDraft(req.agentIdentity.userId, req.agentDraftId);
      res.status(202).json({ ...req.agentSession.snapshot(), draft: req.agentDraft });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/reset", async (req, res) => {
    try {
      await req.agentSession.reset();
      touchLocalDraft(req.agentIdentity.userId, req.agentDraftId);
      res.json({ ...req.agentSession.snapshot(), draft: req.agentDraft });
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
      touchLocalDraft(req.agentIdentity.userId, req.agentDraftId);
      res.json({ ...req.agentSession.snapshot(), draft: req.agentDraft });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/approval", (req, res) => {
    try {
      req.agentSession.decideApproval(req.body?.requestId, req.body?.decision);
      touchLocalDraft(req.agentIdentity.userId, req.agentDraftId);
      res.json({ ...req.agentSession.snapshot(), draft: req.agentDraft });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/sync", async (req, res) => {
    try {
      const result = await req.agentSession.syncWithTarget(req.body?.message, req.body?.digest);
      touchLocalDraft(req.agentIdentity.userId, req.agentDraftId);
      res.json(result);
    } catch (error) {
      res.status(409).json({ error: error.message, sync: error.sync });
    }
  });
  router.post("/finalize", async (req, res) => {
    try {
      const result = await req.agentSession.finalize(req.body?.message, req.body?.digest);
      let pullRequest;
      try {
        pullRequest = finalizeLocalDraft(req.agentIdentity.userId, req.agentDraftId, {
          title: req.body?.message,
          url: result.pullRequest.url,
          number: result.pullRequest.number,
          branch: result.session.branch || req.agentDraft.branch,
          baseBranch: req.agentDraft.targetBranch,
          status: result.pullRequest.state || "OPEN",
        });
      } catch {
        return res.status(503).json({
          error: "The pull request was created, but local History PR could not be saved. Retry to record it.",
        });
      }
      return res.json({ ...result, pullRequest, draft: getLocalDraft(req.agentIdentity.userId, req.agentDraftId) });
    } catch (error) {
      if (error.sync) return res.status(409).json({ error: error.message, sync: error.sync });
      if (error.message?.includes("Could not save") || error.message?.includes("history could not be saved"))
        return res
          .status(503)
          .json({ error: "The pull request was created, but local history could not be saved. Retry to record it." });
      return res.status(400).json({ error: error.message });
    }
  });
  router.post("/commit", async (req, res) => {
    try {
      const result = await req.agentSession.commitChanges(req.body?.message, req.body?.digest);
      touchLocalDraft(req.agentIdentity.userId, req.agentDraftId);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  router.post("/approve-scenarios", async (req, res) => {
    try {
      await req.agentSession.approveScenarios(req.body?.digest);
      touchLocalDraft(req.agentIdentity.userId, req.agentDraftId);
      res.json({ ...req.agentSession.snapshot(), draft: req.agentDraft });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  return router;
}
