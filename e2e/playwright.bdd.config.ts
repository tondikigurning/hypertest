/**
 * Playwright BDD config — Hyperscal Testing Strategy M5.
 *
 * Runs BDD scenarios authored in Gherkin (.feature files) using playwright-bdd.
 * Separate from the existing playwright.config.ts to avoid disrupting existing e2e tests.
 *
 * Project split (mirrors playwright.config.ts):
 *   • bdd-chromium              — auth features; NO storageState (login/logout need a clean session)
 *   • setup + bdd-chromium-authenticated — all other features; reuse playwright/.auth/user.json
 *
 * Run with:
 *   pnpm test:bdd
 *     ↑ runs bddgen THEN playwright (required after adding/changing .feature files)
 *
 * Do NOT run `playwright test --config=playwright.bdd.config.ts` alone unless you have
 * already run `bddgen` in this session. playwright-bdd writes generated tests to
 * .features-gen/; without bddgen, only previously generated scenarios run.
 *
 * The Automation API builds its scenario catalog from the .feature sources and stores it
 * in PostgreSQL at startup. This reporter writes per-run results only; it does not create
 * scenario catalog files.
 *
 * Run only smoke scenarios:
 *   pnpm test:bdd --grep=@smoke
 *
 * `pnpm test:bdd` suppresses automatic HTML opening while it uploads evidence;
 * use `pnpm exec playwright show-report playwright-report/bdd` to view it afterward.
 * Direct runs suppress the report when CI=1 or AGGREGATE_REPORT=1.
 */
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import path from "path";
import { defineBddProject } from "playwright-bdd";

const ENV_FILE = path.resolve(import.meta.dirname, ".env.local");
dotenv.config({ path: ENV_FILE, quiet: true });

const fileEnvironment = existsSync(ENV_FILE) ? dotenv.parse(readFileSync(ENV_FILE)) : {};
const ENV = process.env.SELECTED_ENV || fileEnvironment.ENV;
if (!ENV || !/^[a-z0-9-]+$/.test(ENV)) throw new Error("Set a valid ENV in e2e/.env.local.");
const TARGET_URL = `https://converge.${ENV}.hyperscal.com/`;

// A hosted worker may supply an isolated Playwright storage-state file. Ordinary
// local/CI runs continue to use the existing credential-based setup project.
const STORAGE_STATE_FILE = process.env.STORAGE_STATE;
if (STORAGE_STATE_FILE && !path.isAbsolute(STORAGE_STATE_FILE)) {
    throw new Error("STORAGE_STATE must be an absolute path");
}
const AUTH_FILE = STORAGE_STATE_FILE || process.env.SETUP_AUTH_FILE || path.join(import.meta.dirname, "playwright/.auth/user.json");
const BDD_STEPS = ["tests/bdd/steps/**/*.ts", "tests/bdd/fixtures/**/*.ts"];
const BDD_REPORT_DIR = process.env.REPORT_DIR || path.join(import.meta.dirname, "playwright-report", "bdd");
const BDD_OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(import.meta.dirname, "test-results", "bdd");
const BDD_FEATURES = process.env.BDD_FEATURES
    ? JSON.parse(process.env.BDD_FEATURES)
    : [
        "tests/bdd/features/_components/**/*.feature",
        "tests/bdd/features/user-management/**/*.feature",
        "tests/bdd/features/iam/**/*.feature",
        "tests/bdd/features/case-management/survey-template-manager.feature",
        "tests/bdd/features/case-management/dashboard.feature",
        "tests/bdd/features/case-management/cases/assignment.feature",
        "tests/bdd/features/case-management/cases/collaboration.feature",
        "tests/bdd/features/case-management/cases/communications.feature",
        "tests/bdd/features/case-management/cases/bulk.feature",
        "tests/bdd/features/case-management/cases/create.feature",
        "tests/bdd/features/case-management/cases/editing.feature",
        "tests/bdd/features/case-management/cases/lifecycle.feature",
        "tests/bdd/features/case-management/cases/list-and-detail.feature",
        "tests/bdd/features/case-management/cases/integrations.feature",
        "tests/bdd/features/workforce-management/**/*.feature",
        "tests/bdd/features/system-settings/**/*.feature",

        "tests/bdd/features/reports/report-templates.feature",

        "tests/bdd/features/knowledge-management/**/*.feature",

    ];
const EVIDENCE_SIZE = { width: 1920, height: 1080 };

export default defineConfig({
    timeout: process.env.CI ? 180_000 : 180_000,
    workers: 1,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    outputDir: BDD_OUTPUT_DIR,
    reporter: [
        ["list"],
        // HTML reports can include action arguments and network details. Automation
        // runs use the live reporter instead so browser credentials stay out of reports.
        ...(!process.env.EVENTS_FILE ? [["html", {
            open: process.env.CI || process.env.AGGREGATE_REPORT === "1" ? "never" : "always",
            outputFolder: BDD_REPORT_DIR,
        }] as [string, { open: "never" | "always"; outputFolder: string }]] : []),
        // The local Automation runner also updates the shared latest-result catalog.
        // Its result file and test artifacts are isolated under the run's temp dir.
        ["@hyperscal/test-utils/playwright", {
            outputFile: process.env.BDD_RESULTS_FILE || "temp/test-results/tenants/bdd.results.json",
        }],
        ...(process.env.EVENTS_FILE
            ? [[path.resolve(import.meta.dirname, "../server/modules/runs/playwright-reporter.mjs")] as [string]]
            : []),
    ],
    use: {
        baseURL: TARGET_URL,
        ...(process.env.AGENT_PROXY ? { proxy: { server: process.env.AGENT_PROXY } } : {}),
        headless: true,
        screenshot: "on",
        viewport: EVIDENCE_SIZE,
        video: { mode: "on", size: EVIDENCE_SIZE },
        trace: process.env.SETUP_AUTH_FILE ? "off" : "retain-on-failure",
        actionTimeout: process.env.CI ? 45_000 : 30_000,
        navigationTimeout: process.env.CI ? 45_000 : 30_000,
    },
    projects: [
        // ── 1. Auth setup — runs once, saves session for authenticated BDD projects ──
        {
            name: "setup",
            testMatch: /tests[\\/]bdd[\\/]setup[\\/]auth\.setup\.ts/,
            use: { ...devices["Desktop Chrome"], viewport: EVIDENCE_SIZE },
        },

        // ── 2. Auth BDD — clean browser context (no storageState) ───────────────────
        {
            ...defineBddProject({
                name: "bdd-chromium",
                features: "tests/bdd/features/auth/**/*.feature",
                steps: BDD_STEPS,
            }),
            use: { ...devices["Desktop Chrome"], viewport: EVIDENCE_SIZE },
        },

        // ── 3. Authenticated BDD — reuse saved session via storageState ─────────────
        {
            ...defineBddProject({
                name: "bdd-chromium-authenticated",
                features: BDD_FEATURES,
                steps: BDD_STEPS,
            }),
            use: {
                ...devices["Desktop Chrome"],
                viewport: EVIDENCE_SIZE,
                storageState: AUTH_FILE,
            },
            dependencies: STORAGE_STATE_FILE ? [] : ["setup"],
        },

        // ── 4. Organization Management (dedicated) ──────────────────────────────
        //     Heavy list/detail/tab flows (e.g. 11 entity-detail tab examples) blow past
        //     the 180s default. Give this module a generous per-test ceiling + slower
        //     action/navigation timeouts so genuine slowness doesn't fail the run.
        {
            ...defineBddProject({
                name: "bdd-chromium-org",
                features: ["tests/bdd/features/organization-management/**/*.feature"],
                steps: BDD_STEPS,
            }),
            timeout: 600_000,
            use: {
                ...devices["Desktop Chrome"],
                viewport: EVIDENCE_SIZE,
                storageState: AUTH_FILE,
                actionTimeout: process.env.CI ? 90_000 : 60_000,
                navigationTimeout: process.env.CI ? 90_000 : 60_000,
            },
            dependencies: STORAGE_STATE_FILE ? [] : ["setup"],
        },
    ],
});
