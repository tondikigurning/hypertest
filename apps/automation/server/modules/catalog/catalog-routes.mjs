import { Router } from "express";
import { getCatalog } from "./catalog-controller.mjs";

export function createCatalogRouter() {
  const router = Router();
  router.get("/", getCatalog);
  return router;
}
