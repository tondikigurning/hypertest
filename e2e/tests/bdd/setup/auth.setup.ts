/**
 * Saves authenticated storageState to playwright/.auth/user.json for BDD projects.
 * Credentials: E2E_USERNAME / E2E_PASSWORD from e2e/.env.local
 */
import { expect, test as setup } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import path from "path";
import { LoginPage } from "../pages/auth/LoginPage";
import { startLivePreview } from "../fixtures/live-preview";

export const AUTH_FILE = process.env.AUTOMATION_SETUP_AUTH_FILE || path.join(import.meta.dirname, "../../../playwright/.auth/user.json");

setup("authenticate", async ({ page, browser, baseURL }) => {
    const stopPreview = await startLivePreview(page.context());
    try {
    const loginPage = new LoginPage(page);
    const username = process.env.E2E_USERNAME ?? "";
    const password = process.env.E2E_PASSWORD ?? "";

    // Reuse only a locally created session for the same environment and account.
    // Verify it against the application: a storage-state file can outlive its session.
    const cacheEnabled = !process.env.CI && !process.env.AUTOMATION_SETUP_AUTH_FILE;
    const metadataPath = `${AUTH_FILE}.meta.json`;
    const identity = { baseURL, username };
    if (cacheEnabled && baseURL && username) {
        try {
            const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
            if (metadata.baseURL === baseURL && metadata.username === username) {
                const cachedContext = await browser.newContext({ baseURL, storageState: AUTH_FILE });
                try {
                    const cachedPage = await cachedContext.newPage();
                    await cachedPage.goto("/home", { waitUntil: "domcontentloaded", timeout: 10_000 });
                    await cachedPage.locator('[data-testid="user-profile-avatar"]').first().waitFor({ state: "visible", timeout: 10_000 });
                    await cachedContext.storageState({ path: AUTH_FILE });
                    console.log("Using verified cached authentication session.");
                    return;
                } finally {
                    await cachedContext.close();
                }
            }
        } catch {
            console.log("Cached authentication unavailable or expired; signing in again.");
        }
    }

    // The auth host can be intermittently slow/unreachable; retry the full login flow
    // (navigation + credential submit + redirect) instead of failing the whole suite.
    let authed = false;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 3 && !authed; attempt++) {
        try {
            await loginPage.gotoLogin();
            // The server-rendered form is visible before React has attached its
            // input handlers. Filling it earlier can leave TanStack Form's values
            // empty and trigger required errors instead of a login request.
            await page.waitForFunction(() =>
                ["identifier", "password"].every((id) => {
                    const input = document.getElementById(id);
                    return input && Object.getOwnPropertyNames(input).some((key) => key.startsWith("__reactProps$"));
                }),
                null,
                { timeout: 30_000 },
            );
            await loginPage.fillCredentials(username, password);
            const [response] = await Promise.all([
                page.waitForResponse((response) => {
                    const url = new URL(response.url());
                    return response.request().method() === "POST" && (url.pathname === "/login" || url.pathname === "/login.data");
                }),
                loginPage.submitLogin(),
            ]);
            if (!response.ok()) {
                throw new Error(`Login request failed with HTTP ${response.status()}`);
            }
            await loginPage.waitForAuthenticatedRedirect();
            authed = true;
        } catch (error) {
            lastError = error;
            // Reset to a fresh /login before the next attempt.
            await page.goto("/login", { waitUntil: "domcontentloaded" }).catch(() => {});
            await page.waitForTimeout(1_000).catch(() => {});
        }
    }

    if (!authed) {
        throw lastError instanceof Error ? lastError : new Error("Authentication failed after retries");
    }

    await expect(page.locator('[data-testid="user-profile-avatar"]').first()).toBeVisible({ timeout: 30_000 });

    await page.context().storageState({ path: AUTH_FILE });
    if (cacheEnabled && baseURL && username) {
        await writeFile(metadataPath, JSON.stringify(identity));
    }
    } finally {
        await stopPreview();
    }
});
