/**
 * BDD steps — IAM / Permission Sets (permission-sets.feature).
 * Auth via storageState (playwright/.auth/user.json).
 *
 * Only module-specific steps live here. Shared list-page steps (search, filter,
 * sort, detail panel, feedback state) are in steps/_shared/ and resolve via
 * pageContext + TEN_IAM_* tags.
 */
import type { TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import { http, HttpResponse, delay as mswDelay } from "msw";
import { createBdd } from "playwright-bdd";
import { test } from "../../fixtures/base.fixture";
import {
    armListResponseProbe,
    ensureListResponseTracking,
    navigateToList,
    registerListFilterHandler,
} from "../../utils/list-page-network-utils";
import { PERMISSION_SETS_CREATE_API } from "../../utils/list-page-constants";

const { Given, When, Then } = createBdd(test);

function generateUniqueName(): string {
    return `E2E Permission Set ${Date.now()}`;
}

// ─── Navigation ──────────────────────────────────────────────────────────────────

Given("the user is on the permission sets list page", async ({ page, pageContext, $testInfo }) => {
    pageContext.setCurrentPage("permission-sets");
    pageContext.setListSurface("list");
    await navigateToList(page, pageContext, $testInfo as TestInfo);
});

// ─── 401 auth mock ────────────────────────────────────────────────────────────────

Given("the permission sets API is configured to return a 401 authentication error", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("permission-sets");
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 }),
    );
});

When("the user navigates to the permission sets list page", async ({ page, pageContext }) => {
    pageContext.setCurrentPage("permission-sets");
    ensureListResponseTracking(page, pageContext);
    await page.goto("/iam/permission-sets", { waitUntil: "domcontentloaded" });
});

// ─── List page assertions ─────────────────────────────────────────────────────────

Then("the permission sets data table is visible", async ({ permissionSetsPage }) => {
    await permissionSetsPage.table.expectVisible();
});

// ─── Create wizard flow ───────────────────────────────────────────────────────────

Given("the create permission set API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(PERMISSION_SETS_CREATE_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

When("the user clicks Create Permission Set button", async ({ permissionSetsPage }) => {
    await permissionSetsPage.clickCreatePermissionSet();
});

When("the user completes the create permission set wizard", async ({ permissionSetsPage }) => {
    const name = generateUniqueName();
    await permissionSetsPage.completeCreateWizard(name, `E2E description ${Date.now()}`);
});

When("the user advances the create permission set wizard to confirm", async ({ permissionSetsPage }) => {
    const name = generateUniqueName();
    // Step 1: fill details and click Next
    await permissionSetsPage.page.getByPlaceholder("Enter your text here...").first().waitFor({ state: "visible", timeout: 10_000 });
    await permissionSetsPage.page.getByPlaceholder("Enter your text here...").first().fill(name);
    await permissionSetsPage.page.getByPlaceholder("Enter your text here...").nth(1).fill(`E2E description ${Date.now()}`);
    await permissionSetsPage.page.getByRole("button", { name: "Next" }).click({ force: true });
    // Step 2: toggle first individual permission and click Next
    await permissionSetsPage.page.waitForTimeout(1_000);
    const firstPermSwitch = permissionSetsPage.page.getByRole("switch").filter({ hasNotText: /all/i }).first();
    const hasSwitch = await firstPermSwitch.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasSwitch) await firstPermSwitch.click({ force: true });
    await permissionSetsPage.page.getByRole("button", { name: "Next" }).click({ force: true });
    // Step 3: click Confirm — this triggers the POST that gets mocked to 500
    await permissionSetsPage.page.getByRole("button", { name: "Confirm" }).click({ force: true });
});

When("the user clicks Next without filling required fields", async ({ permissionSetsPage }) => {
    await permissionSetsPage.page.getByRole("button", { name: "Next" }).click();
});

When("the user cancels the create wizard", async ({ permissionSetsPage }) => {
    await permissionSetsPage.cancelCreateWizard();
});

Then("the permission set creation success screen is displayed", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectCreateSuccess();
});

Then("the permission set wizard shows required field validation errors", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectValidationErrors();
});

Then("the permission sets list page is displayed", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectLoaded();
});

// ─── Edit flow ────────────────────────────────────────────────────────────────────

When("the user opens the permission set row actions menu", async ({ permissionSetsPage }) => {
    await permissionSetsPage.table.openRowMenu(0);
});

When("the user clicks Edit in permission set actions", async ({ permissionSetsPage }) => {
    await permissionSetsPage.table.clickMenuItem("Edit");
});

When("the user updates the permission set name", async ({ permissionSetsPage }) => {
    const newName = generateUniqueName();
    await permissionSetsPage.fillEditForm(newName);
});

When("the user saves the edit permission set dialog", async ({ permissionSetsPage }) => {
    await permissionSetsPage.saveEditForm();
});

Given("the Edit Permission Set dialog is open", async ({ permissionSetsPage }) => {
    await permissionSetsPage.clickEditPermissionSet();
});

Given("the edit permission set API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.put(/\/iam\/tenant\/permission-sets\/[^/]+(?:\?|$)/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

When("the user cancels the permission set edit dialog", async ({ permissionSetsPage }) => {
    await permissionSetsPage.cancelEditDialog();
});

Then("the permission set success toast shows {string}", async ({ permissionSetsPage }, text: string) => {
    await permissionSetsPage.expectSuccessToast(text);
});

Then("the Edit Permission Set dialog is not visible", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectEditDialogHidden();
});

// ─── Delete flow ───────────────────────────────────────────────────────────────────

Given("the delete permission set API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.delete(/\/iam\/tenant\/permission-sets\/[^/]+(?:\?|$)/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

When("the user opens the row actions menu for the first permission set", async ({ permissionSetsPage, $testInfo }) => {
    const rowCount = await permissionSetsPage.table.rows.count();
    if (rowCount === 0) {
        ($testInfo as TestInfo).skip(true, "No permission sets in the list — scenario requires seed data.");
    }
    await permissionSetsPage.table.openRowMenu(0);
});

When("the user opens the row actions menu for the first E2E result", async ({ permissionSetsPage }) => {
    await permissionSetsPage.table.openRowMenu(0);
});

When("the user clicks Delete in permission set actions", async ({ permissionSetsPage }) => {
    await permissionSetsPage.table.clickMenuItem("Delete");
});

When("the user confirms the permission set deletion", async ({ permissionSetsPage }) => {
    await permissionSetsPage.confirmDelete();
});

When("the user cancels the permission set delete confirmation", async ({ permissionSetsPage }) => {
    await permissionSetsPage.cancelDelete();
});

Then("the delete confirmation is no longer visible", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectDeleteConfirmHidden();
});

When("the user opens the permission set detail panel from the first E2E result", async ({ permissionSetsPage }) => {
    await permissionSetsPage.openDetailPanel();
});

// ─── Revision flow ────────────────────────────────────────────────────────────────

When("the detail panel is opened", async ({ permissionSetsPage }) => {
    await permissionSetsPage.openDetailPanel();
});

When("the user clicks Create New Revision in the detail panel header", async ({ permissionSetsPage }) => {
    await permissionSetsPage.clickCreateNewRevision();
});

When("the user saves the new revision with at least one permission selected", async ({ permissionSetsPage }) => {
    await permissionSetsPage.saveNewRevisionWithFirstPermission();
});

Then("the revision creation success toast is shown", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectRevisionSuccessToast();
});

When("the user clicks the Revisions detail panel tab", async ({ permissionSetsPage }) => {
    await permissionSetsPage.clickDetailPanelTab("Revisions");
});

Then("the revisions table is visible", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectRevisionsTableVisible();
});

Then("the revisions table shows revision status indicators", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectRevisionStatusIndicatorsVisible();
});

Given("the Revisions tab is active", async ({ permissionSetsPage }) => {
    await permissionSetsPage.clickDetailPanelTab("Revisions");
});

// ─── Publish revision (Draft → Published) ─────────────────────────────────────────

When("the user opens the revision kebab menu for a draft revision", async ({ permissionSetsPage }) => {
    await permissionSetsPage.openDraftRevisionKebab();
});

When("the user clicks Publish in the revision actions", async ({ permissionSetsPage }) => {
    await permissionSetsPage.clickMenuItemInRevisionKebab("Publish");
});

When("the user confirms the publish action", async ({ permissionSetsPage }) => {
    await permissionSetsPage.confirmRevisionAction("Publish");
});

Then("the revision publish success toast is shown", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectRevisionSuccessToastContaining("published");
});

// ─── Activate revision (Published → Active) ───────────────────────────────────────

When("the user opens the revision kebab menu for a published revision", async ({ permissionSetsPage }) => {
    await permissionSetsPage.openPublishedRevisionKebab();
});

When("the user clicks Activate in the revision actions", async ({ permissionSetsPage }) => {
    await permissionSetsPage.clickMenuItemInRevisionKebab("Activate");
});

When("the user confirms the activate action", async ({ permissionSetsPage }) => {
    await permissionSetsPage.confirmRevisionAction("Activate");
});

Then("the revision activate success toast is shown", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectRevisionSuccessToastContaining("activated");
});

// ─── Delete revision ──────────────────────────────────────────────────────────────

When("the user clicks Delete in the revision actions", async ({ permissionSetsPage }) => {
    await permissionSetsPage.clickMenuItemInRevisionKebab("Delete");
});

When("the user confirms the revision deletion", async ({ permissionSetsPage }) => {
    await permissionSetsPage.confirmRevisionAction("Delete");
});

Then("the revision delete success toast is shown", async ({ permissionSetsPage }) => {
    await permissionSetsPage.expectRevisionSuccessToast();
});

// ─── E2E-first mutation pattern ──────────────────────────────────

When("the user searches for E2E permission sets", async ({ page, permissionSetsPage }) => {
    await permissionSetsPage.navigateTo();
    const found = await permissionSetsPage.searchFilterKeep("E2E");
    if (found) {
        return;
    }
    // No E2E data found — create one, then navigate back to list
    const name = generateUniqueName();
    await permissionSetsPage.clickCreatePermissionSet();
    await permissionSetsPage.completeCreateWizard(name, `E2E description ${Date.now()}`);
    await permissionSetsPage.navigateTo();
    await permissionSetsPage.searchFilterKeep("E2E");
});

// ─── Auth error Then step ─────────────────────────────────────────────────────────

Then("the permission sets page shows auth error or login redirect", async ({ page }) => {
    await expect(async () => {
        const currentUrl = page.url();
        const isOnAuthPage = /\/login|\/auth|\/sso/i.test(currentUrl);
        const hasAuthError = await page
            .getByText(/access denied|unauthorized|session expired|forbidden/i)
            .first()
            .isVisible()
            .catch(() => false);
        expect(
            isOnAuthPage || hasAuthError,
            `Expected an auth redirect or access-denied message. Current URL: ${currentUrl}`,
        ).toBe(true);
    }).toPass({ timeout: 30_000 });
});

// ─── Filter mock steps (module-specific, not shared filter-option-display_name) ────

Given("the permission sets filter API is configured to return a 500 server error", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("permission-sets");
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    );
});

Given("the permission sets filter API response is delayed by 4 seconds", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("permission-sets");
    registerListFilterHandler(network, pageContext, async () => {
        await mswDelay(4_000);
        return HttpResponse.json({ rows: [], total_count: 0 });
    });
});

When("the user applies the permission sets name filter", async ({ page, pageContext }) => {
    ensureListResponseTracking(page, pageContext);
    armListResponseProbe(page, pageContext);

    await page.getByTestId("btn-add-filter").click();
    await page.getByTestId("filter-option-name").waitFor({ state: "visible", timeout: 15_000 });
    await page.getByTestId("filter-option-name").click();

    const filterInput = page.getByTestId("input-filter-value").first();
    await filterInput.waitFor({ state: "visible", timeout: 15_000 });
    await filterInput.fill("test");

    await page.getByRole("button", { name: "Add Filter" }).click();
    await page.keyboard.press("Escape");
});
