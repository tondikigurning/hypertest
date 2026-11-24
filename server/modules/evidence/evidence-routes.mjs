import { Router } from "express";
import { evidenceHandler } from "./evidence-controller.mjs";

export function createEvidenceRouter(handler = evidenceHandler) {
  const router = Router();
  router.use((req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  });
  return router;
}
