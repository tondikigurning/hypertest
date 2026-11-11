import { createReadStream, realpathSync, statSync } from "node:fs";
import { open } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { isAllowedWebHost } from "../../shared/local-request.mjs";
import { automationCatalog, scenarioCatalog } from "../catalog/scenario-catalog.mjs";
import { resultStore } from "../results/result-store.mjs";
import { createLocalRunService } from "./local-run-service.mjs";
import { resolveSelection } from "./run-selection.mjs";

const e2eWorkspace = resolve(import.meta.dirname, "../../../e2e");
const service = createLocalRunService({ resultStore });
const variables = [
  { name: "E2E_USERNAME", label: "E2E username", secret: false },
  { name: "E2E_PASSWORD", label: "E2E password", secret: true },
];

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(value));
}

export function resolveAgentEnvironment(id) {
  const selected = service.environments.find((item) => item.id === id);
  if (!selected) throw new Error("Select a valid environment.");
  const url = new URL(selected.target);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("The selected environment URL is invalid.");
  return { label: selected.label, target: url.href };
}

export function getRunConfig(_req, res) {
  return json(res, 200, {
    target: service.target,
    environments: service.environments,
    defaultEnvironment: service.defaultEnvironment,
    variables,
  });
}

export function getRun(_req, res) {
  return json(res, 200, service.publicRun());
}

export function getCurrentRunSnapshot() {
  return service.publicRun();
}

export function cancelRun(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (req.headers.origin !== `http://${req.headers.host}`) return json(res, 403, { error: "Local requests only." });
  if (!service.active() || !service.matches(url.searchParams.get("run")))
    return json(res, 409, { error: "This run is no longer active." });
  if (service.publicRun().stage === "uploading evidence")
    return json(res, 409, { error: "The scenarios have finished; evidence upload cannot be cancelled." });
  return json(res, 202, service.cancel());
}

export function getLiveFrame(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (!service.active() || !service.matches(url.searchParams.get("run")))
    return json(res, 404, { error: "Not found." });
  const frame = service.framePath();
  return sendLiveFrame(frame, req, res);
}

/** Read metadata and bytes from the same open frame while the producer replaces it. */
export async function sendLiveFrame(frame, req, res) {
  let file;
  try {
    file = await open(frame, "r");
    const metadata = await file.stat();
    const etag = `"${metadata.mtimeMs}-${metadata.size}"`;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("ETag", etag);
    if (req.headers["if-none-match"] === etag) {
      res.statusCode = 304;
      return res.end();
    }
    const data = await file.readFile();
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.end(data);
  } catch {
    res.statusCode = 204;
    return res.end();
  } finally {
    await file?.close();
  }
}

export function startRun(req, res) {
  if (req.headers.origin !== `http://${req.headers.host}` || !isAllowedWebHost(req.headers.host))
    return json(res, 403, { error: "Local requests only." });
  if (service.active()) return json(res, 409, { error: "A run is already in progress." });
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 16384) req.destroy();
  });
  req.on("end", () => {
    // Another request may have started a run while this body was being read.
    if (service.active()) return json(res, 409, { error: "A run is already in progress." });
    let input;
    try {
      input = JSON.parse(body);
    } catch {
      return json(res, 400, { error: "Invalid request." });
    }
    const values = input?.variables;
    if (
      !values ||
      typeof values !== "object" ||
      variables.some(({ name }) => typeof values[name] !== "string" || !values[name].trim())
    )
      return json(res, 400, { error: "Set all environment variables before running a scenario." });
    const environment = Object.fromEntries(variables.map(({ name }) => [name, values[name]]));
    const target = service.environments.find((item) => item.id === input.environment)?.target;
    if (!target) return json(res, 400, { error: "Select a valid environment." });
    let resolved;
    try {
      const root = join(e2eWorkspace, "tests/bdd/features");
      resolved = resolveSelection(input.selection || input, scenarioCatalog(root), automationCatalog(root));
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
    return json(res, 202, service.start(resolved, environment, target));
  });
  return;
}

export function getRunEvidence(req, res) {
  return sendRunEvidence(service, req, res);
}

export function sendRunEvidence(service, req, res) {
  const url = new URL(req.url, "http://localhost");
  if (!service.matches(url.searchParams.get("run"))) return json(res, 404, { error: "Not found." });
  const rawIndex = url.searchParams.get("index");
  const index = rawIndex !== null && /^\d+$/.test(rawIndex) ? Number(rawIndex) : NaN;
  const attachment =
    Number.isInteger(index) && index >= 0 ? service.attachment(url.searchParams.get("test"), index) : undefined;
  try {
    const file = attachment && realpathSync(attachment.path);
    const rel = file && relative(realpathSync(service.outputPath()), file);
    if (!file || !rel || rel.startsWith("..") || isAbsolute(rel) || !/^(image|video)\//.test(attachment.contentType))
      throw new Error();
    res.setHeader("Content-Type", attachment.contentType);
    res.setHeader("Cache-Control", "no-store");
    const size = statSync(file).size;
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (req.headers.range && !range) {
      res.statusCode = 416;
      res.setHeader("Content-Range", `bytes */${size}`);
      return res.end();
    }
    if (range) {
      const start = Number(range[1]),
        end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start >= size || end < start) {
        res.statusCode = 416;
        res.setHeader("Content-Range", `bytes */${size}`);
        return res.end();
      }
      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      res.setHeader("Content-Length", end - start + 1);
      res.setHeader("Accept-Ranges", "bytes");
      return createReadStream(file, { start, end })
        .on("error", () => res.destroy())
        .pipe(res);
    }
    res.setHeader("Content-Length", size);
    res.setHeader("Accept-Ranges", "bytes");
    return createReadStream(file)
      .on("error", () => res.destroy())
      .pipe(res);
  } catch {
    return json(res, 404, { error: "Evidence unavailable." });
  }
}
