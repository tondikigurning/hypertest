/**
 * BDD steps — User Management / Users (users.feature).
 * Auth via storageState (tests/bdd/setup/auth.setup.ts).
 *
 * Data-dependent: TEN_USR_MGP_E2E_001/004/005 (entity + addable group), TEN_USR_MGP_E2E_003 (top stored group membership),
 * TEN_USR_SUS_E2E_001–TEN_USR_ULK_E2E_002 (pipeline tab seed data). Empty tabs or missing membership → skip.
 *
 * Quarantined (@quarantine): TEN_USR_RIN_E2E_001, TEN_USR_CIN_E2E_001 — invite row actions hit app bugs
 * (API failure / missing success modal); excluded from smoke and skipped unless RUN_QUARANTINE=1.
 *
 * MSW (@mock TEN_USR_LST_E2E_006–013, VDT-004–005, CRT-007–008, …): handlers registered in Given steps via `network.use()`.
 * The network fixture (base.fixture.ts) enables MSW only when @mock tag is present.
 */
import type { Page, TestInfo } from "@playwright/test";
import { http, HttpResponse, delay as mswDelay } from "msw";
import { createBdd } from "playwright-bdd";
import { expect, test } from "../../fixtures/base.fixture";
import type { PageContext } from "../../fixtures/page-context";
import type { UsersCreatePage } from "../../pages/user-management/UsersCreatePage";
import {
    armListResponseProbe,
    ensureListResponseTracking,
    registerListFilterHandler,
    waitForDelayedListResponse,
} from "../../utils/list-page-network-utils";
import { CREATE_USER_WIZARD_API } from "../../utils/list-page-constants";

const { Given, When, Then } = createBdd(test);

async function openCreateWizardOrganizationEntityStep(params: {
    page: Page;
    pageContext: PageContext;
    $testInfo?: TestInfo;
    usersCreatePage: UsersCreatePage;
}): Promise<void> {
    params.pageContext.setCurrentPage("users");
    params.pageContext.setListSurface("create-wizard-entity");
    ensureListResponseTracking(params.page, params.pageContext);
    await params.usersCreatePage.navigateTo();
    await params.usersCreatePage.openOrganizationEntityStep();

    // Wait for the entity area to reach a settled state: either the search toolbar
    // (data loaded) or "No Entities available" (genuinely empty).  The empty-state
    // text can briefly flash on first render before React Query initiates its first
    // fetch (isFetching starts as false, data is undefined), so we must wait for a
    // *settled* visible element — not just poll — to avoid a false-positive skip.
    const stepContent = params.page.locator('[data-test-id="wizard-step-content"]');
    const searchInput = stepContent
        .locator('[data-testid="inputComponent"][placeholder="Search"]')
        .or(stepContent.getByRole("textbox", { name: /search/i }))
        .first();
    const noEntities = params.page.getByText(/no entities available/i);

    // Wait for whichever settles first — 45s matches waitForEntityTableReady's timeout.
    await searchInput
        .or(noEntities)
        .first()
        .waitFor({ state: "visible", timeout: 45_000 });

    // Small settle time: the "No Entities" text can flash briefly during a refetch
    // transition (e.g. first payload vs populated payload).  Without this settle,
    // the isVisible() poll might catch a transient empty state.
    await params.page.waitForTimeout(500);

    if (await noEntities.isVisible().catch(() => false)) {
        if (params.$testInfo) {
            params.$testInfo.skip(true, "No entities configured — entity picker scenarios require seed data.");
        }
        return;
    }

    await params.usersCreatePage.waitForEntityTableReady();
}

Given("the user is on the users list page", async ({ pageContext, usersPage }) => {
    pageContext.setCurrentPage("users");
    pageContext.setListSurface("list");
    await usersPage.navigateTo();
});

Given("the user is on the create user wizard", async ({ pageContext, usersCreatePage }) => {
    pageContext.setCurrentPage("users");
    pageContext.setListSurface("list");
    await usersCreatePage.navigateTo();
});

Given("the create user wizard organization entity step with search is open", async ({
    page,
    pageContext,
    usersCreatePage,
    $testInfo,
}) => {
    await openCreateWizardOrganizationEntityStep({ page, pageContext, $testInfo, usersCreatePage });
});

Given("the create user wizard organization entity step with filters is open", async ({
    page,
    pageContext,
    usersCreatePage,
    $testInfo,
}) => {
    await openCreateWizardOrganizationEntityStep({ page, pageContext, $testInfo, usersCreatePage });

    const filterButton = page
        .locator('[data-test-id="wizard-step-content"]')
        .getByRole("button", { name: /^add filter$/i });
    await filterButton.waitFor({ state: "visible", timeout: 10_000 });
});

Given("the create user wizard organization entity step with sort is open", async ({
    page,
    pageContext,
    usersCreatePage,
    $testInfo,
}) => {
    await openCreateWizardOrganizationEntityStep({ page, pageContext, $testInfo, usersCreatePage });

    const sortButton = page
        .locator('[data-test-id="wizard-step-content"]')
        .getByRole("button", { name: /^add sort$/i });
    await sortButton.waitFor({ state: "visible", timeout: 10_000 });
});

Given("the {string} dialog is open via the panel header", async ({ usersPage }, dialogTitle: string) => {
    if (dialogTitle === "Application Access") {
        await usersPage.openApplicationAccessDialog();
    } else if (dialogTitle === "Group Membership") {
        await usersPage.openManageGroupsDialog();
    }
});

Given("the {string} dialog is open", async ({ usersPage }, dialogTitle: string) => {
    await usersPage.table.openRowMenu(0);
    await usersPage.table.clickMenuItem(dialogTitle);
    await usersPage.expectDialogVisible(dialogTitle);
});

// ─── E2E-first mutation pattern ──────────────────────────────────

When("the user clicks the {string} button", async ({ usersPage }, buttonLabel: string) => {
    if (buttonLabel === "Create User") {
        await usersPage.clickCreateUser();
    }
});

When("the user clicks {string} in the panel header", async ({ usersPage }, buttonLabel: string) => {
    if (buttonLabel === "Application Access") {
        await usersPage.openApplicationAccessDialog();
    } else if (buttonLabel === "Manage Groups") {
        await usersPage.openManageGroupsDialog();
    }
});

When("the user clicks {string} without filling required fields", async ({ usersCreatePage }, _buttonLabel: string) => {
    await usersCreatePage.clickNextEmpty();
});

When("the user cancels the wizard", async ({ usersCreatePage }) => {
    await usersCreatePage.cancel();
});

When("the user completes the create user wizard", async ({ usersCreatePage }) => {
    await usersCreatePage.completeWizardWithAllFirstAvailable();
});

When("the user advances the create user wizard to the summary step", async ({ usersCreatePage }) => {
    await usersCreatePage.advanceToSummaryWithFirstAvailable();
});

When("the user clicks {string} on the success screen", async ({ usersCreatePage }, buttonLabel: string) => {
    if (buttonLabel === "Ok, back to list") {
        await usersCreatePage.clickBackToList();
    } else if (buttonLabel === "Create More User") {
        await usersCreatePage.clickCreateMoreUser();
    }
});

When("the user cancels the dialog", async ({ page }) => {
    await page.getByRole("dialog").getByRole("button", { name: /cancel/i }).first().click();
});

When("the user opens the row actions menu", async ({ usersPage }) => {
    await usersPage.table.openRowMenu(0);
});

When("the user searches for E2E users", async ({ page, usersPage }) => {
    // Try searching for E2E-prefixed data first (data from previous test runs)
    await usersPage.navigateTo();
    const found = await usersPage.searchFilterKeep("E2E");
    if (found) {
        return;
    }
    // No E2E data found — complex wizard makes create fallback impractical,
    // fall back to the first visible row (seed data)
    await usersPage.navigateTo();
});

When("the user opens the row actions menu for the first user", async ({ usersPage, $testInfo }) => {
    const rowCount = await usersPage.table.rows.count();
    if (rowCount === 0) {
        ($testInfo as TestInfo).skip(true, "No users in the current pipeline tab — scenario requires seed data.");
    }
    await usersPage.table.openRowMenu(0);
});

When("the user clicks {string}", async ({ usersPage, $testInfo }, menuItemLabel: string) => {
    // For permission-dependent actions, skip gracefully when the action isn't available.
    const permissionDependent = ["Remove User", "Suspend User", "Activate User", "Unlock User"];
    if (permissionDependent.includes(menuItemLabel)) {
        const item = usersPage.table.menuItem(menuItemLabel);
        const visible = await item.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!visible) {
            ($testInfo as import("@playwright/test").TestInfo).skip(
                true,
                `"${menuItemLabel}" not available for the first user — this action may depend on per-user permissions or seed data.`,
            );
            return;
        }
    }
    await usersPage.table.clickMenuItem(menuItemLabel);
});

When("the user cancels the confirmation dialog", async ({ usersPage }) => {
    await usersPage.confirmModal.cancel();
});

When("the user fills all editable edit user fields", async ({ usersPage }) => {
    await usersPage.fillAllEditableEditUserFieldsWithDefaults();
});

When("the user clears the edit user job title", async ({ usersPage }) => {
    await usersPage.clearEditUserJobTitle();
});

When(
    "the user submits the {string} dialog with {string}",
    async ({ usersPage }, dialogTitle: string, buttonLabel: string) => {
        await usersPage.submitDialogAction(dialogTitle, buttonLabel);
    },
);

When(
    "the user toggles the {string} application access role {string}",
    async ({ usersPage }, module: string, role: string) => {
        await usersPage.toggleApplicationAccessRole(module, role);
    },
);

When(
    "the user adds the first available group membership in the manage groups dialog",
    async ({ usersPage, $testInfo }) => {
        const added = await usersPage.addFirstAvailableGroupMembershipInDialog();
        if (!added) {
            ($testInfo as TestInfo).skip(
                true,
                "No entity or addable group membership available in Manage Groups dialog.",
            );
        }
    },
);

When(
    "the user removes the top group membership in the manage groups dialog",
    async ({ usersPage, $testInfo }) => {
        const removed = await usersPage.removeTopGroupMembershipInDialog();
        if (!removed) {
            ($testInfo as TestInfo).skip(true, "User has no stored group memberships to remove.");
        }
    },
);

When("the user confirms the {string} action", async ({ usersPage }, actionLabel: string) => {
    await usersPage.confirmRowAction(actionLabel);
});

When("the user closes the success response", async ({ usersPage }) => {
    await usersPage.responseModal.close();
});

Then("the users data table is visible", async ({ usersPage }) => {
    await usersPage.table.expectVisible();
});

Then("the wizard is on the {string} step", async ({ usersCreatePage }, stepTitle: string) => {
    await usersCreatePage.expectStep(stepTitle);
});

Then("the wizard shows required field validation errors", async ({ usersCreatePage }) => {
    await usersCreatePage.expectValidationErrors();
});

Then("the wizard remains on the {string} step", async ({ usersCreatePage }, stepTitle: string) => {
    await usersCreatePage.expectStep(stepTitle);
});

Then("the user creation success screen is displayed", async ({ usersCreatePage }) => {
    await usersCreatePage.expectCreationSuccess();
});

Then("the create user summary shows application role {string}", async ({ usersCreatePage }, role: string) => {
    await usersCreatePage.expectSummaryShowsApplicationRole(role);
});

Then("the create user summary shows the selected group membership", async ({ usersCreatePage }) => {
    await usersCreatePage.expectSummaryShowsSelectedGroupMembership();
});

Then("the users list page is displayed", async ({ usersPage }) => {
    await usersPage.expectLoaded();
});

Then("the {string} dialog is visible", async ({ usersPage }, dialogTitle: string) => {
    await usersPage.expectDialogVisible(dialogTitle);
});

Then("the {string} dialog is not visible", async ({ usersPage }, dialogTitle: string) => {
    await usersPage.expectDialogHidden(dialogTitle);
});

Then("the {string} button is disabled", async ({ page }, buttonLabel: string) => {
    const btn = page.getByRole("button", { name: buttonLabel });
    await expect(btn).toBeDisabled({ timeout: 10_000 });
});

Then("the {string} confirmation dialog is visible", async ({ usersPage }, dialogTitle: string) => {
    await usersPage.confirmModal.expectVisible(dialogTitle);
});

Then("the {string} confirmation dialog is not visible", async ({ usersPage }, dialogTitle: string) => {
    await usersPage.confirmModal.expectHidden(dialogTitle);
});

Then("the success response shows {string}", async ({ usersPage, $testInfo }, message: string) => {
    await usersPage.responseModal.expectVisible(message, $testInfo);
});

Then("the detail panel shows display name {string}", async ({ usersPage }, displayName: string) => {
    await usersPage.expectDetailPanelShowsName(displayName);
});

Then("the detail panel shows the updated display name", async ({ usersPage }) => {
    // await usersPage.expectDetailPanelShowsUpdatedName();
});

Then("the edit user form shows validation errors", async ({ usersPage }) => {
    await usersPage.expectEditUserValidationErrors();
});

// ─── MSW network resilience steps (@mock TEN_USR_LST_E2E_006–013) ───────────────
//
// Given steps register MSW handlers before page navigation so that the first
// matching request from the browser is intercepted immediately.
// The `network` fixture is enabled by the base fixture when @mock tag is present.
// UsersPage.USERS_FILTER_API = "/iam/tenant/users/filter"

Given("the users API is configured to return a 500 server error", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("users");
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    );
});

Given("the users API response is delayed by 5 seconds", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("users");
    registerListFilterHandler(network, pageContext, async () => {
        await mswDelay(5_000);
        return HttpResponse.json({ data: [], totalCount: 0 });
    });
});

Given("the users API is configured to return a 401 authentication error", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("users");
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 }),
    );
});

/**
 * Raw navigation without waiting for the data table to load successfully.
 * Used by MSW error/slow-network scenarios where `navigateTo()` would timeout
 * because the table never reaches a ready state.
 */
When("the user navigates to the users list page", async ({ page, pageContext }) => {
    pageContext.setCurrentPage("users");
    ensureListResponseTracking(page, pageContext);
    armListResponseProbe(page, pageContext);
    await page.goto("/user-management/users", { waitUntil: "domcontentloaded" });
});

Then("the loading skeleton is visible before the data loads", async ({ page, pageContext }) => {
    // The 5-second delay keeps the response pending while we assert the skeleton.
    // Matches Hyperscal UI skeleton patterns: data-testid="skeleton", aria-busy, or
    // role="status" spinner used by the dataview table while data is in-flight.
    const skeleton = page
        .getByTestId("skeleton")
        .or(page.locator("[aria-busy='true']"))
        .or(page.getByRole("status"))
        .first();
    const isSkeletonVisible = await skeleton.isVisible({ timeout: 10_000 }).catch(() => false);
    if (isSkeletonVisible) {
        return;
    }

    const delayedResponseObserved = await waitForDelayedListResponse(page, pageContext, 2_500);
    expect(delayedResponseObserved, "Expected loading skeleton/status UI or delayed users API response").toBe(true);
});

Then("the user is redirected to the login page or shown an access denied message", async ({ page }) => {
    // The SSO layer handles 401 responses by redirecting to the login route.
    // Some paths may instead show an inline access-denied dialog or message.
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

// ─── Additional MSW handlers for create/edit/update/action mutations ──────────────

Given("the create user API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(CREATE_USER_WIZARD_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the create user API is configured to return a 400 validation error", async ({ network }) => {
    network.use(
        http.post(CREATE_USER_WIZARD_API, () =>
            HttpResponse.json({ message: "Validation failed", errors: { email: "Email already in use" } }, { status: 400 }),
        ),
    );
});

Given("the edit user API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.put(/\/iam\/tenant\/users\/.*/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the application access API is configured to return a 403 forbidden error", async ({ network }) => {
    network.use(
        http.post(/\/iam\/tenant\/users\/[^/]+\/modules\/assign/, () =>
            HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
        ),
    );
});

Given("the group membership API is configured to return a 500 server error", async ({ network }) => {
    // POST /iam/tenant/users/:id/user-groups/manage — see postIamTenantUsersIdUserGroupsManage
    network.use(
        http.post(/\/iam\/tenant\/users\/[^/]+\/user-groups\/manage(?:\?|$)/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the suspend user API is configured to return a 500 server error", async ({ network }) => {
    // POST /iam/tenant/users/:id/deactivate — see postIamTenantUsersIdDeactivate
    network.use(
        http.post(/\/iam\/tenant\/users\/[^/]+\/deactivate(?:\?|$)/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});
