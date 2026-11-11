/** POM — /user-management/users (pipeline, table, filters, detail panel, dialogs). */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { ConfirmModalComponent } from "../../components/ConfirmModalComponent";
import { DataTableComponent } from "../../components/DataTableComponent";
import { DetailPanelComponent } from "../../components/DetailPanelComponent";
import { FilterComponent } from "../../components/FilterComponent";
import { PipelineComponent } from "../../components/PipelineComponent";
import { ResponseModalComponent } from "../../components/ResponseModalComponent";
import type { FilterResult, SortResult } from "../../components/filter/filter-types";
import { ensureListPageCleanState, waitForListTableRows } from "../../utils/list-page-network-utils";
import { USERS_FILTER_API, USERS_LIST_PATH } from "../../utils/list-page-constants";
import { applicationAccessRoleButton } from "../../utils/application-access-test-utils";
import { tryAddFirstAvailableGroupFromDirectory } from "../../utils/membership-test-utils";
import { createE2EThumbnailUpload, generateUniqueEmail } from "../../utils/test-file-utils";
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

export interface UsersEditData {
    firstName: string;
    lastName: string;
    displayName: string;
    jobTitle: string;
    phoneCountry: string;
    phoneNumber: string;
}

export class UsersPage {
    static readonly USERS_FILTER_API = USERS_FILTER_API;

    readonly pipeline: PipelineComponent;
    readonly table: DataTableComponent;
    readonly detailPanel: DetailPanelComponent;
    readonly filters: FilterComponent;
    readonly confirmModal: ConfirmModalComponent;
    readonly responseModal: ResponseModalComponent;

    lastSearchKeyword: string | null = null;
    lastSearchMatched = false;
    lastFilterResults: FilterResult[] = [];
    lastSortResults: SortResult[] = [];

    // Excludes "All" — mixed statuses, no single status to wait for after tab switch.
    private static readonly STATUS_TABS = ["Active", "Invited", "Suspended", "Account Lockout", "Cancelled"];

    constructor(private readonly page: Page) {
        this.pipeline = new PipelineComponent(page);
        this.table = new DataTableComponent(page);
        this.detailPanel = new DetailPanelComponent(page);
        this.filters = new FilterComponent(page);
        this.confirmModal = new ConfirmModalComponent(page);
        this.responseModal = new ResponseModalComponent(page);
    }

    private get createUserButton(): Locator {
        return this.page.getByRole("button", { name: "Create User" });
    }

    private get addFilterButton(): Locator {
        return this.page.getByTestId("btn-add-filter");
    }

    private get filterFieldOption(): Locator {
        // @hyperscal/filters: menuitem role via data-testid="filter-option-*", not <option>.
        return this.page.locator('[data-testid^="filter-option-"]').first();
    }

    private get enumPickerButton(): Locator {
        return this.page.getByTestId("btn-enum-picker");
    }

    private get addFilterActionButton(): Locator {
        return this.page.getByRole("button", { name: "Add Filter" });
    }

    private dialog(title: string): Locator {
        // UI header is "Manage Group"; feature steps still say "Group Membership".
        if (title === "Group Membership") {
            return this.page.getByRole("dialog", { name: /Manage Group/i });
        }
        return this.page.getByRole("dialog", { name: title });
    }

    private dialogCancelButton(dialogTitle: string): Locator {
        return this.dialog(dialogTitle).getByRole("button", { name: /cancel/i });
    }

    async navigateTo(): Promise<void> {
        await this.page.goto(USERS_LIST_PATH, { waitUntil: "domcontentloaded" });
        await this.expectLoaded();
        await dismissTencentWorkbenchIfPresent(this.page);

        if (await this.detailPanel.isVisible()) {
            await this.detailPanel.close();
        }

        await this.page.keyboard.press("Escape");
        await ensureListPageCleanState(this.page, UsersPage.USERS_FILTER_API);
        await waitForListTableRows(this.page, UsersPage.USERS_FILTER_API);
    }

    /** Status tabs wait for grid refresh so kebab actions don't race stale rows. */
    async selectPipelineTab(tab: string): Promise<void> {
        const responsePromise = this.page
            .waitForResponse(
                (res) =>
                    res.url().includes(UsersPage.USERS_FILTER_API)
                    && !res.url().includes("filter-options")
                    && res.request().method() === "POST",
                { timeout: 45_000 },
            )
            .catch(() => null);

        await this.pipeline.selectTab(tab);
        await responsePromise;

        if (UsersPage.STATUS_TABS.includes(tab)) {
            await this.table.waitForStatusSettled(tab);
        }
    }

    async clickCreateUser(): Promise<void> {
        await this.createUserButton.waitFor({ state: "visible" });
        await this.createUserButton.click();
        await this.page.waitForURL(/\/user-management\/users\/create/, { timeout: 20_000 });
    }

    async openFilterPanel(): Promise<void> {
        await this.addFilterButton.click();
        await expect(this.filterFieldOption).toBeVisible({ timeout: 20_000 });
    }

    async selectFirstFilterField(): Promise<void> {
        await this.filterFieldOption.click();
    }

    async applyFilter(): Promise<void> {
        await this.addFilterActionButton.click();
        await this.page.press("body", "Escape");
        await this.table.expectVisible();
    }

    async applyUnmatchableFilter(): Promise<void> {
        await this.page.getByTestId("filter-option-display_name").click();
        await this.page.getByTestId("input-filter-value").fill("__NOMATCH_XYZZY_QWERTYUIOP__");
        await this.applyFilter();
    }

    /** Opens detail via display-name link — plain row clicks on column 1 are ignored by the grid. */
    async openDetailPanel(): Promise<void> {
        if (await this.detailPanel.isVisible()) {
            return;
        }
        await this.table.openRowDetail(0);
        await this.detailPanel.waitForVisible();
    }

    async clickDetailPanelTab(tabName: string): Promise<void> {
        await this.detailPanel.clickTab(tabName);
    }

    async closeDetailPanel(): Promise<void> {
        await this.detailPanel.close();
    }

    /** Module role chips render only after per-module role queries finish (skeletons otherwise). */
    private async waitForApplicationAccessRolesLoaded(dlg: Locator, module: string, role: string): Promise<void> {
        const roleButton = applicationAccessRoleButton(dlg, module, role);
        await expect(roleButton).toBeVisible({ timeout: 45_000 });
    }

    async openApplicationAccessDialog(): Promise<void> {
        await this.detailPanel.headerButton("Application Access").click();
        const dlg = this.dialog("Application Access");
        await dlg.waitFor({ state: "visible", timeout: 20_000 });
    }

    async openManageGroupsDialog(): Promise<void> {
        await this.detailPanel.headerButton("Manage Groups").click();
        await this.groupMembershipDialog().waitFor({ state: "visible", timeout: 10_000 });
    }

    private editUserDialog(): Locator {
        return this.dialog("Edit User");
    }

    async fillAllEditableEditUserFields(data: UsersEditData): Promise<void> {
        const dlg = this.editUserDialog();
        await dlg.waitFor({ state: "visible", timeout: 20_000 });

        const useLoginEmailCheckbox = dlg.getByRole("checkbox", {
            name: "Use login email for communication",
        });
        if (await useLoginEmailCheckbox.isChecked()) {
            await useLoginEmailCheckbox.uncheck();
        }

        const commsEmail = generateUniqueEmail();
        await dlg.getByRole("textbox", { name: "Communication Email" }).fill(commsEmail);
        await expect(dlg.getByText(/is available/i).first()).toBeVisible({ timeout: 20_000 });

        await dlg.locator("input#first_name").fill(data.firstName);
        await dlg.locator("input#last_name").fill(data.lastName);
        await dlg.locator("input#display_name").fill(data.displayName);
        await dlg.locator("input#job_title").fill(data.jobTitle);

        const [fileChooser] = await Promise.all([
            this.page.waitForEvent("filechooser"),
            dlg.getByRole("button", { name: /Select File|Change File/i }).click(),
        ]);
        await fileChooser.setFiles(createE2EThumbnailUpload());
        await expect(dlg.getByText("Success").first()).toBeVisible({ timeout: 20_000 });

        await dlg.getByRole("button", { name: "Select country" }).click();
        await this.page
            .getByRole("button", { name: new RegExp(`${data.phoneCountry}\\s*\\+63`, "i") })
            .click();
        await dlg.getByRole("textbox", { name: "Phone number" }).fill(data.phoneNumber);
    }

    async clearEditUserJobTitle(): Promise<void> {
        await this.editUserDialog().locator("input#job_title").clear();
    }

    async fillAllEditableEditUserFieldsWithDefaults(): Promise<void> {
        const data: UsersEditData = {
            firstName: "Jane",
            lastName: "Smith",
            displayName: "Jane Smith",
            jobTitle: "Manager",
            phoneCountry: "Philippines",
            phoneNumber: "9123456789",
        };
        await this.fillAllEditableEditUserFields(data);
    }

    async expectEditUserValidationErrors(): Promise<void> {
        // FieldControl renders required messages as <p data-testid="error-text"> (no role="alert").
        const error = this.editUserDialog()
            .locator('[data-testid="field-control-root"]')
            .filter({ has: this.page.locator('input#job_title[aria-invalid="true"]') })
            .getByTestId("error-text");
        await expect(error).toBeVisible({ timeout: 10_000 });
    }

    async submitDialogAction(dialogTitle: string, buttonLabel: string): Promise<void> {
        const dlg = this.dialog(dialogTitle);
        await dlg.getByRole("button", { name: buttonLabel, exact: true }).click();
    }

    /**
     * Confirms a destructive/status row action. Does not wait for the confirm dialog to close —
     * the success ResponseModal is shown while confirm is still dismissing, and waiting for
     * hide races (and can miss) that modal. The following "success response" step owns the wait.
     */
    async confirmRowAction(actionLabel: string): Promise<void> {
        const confirmDlg = this.page.getByRole("dialog", { name: actionLabel }).or(
            this.page.getByRole("dialog").filter({
                has: this.page.getByRole("button", { name: actionLabel, exact: true }),
            }),
        );
        await expect(confirmDlg.first()).toBeVisible({ timeout: 10_000 });
        await confirmDlg.getByRole("button", { name: actionLabel, exact: true }).click();
    }

    async toggleApplicationAccessRole(module: string, role: string): Promise<void> {
        const dlg = this.dialog("Application Access");
        await dlg.waitFor({ state: "visible", timeout: 20_000 });
        await this.waitForApplicationAccessRolesLoaded(dlg, module, role);

        const roleButton = applicationAccessRoleButton(dlg, module, role);
        await roleButton.click();
    }

    private groupMembershipDialog(): Locator {
        return this.dialog("Group Membership");
    }

    /**
     * Manage Groups directory stays blocked until an entity is chosen
     * ("Choose Entity First"). Selects the first available entity option.
     * Returns false when the dropdown has no entities (caller should skip).
     */
    async selectFirstEntityInManageGroupsDialog(): Promise<boolean> {
        const dlg = this.groupMembershipDialog();
        await expect(dlg).toBeVisible({ timeout: 10_000 });

        // entity-selection is a <ComboBox type="single"> — trigger has <input placeholder="Choose Entity">.
        // When entity is already selected, placeholder is replaced with the entity name.
        const entityDropdown = dlg.getByPlaceholder("Choose Entity");
        const needsEntitySelection = await entityDropdown.isVisible({ timeout: 5_000 }).catch(() => false);

        if (!needsEntitySelection) {
            // Entity already selected — directory should be unlocked.
            return true;
        }

        await expect(entityDropdown).toBeEnabled({ timeout: 20_000 });
        await entityDropdown.click();

        // ComboBox renders options as role="option" inside a PopoverContent.
        const firstOption = this.page.getByRole("option").first();
        const hasOption = await firstOption.isVisible({ timeout: 10_000 }).catch(() => false);
        if (!hasOption) {
            await this.page.keyboard.press("Escape");
            return false;
        }

        await firstOption.click();
        await expect(dlg.getByText("Choose Entity First")).toBeHidden({ timeout: 10_000 });
        return true;
    }

    /** Returns false when no entity/groups are available to add (caller should skip). */
    async addFirstAvailableGroupMembershipInDialog(): Promise<boolean> {
        const dlg = this.groupMembershipDialog();
        const entitySelected = await this.selectFirstEntityInManageGroupsDialog();
        if (!entitySelected) return false;

        const added = await tryAddFirstAvailableGroupFromDirectory(dlg);
        if (added) {
            await expect(dlg.getByRole("button", { name: "Save Changes" })).toBeEnabled({ timeout: 10_000 });
        }
        return added;
    }

    /** Returns false when the user has no stored group memberships (caller should skip). */
    async removeTopGroupMembershipInDialog(): Promise<boolean> {
        const dlg = this.groupMembershipDialog();
        // Wait for the "Existing Groups" section to finish loading (API call resolves)
        // The section renders only after currentMembers API call completes.
        const existingSection = dlg
            .locator("section")
            .filter({ hasText: "Existing Groups" });
        const sectionLoaded = await existingSection.waitFor({ state: "visible", timeout: 25_000 })
            .then(() => true)
            .catch(() => false);
        if (!sectionLoaded) return false;

        const removeButton = existingSection
            .getByRole("button", { name: /^Remove / })
            .first();
        const hasMembership = await removeButton.isVisible({ timeout: 5_000 }).catch(() => false);
        if (!hasMembership) return false;

        await removeButton.click();
        await expect(dlg.getByRole("button", { name: "Save Changes" })).toBeEnabled({ timeout: 10_000 });
        return true;
    }

    async expectDetailPanelShowsName(displayName: string): Promise<void> {
        await this.detailPanel.expectShowsTitle(displayName);
    }

    async cancelDialog(title: string): Promise<void> {
        await this.dialogCancelButton(title).click();
        await this.dialog(title).waitFor({ state: "hidden", timeout: 10_000 });
    }

    async expectLoaded(): Promise<void> {
        await this.page.waitForURL(/\/user-management\/users/, { timeout: 30_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
        await this.table.expectVisible();
    }

    async expectCreateUserButtonVisible(): Promise<void> {
        await expect(this.createUserButton).toBeVisible({ timeout: 10_000 });
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

    async expectDialogVisible(title: string): Promise<void> {
        await expect(this.dialog(title)).toBeVisible({ timeout: 10_000 });
    }

    async expectDialogHidden(title: string): Promise<void> {
        await expect(this.dialog(title)).not.toBeVisible({ timeout: 10_000 });
    }

    async expectSaveChangesDisabled(): Promise<void> {
        const saveBtn = this.groupMembershipDialog().getByRole("button", { name: "Save Changes" });
        await expect(saveBtn).toBeDisabled({ timeout: 10_000 });
    }

    async expectUrlHasFilterParam(): Promise<void> {
        await expect(this.page).toHaveURL(/[?&]f=/, { timeout: 10_000 });
    }

    async getFirstRowDisplayName(): Promise<string> {
        // Wait for the table to be ready and have rows
        await this.table.expectVisible();
        await expect(async () => {
            const rowCount = await this.table.rows.count();
            expect(rowCount).toBeGreaterThan(0);
        }).toPass({ timeout: 15_000 });

        // Users table: [checkbox] | Display Name | Job Title | Apps | Status | Created At ...
        // Skip the first (checkbox) column and find the cell with the display name link
        const cells = this.table.rows.first().locator("td");
        const cellCount = await cells.count();
        // Start from column 1 to skip the checkbox column
        for (let i = 1; i < cellCount; i++) {
            const cellText = (await cells.nth(i).textContent({ timeout: 3_000 }).catch(() => "")) ?? "";
            const trimmed = cellText.trim();
            // Look for a non-empty text that could be a display name — skip empty,
            // purely numeric, checkbox indicators, email addresses, dates, and short labels
            if (
                trimmed &&
                trimmed.length > 2 &&
                !/^\d{1,2}\s/.test(trimmed) &&        // not a date prefix
                !trimmed.includes("@") &&               // not an email
                !/^(Active|Suspended|Invited|Cancelled|Account Lockout|All)$/i.test(trimmed) // not a status
            ) {
                return trimmed;
            }
        }

        throw new Error("No display name found in the first table row using available methods.");
    }

    /**
     * Gets a field value from the first visible row.
     * - "email_address": extracts the email address found in the row text.
     * - "name" / any other field: falls back to getFirstRowDisplayName().
     */
    async getFirstRowFieldValue(field: string): Promise<string> {
        if (field === "email_address") {
            await this.table.expectVisible();
            await expect(async () => {
                const rowCount = await this.table.rows.count();
                expect(rowCount).toBeGreaterThan(0);
            }).toPass({ timeout: 15_000 });

            // Scan each cell individually to avoid cross-cell text concatenation
            const cells = this.table.rows.first().locator("td");
            const cellCount = await cells.count();
            for (let i = 0; i < cellCount; i++) {
                const cellText = (await cells.nth(i).textContent({ timeout: 5_000 }).catch(() => "")) ?? "";
                const emailMatch = cellText.match(/(?<!\w)[\w.+-]+@[\w.-]+\.\w{2,4}(?!\w)/);
                if (emailMatch?.[0]) {
                    return emailMatch[0];
                }
            }
        }
        return this.getFirstRowDisplayName();
    }

    async buildFilterFieldValuesFromFirstRow(): Promise<Record<string, string>> {
        const displayName = await this.getFirstRowDisplayName();
        const firstRowText = (await this.table.rows.first().textContent()) ?? "";
        const usernameMatch = firstRowText.match(/\(@([^)]+)\)/);
        const emailMatch = firstRowText.match(/(?<!\w)[\w.+-]+@[\w.-]+\.\w{2,4}(?!\w)/);
        const statusLabel =
            UsersPage.STATUS_TABS.find((status) => firstRowText.includes(status)) ?? "Active";
        const nameParts = displayName.split(/\s+/);
        const firstName = nameParts[0] ?? displayName;
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
        const recentBusinessDay = getMostRecentBusinessDay();

        return {
            created_at: recentBusinessDay,
            created_by_name: "",
            date_of_birth: "1990-01-01",
            display_name: displayName,
            email_address: emailMatch?.[0] ?? displayName,
            sub_tenant_unit_uuid: "",
            first_name: firstName,
            gender_name: "",
            job_title: "",
            last_name: lastName,
            updated_at: recentBusinessDay,
            updated_by_name: "",
            user_status_uuid: statusLabel,
            username: usernameMatch?.[1] ?? displayName,
        };
    }

    async searchFilter(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilter(UsersPage.USERS_FILTER_API, value);
        return this.lastSearchMatched;
    }

    /** Search without clearing the filter afterwards — keeps the result set active. */
    async searchFilterKeep(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilterKeep(UsersPage.USERS_FILTER_API, value);
        return this.lastSearchMatched;
    }

    async applyAllFilters(fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applyAllFilters(UsersPage.USERS_FILTER_API, fieldValues);
        return this.lastFilterResults;
    }

    async applySingleFilter(filterOption: string, fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applySingleFilter(
            UsersPage.USERS_FILTER_API,
            filterOption,
            fieldValues,
        );
        return this.lastFilterResults;
    }

    async applyAllSorts(): Promise<SortResult[]> {
        this.lastSortResults = await this.filters.applyAllSorts(UsersPage.USERS_FILTER_API);
        return this.lastSortResults;
    }
}
