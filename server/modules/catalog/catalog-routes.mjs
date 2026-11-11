import { Router } from "express";
import { getCatalog } from "./catalog-controller.mjs";

export function createCatalogRouter(getCatalogHandler = getCatalog) {
  const router = Router();
  router.get("/", getCatalogHandler);
  return router;
}
