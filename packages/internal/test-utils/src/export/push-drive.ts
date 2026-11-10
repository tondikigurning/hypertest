import { parentFoldersOf, spreadsheetNameFromRelativePath } from "./report-paths";
import type { GoogleDrivePushConfig, ServiceAccountCredentials } from "./resolve-credentials";
import { buildStylingRequests, cleanAnsiCodes } from "./sheets-requests";
import type { GoogleExportPayload, GoogleSheetTab } from "./types";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPES = ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/spreadsheets"];

export type { GoogleDrivePushConfig };

export interface DriveMirrorPlan {
  reportFolder: string;
  spreadsheetTitle: string;
  folders: Array<string>;
  files: Array<{ relativePath: string; spreadsheetName: string; rowCount: number }>;
}

export interface DrivePushResult {
  reportFolderId: string;
  reportFolderUrl: string;
  reportFolder: string;
  createdFolders: Array<string>;
  files: Array<{ relativePath: string; spreadsheetId: string; spreadsheetUrl: string }>;
}

export interface PushDriveOptions {
  /** Override fetch (tests). */
  fetchFn?: typeof fetch;
  /** Override token minting (tests) — skips google-auth-library. */
  getAccessToken?: (credentials: ServiceAccountCredentials) => Promise<string>;
}

/** Build the folder/file plan mirrors `testing-docs/reports/<tag>/`. */
export function buildDriveMirrorPlan(payload: GoogleExportPayload): DriveMirrorPlan {
  const folderSet = new Set<string>();
  for (const sheet of payload.sheets) {
    for (const folder of parentFoldersOf(sheet.relativePath)) {
      folderSet.add(folder);
    }
  }
  return {
    reportFolder: payload.reportFolder,
    spreadsheetTitle: payload.spreadsheetTitle,
    folders: [...folderSet].sort((a, b) => a.localeCompare(b) || a.length - b.length),
    files: payload.sheets.map((sheet) => ({
      relativePath: sheet.relativePath,
      spreadsheetName: spreadsheetNameFromRelativePath(sheet.relativePath),
      rowCount: sheet.values.length,
    })),
  };
}

/**
 * Creates `<parent>/<reportFolder>/…` on Drive (same layout as the dated report),
 * and one Spreadsheet per leaf `.md` path with that file's table values.
 */
export async function pushGoogleExportToDrive(
  payload: GoogleExportPayload,
  config: GoogleDrivePushConfig,
  options: PushDriveOptions = {},
): Promise<DrivePushResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const token = options.getAccessToken
    ? await options.getAccessToken(config.credentials)
    : await mintAccessToken(config.credentials, SCOPES);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const plan = buildDriveMirrorPlan(payload);
  const createdFolders: Array<string> = [];
  const folderIds = new Map<string, string>();

  const reportFolderId = await createFolder(fetchFn, headers, payload.reportFolder, config.parentFolderId);
  createdFolders.push(payload.reportFolder);
  folderIds.set("", reportFolderId);

  for (const folderPath of plan.folders) {
    const parentPath = folderPath.includes("/") ? folderPath.slice(0, folderPath.lastIndexOf("/")) : "";
    const parentId = folderIds.get(parentPath);
    if (!parentId) {
      throw new Error(`Missing parent folder id for ${folderPath}`);
    }
    const name = folderPath.split("/").pop();
    if (!name) {
      throw new Error(`Invalid folder path: ${folderPath}`);
    }
    const id = await createFolder(fetchFn, headers, name, parentId);
    folderIds.set(folderPath, id);
    createdFolders.push(folderPath);
  }

  const files: DrivePushResult["files"] = [];
  for (const sheet of payload.sheets) {
    const parentPath = sheet.relativePath.includes("/")
      ? sheet.relativePath.slice(0, sheet.relativePath.lastIndexOf("/"))
      : "";
    const parentId = folderIds.get(parentPath);
    if (!parentId) {
      throw new Error(`Missing parent folder for ${sheet.relativePath}`);
    }
    const name = spreadsheetNameFromRelativePath(sheet.relativePath);
    const spreadsheetId = await createSpreadsheetInFolder(fetchFn, headers, name, parentId);
    await writeSheetValues(fetchFn, headers, spreadsheetId, sheet);
    files.push({
      relativePath: sheet.relativePath,
      spreadsheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    });
  }

  return {
    reportFolderId,
    reportFolderUrl: `https://drive.google.com/drive/folders/${reportFolderId}`,
    reportFolder: payload.reportFolder,
    createdFolders,
    files,
  };
}

async function createFolder(
  fetchFn: typeof fetch,
  headers: Record<string, string>,
  name: string,
  parentId: string,
): Promise<string> {
  const res = await fetchFn(`${DRIVE_API}/files?supportsAllDrives=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!res.ok) {
    throw new Error(`Drive create folder "${name}" failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error(`Drive create folder "${name}" returned no id`);
  return json.id;
}

async function createSpreadsheetInFolder(
  fetchFn: typeof fetch,
  headers: Record<string, string>,
  name: string,
  parentId: string,
): Promise<string> {
  const res = await fetchFn(`${DRIVE_API}/files?supportsAllDrives=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [parentId],
    }),
  });
  if (!res.ok) {
    throw new Error(`Drive create spreadsheet "${name}" failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error(`Drive create spreadsheet "${name}" returned no id`);
  return json.id;
}

async function writeSheetValues(
  fetchFn: typeof fetch,
  headers: Record<string, string>,
  spreadsheetId: string,
  sheet: GoogleSheetTab,
): Promise<void> {
  // Rename the default tab to the leaf stem for clarity.
  const meta = await sheetsGet(fetchFn, `${SHEETS_API}/${spreadsheetId}?fields=sheets.properties`, headers);
  const firstSheetId = meta.sheets?.[0]?.properties?.sheetId;
  const tabTitle = spreadsheetNameFromRelativePath(sheet.relativePath).slice(0, 100);
  if (typeof firstSheetId === "number") {
    await sheetsPost(fetchFn, `${SHEETS_API}/${spreadsheetId}:batchUpdate`, headers, {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: firstSheetId, title: tabTitle },
            fields: "title",
          },
        },
      ],
    });
  }

  await sheetsPost(fetchFn, `${SHEETS_API}/${spreadsheetId}/values:batchClear`, headers, {
    ranges: [`'${tabTitle.replaceAll("'", "''")}'!A1:ZZ50000`],
  });

  // Clean raw terminal ANSI escape/color codes from values before writing
  const cleanedValues = sheet.values.map((row) => row.map((cell) => cleanAnsiCodes(cell)));

  await sheetsPost(fetchFn, `${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, headers, {
    valueInputOption: "RAW",
    data: [
      {
        range: `'${tabTitle.replaceAll("'", "''")}'!A1`,
        values: cleanedValues,
      },
    ],
  });

  // Apply visual layout enhancements (freeze headers, alternating rows, text wrapping)
  if (typeof firstSheetId === "number") {
    const formattingRequests = buildStylingRequests([{ sheetId: firstSheetId, tab: sheet }]);
    await sheetsPost(fetchFn, `${SHEETS_API}/${spreadsheetId}:batchUpdate`, headers, {
      requests: formattingRequests,
    });
  }
}

async function mintAccessToken(credentials: ServiceAccountCredentials, scopes: Array<string>): Promise<string> {
  let GoogleAuth: typeof import("google-auth-library").GoogleAuth;
  try {
    ({ GoogleAuth } = await import("google-auth-library"));
  } catch {
    throw new Error("google-auth-library is required for Drive push. Run: pnpm add -wD google-auth-library");
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
      project_id: credentials.project_id,
    },
    scopes,
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;
  if (!token) throw new Error("Failed to obtain Google access token from the service account.");
  return token;
}

async function sheetsGet(
  fetchFn: typeof fetch,
  url: string,
  headers: Record<string, string>,
): Promise<{ sheets?: Array<{ properties?: { sheetId?: number; title?: string } }> }> {
  const res = await fetchFn(url, { headers });
  if (!res.ok) throw new Error(`Sheets GET failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as { sheets?: Array<{ properties?: { sheetId?: number; title?: string } }> };
}

async function sheetsPost(
  fetchFn: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetchFn(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Sheets POST failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as Record<string, unknown>;
}
