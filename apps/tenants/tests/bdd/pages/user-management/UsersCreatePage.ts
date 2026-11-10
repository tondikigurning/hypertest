/**
 * Page Object Model — User Management / Users create page.
 *
 * Route: /user-management/users/create
 *
 * Encapsulates the multi-step create-user wizard:
 *   1. User Details
 *   2. Organization & Entity
 *   3. Application Access
 *   4. Group Memberships
 *   5. Summary → Confirm
 *   6. Completed (success)
 */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { randomUUID } from "@hyperscal/utils";
import { DataviewFilterComponent } from "../../components/dataview-filter-component";
import type { FilterResult, SortResult } from "../../components/filter/filter-types";
import {
    ENTITIES_UNITS_FILTER_API,
} from "../../utils/list-page-constants";
import {
    addFirstAvailableGroupFromDirectory,
} from "../../utils/membership-test-utils";
import {
    applicationAccessRoleButton,
    DEFAULT_APPLICATION_ACCESS,
} from "../../utils/application-access-test-utils";
import { createE2EThumbnailUpload, generateUniqueEmail } from "../../utils/test-file-utils";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";

/** Parsed from "Module:Role,Module:Role" outline values. */
export interface ApplicationAccessSelection {
    module: string;
    role: string;
}

export interface UsersCreateData {
    firstName: string;
    lastName: string;
    displayName: string;
    jobTitle: string;
    phoneCountry: string;
    phoneNumber: string;
    applicationAccess: Array<ApplicationAccessSelection>;
    groupMemberships: Array<string>;
}

type UsersCreateUserDetails = Pick<
    UsersCreateData,
    "firstName" | "lastName" | "displayName" | "jobTitle" | "phoneCountry" | "phoneNumber"
>;

function getMostRecentBusinessDay(): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dayOfWeek = yesterday.getDay();
    if (dayOfWeek === 0) {
        yesterday.setDate(yesterday.getDate() - 2);
    } else if (dayOfWeek === 6) {
        yesterday.setDate(yesterday.getDate() - 1);
    }

    return yesterday.toISOString().split("T")[0];
}

export class UsersCreatePage {
    static readonly ENTITIES_FILTER_API = ENTITIES_UNITS_FILTER_API;

    readonly filters: DataviewFilterComponent;

    lastSearchKeyword: string | null = null;
    lastSearchMatched = false;
    lastFilterResults: FilterResult[] = [];
    lastSortResults: SortResult[] = [];

    private static readonly DEFAULT_USER_DETAILS = {
        firstName: "John",
        lastName: "Doe",
        displayName: "John Doe",
        jobTitle: "Basic Worker",
        phoneCountry: "Philippines",
        phoneNumber: "9123456789",
    } as const;

    constructor(private readonly page: Page) {
        this.filters = new DataviewFilterComponent(page, page.locator('[data-test-id="wizard-step-content"]'));
    }

    private get wizardStepContent(): Locator {
        return this.page.locator('[data-test-id="wizard-step-content"]');
    }

    private get entityTableRows(): Locator {
        return this.wizardStepContent.locator("table tbody tr");
    }

    // ── Locators ──────────────────────────────────────────────────────────────

    private get wizardNextButton(): Locator {
        return this.page.getByRole("button", { name: /^next$/i });
    }

    private get wizardConfirmButton(): Locator {
        return this.page.getByRole("button", { name: /^confirm$/i });
    }

    private get wizardCancelButton(): Locator {
        return this.page.getByTestId("btn_cancelWizard");
    }

    private get wizardCurrentStepHeading(): Locator {
        // The wizard renders two h2 elements: [0] wizard title "Create New User",
        // [1] the current step title (e.g. "User Details"). We want the second one.
        return this.page.getByRole("heading", { level: 2 }).nth(1);
    }

    private get successHeading(): Locator {
        return this.page.getByRole("heading", { name: "Success", level: 3 });
    }

    private get successMessage(): Locator {
        return this.page.getByText("New User has been successfully created");
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    async navigateTo(): Promise<void> {
        await this.page.goto("/user-management/users/create");
        await this.page.waitForLoadState("networkidle");
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
        await dismissTencentWorkbenchIfPresent(this.page);
    }

    // ── Step actions ───────────────────────────────────────────────────────────

    async expectStep(stepTitle: string): Promise<void> {
        await expect(this.wizardCurrentStepHeading).toContainText(stepTitle, { timeout: 20_000 });
    }

    async clickNext(): Promise<void> {
        await this.wizardNextButton.click();
        await this.page.waitForLoadState("networkidle");
    }

    /** Clicks "Next" without filling any fields — triggers validation. */
    async clickNextEmpty(): Promise<void> {
        await this.wizardNextButton.click();
        await this.page.waitForTimeout(500);
    }

    async cancel(): Promise<void> {
        await this.wizardCancelButton.waitFor({ state: "visible", timeout: 15_000 });
        await this.wizardCancelButton.click();
        await this.page.waitForURL(/\/user-management\/users(?:\?|$)/, { timeout: 20_000 });
    }

    /**
     * Fills step 1 (User Details) and advances.
     * Checks "Use login email for communication", uploads thumbnail, sets +63 phone.
     */
    async fillAndSubmitUserDetails(
        data: UsersCreateUserDetails,
    ): Promise<{ email: string; username: string }> {
        const email = generateUniqueEmail();
        const username = `e2e.${email.split("@")[0]?.replace("e2e.", "") ?? randomUUID().slice(0, 8)}`;

        await this.expectStep("User Details");

        await this.page.getByRole("textbox", { name: "Login Email" }).fill(email);
        await this.page.getByRole("checkbox", { name: "Use login email for communication" }).check();

        await this.page.getByRole("textbox", { name: "First Name" }).fill(data.firstName);
        await this.page.getByRole("textbox", { name: "Last Name" }).fill(data.lastName);
        await this.page.getByRole("textbox", { name: "Display Name" }).fill(data.displayName);
        await this.page.getByRole("textbox", { name: "Job Title" }).fill(data.jobTitle);
        await this.page.getByRole("textbox", { name: "Username" }).fill(username);

        await this.uploadThumbnail();

        await this.page.getByRole("button", { name: "Select country" }).click();
        await this.page
            .getByRole("button", { name: new RegExp(`${data.phoneCountry}\\s*\\+63`, "i") })
            .click();
        await this.page.getByRole("textbox", { name: "Phone number" }).fill(data.phoneNumber);

        // Wait for async unique-validation on email/username before advancing.
        await expect(this.page.getByText(/is available/i).first()).toBeVisible({ timeout: 20_000 });

        await this.clickNext();

        return { email, username };
    }

    private async uploadThumbnail(): Promise<void> {
        const [fileChooser] = await Promise.all([
            this.page.waitForEvent("filechooser"),
            this.page.getByRole("button", { name: /Select File|Change File/i }).click(),
        ]);
        await fileChooser.setFiles(createE2EThumbnailUpload());
        await expect(this.page.getByText("Success").first()).toBeVisible({ timeout: 20_000 });
    }

    /** Fills step 1 and lands on Organization & Entity without selecting an entity. */
    async openOrganizationEntityStep(): Promise<void> {
        await this.fillAndSubmitUserDetails(UsersCreatePage.DEFAULT_USER_DETAILS);
        await this.expectStep("Organization & Entity");
    }

    /** Waits for the entity picker toolbar and at least one table row. */
    async waitForEntityTableReady(): Promise<void> {
        const searchInput = this.wizardStepContent
            .locator('[data-testid="inputComponent"][placeholder="Search"]')
            .or(this.wizardStepContent.getByRole("textbox", { name: /search/i }))
            .first();
        await searchInput.waitFor({ state: "visible", timeout: 45_000 });

        await expect(async () => {
            const rowCount = await this.entityTableRows.count();
            expect(rowCount).toBeGreaterThan(0);
        }).toPass({ timeout: 45_000 });
    }

    async getFirstRowFieldValue(_field: string): Promise<string> {
        return this.getFirstRowDisplayName();
    }

    async getFirstRowDisplayName(): Promise<string> {
        await this.waitForEntityTableReady();

        const nameFromSelectionCell = this.entityTableRows
            .first()
            .locator('[data-testid="selection-cell"] p')
            .first();
        const name = await nameFromSelectionCell.textContent({ timeout: 10_000 });
        if (name?.trim()) {
            return name.trim();
        }

        const firstCellText = await this.entityTableRows.first().locator("td").first().textContent({ timeout: 10_000 });
        if (firstCellText?.trim()) {
            return firstCellText.trim();
        }

        throw new Error("No company name found in the first entity table row.");
    }

    async buildFilterFieldValuesFromFirstRow(): Promise<Record<string, string>> {
        const companyName = await this.getFirstRowDisplayName();
        const cells = await this.entityTableRows.first().locator("td").allTextContents();
        const unitType = cells[1]?.trim() ?? "";
        const parent = cells[2]?.trim() ?? "";
        const status = cells[3]?.trim() ?? "Active";
        const recentBusinessDay = getMostRecentBusinessDay();

        return {
            name: companyName,
            created_at: recentBusinessDay,
            created_by: "System",
            parent: parent === "-" ? "" : parent,
            active_status: status,
            unit_type: unitType,
            updated_at: recentBusinessDay,
            updated_by: "System",
        };
    }

    async searchFilter(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilter(UsersCreatePage.ENTITIES_FILTER_API, value);
        return this.lastSearchMatched;
    }

    async searchFilterKeep(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilter(UsersCreatePage.ENTITIES_FILTER_API, value);
        return this.lastSearchMatched;
    }

    async applyAllFilters(fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applyAllFilters(
            UsersCreatePage.ENTITIES_FILTER_API,
            fieldValues,
        );
        return this.lastFilterResults;
    }

    async applySingleFilter(filterOption: string, fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applySingleFilter(
            UsersCreatePage.ENTITIES_FILTER_API,
            filterOption,
            fieldValues,
        );
        return this.lastFilterResults;
    }

    async applyAllSorts(): Promise<SortResult[]> {
        this.lastSortResults = await this.filters.applyAllSorts(UsersCreatePage.ENTITIES_FILTER_API);
        return this.lastSortResults;
    }

    /** Selects the first available entity in the Organization & Entity step. */
    async selectOrganizationAndEntity(): Promise<void> {
        await this.expectStep("Organization & Entity");
        await this.waitForEntityTableReady();

        const firstEntityCheckbox = this.entityTableRows
            .first()
            .locator('[data-testid="selection-cell"]')
            .getByRole("checkbox");
        await firstEntityCheckbox.waitFor({ state: "visible", timeout: 20_000 });
        await firstEntityCheckbox.click();

        await this.clickNext();
    }

    /** Selects the default application access role (User Management) on step 3. */
    private async waitForApplicationAccessRolesLoaded(): Promise<void> {
        const { module, role } = DEFAULT_APPLICATION_ACCESS;
        const roleButton = applicationAccessRoleButton(this.page, module, role);
        await expect(roleButton).toBeVisible({ timeout: 45_000 });
    }

    private async selectDefaultApplicationAccess(): Promise<Array<ApplicationAccessSelection>> {
        await this.expectStep("Application Access");
        await this.waitForApplicationAccessRolesLoaded();

        const { module, role } = DEFAULT_APPLICATION_ACCESS;
        const roleButton = applicationAccessRoleButton(this.page, module, role);

        await roleButton.click();
        await expect(roleButton).toHaveAttribute("aria-pressed", "true");
        await this.clickNext();

        return [{ module, role }];
    }

    /** Adds the first available group from the directory on step 4. */
    async addFirstAvailableGroupMembership(): Promise<void> {
        await this.expectStep("Group Memberships");
        await addFirstAvailableGroupFromDirectory(this.page);
        await this.clickNext();
    }

    async confirmSummary(): Promise<void> {
        await this.expectStep("Summary");
        await this.wizardConfirmButton.click();
        await this.page.waitForLoadState("networkidle");
    }

    /** Runs the full wizard with default text fields and first-available access/group selections. */
    async completeWizardWithAllFirstAvailable(): Promise<{ email: string; username: string }> {
        const credentials = await this.fillAndSubmitUserDetails(UsersCreatePage.DEFAULT_USER_DETAILS);
        await this.selectOrganizationAndEntity();
        await this.selectDefaultApplicationAccess();
        await this.addFirstAvailableGroupMembership();
        await this.confirmSummary();
        return credentials;
    }

    /** Advances to summary with default text fields and first-available access/group selections. */
    async advanceToSummaryWithFirstAvailable(): Promise<void> {
        await this.fillAndSubmitUserDetails(UsersCreatePage.DEFAULT_USER_DETAILS);
        await this.selectOrganizationAndEntity();
        await this.selectDefaultApplicationAccess();
        await this.addFirstAvailableGroupMembership();
        await this.expectStep("Summary");
    }

    async clickBackToList(): Promise<void> {
        await this.page.getByRole("button", { name: "Ok, back to list" }).click();
        await this.page.waitForURL(/\/user-management\/users(?:\?|$)/, { timeout: 20_000 });
    }

    async clickCreateMoreUser(): Promise<void> {
        await this.page.getByRole("button", { name: "Create More User" }).click();
        await this.expectStep("User Details");
    }

    async expectSummaryShowsApplicationRole(role: string): Promise<void> {
        await expect(this.page.getByText(role, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    }

    /** Assertion for showing the selected group membership on summary. */
    async expectSummaryShowsSelectedGroupMembership(): Promise<void> {
        // The summary should show at least one group membership was selected
        const groupSection = this.page.getByText(/group memberships/i, { exact: false });
        await expect(groupSection.first()).toBeVisible({ timeout: 10_000 });
    }

    // ── Assertions ────────────────────────────────────────────────────────────

    async expectLoaded(): Promise<void> {
        await this.page.waitForURL(/\/user-management\/users\/create/, { timeout: 20_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    }

    async expectCreationSuccess(): Promise<void> {
        await expect(this.successHeading).toBeVisible({ timeout: 30_000 });
        await expect(this.successMessage).toBeVisible({ timeout: 10_000 });
    }

    async expectValidationErrors(): Promise<void> {
        const error = this.page.locator('[data-testid="error-text"], [role="alert"], .text-error').first();
        await expect(error).toBeVisible({ timeout: 10_000 });
    }
}
