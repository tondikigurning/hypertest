import fs from "node:fs";
import path from "node:path";

/** Subset of a Google service-account JSON key used for Sheets/Drive push. */
export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

/** Legacy single-spreadsheet push (flat tabs). */
export interface GoogleSheetsPushConfig {
  spreadsheetId: string;
  credentials: ServiceAccountCredentials;
  credentialsPath?: string;
}

/** Drive folder-mirror push — one Spreadsheet per report `.md` leaf. */
export interface GoogleDrivePushConfig {
  parentFolderId: string;
  credentials: ServiceAccountCredentials;
  credentialsPath?: string;
}

export type ResolveSheetsPushConfigResult = { ok: true; config: GoogleSheetsPushConfig } | { ok: false; error: string };

export type ResolveDrivePushConfigResult = { ok: true; config: GoogleDrivePushConfig } | { ok: false; error: string };

/**
 * Drive mirror push (default `--push`).
 *
 * Required env:
 * - `GOOGLE_DRIVE_FOLDER_ID` — parent folder id **or** full Drive folder URL
 * - `GOOGLE_SERVICE_ACCOUNT_FILE` **or** `GOOGLE_SERVICE_ACCOUNT_JSON`
 */
export function resolveGoogleDrivePushConfig(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): ResolveDrivePushConfigResult {
  const rawFolder = env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!rawFolder) {
    return {
      ok: false,
      error: "Missing GOOGLE_DRIVE_FOLDER_ID.",
    };
  }

  const parentFolderId = normalizeGoogleDriveFolderId(rawFolder);
  if (!parentFolderId) {
    return {
      ok: false,
      error: "Invalid GOOGLE_DRIVE_FOLDER_ID. Expected an id like 1abc… or a URL …/folders/1abc…",
    };
  }

  const credentialsResult = loadCredentials(env, cwd);
  if (!credentialsResult.ok) return credentialsResult;

  return {
    ok: true,
    config: {
      parentFolderId,
      credentials: credentialsResult.credentials,
      credentialsPath: credentialsResult.credentialsPath,
    },
  };
}

export function normalizeGoogleDriveFolderId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const fromUrl = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1];
  if (fromUrl) return fromUrl;

  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;

  return null;
}

export function resolveGoogleSheetsPushConfig(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): ResolveSheetsPushConfigResult {
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  if (!spreadsheetId) {
    return {
      ok: false,
      error: "Missing GOOGLE_SHEETS_SPREADSHEET_ID.",
    };
  }

  const credentialsResult = loadCredentials(env, cwd);
  if (!credentialsResult.ok) return credentialsResult;

  return {
    ok: true,
    config: {
      spreadsheetId,
      credentials: credentialsResult.credentials,
      credentialsPath: credentialsResult.credentialsPath,
    },
  };
}

function loadCredentials(
  env: NodeJS.ProcessEnv,
  cwd: string,
): { ok: true; credentials: ServiceAccountCredentials; credentialsPath?: string } | { ok: false; error: string } {
  const inline = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  const fileRef = env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim();

  if (!inline && !fileRef) {
    return {
      ok: false,
      error: "Missing credentials. Set GOOGLE_SERVICE_ACCOUNT_FILE (path) or GOOGLE_SERVICE_ACCOUNT_JSON (CI secret).",
    };
  }

  if (inline && fileRef) {
    return {
      ok: false,
      error: "Set only one of GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_SERVICE_ACCOUNT_JSON, not both.",
    };
  }

  let raw: string;
  let credentialsPath: string | undefined;

  if (inline) {
    raw = inline;
  } else if (fileRef) {
    credentialsPath = path.isAbsolute(fileRef) ? fileRef : path.resolve(cwd, fileRef);
    if (!fs.existsSync(credentialsPath)) {
      return { ok: false, error: `Service account file not found: ${credentialsPath}` };
    }
    raw = fs.readFileSync(credentialsPath, "utf8");
  } else {
    return {
      ok: false,
      error: "Missing credentials.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Service account JSON is not valid JSON." };
  }

  const credentials = validateServiceAccountCredentials(parsed);
  if (!credentials) {
    return {
      ok: false,
      error: "Service account JSON must include client_email and private_key.",
    };
  }

  return { ok: true, credentials, credentialsPath };
}

export function validateServiceAccountCredentials(value: unknown): ServiceAccountCredentials | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.client_email !== "string" || !record.client_email.includes("@")) return null;
  if (typeof record.private_key !== "string" || !record.private_key.includes("PRIVATE KEY")) return null;
  return {
    client_email: record.client_email,
    private_key: record.private_key,
    project_id: typeof record.project_id === "string" ? record.project_id : undefined,
  };
}
