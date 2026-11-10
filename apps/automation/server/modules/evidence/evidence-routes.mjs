import { Router } from "express";
import { driveEvidence } from "./evidence-controller.mjs";

export function createEvidenceRouter() {
  const router = Router();
  router.use((req, res, next) => {
    Promise.resolve(driveEvidence(req, res)).catch(next);
  });
  return router;
}
