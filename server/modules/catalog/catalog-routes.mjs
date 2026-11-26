import { resolve } from "node:path";
import { Router } from "express";
import { getCatalog } from "./catalog-controller.mjs";
import { automationCatalog } from "./scenario-catalog.mjs";

export function createCatalogRouter(getCatalogHandler = getCatalog) {
  const router = Router();
  router.get("/snapshot", (_req, res, next) => {
    try {
      return res.json(automationCatalog(resolve(import.meta.dirname, "../../../e2e/tests/bdd/features")));
    } catch (error) {
      return next(error);
    }
  });
  router.get("/", getCatalogHandler);
  return router;
}
