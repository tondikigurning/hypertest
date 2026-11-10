/**
 * BDD steps — IAM / Access Roles (access-roles.feature).
 * Auth via storageState (playwright/.auth/user.json).
 *
 * Only module-specific steps live here. Shared list-page steps (search, filter,
 * sort, detail panel, feedback state, 401 error, loading indicators) are in
 * steps/_shared/ and resolve via pageContext + TEN_IAM_* tags.
 *
 * @mock mutation scenarios: module-specific Given steps register MSW handlers
 * via network.use() for create, edit, and delete API endpoints.
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
import { ACCESS_ROLES_CREATE_API, ACCESS_ROLES_DELETE_API } from "../../utils/list-page-constants";

const { Given, When, Then } = createBdd(test);

// ─── Test data helpers ────────────────────────────────────────────────────────────

function generateUniqueRoleName(): string {
    return `E2E Role ${Date.now()}`;
}

function generateUniqueDescription(): string {
    return `E2E description ${Date.now()}`;
}

// ─── Navigation Given steps (module-scoped) ───────────────────────────────────────

Given("the user is on the access roles list page", async ({ page, pageContext, $testInfo }) => {
    pageContext.setCurrentPage("access-roles");
    pageContext.setListSurface("list");
    await navigateToList(page, pageContext, $testInfo as TestInfo);
});

// ─── Filter mock steps (module-specific, not shared filter-option-display_name) ────

Given("the access roles filter API is configured to return a 500 server error", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("access-roles");
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    );
});

Given("the access roles filter API response is delayed by 4 seconds", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("access-roles");
    registerListFilterHandler(network, pageContext, async () => {
        await mswDelay(4_000);
        return HttpResponse.json({ rows: [], total_count: 0 });
    });
});

When("the user applies the access roles name filter", async ({ page, pageContext }) => {
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

// ─── Navigation-triggered mock (401) ──────────────────────────────────────────────

Given("the access roles API is configured to return a 401 authentication error", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("access-roles");
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 }),
    );
});

When("the user navigates to the access roles list page", async ({ page, pageContext }) => {
    pageContext.setCurrentPage("access-roles");
    ensureListResponseTracking(page, pageContext);
    await page.goto("/iam/access-roles", { waitUntil: "domcontentloaded" });
});

// ─── Create flow steps ────────────────────────────────────────────────────────────

Given("the create access role API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(ACCESS_ROLES_CREATE_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

When("the user clicks the Create Access Role button", async ({ accessRolesPage }) => {
    await accessRolesPage.clickCreateAccessRole();
});

When("the user fills the create access role form with valid data", async ({ accessRolesPage }) => {
    const roleName = generateUniqueRoleName();
    const description = generateUniqueDescription();
    await accessRolesPage.fillCreateForm(roleName, description);
});

When("the user submits the create access role form", async ({ accessRolesPage }) => {
    await accessRolesPage.submitCreateForm();
});

When("the user clicks Create without filling required fields", async ({ accessRolesPage }) => {
    await accessRolesPage.clickCreateAccessRole();
    await accessRolesPage.submitCreateForm();
});

When("the user cancels the create access role dialog", async ({ accessRolesPage }) => {
    await accessRolesPage.cancelCreateDialog();
});

Then("the access role creation success dialog is displayed", async ({ accessRolesPage }) => {
    await accessRolesPage.expectCreateSuccess();
});

Then("the create access role form shows required field validation errors", async ({ accessRolesPage }) => {
    await accessRolesPage.expectFormValidationErrors();
});

Then("the create access role dialog is not visible", async ({ accessRolesPage }) => {
    await accessRolesPage.expectCreateDialogHidden();
});

// ─── Edit flow steps ──────────────────────────────────────────────────────────────

Given("the Edit Access Role dialog is open", async ({ accessRolesPage }) => {
    await accessRolesPage.clickEditAccessRole();
});

Given("the edit access role API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.put(/\/iam\/tenant\/access-roles\/[^/]+(?:\?|$)/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

When("the user opens the access role row actions menu", async ({ accessRolesPage }) => {
    await accessRolesPage.table.openRowMenu(0);
});

When("the user clicks Edit Access Role", async ({ accessRolesPage }) => {
    await accessRolesPage.table.clickMenuItem("Edit Access Role");
    await accessRolesPage.expectEditDialogVisible();
});

When("the user clicks Delete Access Role", async ({ accessRolesPage }) => {
    await accessRolesPage.table.clickMenuItem("Delete Access Role");
});

When("the user updates the access role name and description", async ({ accessRolesPage }) => {
    const newName = generateUniqueRoleName();
    const newDescription = generateUniqueDescription();
    await accessRolesPage.fillEditForm(newName, newDescription);
});

When("the user submits the edit access role form", async ({ accessRolesPage }) => {
    await accessRolesPage.submitEditForm();
});

When("the user cancels the edit dialog", async ({ page }) => {
    await page.getByRole("dialog").getByRole("button", { name: /cancel/i }).first().click();
});

Then("the success toast shows {string}", async ({ accessRolesPage }, text: string) => {
    await accessRolesPage.expectSuccessToast(text);
});

Then("the Edit Access Role dialog is not visible", async ({ accessRolesPage }) => {
    await accessRolesPage.expectEditDialogHidden();
});

Then("the Manage Permission Sets dialog is visible", async ({ accessRolesPage }) => {
    await accessRolesPage.expectManagePermissionSetsDialogVisible();
});

Then('Delete Access Role confirmation is no longer visible', async ({ accessRolesPage }) => {
    await accessRolesPage.confirmModal.expectHidden("Delete Access Role");
});

// ─── Delete flow steps ────────────────────────────────────────────────────────────

Given("the delete access role API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.delete(ACCESS_ROLES_DELETE_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

When("the user opens the row actions menu for the first access role", async ({ accessRolesPage, $testInfo }) => {
    const rowCount = await accessRolesPage.table.rows.count();
    if (rowCount === 0) {
        ($testInfo as TestInfo).skip(true, "No access roles in the list — scenario requires seed data.");
    }
    await accessRolesPage.table.openRowMenu(0);
});

// ─── E2E-first mutation pattern ──────────────────────────────────

When("the user searches for E2E access roles", async ({ page, accessRolesPage }) => {
    accessRolesPage.lastSearchKeyword = null;
    accessRolesPage.lastSearchMatched = false;
    await accessRolesPage.navigateTo();
    const found = await accessRolesPage.searchFilterKeep("E2E");
    if (found) {
        return;
    }
    // No E2E data found — create one, then search for it
    await accessRolesPage.clickCreateAccessRole();
    const roleName = `E2E-ACR-${Date.now()}`;
    const description = `E2E description ${Date.now()}`;
    await accessRolesPage.fillCreateForm(roleName, description);
    await accessRolesPage.submitCreateForm();
    await accessRolesPage.expectCreateSuccess();
    // Dismiss success dialog and navigate back to list
    await page.keyboard.press("Escape");
    await accessRolesPage.navigateTo();
    await accessRolesPage.searchFilterKeep("E2E");
});

When("the user opens the access role detail panel from the first E2E result", async ({ accessRolesPage }) => {
    await accessRolesPage.openDetailPanel();
});

When("the user confirms the access role deletion", async ({ accessRolesPage }) => {
    await accessRolesPage.confirmDeleteAction();
});

When("the user clicks the confirm delete button", async ({ accessRolesPage }) => {
    await accessRolesPage.clickConfirmDeleteButton();
});

When("the user cancels the access role confirmation dialog", async ({ accessRolesPage }) => {
    await accessRolesPage.confirmModal.cancel();
});

// ─── Permission Sets flow steps ──────────────────────────────────────────────────

When("the user clicks {string} in the detail panel header", async ({ accessRolesPage }, buttonLabel: string) => {
    if (buttonLabel === "Manage Permission Sets") {
        await accessRolesPage.openManagePermissionSets();
    }
});

When("the user adds the first available permission set in the manage permission sets dialog", async ({ accessRolesPage, $testInfo }) => {
    const added = await accessRolesPage.addFirstAvailablePermissionSet();
    if (!added) {
        ($testInfo as TestInfo).skip(
            true,
            "No available permission set to add in the Manage Permission Sets dialog.",
        );
    }
});

When("the user removes the first assigned permission set in the manage permission sets dialog", async ({ accessRolesPage, $testInfo }) => {
    const removed = await accessRolesPage.removeFirstAssignedPermissionSet();
    if (!removed) {
        ($testInfo as TestInfo).skip(
            true,
            "No assigned permission set to remove in the Manage Permission Sets dialog.",
        );
    }
});

When("the user saves the Manage Permission Sets dialog", async ({ page, accessRolesPage }) => {
    const dlg = accessRolesPage.managePermissionSetsDialog;
    // Click Save Changes — the enabled state means at least one change was made
    const saveBtn = dlg.getByRole("button", { name: "Save Changes" });
    await saveBtn.click();
    // After save the dialog closes. Wait briefly then dismiss any lingering overlay.
    await page.waitForTimeout(800);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
});

When("the user dismisses the dialog overlay", async ({ page }) => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
});

// ─── List page assertion Then steps ───────────────────────────────────────────────

Then("the access roles data table is visible", async ({ accessRolesPage }) => {
    await accessRolesPage.table.expectVisible();
});

// ─── 401 auth error Then step ────────────────────────────────────────────────────

Then("the user is redirected to the login page or shown an auth error", async ({ page }) => {
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
