import { resolve } from "node:path";
import { Readable } from "node:stream";
import { isLocalRequest } from "../../shared/local-request.mjs";
import { automationCatalog } from "../catalog/scenario-catalog.mjs";
import { resultStore } from "../results/result-store.mjs";
import { createLocalRunService } from "../runs/local-run-service.mjs";
import { createDriveClient } from "./drive-client.mjs";

const root = resolve(import.meta.dirname, "../../../../..");
const features = resolve(root, "apps/tenants/tests/bdd/features");
const environments = createLocalRunService().environments;

export function createDriveEvidenceHandler({
  catalog = () => automationCatalog(features),
  drive = createDriveClient,
  results = resultStore,
} = {}) {
  return async function driveEvidence(req, res) {
    const fail = (status, error) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error }));
    };
    if (!isLocalRequest(req) || req.method !== "GET") return fail(403, "Local requests only.");
    try {
      const url = new URL(req.url, "http://localhost");
      const scenario = catalog().find((item) => item.key === url.searchParams.get("scenario"));
      const environment = url.searchParams.get("environment");
      if (!scenario || !environment || !environments.some((item) => item.id === environment))
        return fail(404, "Evidence folder is unavailable.");
      if (!scenario.docFile || !scenario.id || scenario.availability === "unavailable")
        return fail(404, "Evidence folder is unavailable.");
      const latest = (await results.list(environment)).find((item) => item.scenarioId === scenario.id);
      const expectedFolder = latest?.evidenceUrl?.match(
        /^https:\/\/drive\.google\.com\/drive\/folders\/([\w-]+)(?:[/?#]|$)/,
      )?.[1];
      if (latest?.uploadStatus !== "uploaded" || !expectedFolder) {
        if (url.searchParams.has("file")) return fail(404, "Evidence file is unavailable.");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        return res.end("[]");
      }
      const client = await drive();
      if (!client) return fail(503, "Drive credentials are not configured for the local viewer.");
      const folder = await client.findEvidenceFolder([
        environment,
        "tenants",
        ...scenario.docFile.replace(/\.md$/i, "").split("/"),
        scenario.id,
        latest.runId,
      ]);
      if (!folder) {
        if (url.searchParams.has("file")) return fail(404, "Evidence file is unavailable.");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        return res.end("[]");
      }
      if (folder !== expectedFolder) return fail(404, "Evidence folder is unavailable.");
      const exampleNames = new Map(
        (latest.examples ?? []).flatMap((example) =>
          (example.evidenceNames ?? []).map((name) => [name, example.title]),
        ),
      );
      const files = (await client.listMedia(folder))
        .filter((file) => exampleNames.has(file.name))
        .map((file) => ({ ...file, exampleTitle: exampleNames.get(file.name) }));
      const id = url.searchParams.get("file");
      if (!id) {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        return res.end(JSON.stringify(files));
      }
      const file = files.find((item) => item.id === id);
      if (!file) return fail(404, "Evidence file is unavailable.");
      const response = await client.download(id, req.headers.range);
      res.statusCode = response.status;
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Cache-Control", "no-store");
      for (const header of ["content-length", "content-range", "accept-ranges"])
        if (response.headers.has(header)) res.setHeader(header, response.headers.get(header));
      return Readable.fromWeb(response.body)
        .on("error", () => res.destroy())
        .pipe(res);
    } catch {
      return fail(502, "Unable to load evidence from Drive. Check the local credentials and folder access.");
    }
  };
}

export const driveEvidence = createDriveEvidenceHandler();
