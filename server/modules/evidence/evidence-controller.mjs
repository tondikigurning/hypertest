import { Readable } from "node:stream";
import {
  createR2Storage,
  intermediateR2EvidencePrefix,
  legacyR2EvidencePrefix,
  parseR2EvidenceLocation,
  r2EvidencePrefix,
} from "../../../packages/internal/test-utils/src/export/r2-client.mjs";
import { isLocalRequest } from "../../shared/local-request.mjs";
import { catalogStore } from "../catalog/catalog-store.mjs";
import { resultStore } from "../results/result-store.mjs";
import { createLocalRunService } from "../runs/local-run-service.mjs";
import { createDriveClient } from "./drive-client.mjs";

const environments = createLocalRunService().environments;

export function createDriveEvidenceHandler({
  catalog = () => catalogStore.list(),
  drive = createDriveClient,
  r2 = createR2Storage,
  results = resultStore,
} = {}) {
  return async function driveEvidence(req, res) {
    const fail = (status, error) => {
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error }));
    };
    if (!isLocalRequest(req) || req.method !== "GET") return fail(403, "Local requests only.");
    const url = new URL(req.url, "http://localhost");
    const environment = url.searchParams.get("environment");
    if (!environment || !environments.some((item) => item.id === environment))
      return fail(404, "Evidence folder is unavailable.");

    let scenario;
    try {
      scenario = (await catalog()).find((item) => item.key === url.searchParams.get("scenario"));
    } catch {
      return fail(503, "Scenario catalog is unavailable.");
    }
    if (!scenario?.file || !scenario.id || scenario.availability === "unavailable")
      return fail(404, "Evidence folder is unavailable.");

    let latest;
    try {
      latest = (await results.list(environment)).find((item) => item.scenarioId === scenario.id);
    } catch {
      return fail(503, "Run results are unavailable.");
    }
    if (latest?.uploadStatus !== "uploaded" || !latest.evidenceUrl) {
      if (url.searchParams.has("file")) return fail(404, "Evidence file is unavailable.");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      return res.end("[]");
    }

    const r2Location = parseR2EvidenceLocation(latest.evidenceUrl);
    if (r2Location) {
      let storage;
      try {
        storage = r2();
        if (!storage || storage.bucket !== r2Location.bucket) return fail(503, "R2 credentials are not configured.");
        const expectedPrefixes = [
          r2EvidencePrefix(environment, "scenarios", scenario.file.replace(/\.feature$/i, ""), scenario.id),
          intermediateR2EvidencePrefix(environment, "scenarios", scenario.file.replace(/\.feature$/i, ""), scenario.id),
          legacyR2EvidencePrefix(environment, "scenarios", scenario.file.replace(/\.feature$/i, ""), scenario.id),
        ];
        if (!expectedPrefixes.includes(r2Location.prefix)) return fail(404, "Evidence folder is unavailable.");
        const prefix = r2Location.prefix;
        const exampleNames = new Map(
          (latest.examples ?? []).flatMap((example) =>
            (example.evidenceNames ?? []).map((name) => [name, example.title]),
          ),
        );
        const objects = await storage.list(prefix);
        const files = await Promise.all(
          objects
            .filter((item) => item.Key && (!exampleNames.size || exampleNames.has(item.Key.slice(prefix.length))))
            .map(async (item) => {
              const id = item.Key;
              const name = id.slice(prefix.length);
              const mimeType = mimeTypeForEvidenceName(name);
              return {
                id,
                name,
                mimeType,
                url: await storage.signDownload(
                  id,
                  mimeType.startsWith("image/") || mimeType.startsWith("video/") ? undefined : name,
                ),
                ...(exampleNames.has(name) ? { exampleTitle: exampleNames.get(name) } : {}),
              };
            }),
        );
        const fileId = url.searchParams.get("file");
        if (fileId) {
          const selected = files.find((file) => file.id === fileId);
          if (!selected) return fail(404, "Evidence file is unavailable.");
          res.statusCode = 302;
          res.setHeader("Location", selected.url);
          res.setHeader("Cache-Control", "no-store");
          return res.end();
        }
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        return res.end(JSON.stringify(files));
      } catch {
        return fail(502, "Unable to load evidence from Cloudflare R2. Check the local R2 configuration.");
      } finally {
        storage?.close();
      }
    }

    try {
      const expectedFolder = latest?.evidenceUrl?.match(
        /^https:\/\/drive\.google\.com\/drive\/folders\/([\w-]+)(?:[/?#]|$)/,
      )?.[1];
      if (!expectedFolder) {
        if (url.searchParams.has("file")) return fail(404, "Evidence file is unavailable.");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        return res.end("[]");
      }
      const client = await drive();
      if (!client) return fail(503, "Drive credentials are not configured for the local viewer.");
      const scenarioFolder = [
        environment,
        "scenarios",
        ...scenario.file.replace(/\.feature$/i, "").split("/"),
        scenario.id,
      ];
      const stableFolder = await client.findEvidenceFolder(scenarioFolder);
      const runFolder = latest.runId ? await client.findEvidenceFolder([...scenarioFolder, latest.runId]) : null;
      const folder = stableFolder === expectedFolder ? stableFolder : runFolder;
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
        .filter((file) => !exampleNames.size || exampleNames.has(file.name))
        .map((file) => ({
          ...file,
          ...(exampleNames.has(file.name) ? { exampleTitle: exampleNames.get(file.name) } : {}),
        }));
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

function mimeTypeForEvidenceName(name) {
  const extension = name.split(".").at(-1)?.toLowerCase();
  return (
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      mp4: "video/mp4",
      webm: "video/webm",
      zip: "application/zip",
      json: "application/json",
      txt: "text/plain",
      log: "text/plain",
      bin: "application/octet-stream",
    }[extension] || "application/octet-stream"
  );
}
