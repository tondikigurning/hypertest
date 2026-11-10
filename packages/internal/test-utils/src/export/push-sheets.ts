import type { GoogleSheetsPushConfig, ServiceAccountCredentials } from "./resolve-credentials";
import {
  buildAddSheetRequests,
  buildClearRanges,
  buildPushPlan,
  buildStylingRequests,
  buildValuesBatchUpdateBody,
  missingSheetTitles,
  requiredSheetTitles,
} from "./sheets-requests";
import type { GoogleExportPayload, GoogleSheetTab } from "./types";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export interface PushGoogleExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetsCreated: Array<string>;
  tabsWritten: Array<string>;
  updatedCells?: number;
}

export interface PushGoogleExportOptions {
  fetchFn?: typeof fetch;
  getAccessToken?: (credentials: ServiceAccountCredentials) => Promise<string>;
}

interface SheetMetadata {
  sheets?: Array<{
    properties?: {
      title?: string;
      sheetId?: number;
    };
  }>;
}

/**
 * Pushes a Google-ready export payload into an existing spreadsheet.
 * Flow: ensure tabs → clear prior values → values.batchUpdate → apply styling.
 */
export async function pushGoogleExportToSheets(
  payload: GoogleExportPayload,
  config: GoogleSheetsPushConfig,
  options: PushGoogleExportOptions = {},
): Promise<PushGoogleExportResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const token = options.getAccessToken
    ? await options.getAccessToken(config.credentials)
    : await mintAccessToken(config.credentials);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const meta = await sheetsGet(
    fetchFn,
    `${SHEETS_API}/${config.spreadsheetId}?fields=sheets.properties.title`,
    headers,
  );
  const existingTitles = (meta.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => typeof t === "string");

  const required = requiredSheetTitles(payload);
  const toCreate = missingSheetTitles(required, existingTitles);
  if (toCreate.length > 0) {
    await sheetsPost(fetchFn, `${SHEETS_API}/${config.spreadsheetId}:batchUpdate`, headers, {
      requests: buildAddSheetRequests(toCreate),
    });
  }

  await sheetsPost(fetchFn, `${SHEETS_API}/${config.spreadsheetId}:batchUpdate`, headers, {
    requests: [
      {
        updateSpreadsheetProperties: {
          properties: { title: payload.spreadsheetTitle },
          fields: "title",
        },
      },
    ],
  });

  await sheetsPost(fetchFn, `${SHEETS_API}/${config.spreadsheetId}/values:batchClear`, headers, {
    ranges: buildClearRanges(required),
  });

  const valuesBody = buildValuesBatchUpdateBody(payload);
  const updateResult = await sheetsPost(
    fetchFn,
    `${SHEETS_API}/${config.spreadsheetId}/values:batchUpdate`,
    headers,
    valuesBody,
  );

  const freshMeta = await sheetsGet(
    fetchFn,
    `${SHEETS_API}/${config.spreadsheetId}?fields=sheets.properties(title,sheetId)`,
    headers,
  );

  const tabByTitle = new Map(payload.sheets.map((tab) => [tab.title, tab]));
  const sheetLayouts: Array<{ sheetId: number; tab: GoogleSheetTab }> = [];
  for (const sheet of freshMeta.sheets ?? []) {
    const title = sheet.properties?.title;
    const sheetId = sheet.properties?.sheetId;
    if (!title || typeof sheetId !== "number" || !required.includes(title)) continue;
    const tab = tabByTitle.get(title);
    if (!tab) continue;
    sheetLayouts.push({ sheetId, tab });
  }

  if (sheetLayouts.length > 0) {
    await sheetsPost(fetchFn, `${SHEETS_API}/${config.spreadsheetId}:batchUpdate`, headers, {
      requests: buildStylingRequests(sheetLayouts),
    });
  }

  return {
    spreadsheetId: config.spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`,
    sheetsCreated: toCreate,
    tabsWritten: required,
    updatedCells: typeof updateResult.totalUpdatedCells === "number" ? updateResult.totalUpdatedCells : undefined,
  };
}

export { buildPushPlan };

async function mintAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  let GoogleAuth: typeof import("google-auth-library").GoogleAuth;
  try {
    ({ GoogleAuth } = await import("google-auth-library"));
  } catch {
    throw new Error("google-auth-library is required for live Sheets push. Run: pnpm add -wD google-auth-library");
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
      project_id: credentials.project_id,
    },
    scopes: SCOPES,
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;
  if (!token) {
    throw new Error("Failed to obtain Google access token from the service account.");
  }
  return token;
}

async function sheetsGet(fetchFn: typeof fetch, url: string, headers: Record<string, string>): Promise<SheetMetadata> {
  const res = await fetchFn(url, { headers });
  if (!res.ok) {
    throw new Error(`Sheets GET failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as SheetMetadata;
}

async function sheetsPost(
  fetchFn: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetchFn(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Sheets POST failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as Record<string, unknown>;
}
