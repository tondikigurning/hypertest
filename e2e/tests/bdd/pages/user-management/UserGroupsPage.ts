import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect } from "@playwright/test";
import { ConfirmModalComponent } from "../../components/ConfirmModalComponent";
import { DataTableComponent } from "../../components/DataTableComponent";
import { DetailPanelComponent } from "../../components/DetailPanelComponent";
import { FilterComponent } from "../../components/FilterComponent";
import type { FilterResult, SortResult } from "../../components/filter/filter-types";
import { ensureListPageCleanState, waitForListTableRows } from "../../utils/list-page-network-utils";
import {
    USER_GROUPS_FILTER_API,
    USER_GROUPS_LIST_PATH,
} from "../../utils/list-page-constants";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";

/**
 * Gets the most recent business day (yesterday, or previous Friday if weekend).
 * Returns date in YYYY-MM-DD format for date filters.
 */
function getMostRecentBusinessDay(): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dayOfWeek = yesterday.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0) {
        // Sunday, go back to Friday
        yesterday.setDate(yesterday.getDate() - 2);
    } else if (dayOfWeek === 6) {
        // Saturday, go back to Friday
        yesterday.setDate(yesterday.getDate() - 1);
    }

    return yesterday.toISOString().split('T')[0];
}

export class UserGroupsPage {
  static readonly USER_GROUPS_FILTER_API = USER_GROUPS_FILTER_API;

  readonly table: DataTableComponent;
  readonly detailPanel: DetailPanelComponent;
  readonly confirmModal: ConfirmModalComponent;
  readonly filters: FilterComponent;

  private selectedUserGroupId: string | null = null;

  lastSearchKeyword: string | null = null;
  lastSearchMatched = false;
  lastFilterResults: FilterResult[] = [];
  lastSortResults: SortResult[] = [];

  constructor(private readonly page: Page) {
    this.table = new DataTableComponent(page);
    this.detailPanel = new DetailPanelComponent(page);
    this.confirmModal = new ConfirmModalComponent(page);
    this.filters = new FilterComponent(page);
  }

  private get searchInput(): Locator {
    return this.page.getByRole("textbox", { name: /search/i }).first();
  }

  private get createNewAction(): Locator {
    return this.page.getByRole("button", { name: /create new/i }).first();
  }

  private get createDialog(): Locator {
    return this.page.getByRole("dialog").filter({ hasText: /create user group/i }).first();
  }

  private get editDialog(): Locator {
    return this.page.getByRole("dialog", { name: /edit user group/i });
  }

  private get groupMembershipDialog(): Locator {
    // DialogHeader title is "Manage Member" (user-groups-members-add).
    return this.page.getByRole("dialog").filter({ hasText: /manage member/i }).first();
  }

  private get detailsForm(): Locator {
    return this.page.getByRole("heading", { name: /^details$/i });
  }

  private get saveButton(): Locator {
    return this.page.getByRole("button", { name: /^save$/i }).first();
  }

  private get deleteUserGroupButton(): Locator {
    return this.page.getByRole("button", { name: /delete user group/i }).first();
  }

  private async setSelectedIdFromUrlQuery(): Promise<void> {
    const currentUrl = new URL(this.page.url());
    const id = currentUrl.searchParams.get("id");
    if (!id) {
      throw new Error("Expected query parameter id after opening a user group detail panel.");
    }
    this.selectedUserGroupId = id;
  }

  private async resolveFirstUserGroupId(): Promise<string | null> {
    if (this.selectedUserGroupId) {
      return this.selectedUserGroupId;
    }

    await this.navigateToList();
    await this.table.expectHasRows();
    await this.table.openRowDetail(0);
    await this.page.waitForURL(/id=/, { timeout: 20_000 });
    await this.setSelectedIdFromUrlQuery();

    return this.selectedUserGroupId;
  }

  private async clickFormDropdown(btn: Locator): Promise<void> {
    const bbox = await btn.boundingBox();
    if (bbox) {
      await this.page.mouse.click(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
    } else {
      await btn.dispatchEvent("click");
    }
    await this.page.locator('[role="menu"][data-state="open"]').first().waitFor({ state: "visible", timeout: 10_000 });
  }

  async navigateToList(): Promise<void> {
    await this.page.goto(USER_GROUPS_LIST_PATH, { waitUntil: "domcontentloaded" });
    await this.page.waitForURL(/\/user-management\/user-groups/, { timeout: 30_000 });
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    await dismissTencentWorkbenchIfPresent(this.page);

    if (await this.detailPanel.isVisible()) {
      await this.detailPanel.close();
    }

    await this.page.keyboard.press("Escape");
    await this.table.expectVisible();
    await ensureListPageCleanState(this.page, UserGroupsPage.USER_GROUPS_FILTER_API);
    await waitForListTableRows(this.page, UserGroupsPage.USER_GROUPS_FILTER_API);
  }

  async expectTableVisible(): Promise<void> {
    await this.table.expectVisible();
  }

  async expectSearchInputVisible(): Promise<void> {
    await expect(this.searchInput).toBeVisible({ timeout: 10_000 });
  }

  async expectCreateActionVisible(): Promise<void> {
    await expect(this.createNewAction).toBeVisible({ timeout: 10_000 });
  }

  async openFirstRowActionsMenu(): Promise<void> {
    await this.table.openRowMenu(0);
  }

  async expectRowActionsMenuVisible(): Promise<void> {
    await expect(this.openRowActionsMenu()).toBeVisible({ timeout: 10_000 });
  }

  async expectRowMenuItemVisible(label: string): Promise<void> {
    await expect(this.openRowActionsMenu().getByRole("menuitem", { name: label, exact: true })).toBeVisible({
      timeout: 10_000,
    });
  }

  /**
   * Edit / Delete are gated by IAM permissions and per-row `actions` flags.
   * Assert the open kebab exposes at least one of the known group actions.
   */
  async expectAtLeastOneRowActionVisible(): Promise<void> {
    const menu = this.openRowActionsMenu();
    await expect(menu).toBeVisible({ timeout: 10_000 });

    const knownActions = ["Edit", "Manage Members", "Delete"] as const;
    await expect(async () => {
      for (const label of knownActions) {
        if (await menu.getByRole("menuitem", { name: label, exact: true }).isVisible().catch(() => false)) {
          return;
        }
      }
      throw new Error(`Expected one of [${knownActions.join(", ")}] in the open row actions menu.`);
    }).toPass({ timeout: 10_000 });
  }

  private openRowActionsMenu(): Locator {
    return this.page.locator('[data-slot="dropdown-menu-content"][role="menu"][data-state="open"]');
  }

  private rowActionMenuItem(label: string): Locator {
    return this.openRowActionsMenu().getByRole("menuitem", { name: label, exact: true });
  }

  async openCreateDialog(): Promise<void> {
    if (await this.createDialog.isVisible().catch(() => false)) {
      return;
    }

    await expect(this.createNewAction).toBeVisible({ timeout: 20_000 });
    await this.createNewAction.click({ force: true });
    await expect(this.createDialog).toBeVisible({ timeout: 20_000 });
  }

  async cancelCreateDialog(): Promise<void> {
    await this.createDialog.getByRole("button", { name: /^cancel$/i }).click();
    await expect(this.createDialog).not.toBeVisible({ timeout: 10_000 });
  }

  async expectCreateDialogHidden(): Promise<void> {
    await expect(this.createDialog).not.toBeVisible({ timeout: 10_000 });
  }

  async clickCreateSaveWithoutRequiredFields(): Promise<void> {
    await this.createDialog.getByRole("button", { name: /^save$/i }).click({ force: true });
  }

  async expectRequiredValidationFeedback(): Promise<void> {
    const explicitValidation = this.createDialog.locator('[data-testid="error-text"], [role="alert"]');
    const invalidFields = this.createDialog.locator('[aria-invalid="true"]');
    const saveButton = this.createDialog.getByRole("button", { name: /^save$/i });

    await expect
      .poll(async () => {
        const hasExplicitValidation = (await explicitValidation.count()) > 0;
        const hasInvalidField = (await invalidFields.count()) > 0;
        const isSaveDisabled = await saveButton.isDisabled().catch(() => false);
        const dialogStillOpen = await this.createDialog.isVisible().catch(() => false);
        return hasExplicitValidation || hasInvalidField || isSaveDisabled || dialogStillOpen;
      }, { timeout: 10_000 })
      .toBeTruthy();
  }

  async openDetailPanelFromFirstRow(): Promise<void> {
    await this.table.expectHasRows();
    const maxAttempts = Math.min(await this.table.rows.count(), 8);

    for (let rowIndex = 0; rowIndex < maxAttempts; rowIndex++) {
      await this.table.openRowDetail(rowIndex);

      const opened = await this.page
        .waitForURL(/[?&]id=/, { timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      if (!opened) {
        continue;
      }

      await this.setSelectedIdFromUrlQuery();
      const panelVisible = await this.detailPanel.isVisible().catch(() => false);
      if (panelVisible) {
        return;
      }

      // URL updated but panel not painted yet.
      await this.expectDetailPanelVisible();
      return;
    }

    throw new Error(
      "Could not open the user group detail panel — no list row opened a panel (check view_details permissions / seed data).",
    );
  }

  async ensureDetailPanelOpen(): Promise<void> {
    if (await this.detailPanel.isVisible()) {
      return;
    }
    await this.openDetailPanelFromFirstRow();
  }

  // Shared-step API compatibility
  async openDetailPanel(): Promise<void> {
    await this.openDetailPanelFromFirstRow();
  }

  async clickDetailPanelTab(tabName: string): Promise<void> {
    await this.detailPanel.clickTab(tabName, 10_000);
  }

  async closeDetailPanel(): Promise<void> {
    await this.detailPanel.close();
  }

  async expectDetailPanelVisible(): Promise<void> {
    await this.detailPanel.expectVisible();
  }

  async expectDetailPanelHidden(): Promise<void> {
    await this.detailPanel.expectHidden();
  }

  async expectDetailPanelHasTitle(): Promise<void> {
    await this.detailPanel.expectHasTitle();
  }

  async expectDetailTabContentVisible(tabName: string): Promise<void> {
    await this.detailPanel.expectTabContentVisible(tabName, 10_000);
  }

  async expectPanelTabVisible(tabName: string): Promise<void> {
    await this.detailPanel.expectTabVisible(tabName);
  }

  async openGroupMembershipDialogFromDetailPanel(): Promise<void> {
    await this.detailPanel.headerButton(/^manage members$/i).click({ force: true });
    await expect(this.groupMembershipDialog).toBeVisible({ timeout: 20_000 });
  }

  async expectGroupMembershipDialogVisible(): Promise<void> {
    await expect(this.groupMembershipDialog).toBeVisible({ timeout: 10_000 });
  }

  async expectSaveChangesDisabled(): Promise<void> {
    await expect(this.groupMembershipDialog.getByRole("button", { name: /save changes/i })).toBeDisabled({
      timeout: 10_000,
    });
  }

  async cancelGroupMembershipDialog(): Promise<void> {
    await this.groupMembershipDialog.getByRole("button", { name: /^cancel$/i }).click();
  }

  async expectGroupMembershipDialogHidden(): Promise<void> {
    await expect(this.groupMembershipDialog).not.toBeVisible({ timeout: 10_000 });
  }

  async openEditFromFirstRowActionsMenu(): Promise<void> {
    await this.table.clickMenuItem("Edit");
  }

  async expectEditDialogVisible(): Promise<void> {
    await expect(this.editDialog).toBeVisible({ timeout: 10_000 });
  }

  async cancelEditDialog(): Promise<void> {
    await this.editDialog.getByRole("button", { name: /^cancel$/i }).click();
  }

  async expectEditDialogHidden(): Promise<void> {
    await expect(this.editDialog).not.toBeVisible({ timeout: 10_000 });
  }

  async openDeleteFromFirstRowActionsMenu(): Promise<void> {
    await this.table.clickMenuItem("Delete");
  }

  async expectDeleteConfirmationVisible(): Promise<void> {
    await this.confirmModal.expectVisible("Delete User Group");
  }

  async cancelDeleteConfirmation(): Promise<void> {
    await this.confirmModal.cancel();
  }

  async expectDeleteConfirmationHidden(): Promise<void> {
    await this.confirmModal.expectHidden("Delete User Group");
  }

  async navigateToValidDetailsRoute(): Promise<void> {
    const id = await this.resolveFirstUserGroupId();
    await this.page.goto(`/user-management/user-groups/${id}/details`, { waitUntil: "domcontentloaded" });
    await this.page.waitForURL(new RegExp(`/user-management/user-groups/${id}/details$`), { timeout: 30_000 });
    await dismissTencentWorkbenchIfPresent(this.page);
  }

  async expectDetailsFormVisible(): Promise<void> {
    await expect(this.detailsForm).toBeVisible({ timeout: 10_000 });
  }

  async expectSaveActionVisible(): Promise<void> {
    await expect(this.saveButton).toBeVisible({ timeout: 10_000 });
  }

  async expectDeleteActionVisible(): Promise<void> {
    await expect(this.deleteUserGroupButton).toBeVisible({ timeout: 10_000 });
  }

  async clickSaveWithoutChangingDetails(): Promise<void> {
    await this.saveButton.click();
  }

  async expectUpdateErrorShown(): Promise<void> {
    const errorToast = this.page
      .getByRole("region", { name: /notifications/i })
      .locator(':text-matches("error updating user group|an error occurred", "i")')
      .first();
    await expect(errorToast).toBeVisible({ timeout: 20_000 });
  }

  async navigateToValidMembersRoute(): Promise<void> {
    const id = await this.resolveFirstUserGroupId();
    await this.page.goto(`/user-management/user-groups/${id}/members`, { waitUntil: "domcontentloaded" });
    await this.page.waitForURL(new RegExp(`/user-management/user-groups/${id}/members`), { timeout: 30_000 });
    await dismissTencentWorkbenchIfPresent(this.page);
  }

  async expectUsersSectionHeaderVisible(): Promise<void> {
    await expect(this.page.getByText(/^Users$/).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectMembersTableAreaVisible(): Promise<void> {
    await expect(this.page.locator("table").first()).toBeVisible({ timeout: 10_000 });
  }

  async navigateToBaseUserGroupIdRoute(): Promise<void> {
    const id = await this.resolveFirstUserGroupId();
    await this.page.goto(`/user-management/user-groups/${id}`, { waitUntil: "domcontentloaded" });
  }

  async expectRedirectedToIamDetailsPath(): Promise<void> {
    const id = await this.resolveFirstUserGroupId();
    await expect
      .poll(() => new URL(this.page.url()).pathname, { timeout: 20_000 })
      .toBe(`/iam/user-groups/${id}/details`);
  }

  async expectPageNotFoundVisible(): Promise<void> {
    await expect(this.page.getByText(/page not found/i)).toBeVisible({ timeout: 10_000 });
  }

  // Shared filter/sort API compatibility

  async getFirstRowFieldValue(_field: string): Promise<string> {
    return this.getFirstRowDisplayName();
  }

  async getFirstRowDisplayName(): Promise<string> {
    // Wait for the table to be ready and have rows
    await this.table.expectVisible();
    await expect(async () => {
      const rowCount = await this.table.rows.count();
      expect(rowCount).toBeGreaterThan(0);
    }).toPass({ timeout: 15_000 });

    // Try to get the display name from the row link
    try {
      const name = await this.table.rowDisplayNameLink(0).textContent({ timeout: 10_000 });
      if (name?.trim()) {
        return name.trim();
      }
    } catch {
      // Fall through to cell text fallback.
    }

    // Fallback: get text from the first row's first cell
    try {
      const firstRowText = await this.table.rows.first().locator('td').first().textContent({ timeout: 10_000 });
      if (firstRowText?.trim()) {
        return firstRowText.trim();
      }
    } catch {
      // Fall through to error below.
    }

    throw new Error("No group name found in the first table row using available methods.");
  }

  async buildFilterFieldValuesFromFirstRow(): Promise<Record<string, string>> {
    const groupName = await this.getFirstRowDisplayName();
    const recentBusinessDay = getMostRecentBusinessDay();

    return {
      created_at: recentBusinessDay,
      resource_uuid: "",
      name: groupName,
      updated_at: recentBusinessDay,
    };
  }

  async searchFilter(value: string): Promise<boolean> {
    this.lastSearchKeyword = value;
    this.lastSearchMatched = await this.filters.searchFilter(UserGroupsPage.USER_GROUPS_FILTER_API, value);
    return this.lastSearchMatched;
  }

  /** Search without clearing the filter afterwards — keeps the result set active. */
  async searchFilterKeep(value: string): Promise<boolean> {
    this.lastSearchKeyword = value;
    this.lastSearchMatched = await this.filters.searchFilterKeep(UserGroupsPage.USER_GROUPS_FILTER_API, value);
    return this.lastSearchMatched;
  }

  async applyAllFilters(fieldValues?: Record<string, string>): Promise<FilterResult[]> {
    this.lastFilterResults = await this.filters.applyAllFilters(UserGroupsPage.USER_GROUPS_FILTER_API, fieldValues);
    return this.lastFilterResults;
  }

  async applySingleFilter(filterOption: string, fieldValues?: Record<string, string>): Promise<FilterResult[]> {
    this.lastFilterResults = await this.filters.applySingleFilter(
      UserGroupsPage.USER_GROUPS_FILTER_API,
      filterOption,
      fieldValues,
    );
    return this.lastFilterResults;
  }

  async applyAllSorts(): Promise<SortResult[]> {
    this.lastSortResults = await this.filters.applyAllSorts(UserGroupsPage.USER_GROUPS_FILTER_API);
    return this.lastSortResults;
  }

  // ─── CREATE MUTATION ──────────────────────────────────────────────────────

  /** Selects Domain Type (and Entity when required), then submits Create. */
  private async selectDomainTypeAndSubmit(domainTypeLabel: string): Promise<void> {
    const uniqueName = `E2E-UGP-${Date.now()}`;
    await this.createDialog.locator("input#name").fill(uniqueName);

    const domTypeBtn = this.createDialog.getByText("Select Domain Type");
    await this.clickFormDropdown(domTypeBtn);
    await this.page.getByRole("menuitem", { name: domainTypeLabel, exact: true }).click();
    await this.page.waitForTimeout(300);

    if (/entity/i.test(domainTypeLabel)) {
      const entityBtn = this.createDialog.getByText("Select Sub Tenant Unit");
      await this.clickFormDropdown(entityBtn);
      const openMenu = this.page.locator('[role="menu"][data-state="open"]').first();
      const noOptionsVisible = await openMenu.getByText(/no options found/i).isVisible().catch(() => false);
      if (!noOptionsVisible) {
        await openMenu.getByRole("menuitem").first().click();
        await this.page.waitForTimeout(200);
      } else {
        await this.page.keyboard.press("Escape");
      }
    }

    await this.createDialog.getByRole("button", { name: "Save" }).click();
  }

  /**
   * Opens Create (if needed), picks the first Domain Type option, and submits.
   * Safe when the dialog is already open from a prior step.
   */
  async fillAndSubmitCreateDialogWithFirstAvailableDomainType(): Promise<void> {
    await this.openCreateDialog();

    const uniqueName = `E2E-UGP-${Date.now()}`;
    await this.createDialog.locator("input#name").fill(uniqueName);

    const domTypeBtn = this.createDialog.getByText("Select Domain Type");
    await this.clickFormDropdown(domTypeBtn);
    const firstOption = this.page.locator('[role="menu"][data-state="open"]').getByRole("menuitem").first();
    await expect(firstOption).toBeVisible({ timeout: 10_000 });
    const domainTypeLabel = ((await firstOption.textContent()) ?? "").trim();
    if (!domainTypeLabel) {
      throw new Error("Domain Type dropdown has no selectable options.");
    }
    await firstOption.click();
    await this.page.waitForTimeout(300);

    if (/entity/i.test(domainTypeLabel)) {
      const entityBtn = this.createDialog.getByText("Select Sub Tenant Unit");
      await this.clickFormDropdown(entityBtn);
      const openMenu = this.page.locator('[role="menu"][data-state="open"]').first();
      const noOptionsVisible = await openMenu.getByText(/no options found/i).isVisible().catch(() => false);
      if (!noOptionsVisible) {
        await openMenu.getByRole("menuitem").first().click();
        await this.page.waitForTimeout(200);
      } else {
        await this.page.keyboard.press("Escape");
      }
    }

    await this.createDialog.getByRole("button", { name: "Save" }).click();
  }

  async fillAndSubmitCreateDialogWithDomainType(domainTypeLabel: string): Promise<void> {
    await this.openCreateDialog();
    await this.selectDomainTypeAndSubmit(domainTypeLabel);
  }

  async expectCreateSuccessToast(): Promise<void> {
    await expect(this.page.getByRole("region", { name: /notifications/i })).toContainText(/success creating user group/i, {
      timeout: 20_000,
    });
  }

  // ─── EDIT MUTATION ────────────────────────────────────────────────────────

  async updateUserGroupNameAndSave(): Promise<void> {
    await expect(this.editDialog).toBeVisible({ timeout: 10_000 });
    const newName = `E2E-UGP-Edited-${Date.now()}`;
    await this.editDialog.getByRole("textbox", { name: /user group name/i }).fill(newName);
    await this.editDialog.getByRole("button", { name: "Save" }).click();
    // Success path: toast step waits for success. Error path: dialog stays open with form banner.
  }

  async expectEditSuccessToast(): Promise<void> {
    await expect(this.page.getByRole("region", { name: /notifications/i })).toContainText(/success updating user group/i, {
      timeout: 20_000,
    });
  }

  // ─── DELETE MUTATION ──────────────────────────────────────────────────────

  async confirmUserGroupDeletion(): Promise<void> {
    const dlg = this.page.getByRole("dialog", { name: "Delete User Group" });
    await expect(dlg).toBeVisible({ timeout: 10_000 });
    await dlg.getByRole("button", { name: "Delete" }).click();
    await expect(dlg).not.toBeVisible({ timeout: 20_000 });
  }

  async expectDeleteSuccessToast(): Promise<void> {
    await expect(
      this.page.locator('[data-sonner-toast][data-type="success"]').filter({ hasText: /success deleting user group/i }),
    ).toBeVisible({ timeout: 20_000 });
  }

  // ─── MANAGE MEMBERS MUTATION (add) ───────────────────────────────────────

  async addFirstAvailableUserFromMembershipDialog(): Promise<void> {
    const dlg = this.groupMembershipDialog;
    await expect(dlg).toBeVisible({ timeout: 10_000 });
    const addBtn = dlg.getByRole("button", { name: /^Add /i }).first();
    await addBtn.waitFor({ state: "visible", timeout: 20_000 });
    await addBtn.click();
    const saveChanges = dlg.getByRole("button", { name: /save changes/i });
    await expect(saveChanges).toBeEnabled({ timeout: 10_000 });
    await saveChanges.click();
  }

  async expectGroupUpdatedResponseModalVisible(): Promise<void> {
    await expect(this.page.getByRole("dialog").filter({ hasText: /group updated/i })).toBeVisible({ timeout: 20_000 });
  }

  async closeGroupUpdatedResponseModal(): Promise<void> {
    const modal = this.page.getByRole("dialog").filter({ hasText: /group updated/i });
    await modal.getByRole("button", { name: "Close" }).click();
    await expect(modal).not.toBeVisible({ timeout: 10_000 });
  }

  // ─── MANAGE MEMBERS MUTATION (remove) ────────────────────────────────────

  async ensureMembersTabHasMembers(testInfo: TestInfo): Promise<void> {
    await this.detailPanel.tab("Members").click();
    await this.page.waitForTimeout(800);
    const rowCount = await this.detailPanel.root.locator("table tbody tr").count();
    if (rowCount === 0) {
      testInfo.skip(true, "User group has no members — scenario requires at least one existing member.");
    }
  }

  async removeFirstMemberFromDetailPanelMembersTab(): Promise<void> {
    const firstRow = this.detailPanel.root.locator("table tbody tr").first();
    await firstRow.getByRole("button").first().click();
    const confirmDlg = this.page.getByRole("dialog").filter({ hasText: /delete user/i }).first();
    await confirmDlg.waitFor({ state: "visible", timeout: 10_000 });
    await confirmDlg.getByRole("button", { name: "Delete" }).click();
    await confirmDlg.waitFor({ state: "hidden", timeout: 20_000 });
  }

  async expectMemberRemovalToast(): Promise<void> {
    await expect(this.page.getByRole("region", { name: /notifications/i })).toContainText(
      /users group members deleted successfully/i,
      { timeout: 20_000 },
    );
  }
}
