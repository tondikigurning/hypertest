import express from "express";
import { errorHandler } from "./middleware/error-handler.mjs";
import { notFound } from "./middleware/not-found.mjs";
import { createAgentRouter } from "./modules/agent/agent-routes.mjs";
import { createCatalogRouter } from "./modules/catalog/catalog-routes.mjs";
import { createEvidenceRouter } from "./modules/evidence/evidence-routes.mjs";
import { createRunRouter } from "./modules/runs/run-routes.mjs";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use("/automation/api/agent", createAgentRouter());
  app.use("/automation/api/local", createRunRouter());
  app.use("/automation/api/evidence", createEvidenceRouter());
  app.use("/automation/api/scenarios", createCatalogRouter());
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
