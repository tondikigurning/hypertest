/* eslint-disable no-console */
/** biome-ignore-all lint/suspicious/noConsole: <> */

/**
 * CLI: pnpm test:export
 *
 * Usage:
 *   pnpm test:export [--report <path>] [--push] [--push-flat] [--dry-run]
 *
 * --report     Path to report folder (default: latest testing-docs/reports/*)
 * --push       Push to Google Drive folder mirror (one spreadsheet per .md leaf)
 * --push-flat  Push to a single Google Spreadsheet (legacy flat mode)
 * --dry-run    Build payload and print the plan without pushing
 */

import fs from "node:fs";
import path from "node:path";
import type { AggregateReport } from "../aggregate/types";
import { buildGoogleExportPayload, findLatestReportDir, loadEnvLocal } from "./index";
import { pushGoogleExportToDrive } from "./push-drive";
import { buildPushPlan, pushGoogleExportToSheets } from "./push-sheets";
import { resolveGoogleDrivePushConfig, resolveGoogleSheetsPushConfig } from "./resolve-credentials";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reportArg = getArg(args, "--report");
  const push = hasFlag(args, "--push");
  const pushFlat = hasFlag(args, "--push-flat");
  const dryRun = hasFlag(args, "--dry-run");

  // Load .env.local from the current working directory upward
  loadEnvLocal(process.cwd());

  // Determine the source report directory
  let reportDir: string;
  if (reportArg) {
    reportDir = path.resolve(reportArg);
  } else {
    const reportsRoot = path.resolve(process.cwd(), "testing-docs/reports");
    const latest = findLatestReportDir(reportsRoot);
    if (!latest) {
      console.error("No report directories found under testing-docs/reports/.");
      process.exit(1);
    }
    reportDir = latest;
  }

  const aggregatePath = path.join(reportDir, "aggregate.json");
  if (!fs.existsSync(aggregatePath)) {
    console.error(`aggregate.json not found at: ${aggregatePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(aggregatePath, "utf8");
  let aggregate: AggregateReport;
  try {
    aggregate = JSON.parse(raw) as AggregateReport;
  } catch {
    console.error("Failed to parse aggregate.json.");
    process.exit(1);
  }

  console.log(`Source report: ${reportDir}`);
  console.log(`Run at: ${aggregate.runAt}`);
  console.log(`Total results: ${aggregate.totals.total}`);
  console.log();

  // Build payload
  const payload = buildGoogleExportPayload(aggregate, { sourcePath: reportDir });
  console.log(`Generated payload with ${payload.sheets.length} sheets:`);
  for (const sheet of payload.sheets) {
    console.log(`  ${sheet.relativePath} → "${sheet.title}" (${sheet.values.length} rows)`);
  }
  console.log();

  if (dryRun) {
    console.log("Dry-run complete. No data was pushed.");
    if (pushFlat) {
      const configResult = resolveGoogleSheetsPushConfig();
      if (!configResult.ok) {
        console.error(`Config error: ${configResult.error}`);
        process.exit(1);
      }
      const plan = buildPushPlan(payload, configResult.config.spreadsheetId, []);
      console.log(`\nFlat push plan:`);
      console.log(`  Spreadsheet: ${plan.spreadsheetId}`);
      console.log(`  Sheets to create: ${plan.sheetsToCreate.join(", ") || "(none)"}`);
      console.log(`  Clear ranges: ${plan.clearRanges.length}`);
    } else if (push) {
      const configResult = resolveGoogleDrivePushConfig();
      if (!configResult.ok) {
        console.error(`Config error: ${configResult.error}`);
        process.exit(1);
      }
      console.log(`\nDrive push plan:`);
      console.log(`  Parent folder: ${configResult.config.parentFolderId}`);
      console.log(`  Report folder: ${payload.reportFolder}`);
      console.log(`  Sheets: ${payload.sheets.length}`);
    }
    return;
  }

  if (pushFlat) {
    const configResult = resolveGoogleSheetsPushConfig();
    if (!configResult.ok) {
      console.error(`Config error: ${configResult.error}`);
      process.exit(1);
    }
    console.log(`Pushing to flat spreadsheet: ${configResult.config.spreadsheetId}...`);
    const result = await pushGoogleExportToSheets(payload, configResult.config);
    console.log(`Done! ${result.tabsWritten.length} tabs written.`);
    console.log(`Spreadsheet: ${result.spreadsheetUrl}`);
    console.log(`Cells updated: ${result.updatedCells}`);
  } else if (push) {
    const configResult = resolveGoogleDrivePushConfig();
    if (!configResult.ok) {
      console.error(`Config error: ${configResult.error}`);
      process.exit(1);
    }
    console.log(`Pushing to Drive folder: ${configResult.config.parentFolderId}...`);
    console.log(`Report folder: ${payload.reportFolder}`);
    const result = await pushGoogleExportToDrive(payload, configResult.config);
    console.log(`\nDone! Root folder: ${result.reportFolderUrl}`);
    console.log(`Spreadsheets created: ${result.files.length}`);
    for (const ss of result.files) {
      console.log(`  ${ss.relativePath} → ${ss.spreadsheetUrl}`);
    }
  } else {
    // No push flag — just show what would happen
    console.log("No --push or --push-flat flag provided. Use --dry-run to preview.");
    console.log("Use --push for Drive folder mirror or --push-flat for legacy single-spreadsheet.");
  }
}

function hasFlag(args: Array<string>, flag: string): boolean {
  return args.includes(flag);
}

function getArg(args: Array<string>, arg: string): string | undefined {
  const idx = args.indexOf(arg);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

main().catch((err: Error) => {
  console.error("Export failed:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
