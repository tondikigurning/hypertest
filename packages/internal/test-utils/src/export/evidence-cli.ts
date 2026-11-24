/* eslint-disable no-console */
/** biome-ignore-all lint/suspicious/noConsole: CLI status and error output */

import fs from "node:fs";
import path from "node:path";
import { bddFeatureTargetFromFile } from "../playwright/feature-paths";
import type { ScenarioResult } from "../schema/types";
import { loadEnvLocal } from "./env";
import { createR2Storage, r2EvidenceLocation, r2EvidencePrefix, resolveR2Config } from "./r2-client.mjs";

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
      result,
    ): result is ScenarioResult & {
      executedAt: string;
      evidenceAttachments: NonNullable<ScenarioResult["evidenceAttachments"]>;
    } =>
      result.runner === "playwright" &&
      (!scenarioId || result.meta.id === scenarioId) &&
      Boolean(result.executedAt && result.evidenceAttachments?.length),
  );
  if (scenarioId && !selected.length)
    throw new Error(`No executed BDD result with attachments found for ${scenarioId} in ${resultsPath}`);
  if (!selected.length) {
    console.log("No evidence attachments found; nothing to upload.");
    return;
  }
  for (const result of selected)
    for (const attachment of result.evidenceAttachments) {
      if (!fs.existsSync(attachment.path)) throw new Error(`Attachment no longer exists: ${attachment.path}`);
    }
  console.log(
    `Evidence plan: ${selected.length} scenarios, ${selected.reduce((count, result) => count + result.evidenceAttachments.length, 0)} files`,
  );
  if (!args.includes("--push")) {
    console.log("Preview only. Pass --push to upload.");
    return;
  }

  const config = resolveR2Config();
  if (config.status === "invalid") throw new Error(config.error);
  if (config.status === "missing") {
    if (automatic) {
      console.warn("[evidence] Automatic upload skipped: Cloudflare R2 is not configured.");
      return;
    }
    throw new Error("Cloudflare R2 is not configured.");
  }
  await uploadR2Evidence(selected, results, resultsPath, environment, runId, config);
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

main().catch((error: Error) => {
  console.error(`Evidence export failed: ${error.message}`);
  process.exitCode = 1;
});
