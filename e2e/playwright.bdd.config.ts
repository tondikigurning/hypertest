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
import path from "path";
import { defineBddProject } from "playwright-bdd";

dotenv.config({ path: path.resolve(import.meta.dirname, ".env.local") });

// A hosted worker may supply an isolated Playwright storage-state file. Ordinary
// local/CI runs continue to use the existing credential-based setup project.
const AUTOMATION_AUTH_FILE = process.env.AUTOMATION_STORAGE_STATE;
if (AUTOMATION_AUTH_FILE && !path.isAbsolute(AUTOMATION_AUTH_FILE)) {
    throw new Error("AUTOMATION_STORAGE_STATE must be an absolute path");
}
const AUTH_FILE = AUTOMATION_AUTH_FILE || process.env.AUTOMATION_SETUP_AUTH_FILE || path.join(import.meta.dirname, "playwright/.auth/user.json");
const BDD_STEPS = ["tests/bdd/steps/**/*.ts", "tests/bdd/fixtures/**/*.ts"];
const BDD_REPORT_DIR = process.env.AUTOMATION_REPORT_DIR || path.join(import.meta.dirname, "playwright-report", "bdd");
const BDD_OUTPUT_DIR = process.env.AUTOMATION_OUTPUT_DIR || path.join(import.meta.dirname, "test-results", "bdd");
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
        [
            "html",
            {
                open:
                    process.env.CI || process.env.AGGREGATE_REPORT === "1" || process.env.AUTOMATION_EVENTS_FILE ? "never" : "always",
                outputFolder: BDD_REPORT_DIR,
            },
        ],
        // The local Automation runner also updates the shared latest-result catalog.
        // Its result file and test artifacts are isolated under the run's temp dir.
        ["@hyperscal/test-utils/playwright", {
            outputFile: process.env.BDD_RESULTS_FILE || "temp/test-results/tenants/bdd.results.json",
        }],
        ...(process.env.AUTOMATION_EVENTS_FILE
            ? [[path.resolve(import.meta.dirname, "../server/modules/runs/playwright-reporter.mjs")] as [string]]
            : []),
    ],
    use: {
        baseURL: process.env.BASE_URL || "https://converge.stt.hyperscal.com/",
        headless: true,
        screenshot: "on",
        viewport: EVIDENCE_SIZE,
        video: { mode: "on", size: EVIDENCE_SIZE },
        trace: "retain-on-failure",
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
                features: [
                    "tests/bdd/features/_components/**/*.feature",
                    "tests/bdd/features/user-management/**/*.feature",
                    "tests/bdd/features/iam/**/*.feature",
                    // Phase 1 implemented (steps + POM present). Register sibling feature files
                    // here only once their steps/POM exist — the Phase 0 features (home, iam,
                    // organization-management, workforce-management, case-management/dashboard)
                    // are intentionally excluded because their undefined steps would break bddgen.
                    "tests/bdd/features/case-management/cases.feature",
                    "tests/bdd/features/case-management/survey-template-manager.feature",
                    "tests/bdd/features/case-management/dashboard.feature",
                    "tests/bdd/features/workforce-management/**/*.feature",
                    "tests/bdd/features/knowledge-management/**/*.feature",
                    "tests/bdd/features/system-settings/**/*.feature",
                    // Organization Management runs as its own project (below) with a longer
                    // per-test timeout — its list/detail flows are heavy and time out at 180s.
                    // Add new module feature globs here as BDD coverage expands.
                ],
                steps: BDD_STEPS,
            }),
            use: {
                ...devices["Desktop Chrome"],
                viewport: EVIDENCE_SIZE,
                storageState: AUTH_FILE,
            },
            dependencies: AUTOMATION_AUTH_FILE ? [] : ["setup"],
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
            dependencies: AUTOMATION_AUTH_FILE ? [] : ["setup"],
        },
    ],
});
