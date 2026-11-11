import express from "express";
import { errorHandler } from "./middleware/error-handler.mjs";
import { notFound } from "./middleware/not-found.mjs";
import { createAgentRouter } from "./modules/agent/agent-routes.mjs";
import { createCatalogRouter } from "./modules/catalog/catalog-routes.mjs";
import { createEvidenceRouter } from "./modules/evidence/evidence-routes.mjs";
import { createRunRouter } from "./modules/runs/run-routes.mjs";

export function createApp({ catalogHandler, evidenceHandler, resolveAgentIdentity } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api/agent", createAgentRouter({ resolveIdentity: resolveAgentIdentity }));
  app.use("/api/local", createRunRouter());
  app.use("/api/evidence", createEvidenceRouter(evidenceHandler));
  app.use("/api/scenarios", createCatalogRouter(catalogHandler));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
