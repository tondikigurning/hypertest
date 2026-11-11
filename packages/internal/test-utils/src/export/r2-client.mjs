import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const envFile = resolve(repoRoot, ".env.local");
const requiredNames = [
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_BUCKET",
];

export function resolveR2Config() {
  const fileValues = existsSync(envFile) ? dotenv.parse(readFileSync(envFile)) : {};
  const values = { ...fileValues, ...process.env };
  const present = requiredNames.filter((name) => values[name]?.trim());
  if (!present.length) return { status: "missing" };
  const missing = requiredNames.filter((name) => !values[name]?.trim());
  if (missing.length) {
    return { status: "invalid", error: `Incomplete Cloudflare R2 configuration: ${missing.join(", ")}.` };
  }

  const accountId = values.CLOUDFLARE_R2_ACCOUNT_ID.trim();
  const endpoint = values.CLOUDFLARE_R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`;
  let parsedEndpoint;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    return { status: "invalid", error: "CLOUDFLARE_R2_ENDPOINT must be a valid URL." };
  }
  if (parsedEndpoint.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsedEndpoint.hostname)) {
    return { status: "invalid", error: "CLOUDFLARE_R2_ENDPOINT must use HTTPS." };
  }

  return {
    status: "configured",
    config: {
      accountId,
      accessKeyId: values.CLOUDFLARE_R2_ACCESS_KEY_ID.trim(),
      secretAccessKey: values.CLOUDFLARE_R2_SECRET_ACCESS_KEY.trim(),
      bucket: values.CLOUDFLARE_R2_BUCKET.trim(),
      endpoint,
    },
  };
}

export function r2EvidencePrefix(environment, app, relativeFeaturePath, scenarioId) {
  const segments = [environment, app, ...relativeFeaturePath.split("/"), scenarioId, "latest"];
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Invalid evidence path.");
  }
  return `E2E Evidence/${segments.map((segment) => encodeURIComponent(segment)).join("/")}/`;
}

export function r2EvidenceLocation(bucket, prefix) {
  return `r2://${bucket}/${prefix}`;
}

export function parseR2EvidenceLocation(location) {
  let parsed;
  try {
    parsed = new URL(location);
  } catch {
    return null;
  }
  if (parsed.protocol !== "r2:" || !parsed.hostname || !parsed.pathname.startsWith("/")) return null;
  const prefix = parsed.pathname.slice(1);
  return prefix.endsWith("/") ? { bucket: parsed.hostname, prefix } : null;
}

export function createR2Storage(configResult = resolveR2Config()) {
  if (configResult.status === "missing") return null;
  if (configResult.status !== "configured") throw new Error(configResult.error);

  const { config } = configResult;
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });

  return {
    bucket: config.bucket,
    async list(prefix) {
      const contents = [];
      let continuationToken;
      do {
        const response = await client.send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        contents.push(...(response.Contents ?? []));
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);
      return contents.filter((item) => item.Key);
    },
    async put({ key, body, contentType, runId, scenarioId, environment }) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          Metadata: { "run-id": runId, "scenario-id": scenarioId, environment },
        }),
      );
    },
    async remove(keys) {
      for (let offset = 0; offset < keys.length; offset += 1000) {
        const batch = keys.slice(offset, offset + 1000);
        if (!batch.length) continue;
        const response = await client.send(
          new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
          }),
        );
        if (response.Errors?.length) throw new Error("Some previous R2 evidence files could not be replaced.");
      }
    },
    async signDownload(key, downloadName) {
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ...(downloadName ? { ResponseContentDisposition: `attachment; filename="${downloadName}"` } : {}),
        }),
        { expiresIn: 300 },
      );
    },
    close() {
      client.destroy();
    },
  };
}
