/**
 * BDD step definitions — User Authentication (apps/tenants).
 *
 * Steps for auth/authentication.feature scenarios.
 * Uses fixture-injected LoginPage (same pattern as tests/bdd/fixtures/base.fixture.ts).
 *
 * NOTE: The "the user is logged in" Given step is also used by other modules as a
 * precondition. Because playwright-bdd resolves steps globally across all files in the
 * steps/ glob, any feature can reference it without importing this file.
 */
import { createBdd } from "playwright-bdd";
import { expect, test } from "../../fixtures/base.fixture";
import { http, HttpResponse, delay as mswDelay } from "msw";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";

const { Given, When, Then } = createBdd(test);

// ─────────────────────────────────────────────────────────────────────────────
// Given
// ─────────────────────────────────────────────────────────────────────────────

Given("the user is on the login page", async ({ loginPage }) => {
    await loginPage.gotoLogin();
});

Given("the user is logged in", async ({ page, loginPage }) => {
    await loginPage.login(process.env.E2E_USERNAME ?? "", process.env.E2E_PASSWORD ?? "");
    await loginPage.waitForAuthenticatedRedirect();
    // No page navigation follows login here — dismiss the Tencent workbench if it mounts.
    await dismissTencentWorkbenchIfPresent(page);
});

// ─────────────────────────────────────────────────────────────────────────────
// When
// ─────────────────────────────────────────────────────────────────────────────

When("they enter valid credentials", async ({ loginPage }) => {
    await loginPage.fillCredentials(process.env.E2E_USERNAME ?? "", process.env.E2E_PASSWORD ?? "");
});

When("they enter invalid credentials", async ({ loginPage }) => {
    await loginPage.fillCredentials("invalid-user@example.com", "wrong-password-123");
});

When("they submit the login form", async ({ loginPage }) => {
    await loginPage.submitLogin();
});

When("they log out", async ({ loginPage }) => {
    await loginPage.profileMenu.logout();
});

When("they toggle password visibility", async ({ loginPage }) => {
    await loginPage.togglePasswordVisibility();
});

When("they submit an empty login form", async ({ loginPage }) => {
    await loginPage.submitEmptyForm();
});

// ─────────────────────────────────────────────────────────────────────────────
// Then
// ─────────────────────────────────────────────────────────────────────────────

Then("they are redirected to the dashboard", async ({ page }) => {
    await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 30_000 });
    expect(page.url()).not.toContain("/login");
});

Then("they are redirected to the login page", async ({ page }) => {
    await page.waitForURL((url) => url.pathname.includes("login"), { timeout: 30_000 });
    await expect(page).toHaveURL(/.*login.*/);
});

Then("they see an authentication error message", async ({ page, loginPage }) => {
    await loginPage.waitForAuthenticationError();
    // Verify we are still on the login page (not authenticated)
    expect(page.url()).toMatch(/login/);
});

Then("the password field is hidden", async ({ loginPage }) => {
    await loginPage.expectPasswordFieldType("password");
});

Then("the password field is visible", async ({ loginPage }) => {
    await loginPage.expectPasswordFieldType("text");
});

Then("identifier validation is shown", async ({ loginPage }) => {
    await loginPage.waitForIdentifierValidationError();
});

Then("password validation is shown", async ({ loginPage }) => {
    await loginPage.waitForPasswordValidationError();
});

// ─── MSW handlers for authentication error scenarios ──────────────────────────

Given("the authentication API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/iam\/(login|auth|authenticate)/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the authentication API response is delayed by 3 seconds", async ({ network }) => {
    network.use(
        http.post(/\/iam\/(login|auth|authenticate)/, async () => {
            await mswDelay(3_000);
            return HttpResponse.json({ token: "mock-token", user: { id: "user-1", email: "user@example.com" } });
        }),
    );
});

Given("the logout API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/iam\/(logout|sign-out)/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Then("a loading indicator or spinner is visible", async ({ page }) => {
    // Look for loading spinner, skeleton, or progress indicator
    const hasLoadingState = await page
        .locator('[role="progressbar"], .spinner, .loader, .skeleton, [data-testid*="loading"]')
        .first()
        .isVisible()
        .catch(() => false);
    const hasLoadingText = await page
        .getByText(/loading|please wait|authenticating/i)
        .first()
        .isVisible()
        .catch(() => false);
    expect(hasLoadingState || hasLoadingText, "Expected a loading indicator to be visible").toBe(true);
});

Then("eventually they are logged in", async ({ page }) => {
    await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 10_000 });
    expect(page.url()).not.toContain("/login");
});
