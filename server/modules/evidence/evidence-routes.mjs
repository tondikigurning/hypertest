import { Router } from "express";
import { driveEvidence } from "./evidence-controller.mjs";

export function createEvidenceRouter(driveEvidenceHandler = driveEvidence) {
  const router = Router();
  router.use((req, res, next) => {
    Promise.resolve(driveEvidenceHandler(req, res)).catch(next);
  });
  return router;
}
