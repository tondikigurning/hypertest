import { Router } from "express";
import { isLocalRequest } from "../../shared/local-request.mjs";
import { cancelRun, getLiveFrame, getRun, getRunConfig, getRunEvidence, startRun } from "./run-controller.mjs";

function localOnly(req, res, next) {
  if (!isLocalRequest(req)) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(403).json({ error: "Local requests only." });
  }
  if (req.method === "HEAD") return res.status(404).end();
  return next();
}

export function createRunRouter() {
  const router = Router();
  router.get("/config", localOnly, getRunConfig);
  router.get("/run", localOnly, getRun);
  router.post("/run", localOnly, startRun);
  router.post("/cancel", localOnly, cancelRun);
  router.get("/live", localOnly, getLiveFrame);
  router.get("/evidence", localOnly, getRunEvidence);
  return router;
}
