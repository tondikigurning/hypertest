/** One tab within a generated Google Spreadsheet. */
export interface GoogleSheetTab {
  /** Sheet title in the workbook. Must be unique and ≤ 100 chars. */
  title: string;
  /**
   * Relative virtual file path mirroring the report .md tree, e.g.
   * "overview.md", "e2e/tenants/auth/authentication.md",
   * "unit/dataview.md".
   */
  relativePath: string;
  /** Header row followed by data rows. */
  values: Array<Array<string | number>>;
}

/** Full Google-export payload produced from an aggregate report. */
export interface GoogleExportPayload {
  /** ISO 8601 of when this payload was generated. */
  generatedAt: string;
  /** `runAt` from the source aggregate. */
  sourceRunAt: string;
  /** Workbook document title. */
  spreadsheetTitle: string;
  /**
   * Folder tag for the report, e.g. `2026-07-13_1826`.
   * Used as the Drive folder name for mirror pushes.
   */
  reportFolder: string;
  /** Tabs in presentation order. */
  sheets: Array<GoogleSheetTab>;
}

/** Options for buildGoogleExportPayload. */
export interface BuildGoogleExportOptions {
  now?: () => Date;
  spreadsheetTitle?: string;
  sourcePath?: string;
  reportFolder?: string;
}
