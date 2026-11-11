/* eslint-disable no-console */
/** biome-ignore-all lint/suspicious/noConsole: CLI status and error output */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { GoogleAuth } from "google-auth-library";
import { bddFeatureTargetFromFile } from "../playwright/feature-paths";
import type { ScenarioResult } from "../schema/types";
import { loadEnvLocal } from "./env";
import { createR2Storage, r2EvidenceLocation, r2EvidencePrefix, resolveR2Config } from "./r2-client.mjs";
import { resolveGoogleDrivePushConfig } from "./resolve-credentials";

// Upload is explicit unless the BDD runner invokes this with --auto.
async function main() {
  const root = process.cwd();
  loadEnvLocal(root);
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf("--results");
  const scenarioIndex = args.indexOf("--scenario-id");
  const environmentIndex = args.indexOf("--environment");
  const runIndex = args.indexOf("--run-id");
  const runId = runIndex >= 0 ? args[runIndex + 1] : undefined;
  if (runIndex >= 0 && (!runId || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(runId)))
    throw new Error("--run-id requires a UUID");
  const environment = environmentIndex >= 0 ? args[environmentIndex + 1] : undefined;
  if (environmentIndex >= 0 && (!environment || !/^[a-z0-9-]+$/.test(environment)))
    throw new Error("--environment requires a lowercase environment ID");
  const resultsPath = path.resolve(
    root,
    fileIndex >= 0 ? args[fileIndex + 1] : "temp/test-results/tenants/bdd.results.json",
  );
  const results = JSON.parse(fs.readFileSync(resultsPath, "utf8")) as Array<ScenarioResult>;
  const scenarioId = scenarioIndex >= 0 ? args[scenarioIndex + 1] : undefined;
  const automatic = args.includes("--auto");
  if (scenarioIndex >= 0 && !scenarioId) throw new Error("--scenario-id requires a scenario ID");
  const selected = results.filter(
    (
      r,
    ): r is ScenarioResult & {
      executedAt: string;
      evidenceAttachments: NonNullable<ScenarioResult["evidenceAttachments"]>;
    } =>
      r.runner === "playwright" &&
      (!scenarioId || r.meta.id === scenarioId) &&
      Boolean(r.executedAt && r.evidenceAttachments?.length),
  );
  if (scenarioId && !selected.length)
    throw new Error(`No executed BDD result with attachments found for ${scenarioId} in ${resultsPath}`);
  if (!selected.length) {
    console.log("No evidence attachments found; nothing to upload.");
    return;
  }
  for (const r of selected)
    for (const a of r.evidenceAttachments) {
      if (!fs.existsSync(a.path)) throw new Error(`Attachment no longer exists: ${a.path}`);
    }
  console.log(
    `Evidence plan: ${selected.length} scenarios, ${selected.reduce((n, r) => n + r.evidenceAttachments.length, 0)} files`,
  );
  if (!args.includes("--push")) {
    console.log("Preview only. Pass --push to upload.");
    return;
  }
  const r2Config = resolveR2Config();
  if (r2Config.status === "invalid") throw new Error(r2Config.error);
  if (r2Config.status === "configured") {
    await uploadR2Evidence(selected, results, resultsPath, environment, runId, r2Config);
    return;
  }
  const config = resolveGoogleDrivePushConfig();
  if (!config.ok) {
    if (
      automatic &&
      (config.error.startsWith("Missing GOOGLE_DRIVE_FOLDER_ID") || config.error.startsWith("Missing credentials"))
    ) {
      console.warn(`[evidence] Automatic upload skipped: ${config.error}`);
      return;
    }
    throw new Error(config.error);
  }
  const auth = new GoogleAuth({
    credentials: config.config.credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const client = await auth.getClient();
  const access = await client.getAccessToken();
  const token = typeof access === "string" ? access : access?.token;
  if (!token) throw new Error("Unable to obtain Google access token");
  const headers = { Authorization: `Bearer ${token}` };
  const api = "https://www.googleapis.com/drive/v3/files";
  async function find(parent: string, name: string): Promise<{ id: string; mimeType: string } | undefined> {
    const q = `'${parent.replaceAll("'", "\\'")}' in parents and name = '${name.replaceAll("'", "\\'")}' and trashed = false`;
    const params = new URLSearchParams({
      q,
      fields: "files(id,name,mimeType)",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      pageSize: "100",
    });
    const res = await fetch(`${api}?${params}`, { headers });
    if (!res.ok) throw new Error(`Drive list failed (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as { files: Array<{ id: string; mimeType: string }> };
    if (data.files.length > 1)
      throw new Error(`Multiple Drive items named ${name}; resolve duplicates before retrying.`);
    return data.files[0];
  }
  async function listChildren(
    parent: string,
  ): Promise<Array<{ id: string; name: string; mimeType: string; capabilities?: { canTrash?: boolean } }>> {
    const files: Array<{ id: string; name: string; mimeType: string; capabilities?: { canTrash?: boolean } }> = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q: `'${parent.replaceAll("'", "\\'")}' in parents and trashed = false`,
        fields: "nextPageToken,files(id,name,mimeType,capabilities(canTrash))",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
        pageSize: "100",
        ...(pageToken ? { pageToken } : {}),
      });
      const res = await fetch(`${api}?${params}`, { headers });
      if (!res.ok) throw new Error(`Drive list children failed (${res.status}): ${await res.text()}`);
      const data = (await res.json()) as { files?: typeof files; nextPageToken?: string };
      files.push(...(data.files ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);
    return files;
  }
  async function folder(parent: string, name: string): Promise<string> {
    const found = await find(parent, name);
    if (found) {
      if (found.mimeType !== "application/vnd.google-apps.folder")
        throw new Error(`Drive item ${name} is not a folder.`);
      return found.id;
    }
    const res = await fetch(`${api}?supportsAllDrives=true`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ name, parents: [parent], mimeType: "application/vnd.google-apps.folder" }),
    });
    if (!res.ok) throw new Error(`Drive folder create failed (${res.status}): ${await res.text()}`);
    return ((await res.json()) as { id: string }).id;
  }
  const folderCache = new Map<string, string>();
  async function cachedFolder(parent: string, name: string): Promise<string> {
    const key = `${parent}/${name}`;
    const cached = folderCache.get(key);
    if (cached) return cached;
    const id = await folder(parent, name);
    folderCache.set(key, id);
    return id;
  }

  let evidenceRoot = await cachedFolder(config.config.parentFolderId, "E2E Evidence");
  if (environment) evidenceRoot = await cachedFolder(evidenceRoot, environment);
  for (const result of selected) {
    const target = bddFeatureTargetFromFile(result.file);
    if (!target) throw new Error(`Unsupported feature path: ${result.file}`);
    let parent = evidenceRoot;
    for (const segment of [target.app, ...target.relPath.split("/")]) parent = await cachedFolder(parent, segment);
    const scenarioRoot = await cachedFolder(parent, result.meta.id);
    const scenarioFolder = scenarioRoot;
    const timestamp = e2eTimestamp(new Date(result.executedAt));
    const currentAttachments = result.evidenceAttachments.map((attachment, index) => {
      const data = fs.readFileSync(attachment.path);
      const extension = path.extname(attachment.path) || extensionForContentType(attachment.contentType);
      const name = `${result.meta.id}_${timestamp}_${index + 1}${extension}`;
      const legacyHash = createHash("sha256").update(data).digest("hex").slice(0, 16);
      const legacyName = `${result.executedAt.replace(/[^0-9]/g, "")}-${legacyHash}-${path.basename(attachment.path)}`;
      return { attachment, data, name, legacyName };
    });
    const targetNames = new Set(currentAttachments.map((file) => file.name));
    if (targetNames.size !== currentAttachments.length) {
      throw new Error(
        `${result.meta.id} produced multiple attachments with the same extension; the requested filename format cannot distinguish them.`,
      );
    }
    const scenarioFiles = await listChildren(scenarioFolder);
    const previousFiles = scenarioFiles.filter(
      (file) =>
        file.mimeType !== "application/vnd.google-apps.folder" &&
        isScenarioEvidenceName(file.name, result.meta.id) &&
        !targetNames.has(file.name) &&
        !currentAttachments.some((current) => current.legacyName === file.name),
    );
    const cannotTrash = previousFiles.find((file) => !file.capabilities?.canTrash);
    if (cannotTrash) {
      throw new Error(
        `Cannot replace old evidence ${cannotTrash.name}: the service account lacks permission to move it to Drive trash.`,
      );
    }
    for (const { attachment, data, name, legacyName } of currentAttachments) {
      const existingFile = scenarioFiles.find((file) => file.name === name || file.name === legacyName);
      const boundary = `evidence_${result.meta.id}_${timestamp}`;
      const metadata = existingFile ? { name } : { name, parents: [scenarioFolder] };
      const body = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${attachment.contentType}\r\n\r\n`,
        ),
        data,
        Buffer.from(`\r\n--${boundary}--`),
      ]);
      const endpoint = existingFile
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart&supportsAllDrives=true`
        : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true";
      const res = await fetch(endpoint, {
        method: existingFile ? "PATCH" : "POST",
        headers: { ...headers, "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      });
      if (!res.ok) throw new Error(`Evidence upload failed (${res.status}): ${await res.text()}`);
    }
    for (const oldFile of previousFiles) {
      const res = await fetch(`${api}/${oldFile.id}?supportsAllDrives=true`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ trashed: true }),
      });
      if (!res.ok)
        throw new Error(
          `Could not move old evidence ${oldFile.name} to Drive trash (${res.status}): ${await res.text()}`,
        );
    }
    if (previousFiles.length > 0) {
      console.log(`[evidence] Moved ${previousFiles.length} older file(s) to Drive trash for ${result.meta.id}.`);
    }
    for (const example of result.examples ?? []) {
      example.evidenceNames = currentAttachments
        .filter((file) => file.attachment.exampleId === example.id)
        .map((file) => file.name);
    }
    result.evidenceUrl = `https://drive.google.com/drive/folders/${scenarioFolder}`;
  }
  // Persist links only after every selected upload succeeds.
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`Uploaded evidence for ${selected.length} scenarios.`);
}

async function uploadR2Evidence(
  selected: Array<
    ScenarioResult & { executedAt: string; evidenceAttachments: NonNullable<ScenarioResult["evidenceAttachments"]> }
  >,
  results: Array<ScenarioResult>,
  resultsPath: string,
  environment: string | undefined,
  runId: string | undefined,
  config: Exclude<ReturnType<typeof resolveR2Config>, { status: "missing" | "invalid" }>,
): Promise<void> {
  if (!environment || !runId) throw new Error("R2 evidence uploads require --environment and --run-id.");
  const storage = createR2Storage(config);
  if (!storage) throw new Error("Cloudflare R2 is not configured.");
  try {
    for (const result of selected) {
      const target = bddFeatureTargetFromFile(result.file);
      if (!target) throw new Error(`Unsupported feature path: ${result.file}`);
      const prefix = r2EvidencePrefix(environment, target.app, target.relPath, result.meta.id);
      const existing = await storage.list(prefix);
      const currentAttachments = result.evidenceAttachments.map((attachment, index) => {
        const data = fs.readFileSync(attachment.path);
        const extension = path.extname(attachment.path) || extensionForContentType(attachment.contentType);
        const name = `attachment-${String(index + 1).padStart(3, "0")}${extension}`;
        return { attachment, data, name, key: `${prefix}${name}` };
      });
      const targetKeys = new Set(currentAttachments.map((attachment) => attachment.key));
      for (const { attachment, data, key } of currentAttachments) {
        await storage.put({
          key,
          body: data,
          contentType: attachment.contentType,
          runId,
          scenarioId: result.meta.id,
          environment,
        });
      }
      const staleKeys = existing
        .map((item) => item.Key)
        .filter((key): key is string => Boolean(key && !targetKeys.has(key)));
      await storage.remove(staleKeys);
      for (const example of result.examples ?? []) {
        example.evidenceNames = currentAttachments
          .filter((attachment) => attachment.attachment.exampleId === example.id)
          .map((attachment) => attachment.name);
      }
      result.evidenceUrl = r2EvidenceLocation(storage.bucket, prefix);
    }
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`Uploaded latest evidence for ${selected.length} scenarios to Cloudflare R2.`);
  } finally {
    storage.close();
  }
}

// Keep in sync with e2e/tests/bdd/utils/e2e-test-data.ts (local DDMMYYYYHHmm).
function e2eTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    pad(date.getDate()),
    pad(date.getMonth() + 1),
    date.getFullYear(),
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
}

function extensionForContentType(contentType: string): string {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "video/webm") return ".webm";
  if (contentType === "video/mp4") return ".mp4";
  if (contentType === "application/zip") return ".zip";
  if (contentType === "application/json") return ".json";
  if (contentType.startsWith("text/")) return ".txt";
  return ".bin";
}

function isScenarioEvidenceName(name: string, scenarioId: string): boolean {
  const escapedId = scenarioId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    new RegExp(`^${escapedId}_\\d{12}(?:_\\d+)?\\.[a-z0-9]+$`, "i").test(name) ||
    /^\d{17}-[a-f0-9]{16}-.+\.[a-z0-9]+$/i.test(name)
  );
}

main().catch((error: Error) => {
  console.error(`Evidence export failed: ${error.message}`);
  process.exitCode = 1;
});
