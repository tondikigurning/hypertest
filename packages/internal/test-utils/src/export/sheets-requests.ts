import type { GoogleExportPayload, GoogleSheetTab } from "./types";

/** One values range for Sheets `spreadsheets.values.batchUpdate`. */
export interface SheetsValueRange {
  range: string;
  values: Array<Array<string | number>>;
}

/** Body for `POST .../values:batchUpdate`. */
export interface SheetsValuesBatchUpdateBody {
  valueInputOption: "RAW";
  data: Array<SheetsValueRange>;
}

/** `addSheet` request for `spreadsheets.batchUpdate` when a tab is missing. */
export interface SheetsAddSheetRequest {
  addSheet: {
    properties: {
      title: string;
    };
  };
}

/** RGB(A) colour as used by the Sheets API (0–1 components). */
export interface SheetsColor {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
}

/** Grid range for formatting / banding requests. */
interface SheetsGridRange {
  sheetId: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

interface SheetsUserEnteredFormat {
  backgroundColor?: SheetsColor;
  textFormat?: {
    bold?: boolean;
    foregroundColor?: SheetsColor;
  };
  horizontalAlignment?: string;
  verticalAlignment?: string;
  wrapStrategy?: string;
}

/** One `spreadsheets.batchUpdate` formatting request. */
export type SheetsFormattingRequest =
  | {
      updateSheetProperties: {
        properties: {
          sheetId: number;
          title?: string;
          gridProperties?: { frozenRowCount?: number };
        };
        fields: string;
      };
    }
  | {
      repeatCell: {
        range: SheetsGridRange;
        cell: { userEnteredFormat: SheetsUserEnteredFormat };
        fields: string;
      };
    }
  | {
      addBanding: {
        bandedRange: {
          range: SheetsGridRange;
          rowProperties: {
            headerColor?: SheetsColor;
            firstBandColor?: SheetsColor;
            secondBandColor?: SheetsColor;
          };
        };
      };
    }
  | {
      updateDimensionProperties: {
        range: {
          sheetId: number;
          dimension: "COLUMNS" | "ROWS";
          startIndex?: number;
          endIndex?: number;
        };
        properties: { pixelSize: number };
        fields: string;
      };
    }
  | {
      addConditionalFormatRule: {
        rule: {
          ranges: Array<SheetsGridRange>;
          booleanRule: {
            condition: {
              type: "TEXT_EQ" | "TEXT_CONTAINS" | "TEXT_STARTS_WITH";
              values: Array<{ userEnteredValue: string }>;
            };
            format: SheetsUserEnteredFormat;
          };
        };
        index: number;
      };
    };

/** Strips ANSI escape color codes. */
const ANSI_CSI_PATTERN = new RegExp(`${String.fromCharCode(0x1b)}\\[[0-9;]*[a-zA-Z]`, "g");

export function cleanAnsiCodes(value: string | number): string | number {
  if (typeof value !== "string") return value;
  return value.replace(ANSI_CSI_PATTERN, "").replace(/\[\d+m/g, "");
}

export function quoteA1SheetRange(sheetTitle: string, cell = "A1"): string {
  const escaped = sheetTitle.replaceAll("'", "''");
  return `'${escaped}'!${cell}`;
}

export function buildValuesBatchUpdateBody(payload: GoogleExportPayload): SheetsValuesBatchUpdateBody {
  return {
    valueInputOption: "RAW",
    data: payload.sheets.map((sheet) => ({
      range: quoteA1SheetRange(sheet.title),
      values: sheet.values.map((row) => row.map((cell) => cleanAnsiCodes(cell))),
    })),
  };
}

export function requiredSheetTitles(payload: GoogleExportPayload): Array<string> {
  return payload.sheets.map((s) => s.title);
}

export function missingSheetTitles(required: Array<string>, existing: Array<string>): Array<string> {
  const have = new Set(existing);
  return required.filter((title) => !have.has(title));
}

export function buildAddSheetRequests(titles: Array<string>): Array<SheetsAddSheetRequest> {
  return titles.map((title) => ({
    addSheet: { properties: { title } },
  }));
}

export function buildClearRanges(sheetTitles: Array<string>): Array<string> {
  return sheetTitles.map((title) => quoteA1SheetRange(title, "A1:ZZ50000"));
}

export function buildPushPlan(
  payload: GoogleExportPayload,
  spreadsheetId: string,
  existingSheetTitles: Array<string> = [],
): {
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheetsToCreate: Array<string>;
  clearRanges: Array<string>;
  valuesBatchUpdate: SheetsValuesBatchUpdateBody;
} {
  const required = requiredSheetTitles(payload);
  const sheetsToCreate = missingSheetTitles(required, existingSheetTitles);
  return {
    spreadsheetId,
    spreadsheetTitle: payload.spreadsheetTitle,
    sheetsToCreate,
    clearRanges: buildClearRanges(required),
    valuesBatchUpdate: buildValuesBatchUpdateBody(payload),
  };
}

function createBadgeStyleRule(
  sheetId: number,
  matchText: string,
  fg: SheetsColor,
  matchType: "TEXT_EQ" | "TEXT_CONTAINS" = "TEXT_EQ",
): SheetsFormattingRequest {
  return {
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex: 1 }],
        booleanRule: {
          condition: { type: matchType, values: [{ userEnteredValue: matchText }] },
          format: {
            textFormat: { foregroundColor: fg, bold: true },
          },
        },
      },
      index: 0,
    },
  };
}

/**
 * Builds batchUpdate requests to format a scenario sheet properly.
 */
export function buildStylingRequests(
  sheetLayouts: Array<{ sheetId: number; tab: GoogleSheetTab }>,
): Array<SheetsFormattingRequest> {
  const requests: Array<SheetsFormattingRequest> = [];

  const brandPrimary: SheetsColor = { red: 0.306, green: 0.145, blue: 0.686 };
  const greenFg: SheetsColor = { red: 0.1, green: 0.5, blue: 0.1 };
  const redFg: SheetsColor = { red: 0.7, green: 0.1, blue: 0.1 };
  const yellowFg: SheetsColor = { red: 0.6, green: 0.4, blue: 0.0 };
  const blueFg: SheetsColor = { red: 0.1, green: 0.3, blue: 0.7 };
  const greyFg: SheetsColor = { red: 0.4, green: 0.4, blue: 0.4 };
  const purpleFg: SheetsColor = { red: 0.4, green: 0.1, blue: 0.6 };

  const dimDimension: "COLUMNS" = "COLUMNS";
  const FIXED_METADATA_WIDTHS: Array<{ index: number; width: number }> = [
    { index: 0, width: 120 },
    { index: 1, width: 220 },
    { index: 2, width: 140 },
    { index: 3, width: 180 },
    { index: 4, width: 100 },
    { index: 5, width: 200 },
    { index: 6, width: 110 },
    { index: 7, width: 110 },
  ];

  for (const { sheetId } of sheetLayouts) {
    requests.push(
      {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: "gridProperties.frozenRowCount",
        },
      },
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: "CENTER",
              verticalAlignment: "MIDDLE",
            },
          },
          fields: "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)",
        },
      },
      {
        addBanding: {
          bandedRange: {
            range: { sheetId, startRowIndex: 0 },
            rowProperties: {
              headerColor: brandPrimary,
              firstBandColor: { red: 1, green: 1, blue: 1 },
              secondBandColor: { red: 0.97, green: 0.97, blue: 0.99 },
            },
          },
        },
      },
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
          cell: {
            userEnteredFormat: {
              wrapStrategy: "OVERFLOW_CELL",
              verticalAlignment: "MIDDLE",
            },
          },
          fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
        },
      },
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 1, startColumnIndex: 8, endColumnIndex: 15 },
          cell: {
            userEnteredFormat: {
              wrapStrategy: "WRAP",
              verticalAlignment: "TOP",
            },
          },
          fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
        },
      },
      {
        updateDimensionProperties: {
          range: { sheetId, dimension: dimDimension, startIndex: 8, endIndex: 15 },
          properties: { pixelSize: 450 },
          fields: "pixelSize",
        },
      },
    );

    const centerAlignRequests: Array<SheetsFormattingRequest> = [0, 2, 4, 5, 6].map((colIndex) => ({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: colIndex, endColumnIndex: colIndex + 1 },
        cell: {
          userEnteredFormat: { horizontalAlignment: "CENTER" },
        },
        fields: "userEnteredFormat(horizontalAlignment)",
      },
    }));
    requests.push(...centerAlignRequests);

    const columnWidthRequests: Array<SheetsFormattingRequest> = FIXED_METADATA_WIDTHS.map(({ index, width }) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: dimDimension, startIndex: index, endIndex: index + 1 },
        properties: { pixelSize: width },
        fields: "pixelSize",
      },
    }));
    requests.push(...columnWidthRequests);

    requests.push(
      createBadgeStyleRule(sheetId, "✅ passed", greenFg),
      createBadgeStyleRule(sheetId, "❌ failed", redFg),
      createBadgeStyleRule(sheetId, "⏭ skipped", yellowFg),
      createBadgeStyleRule(sheetId, "🔵 manual", greyFg),

      createBadgeStyleRule(sheetId, "positive", greenFg),
      createBadgeStyleRule(sheetId, "negative", redFg),
      createBadgeStyleRule(sheetId, "ui-interaction", blueFg),
      createBadgeStyleRule(sheetId, "edge-case", yellowFg),

      createBadgeStyleRule(sheetId, "playwright", greenFg),
      createBadgeStyleRule(sheetId, "vitest", yellowFg),
      createBadgeStyleRule(sheetId, "manual", greyFg),

      createBadgeStyleRule(sheetId, "smoke", purpleFg, "TEXT_CONTAINS"),
      createBadgeStyleRule(sheetId, "regression", greyFg, "TEXT_CONTAINS"),
      createBadgeStyleRule(sheetId, "quarantine", yellowFg, "TEXT_CONTAINS"),
    );
  }

  return requests;
}
