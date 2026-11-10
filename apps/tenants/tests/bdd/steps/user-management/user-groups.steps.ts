import type { TestInfo } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import { test } from "../../fixtures/base.fixture";
import { http, HttpResponse } from "msw";
import {
    armListResponseProbe,
    ensureListResponseTracking,
    registerListFilterHandler,
} from "../../utils/list-page-network-utils";

const { Given, When, Then } = createBdd(test);

Given("the user is on the user groups list page", async ({ pageContext, userGroupsPage }) => {
    pageContext.setCurrentPage("user-groups");
    await userGroupsPage.navigateToList();
});

Given("the user group detail panel is open", async ({ pageContext, userGroupsPage }) => {
    pageContext.setCurrentPage("user-groups");
    await userGroupsPage.ensureDetailPanelOpen();
});

Given("the user navigates to a valid user group details route", async ({ pageContext, userGroupsPage }) => {
    pageContext.setCurrentPage("user-groups");
    await userGroupsPage.navigateToValidDetailsRoute();
});

Given("the user navigates to a valid user group members route", async ({ pageContext, userGroupsPage }) => {
    pageContext.setCurrentPage("user-groups");
    await userGroupsPage.navigateToValidMembersRoute();
});

Given(/^the user navigates to \/user-management\/user-groups\/:id$/, async ({ pageContext, userGroupsPage }) => {
    pageContext.setCurrentPage("user-groups");
    await userGroupsPage.navigateToBaseUserGroupIdRoute();
});

When("the user opens the first user group row actions menu", async ({ userGroupsPage }) => {
    await userGroupsPage.openFirstRowActionsMenu();
});

When("the user opens the create user group dialog", async ({ userGroupsPage }) => {
    await userGroupsPage.openCreateDialog();
});

When("the user cancels the create user group dialog", async ({ userGroupsPage }) => {
    await userGroupsPage.cancelCreateDialog();
});

When("the user clicks save without filling required fields", async ({ userGroupsPage }) => {
    await userGroupsPage.clickCreateSaveWithoutRequiredFields();
});

When("the user opens the detail panel from the first row", async ({ userGroupsPage }) => {
    await userGroupsPage.openDetailPanelFromFirstRow();
});

When("the user opens the group membership dialog from the detail panel", async ({ userGroupsPage }) => {
    await userGroupsPage.openGroupMembershipDialogFromDetailPanel();
});

When("the user cancels the group membership dialog", async ({ userGroupsPage }) => {
    await userGroupsPage.cancelGroupMembershipDialog();
});

When("the user opens edit user group from the first row actions menu", async ({ userGroupsPage }) => {
    await userGroupsPage.openEditFromFirstRowActionsMenu();
});

When("the user cancels the edit user group dialog", async ({ userGroupsPage }) => {
    await userGroupsPage.cancelEditDialog();
});

When("the user opens delete user group from the first row actions menu", async ({ userGroupsPage }) => {
    await userGroupsPage.openDeleteFromFirstRowActionsMenu();
});

Given("the first E2E user group has at least one member", async ({ userGroupsPage }) => {
    await userGroupsPage.openDetailPanelFromFirstRow();
    await userGroupsPage.openGroupMembershipDialogFromDetailPanel();
    await userGroupsPage.addFirstAvailableUserFromMembershipDialog();
    await userGroupsPage.expectGroupUpdatedResponseModalVisible();
    await userGroupsPage.closeGroupUpdatedResponseModal();
    // Close the detail panel so subsequent row-actions steps are unblocked
    await userGroupsPage.closeDetailPanel();
});

// ─── E2E-search-first mutation pattern ──────────────────────────

When("the user searches for E2E user groups", async ({ page, userGroupsPage }) => {
    await userGroupsPage.navigateToList();
    const found = await userGroupsPage.searchFilterKeep("E2E");
    if (found) {
        return;
    }
    // No E2E data found — create one, then search for it
    await userGroupsPage.fillAndSubmitCreateDialogWithFirstAvailableDomainType();
    await userGroupsPage.expectCreateSuccessToast();
    await userGroupsPage.navigateToList();
    await userGroupsPage.searchFilterKeep("E2E");
});

When("the user opens the user group detail panel from the first E2E result", async ({ userGroupsPage }) => {
    await userGroupsPage.openDetailPanelFromFirstRow();
});

When("the user opens edit user group from the first E2E result row actions menu", async ({ userGroupsPage }) => {
    await userGroupsPage.table.openRowMenu(0);
    await userGroupsPage.table.clickMenuItem("Edit");
});

When("the user opens delete user group from the first E2E result row actions menu", async ({ userGroupsPage }) => {
    await userGroupsPage.table.openRowMenu(0);
    await userGroupsPage.table.clickMenuItem("Delete");
});

When("the user cancels the delete user group confirmation dialog", async ({ userGroupsPage }) => {
    await userGroupsPage.cancelDeleteConfirmation();
});

When("the user clicks save without changing details", async ({ userGroupsPage }) => {
    await userGroupsPage.clickSaveWithoutChangingDetails();
});

Then("the user groups data table is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectTableVisible();
});

Then("the search input is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectSearchInputVisible();
});

Then("the create new user group action is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectCreateActionVisible();
});

Then("the row actions menu is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectRowActionsMenuVisible();
});

Then("the menu shows {string}", async ({ userGroupsPage }, label: string) => {
    await userGroupsPage.expectRowMenuItemVisible(label);
});

Then("the open row actions menu shows at least one available group action", async ({ userGroupsPage }) => {
    await userGroupsPage.expectAtLeastOneRowActionVisible();
});

Then("the create user group dialog is not visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectCreateDialogHidden();
});

Then("validation feedback is shown on required fields", async ({ userGroupsPage }) => {
    await userGroupsPage.expectRequiredValidationFeedback();
});

Then("the user group detail panel is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectDetailPanelVisible();
});

Then("the user group detail panel is not visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectDetailPanelHidden();
});

Then("the panel shows the {string} tab", async ({ userGroupsPage }, tabName: string) => {
    await userGroupsPage.expectPanelTabVisible(tabName);
});

Then("the group membership dialog is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectGroupMembershipDialogVisible();
});

Then("the {string} button is disabled when no changes are made", async ({ userGroupsPage }, _buttonLabel: string) => {
    await userGroupsPage.expectSaveChangesDisabled();
});

Then("the group membership dialog is not visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectGroupMembershipDialogHidden();
});

Then("the edit user group dialog is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectEditDialogVisible();
});

Then("the edit user group dialog is not visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectEditDialogHidden();
});

Then("the delete user group confirmation dialog is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectDeleteConfirmationVisible();
});

Then("the delete user group confirmation dialog is not visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectDeleteConfirmationHidden();
});

Then("the details form is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectDetailsFormVisible();
});

Then("the save action is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectSaveActionVisible();
});

Then("the delete user group action is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectDeleteActionVisible();
});

Then("an update error is shown", async ({ userGroupsPage }) => {
    await userGroupsPage.expectUpdateErrorShown();
});

Then("the users section header is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectUsersSectionHeaderVisible();
});

Then("the members table area is visible", async ({ userGroupsPage }) => {
    await userGroupsPage.expectMembersTableAreaVisible();
});

Then(/^the app redirects to \/iam\/user-groups\/:id\/details$/, async ({ userGroupsPage }) => {
    await userGroupsPage.expectRedirectedToIamDetailsPath();
});

Then("the redirected page shows not found", async ({ userGroupsPage }) => {
    await userGroupsPage.expectPageNotFoundVisible();
});

// ─── CREATE MUTATION ─────────────────────────────────────────────────────────

When("the user fills and submits the create user group form with domain type {string}", async ({ userGroupsPage }, domainType: string) => {
    await userGroupsPage.fillAndSubmitCreateDialogWithDomainType(domainType);
});

When("the user fills and submits the create user group form with the first available domain type", async ({ userGroupsPage }) => {
    await userGroupsPage.fillAndSubmitCreateDialogWithFirstAvailableDomainType();
});

Then("the create user group success toast is shown", async ({ userGroupsPage }) => {
    await userGroupsPage.expectCreateSuccessToast();
});

// ─── EDIT MUTATION ────────────────────────────────────────────────────────────

When("the user updates the user group name and saves", async ({ userGroupsPage }) => {
    await userGroupsPage.updateUserGroupNameAndSave();
});

Then("the edit user group success toast is shown", async ({ userGroupsPage }) => {
    await userGroupsPage.expectEditSuccessToast();
});

// ─── DELETE MUTATION ─────────────────────────────────────────────────────────

When("the user confirms the user group deletion", async ({ userGroupsPage }) => {
    await userGroupsPage.confirmUserGroupDeletion();
});

Then("the delete user group success toast is shown", async ({ userGroupsPage }) => {
    await userGroupsPage.expectDeleteSuccessToast();
});

// ─── ADD MEMBER MUTATION ──────────────────────────────────────────────────────

When("the user adds the first available user from the membership dialog", async ({ userGroupsPage }) => {
    await userGroupsPage.addFirstAvailableUserFromMembershipDialog();
});

Then("the group updated response modal is shown", async ({ userGroupsPage }) => {
    await userGroupsPage.expectGroupUpdatedResponseModalVisible();
});

When("the user closes the group updated response modal", async ({ userGroupsPage }) => {
    await userGroupsPage.closeGroupUpdatedResponseModal();
});

// ─── REMOVE MEMBER MUTATION ───────────────────────────────────────────────────

Given("the detail panel Members tab has at least one member", async ({ userGroupsPage, $testInfo }) => {
    await userGroupsPage.ensureMembersTabHasMembers($testInfo as TestInfo);
});

When("the user removes the first member from the detail panel Members tab", async ({ userGroupsPage }) => {
    await userGroupsPage.removeFirstMemberFromDetailPanelMembersTab();
});

Then("the member removal success toast is shown", async ({ userGroupsPage }) => {
    await userGroupsPage.expectMemberRemovalToast();
});

// ─── MSW handlers for user group mutations ────────────────────────────────────

Given("the user groups API is configured to return a 500 server error", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("user-groups");
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
    );
});

Given("the create user group API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/iam\/tenant\/user-groups/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the edit user group API is configured to return a 500 server error", async ({ network }) => {
    // PATCH /iam/tenant/user-groups/:id — see patchIamTenantUserGroupsId
    network.use(
        http.patch(/\/iam\/tenant\/user-groups\/[^/]+(?:\?|$)/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the delete user group API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.delete(/\/iam\/tenant\/user-groups\/.*/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

Given("the user group members API is configured to return a 500 server error", async ({ network }) => {
    // POST /iam/tenant/user-groups/:id/members — see postIamTenantUserGroupsIdMembers
    network.use(
        http.post(/\/iam\/tenant\/user-groups\/[^/]+\/members(?:\?|$)/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

When("the user navigates to the user groups list page", async ({ page, pageContext }) => {
    pageContext.setCurrentPage("user-groups");
    ensureListResponseTracking(page, pageContext);
    armListResponseProbe(page, pageContext);
    await page.goto("/user-management/user-groups", { waitUntil: "domcontentloaded" });
});
