/**
 * POM — /iam/access-roles (list, filter, detail panel, CRUD dialogs, permission sets).
 *
 * Source-of-truth locators from production code:
 *  - Create button:   data-testid="btn_CreateAccessRole"
 *  - Create dialog:   data-testid="dab_CreateAccessRole"  (DialogWrapper)
 *  - Create confirm:  data-testid="btn_ConfirmCreateAccessRole"
 *  - Create cancel:   data-testid="btn_CancelCreateAccessRole"
 *  - Create form:     data-testid="frm_CreateAccessRole"
 *  - Edit dialog:     data-testid="dab_EditAccessRole"
 *  - Edit form:       data-testid="frm_EditAccessRole"
 *  - Edit/update:     data-testid="btn_UpdateAccessRole"
 *  - Edit cancel:     data-testid="btn_CancelEditAccessRole"
 *  - Kebab menu:      data-testid="mnu_AccessRoleActions"
 *  - Kebab items:     data-testid="opt_EditAccessRole", opt_DeleteAccessRole, opt_ManageAccessRolePermissionSets
 *  - Table:           data-testid="tbl_AccessRoles"
 *  - Page header:     data-testid="hdr_AccessRolesPageHeader"
 *  - Search input:    data-testid="filter-search-input"
 *  - Role type:       data-testid="dropdown-role_type_id"
 *  - Form placeholders: "Enter role name", "Enter role description", "Select access role type"
 *  - Create success:  DialogSuccess text "Access Role has been successfully created"
 *  - Success toast:   [data-sonner-toast][data-type="success"]
 *  - Detail panel:    DetailPanel.Title (heading), aria-label="Manage Permission Sets"
 *  - Manage Perm Sets dialog: Dialog title "Manage Permission Sets"
 *
 * NOTES:
 *  - Access-roles has NO pipeline tabs (confirmed via Playwright CLI exploration).
 *  - The Delete flow uses a permission-check dialog that auto-closes if the user
 *    has IAM_ACCESS_ROLES_DELETE permission, then a success toast appears.
 *  - The Manage Permission Sets dialog is a Hyperscal dialog with a MultiSelectList.
 */
import type { FilterResult, SortResult } from "../../components/filter/filter-types";
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { ConfirmModalComponent } from "../../components/ConfirmModalComponent";
import { DataTableComponent } from "../../components/DataTableComponent";
import { DetailPanelComponent } from "../../components/DetailPanelComponent";
import { FilterComponent } from "../../components/FilterComponent";
import { ResponseModalComponent } from "../../components/ResponseModalComponent";
import {
    ACCESS_ROLES_FILTER_API,
    ACCESS_ROLES_LIST_PATH,
} from "../../utils/list-page-constants";
import { waitForListTableRows } from "../../utils/list-page-network-utils";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";

export class AccessRolesPage {
    static readonly ACCESS_ROLES_FILTER_API = ACCESS_ROLES_FILTER_API;
    static readonly ACCESS_ROLES_LIST_PATH = ACCESS_ROLES_LIST_PATH;

    readonly table: DataTableComponent;
    readonly detailPanel: DetailPanelComponent;
    readonly filters: FilterComponent;
    readonly confirmModal: ConfirmModalComponent;
    readonly responseModal: ResponseModalComponent;

    lastSearchKeyword: string | null = null;
    lastSearchMatched = false;
    lastFilterResults: FilterResult[] = [];
    lastSortResults: SortResult[] = [];

    constructor(private readonly page: Page) {
        this.table = new DataTableComponent(page);
        this.detailPanel = new DetailPanelComponent(page);
        this.filters = new FilterComponent(page);
        this.confirmModal = new ConfirmModalComponent(page);
        this.responseModal = new ResponseModalComponent(page);
        this.managePermissionSetsDialog = page.getByRole("dialog").filter({ hasText: "Manage Permission Sets" });
    }

    // ─── Locators ────────────────────────────────────────────────────────────────────

    private get createButton(): Locator {
        return this.page.getByTestId("btn_CreateAccessRole");
    }

    private get createDialog(): Locator {
        return this.page.getByRole("dialog").filter({ hasText: "Create Access Role" });
    }

    private get nameInput(): Locator {
        return this.page.getByPlaceholder("Enter role name");
    }

    private get descriptionInput(): Locator {
        return this.page.getByPlaceholder("Enter role description");
    }

    private get roleTypeTrigger(): Locator {
        return this.page.getByTestId("dropdown-role_type_id");
    }

    private get createConfirmButton(): Locator {
        return this.page.getByTestId("btn_ConfirmCreateAccessRole");
    }

    private get createCancelButton(): Locator {
        return this.page.getByTestId("btn_CancelCreateAccessRole");
    }

    private get editDialog(): Locator {
        return this.page.getByRole("dialog").filter({ hasText: "Edit Access Role" });
    }

    private get updateButton(): Locator {
        return this.page.getByTestId("btn_UpdateAccessRole");
    }

    private get editCancelButton(): Locator {
        return this.page.getByTestId("btn_CancelEditAccessRole");
    }

    private get successToast(): Locator {
        return this.page.locator('[data-sonner-toast][data-type="success"]');
    }

    /** The "Manage Permission Sets" button in the detail panel header. */
    private get managePermissionSetsButton(): Locator {
        return this.detailPanel.headerButton("Manage Permission Sets");
    }

    /** The "Manage Permission Sets" dialog element. */
    readonly managePermissionSetsDialog: Locator;

    // ─── Navigation ──────────────────────────────────────────────────────────────────

    async navigateTo(): Promise<void> {
        await this.page.goto(ACCESS_ROLES_LIST_PATH, { waitUntil: "domcontentloaded" });
        await this.expectLoaded();
        await dismissTencentWorkbenchIfPresent(this.page);

        if (await this.detailPanel.isVisible()) {
            await this.detailPanel.close();
        }

        await this.page.keyboard.press("Escape");
        await this.filters.ensureCleanState(AccessRolesPage.ACCESS_ROLES_FILTER_API);
        await waitForListTableRows(this.page, AccessRolesPage.ACCESS_ROLES_FILTER_API);
    }

    // ─── Page state assertions ───────────────────────────────────────────────────────

    async expectLoaded(): Promise<void> {
        await this.page.waitForURL(/\/iam\/access-roles/, { timeout: 30_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
        await this.table.expectVisible();
    }

    async expectCreateButtonVisible(): Promise<void> {
        await expect(this.createButton).toBeVisible({ timeout: 10_000 });
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
        await this.detailPanel.expectTabContentVisible(tabName);
    }

    // ─── Dialog assertions ───────────────────────────────────────────────────────────

    async expectCreateDialogVisible(): Promise<void> {
        await expect(this.createDialog).toBeVisible({ timeout: 10_000 });
    }

    async expectCreateDialogHidden(): Promise<void> {
        await expect(this.createDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectEditDialogVisible(): Promise<void> {
        await expect(this.editDialog).toBeVisible({ timeout: 10_000 });
    }

    async expectEditDialogHidden(): Promise<void> {
        await expect(this.editDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectManagePermissionSetsDialogVisible(): Promise<void> {
        await expect(this.managePermissionSetsDialog).toBeVisible({ timeout: 15_000 });
        // Wait for the permission sets list to finish loading (skeleton → actual items)
        await this.managePermissionSetsDialog.getByRole("button", { name: /^Add / }).first().waitFor({
            state: "visible",
            timeout: 20_000,
        });
    }

    /** Asserts the create success dialog ("Access Role has been successfully created"). */
    async expectCreateSuccess(): Promise<void> {
        const successText = this.page.getByText("Access Role has been successfully created");
        await expect(successText).toBeVisible({ timeout: 15_000 });
    }

    /** Asserts a success toast matching the given text fragment. */
    async expectSuccessToast(text: string): Promise<void> {
        await expect(this.successToast.filter({ hasText: text })).toBeVisible({ timeout: 15_000 });
    }

    async expectFormValidationErrors(): Promise<void> {
        const error = this.createDialog
            .locator('[data-testid="error-text"]')
            .or(this.page.locator('[aria-invalid="true"]'))
            .first();
        await expect(error).toBeVisible({ timeout: 10_000 });
    }

    // ─── Create flow ─────────────────────────────────────────────────────────────────

    async clickCreateAccessRole(): Promise<void> {
        // Dismiss any leftover dialog overlays from previous scenarios
        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(300);
        await this.createButton.click({ force: true });
        await this.expectCreateDialogVisible();
    }

    async fillCreateForm(name: string, description: string): Promise<void> {
        await this.nameInput.fill(name);
        await this.descriptionInput.fill(description);
        await this.selectFirstRoleType();
    }

    /** Selects the first available role type from the remote dropdown. */
    private async selectFirstRoleType(): Promise<void> {
        await this.roleTypeTrigger.click();
        const option = this.page
            .getByRole("menu", { name: /role_type_id/ })
            .getByRole("menuitem")
            .first();
        await expect(option).toBeVisible({ timeout: 15_000 });
        await option.click();
    }

    async submitCreateForm(): Promise<void> {
        await this.createConfirmButton.click();
    }

    async cancelCreateDialog(): Promise<void> {
        await this.createCancelButton.click();
        await this.expectCreateDialogHidden();
    }

    // ─── Edit flow ───────────────────────────────────────────────────────────────────

    async clickEditAccessRole(): Promise<void> {
        // Opens via kebab menu (first row after detail panel is open)
        await this.table.openRowMenu(0);
        await this.table.clickMenuItem("Edit Access Role");
        await this.expectEditDialogVisible();
    }

    async fillEditForm(name: string, description: string): Promise<void> {
        await this.nameInput.fill(name);
        await this.descriptionInput.fill(description);
    }

    async submitEditForm(): Promise<void> {
        await this.updateButton.click();
    }

    async cancelEditDialog(): Promise<void> {
        await this.editCancelButton.click();
        await this.expectEditDialogHidden();
    }

    async openDetailPanel(): Promise<void> {
        if (await this.detailPanel.isVisible()) {
            return;
        }
        // Dismiss any lingering dialog overlay from the previous step
        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(500);
        // Use force: true to bypass any leftover Radix dialog backdrop
        await this.table.openRowDetail(0);
        await this.detailPanel.waitForVisible();
    }

    async clickDetailPanelTab(tabName: string): Promise<void> {
        await this.detailPanel.clickTab(tabName);
    }

    async closeDetailPanel(): Promise<void> {
        await this.detailPanel.close();
    }

    async expectDialogVisible(title: string): Promise<void> {
        await expect(this.page.getByRole("dialog", { name: title })).toBeVisible({ timeout: 10_000 });
    }

    async expectDialogHidden(title: string): Promise<void> {
        await expect(this.page.getByRole("dialog", { name: title })).not.toBeVisible({ timeout: 10_000 });
    }

    // ─── Delete flow ─────────────────────────────────────────────────────────────────

    async clickDeleteAccessRole(): Promise<void> {
        await this.table.openRowMenu(0);
        await this.table.clickMenuItem("Delete Access Role");
    }

    async confirmDeleteAction(): Promise<void> {
        // The permission-check dialog auto-closes if user has delete permission.
        // Then a confirmation dialog appears with a "Delete Access Role" button.
        const confirmBtn = this.page.getByRole("button", { name: "Delete Access Role", exact: true });
        await expect(confirmBtn).toBeVisible({ timeout: 15_000 });
        await confirmBtn.click();
        await this.successToast.filter({ hasText: "deleted" }).waitFor({
            state: "visible",
            timeout: 30_000,
        });
    }

    /** Just clicks the confirm button without waiting for a success toast. Used by @mock error scenarios. */
    async clickConfirmDeleteButton(): Promise<void> {
        const confirmBtn = this.page.getByRole("button", { name: "Delete Access Role", exact: true });
        await expect(confirmBtn).toBeVisible({ timeout: 15_000 });
        await confirmBtn.click();
    }

    async cancelDeleteAction(): Promise<void> {
        // The permission-check dialog auto-closes → the actual confirm dialog appears.
        await this.confirmModal.cancel();
    }

    // ─── Permission Sets flow ─────────────────────────────────────────────────────────

    async openManagePermissionSets(): Promise<void> {
        await this.managePermissionSetsButton.click({ force: true });
        await this.expectManagePermissionSetsDialogVisible();
    }

    /**
     * Adds the first available permission set in the manage permission sets dialog.
     * Confirmed DOM: left panel items have `<button>` with aria-label matching `"Add <name>"`.
     * Returns false if no available permission set exists to add (caller should skip).
     */
    async addFirstAvailablePermissionSet(): Promise<boolean> {
        const dlg = this.managePermissionSetsDialog;
        // The left panel lists unselected permission sets with "Add <name>" buttons.
        const addButton = dlg.getByRole("button", { name: /^Add / }).first();
        const exists = await addButton.isVisible({ timeout: 15_000 }).catch(() => false);
        if (!exists) return false;

        await addButton.click();
        return true;
    }

    /**
     * Removes the first assigned permission set by clicking its remove button
     * in the right panel of the manage permission sets dialog.
     * Right panel items have icon-only remove buttons (no text).
     * Left panel items have "Add <name>" buttons.
     */
    async removeFirstAssignedPermissionSet(): Promise<boolean> {
        const dlg = this.managePermissionSetsDialog;
        // Right (assigned) panel: list items whose button has no visible text
        const items = dlg.locator("ul li");
        const count = await items.count();
        for (let i = 0; i < count; i++) {
            const item = items.nth(i);
            const btn = item.locator("button");
            const btnText = await btn.textContent().catch(() => "");
            // Left panel "Add" buttons have text like "Add <name>".
            // Right panel remove buttons are icon-only (empty text).
            if (btnText?.trim() === "" || !btnText?.trim()) {
                await btn.click({ force: true });
                return true;
            }
        }
        return false;
    }

    async submitManagePermissionSets(): Promise<void> {
        const dlg = this.managePermissionSetsDialog;
        await dlg.getByRole("button", { name: "Save Changes" }).click();
        // After clicking Save, the dialog closes and toast appears
    }

    // ─── Row helpers ──────────────────────────────────────────────────────────────────

    /** Gets the display name (first cell text) from the first visible row. */
    async getFirstRowFieldValue(_field: string): Promise<string> {
        return this.getFirstRowDisplayName();
    }

    async getFirstRowDisplayName(): Promise<string> {
        await this.table.expectVisible();
        await expect(async () => {
            const rowCount = await this.table.rows.count();
            expect(rowCount).toBeGreaterThan(0);
        }).toPass({ timeout: 15_000 });

        try {
            const name = await this.table.rowDisplayNameLink(0).textContent({ timeout: 10_000 });
            if (name?.trim()) return name.trim();
        } catch {
            // fall through
        }

        try {
            const firstRowText = await this.table.rows.first().locator("td").first().textContent({ timeout: 10_000 });
            if (firstRowText?.trim()) return firstRowText.trim();
        } catch {
            // fall through
        }

        throw new Error("No display name found in the first table row.");
    }

    async searchFilter(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilter(
            AccessRolesPage.ACCESS_ROLES_FILTER_API,
            value,
        );
        return this.lastSearchMatched;
    }

    /** Search without clearing the filter afterwards — keeps the result set active. */
    async searchFilterKeep(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilterKeep(
            AccessRolesPage.ACCESS_ROLES_FILTER_API,
            value,
        );
        return this.lastSearchMatched;
    }

    // ─── Shared filter/sort methods (called by resolveFilterablePage) ─────────────────

    async buildFilterFieldValuesFromFirstRow(): Promise<Record<string, string>> {
        const displayName = await this.getFirstRowDisplayName();
        return {
            name: displayName,
            description: "test",
            role_type: "Entity Role",
            created_at: "2026-07-21",
            created_by: "System",
        };
    }

    async applyAllFilters(fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applyAllFilters(
            AccessRolesPage.ACCESS_ROLES_FILTER_API,
            fieldValues,
        );
        return this.lastFilterResults;
    }

    async applySingleFilter(filterOption: string, fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applySingleFilter(
            AccessRolesPage.ACCESS_ROLES_FILTER_API,
            filterOption,
            fieldValues,
        );
        return this.lastFilterResults;
    }

    async applyAllSorts(): Promise<SortResult[]> {
        this.lastSortResults = await this.filters.applyAllSorts(
            AccessRolesPage.ACCESS_ROLES_FILTER_API,
        );
        return this.lastSortResults;
    }
}
