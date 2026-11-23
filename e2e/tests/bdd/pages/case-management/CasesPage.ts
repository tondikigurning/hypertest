import { expect, type Locator, type Page } from "@playwright/test";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";
import { e2eValue } from "../../utils/e2e-test-data";

const environment = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
}).process?.env;

export class CasesPrerequisiteError extends Error {}

const CREATE_CLASSIFICATIONS = [
    { name: "Billing Documents", outcome: "Statement of Account" },
    { name: "Rebate - Technical", outcome: "Network Outage" },
    { name: "Rebate - Non Technical", outcome: "Service Charges" },
    { name: "Adjustment", outcome: "Bill of Materials" },
    { name: "Refund", outcome: "Aftersales Refund - Overpayment / Cash Advances" },
    { name: "Auto-Debit", outcome: "New - Auto Debit" },
    { name: "Change Bill Cycle", outcome: "Bill Cycle A" },
    { name: "Payment Arangement", outcome: "Promise to Pay" },
] as const;

/** Cases list and the read-only portions of the create dialog. */
export class CasesPage {
    private previousCaseNumbers: string[] = [];
    private selectedCaseNumber: string | null = null;
    private searchedCaseNumber: string | null = null;
    private canceledSubject: string | null = null;
    private savedFields: string[] = [];
    private childSubject: string | null = null;
    private drawerBefore = "";
    private ownedSubject: string | null = null;
    private ownedCustomer: string | null = null;
    private newSubject: string | null = null;
    private existingDuplicate: string | null = null;
    private editedOriginal: string | null = null;
    private editedSubject: string | null = null;
    private restoreAssignment = false;
    private createClassification: (typeof CREATE_CLASSIFICATIONS)[number] = CREATE_CLASSIFICATIONS[0];

    constructor(private readonly page: Page) {}

    private get search(): Locator {
        return this.page.getByTestId("filter-search-input");
    }

    private get createDialog(): Locator {
        return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: /Create New Case/ }) });
    }

    private get rows(): Locator {
        return this.page.getByRole("table").getByRole("rowgroup").last().getByRole("row");
    }

    private assertNonProduction(): void {
        const host = new URL(this.page.url()).hostname.toLowerCase();
        if (!/^converge\.(?:dev|stt\d*|pp|qa\d*|uat\d*|staging)\.hyperscal\.com$/.test(host)) {
            throw new Error("Case customer-data mutations require a recognized non-production target.");
        }
    }

    async navigateTo(): Promise<void> {
        await this.page.goto("/case-management/cases", { waitUntil: "domcontentloaded" });
        await dismissTencentWorkbenchIfPresent(this.page);
        await expect(this.search).toBeVisible({ timeout: 60_000 });
        const reset = this.page.getByTestId("btn-clear-filters");
        if (await reset.isVisible().catch(() => false)) await reset.click();
    }

    async searchFor(value: string): Promise<void> {
        if (await this.search.inputValue() === value) return;
        const previousUrl = this.page.url();
        await this.search.fill(value);
        await this.search.press("Enter");
        await expect.poll(() => this.page.url(), { timeout: 30_000 }).not.toBe(previousUrl);
    }

    async searchForFirstCaseNumber(): Promise<void> {
        const row = this.rows.first();
        await expect(row).toBeVisible({ timeout: 30_000 });
        const number = (await row.getByRole("cell").first().innerText()).trim();
        if (!number) throw new Error("The first case row has no case number.");
        this.searchedCaseNumber = number;
        await this.searchFor(number);
    }

    async selectOwnedCase(status?: string, assignedToMe = false, classification?: string): Promise<void> {
        const customer = environment?.E2E_CASE_CUSTOMER_ID?.trim();
        if (!customer) throw new Error("E2E_CASE_CUSTOMER_ID is required to identify an owned case.");
        await this.navigateTo();
        await this.selectPipeline(assignedToMe ? "Assigned to Me" : "All");
        await this.searchFor("E2E");
        const found = await expect.poll(async () => this.rows.evaluateAll((rows, criteria) => rows.some((row) => {
                const cells = row.querySelectorAll("td");
                return (cells[3]?.textContent ?? "").trim() === criteria.customer
                    && /^E2E\s/.test((cells[4]?.textContent ?? "").trim())
                    && (!criteria.status || (cells[8]?.textContent ?? "").trim() === criteria.status)
                    && (!criteria.classification || (cells[10]?.textContent ?? "").trim() === criteria.classification);
            }), { customer, status, classification }), { timeout: 30_000 }).toBe(true).then(() => true, (error: unknown) => {
                if (error && typeof error === "object" && "matcherResult" in error) return false;
                throw error;
            });
        if (!found) {
            throw new CasesPrerequisiteError(`No E2E-owned case for the configured customer${status ? ` in ${status}` : ""} was found.`);
        }
        for (let i = 0; i < await this.rows.count(); i += 1) {
            const row = this.rows.nth(i);
            const cells = row.getByRole("cell");
            const customerValue = (await cells.nth(3).innerText()).trim();
            const subject = (await cells.nth(4).innerText()).trim();
            const rowStatus = (await cells.nth(8).innerText()).trim();
            if (customerValue !== customer || !/^E2E\s/.test(subject) || (status && rowStatus !== status)) continue;
            if (classification && (await cells.nth(10).innerText()).trim() !== classification) continue;
            this.selectedCaseNumber = (await cells.first().innerText()).trim();
            this.ownedSubject = subject;
            this.ownedCustomer = customer;
            if (!this.selectedCaseNumber) throw new Error("The owned case has no case number.");
            return;
        }
        throw new CasesPrerequisiteError(`No E2E-owned case for the configured customer${status ? ` in ${status}` : ""} was found.`);
    }

    async searchSelectedCase(): Promise<void> {
        if (!this.selectedCaseNumber) throw new Error("No owned case was selected.");
        await this.selectPipeline("All");
        await this.searchFor(this.selectedCaseNumber);
    }

    async searchOwnedSubject(): Promise<void> {
        if (!this.ownedSubject) throw new Error("No owned subject was captured.");
        await this.searchFor(this.ownedSubject);
    }

    async expectSelectedRow(status?: string): Promise<void> {
        if (!this.selectedCaseNumber) throw new Error("No owned case was selected.");
        const row = this.rows.filter({ has: this.page.getByText(this.selectedCaseNumber, { exact: true }) });
        await expect(row).toHaveCount(1);
        if (status) await expect(row.getByRole("cell", { name: status, exact: true })).toBeVisible();
    }

    async expectSelectedRowAbsent(): Promise<void> {
        if (!this.selectedCaseNumber) throw new Error("No owned case was selected.");
        await expect(this.rows.filter({ has: this.page.getByText(this.selectedCaseNumber, { exact: true }) })).toHaveCount(0);
    }

    async filterStatus(status: string): Promise<void> {
        await this.page.getByTestId("btn-add-filter").click();
        await this.page.getByTestId("filter-option-case_status_id").click();
        const search = this.page.getByRole("textbox", { name: "Search for an item" });
        await search.fill(status);
        await this.page.getByRole("option", { name: status, exact: true }).click();
        await this.page.keyboard.press("Escape");
    }

    async prepareReset(): Promise<void> {
        await this.navigateTo();
        await this.selectPipeline("All");
        const row = this.rows.first();
        await expect(row).toBeVisible();
        const number = (await row.getByRole("cell").first().innerText()).trim();
        const status = (await row.getByRole("cell").nth(8).innerText()).trim();
        if (!number || !status) throw new Error("A case and status are required to prepare reset.");
        await this.searchFor(number);
        await this.filterStatus(status);
    }

    async resetCriteria(): Promise<void> { await this.page.getByTestId("btn-clear-filters").click(); }
    async expectSearchCleared(): Promise<void> { await expect(this.search).toHaveValue(""); }
    async expectFiltersCleared(): Promise<void> { await expect(this.page.getByTestId("btn-add-filter")).toBeVisible(); }
    async expectUnfilteredResults(): Promise<void> { await expect.poll(() => this.rows.count(), { timeout: 30_000 }).toBeGreaterThan(0); }

    async expectMatchingSearchRows(): Promise<void> {
        if (!this.searchedCaseNumber) throw new Error("No case number was captured for the search.");
        await expect.poll(() => this.rows.count(), { timeout: 30_000 }).toBeGreaterThan(0);
        const count = await this.rows.count();
        for (let index = 0; index < count; index += 1) {
            await expect(this.rows.nth(index).getByRole("cell").first()).toContainText(this.searchedCaseNumber);
        }
    }

    async expectNoRows(): Promise<void> {
        await expect(this.rows).toHaveCount(0);
    }

    async expectEmptyMessage(message: string): Promise<void> {
        await expect(this.page.getByRole("heading", { name: message, exact: true })).toBeVisible();
    }

    async selectPipeline(name: string): Promise<void> {
        const tab = this.page.getByRole("tab", { name: new RegExp(`^${name}(?:\\s+[\\d,]+)?$`, "i") });
        await tab.click();
    }

    async openOthers(): Promise<void> {
        await this.page.getByRole("button", { name: "Others", exact: true }).click();
    }

    async selectOtherPipeline(name: string): Promise<void> {
        await this.openOthers();
        await this.page.getByRole("menuitem", { name: new RegExp(`^${name}(?:\\s|$)`, "i") }).click();
    }

    async expectStatuses(status: string): Promise<void> {
        await expect.poll(() => this.rows.count(), { timeout: 30_000 }).toBeGreaterThan(0);
        const count = await this.rows.count();
        for (let index = 0; index < count; index += 1) {
            await expect(this.rows.nth(index).getByRole("cell", { name: status, exact: true })).toBeVisible();
        }
    }

    async expectOtherPipelines(names: string[]): Promise<void> {
        for (const name of names) {
            await expect(this.page.getByRole("menuitem", { name: new RegExp(`^${name}(?:\\s|$)`, "i") })).toBeVisible();
        }
    }

    async openFilterFields(): Promise<void> {
        await this.page.getByTestId("btn-add-filter").click();
    }

    async expectFilterFields(names: string[]): Promise<void> {
        for (const name of names) {
            await expect(this.page.getByRole("button", { name, exact: true }).and(this.page.locator('[data-testid^="filter-option-"]'))).toBeVisible();
        }
    }

    async sortByUpdatedAt(): Promise<void> {
        await this.page.getByTestId("btn-add-sort").click();
        const dialog = this.page.getByRole("dialog").filter({ has: this.page.getByPlaceholder("Type a value or choose options") });
        await dialog.getByRole("button", { name: "Updated At", exact: true }).click();
        const created = dialog.getByRole("listitem").filter({ hasText: "Created At" });
        await created.locator("button").filter({ has: this.page.locator("i.i-x") }).click();
        await expect(dialog.getByRole("listitem").filter({ hasText: "Created At" })).toHaveCount(0);
        await this.page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
    }

    async expectUpdatedAtOrder(): Promise<void> {
        await expect(this.page.locator("table th").filter({ hasText: "Last Updated At" })).toBeVisible({ timeout: 30_000 });
        const headings = await this.page.locator("table th").allTextContents();
        const index = headings.findIndex((heading) => heading.includes("Last Updated At"));
        if (index < 0) throw new Error("Last Updated At column is unavailable.");
        const rows = this.page.locator("table tbody tr");
        await expect.poll(() => rows.count()).toBeGreaterThan(1);
        await expect.poll(async () => {
            const values = await rows.evaluateAll((elements, column) => elements.map((row) =>
                Date.parse((row.querySelectorAll("td")[column]?.textContent ?? "").trim())), index);
            if (values.length < 2 || values.some((value) => !Number.isFinite(value))) return false;
            return values.every((value, i) => i === 0 || values[i - 1] <= value)
                || values.every((value, i) => i === 0 || values[i - 1] >= value);
        }, { timeout: 30_000, message: "Visible cases should be ordered by Updated At" }).toBe(true);
    }

    async prepareNextPage(): Promise<void> {
        await this.navigateTo();
        await this.selectPipeline("All");
        const next = this.page.getByRole("button", { name: "Next", exact: true });
        await expect(next).toBeEnabled();
        this.previousCaseNumbers = await this.caseNumbers();
        expect(this.previousCaseNumbers.length).toBeGreaterThan(0);
    }

    private async caseNumbers(): Promise<string[]> {
        const cells = this.rows.getByRole("cell").filter({ has: this.page.getByRole("button") });
        return (await cells.allTextContents()).map((value) => value.trim()).filter((value) => /^HS-\d/.test(value));
    }

    async nextPage(): Promise<void> {
        await this.page.getByRole("button", { name: "Next", exact: true }).click();
    }

    async expectDifferentPage(): Promise<void> {
        await expect.poll(async () => this.caseNumbers()).not.toEqual(this.previousCaseNumbers);
        expect((await this.caseNumbers()).length).toBeGreaterThan(0);
    }

    async openCreate(): Promise<void> {
        await this.page.getByRole("button", { name: "Create New", exact: true }).click();
        await expect(this.createDialog).toBeVisible({ timeout: 30_000 });
    }

    async cancelCreate(): Promise<void> {
        await this.createDialog.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(this.createDialog).toBeHidden();
    }

    async expectCreateDisabled(): Promise<void> {
        await expect(this.createDialog.getByRole("button", { name: "Create Case", exact: true })).toBeDisabled();
    }

    async expectCreateDefaults(): Promise<void> {
        await expect(this.createDialog.getByRole("button", { name: "Converge", exact: true })).toBeVisible();
        await expect(this.createDialog.getByRole("button", { name: "Trouble Case", exact: true })).toBeVisible();
    }

    async expectCreateMarkers(): Promise<void> {
        await expect(this.createDialog.getByRole("button", { name: "Case Severity *", exact: true })).toBeVisible();
        const description = this.createDialog.getByText("Case Description", { exact: true });
        await expect(description).toBeVisible();
        await expect(description.locator("..")).not.toContainText("*");
    }

    async selectBillingClassification(): Promise<void> {
        const category = this.createDialog.getByRole("textbox", { name: "Search or select an item..." });
        await category.fill("Billing Documents");
        await this.page.getByRole("option", { name: "Converge - Request > Billing & Payments > Billing Documents", exact: true }).click();
        await this.createDialog.getByRole("button", { name: "Case Outcome *", exact: true }).click();
        await this.page.getByRole("menuitem", { name: "Statement of Account", exact: true }).click();
    }

    private async selectCreateClassification(): Promise<void> {
        const classification = this.createClassification;
        const category = this.createDialog.getByRole("textbox", { name: "Search or select an item..." });
        await category.fill(classification.name);
        await this.page.getByRole("option", { name: `Converge - Request > Billing & Payments > ${classification.name}`, exact: true }).click();
        await this.createDialog.getByRole("button", { name: "Case Outcome *", exact: true }).click();
        await this.page.getByRole("menuitem", { name: classification.outcome, exact: true }).click();
    }

    private async checkedSubject(label: string): Promise<string> {
        for (const name of [label, `${label} retry`]) {
            const candidate = e2eValue(name);
            await this.searchFor(candidate);
            if (await this.page.getByRole("heading", { name: "No Data Available", exact: true }).isVisible({ timeout: 10_000 }).catch(() => false)) return candidate;
        }
        throw new Error("No collision-free E2E case subject was available.");
    }

    async prepareCreate(): Promise<void> {
        const customer = environment?.E2E_CASE_CUSTOMER_ID?.trim();
        if (!customer) throw new Error("E2E_CASE_CUSTOMER_ID is required for case creation.");
        this.ownedCustomer = customer;
        await this.navigateTo();
        await this.selectPipeline("All");
        if (!this.existingDuplicate) {
            await this.searchFor(customer);
            await expect.poll(async () => (await this.rows.count()) > 0 || await this.page.getByRole("heading", { name: "No Data Available", exact: true }).isVisible(), { timeout: 30_000 }).toBe(true);
            const activeTypes = new Set<string>();
            const next = this.page.getByRole("button", { name: "Next", exact: true });
            for (;;) {
                for (let i = 0; i < await this.rows.count(); i += 1) {
                    const cells = this.rows.nth(i).getByRole("cell");
                    if ((await cells.nth(3).innerText()).trim() !== customer) continue;
                    const status = (await cells.nth(8).innerText()).trim();
                    if (!["Closed", "Solved", "Cancelled"].includes(status)) activeTypes.add((await cells.nth(10).innerText()).trim());
                }
                if (!await next.isEnabled().catch(() => false)) break;
                const previous = await this.rows.first().getByRole("cell").first().innerText();
                await next.click();
                await expect.poll(() => this.rows.first().getByRole("cell").first().innerText(), { timeout: 30_000 }).not.toBe(previous);
            }
            const available = CREATE_CLASSIFICATIONS.find(({ name }) => !activeTypes.has(`Request > Billing & Payments > ${name}`));
            if (!available) throw new CasesPrerequisiteError("The configured customer already has active cases for all verified creation classifications.");
            this.createClassification = available;
        }
        this.newSubject = await this.checkedSubject("case creation");
        await this.page.getByTestId("btn-clear-filters").click();
        await expect(this.search).toHaveValue("");
        await this.expectUnfilteredResults();
        await this.openCreate();
        const lookup = this.createDialog.getByRole("textbox", { name: "Search Customer Account No/Email" });
        await lookup.fill(customer);
        const options = this.page.getByRole("option");
        await expect(options).toHaveCount(1, { timeout: 30_000 });
        await options.first().click();
        await expect(this.createDialog.getByText(customer, { exact: true })).toBeVisible();
    }

    async submitCreate(): Promise<void> {
        this.assertNonProduction();
        if (!this.newSubject || !this.ownedCustomer) throw new Error("The case customer and unique subject must be prepared first.");
        if (this.existingDuplicate) await this.selectBillingClassification();
        else await this.selectCreateClassification();
        await this.createDialog.getByRole("textbox", { name: "Case Subject" }).fill(this.newSubject);
        await this.createDialog.getByRole("textbox", { name: "Case Description" }).fill("Testing case creation and handling in a non-production environment.");
        await this.createDialog.getByRole("button", { name: "Case Source", exact: true }).click();
        await this.page.getByRole("menuitem", { name: "Correspondent Agent", exact: true }).click();
        await this.createDialog.getByRole("button", { name: "Create Case", exact: true }).click();
    }

    async expectCreatedCase(): Promise<void> {
        if (!this.newSubject) throw new Error("No new case subject was recorded.");
        await expect(this.page.getByText("Case Information", { exact: true })).toBeVisible({ timeout: 30_000 });
        const number = (await this.field("Case Number").innerText()).trim();
        if (!number) throw new Error("The created case did not expose its case number.");
        this.selectedCaseNumber = number;
        this.ownedSubject = this.newSubject;
        await expect(this.field("Subject")).toHaveText(this.newSubject);
        await expect(this.field("Account Number", "last")).toContainText(this.ownedCustomer!);
    }

    async prepareDuplicate(): Promise<void> {
        await this.selectOwnedCase("In Progress", false, "Request > Billing & Payments > Billing Documents");
        this.existingDuplicate = this.selectedCaseNumber;
        await this.openSelectedCase();
        expect(await this.readFields(["Category", "Type", "Sub-Type"])).toEqual(["Request", "Billing & Payments", "Billing Documents"]);
        await this.prepareCreate();
    }

    private duplicateDialog(): Locator {
        return this.page.getByRole("dialog").filter({ hasText: "active case with the same CTS" });
    }

    async expectDuplicateWarning(): Promise<void> {
        if (!this.existingDuplicate) throw new Error("No existing duplicate case was identified.");
        await expect(this.duplicateDialog()).toContainText(this.existingDuplicate);
    }

    async viewDuplicate(): Promise<void> {
        await this.duplicateDialog().getByRole("button", { name: "View Existing Case", exact: true }).click();
    }

    async expectExistingDuplicate(): Promise<void> {
        if (!this.existingDuplicate) throw new Error("No existing duplicate case was identified.");
        await expect(this.page.getByRole("tab", { name: new RegExp(`^${this.existingDuplicate}\\s`) })).toBeVisible();
    }

    async editDuplicate(): Promise<void> {
        await this.duplicateDialog().getByRole("button", { name: "Go Back & Edit", exact: true }).click();
    }

    async expectDuplicateFormRetained(): Promise<void> {
        if (!this.newSubject) throw new Error("No attempted subject was recorded.");
        await expect(this.createDialog.getByRole("textbox", { name: "Case Subject" })).toHaveValue(this.newSubject);
    }

    async expectAttemptNotCreated(): Promise<void> {
        if (!this.newSubject) throw new Error("No attempted subject was recorded.");
        if (await this.createDialog.isVisible().catch(() => false)) await this.cancelCreate();
        const selectedTab = this.existingDuplicate && this.page.getByRole("tab", { name: new RegExp(`^${this.existingDuplicate}\\s`) });
        if (selectedTab && await selectedTab.isVisible().catch(() => false)) await selectedTab.getByRole("button", { name: "Close tab" }).click();
        await this.searchFor(this.newSubject);
        await this.expectEmptyMessage("No Data Available");
        await this.expectNoRows();
    }

    async openOwnedCase(status?: string, assignedToMe = false): Promise<void> {
        await this.selectOwnedCase(status, assignedToMe);
        await this.searchSelectedCase();
        await this.openSelectedCase();
        await this.assertOwnedCase();
    }

    private async assertOwnedCase(): Promise<void> {
        if (!this.ownedCustomer || !this.ownedSubject || !this.selectedCaseNumber || !/^E2E\s/.test(this.ownedSubject)) {
            throw new Error("An identified E2E case and configured customer are required.");
        }
        await this.expectSelectedCase();
        await expect(this.field("Account Number", "last")).toContainText(this.ownedCustomer);
        await expect(this.field("Subject")).toHaveText(this.ownedSubject);
    }

    async cancelStatusAction(action: "Pending to customer reply" | "Resolve Case"): Promise<void> {
        await this.openMoreActions();
        await this.page.getByRole("menuitem", { name: action, exact: true }).click();
        const heading = action === "Resolve Case" ? /Resolve Case/ : /Pending Case/;
        const dialog = this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: heading }) });
        await expect(dialog).toBeVisible();
        await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(dialog).toBeHidden();
    }

    async expectStatus(status: string): Promise<void> { await expect(this.field("Team Status")).toHaveText(status); }

    private editDialog(): Locator {
        return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: /Edit Case/ }) });
    }

    private async openEdit(): Promise<void> {
        await this.openMoreActions();
        await this.page.getByRole("menuitem", { name: "Edit Case", exact: true }).click();
        await expect(this.editDialog()).toBeVisible();
    }

    async editSubject(save: boolean): Promise<void> {
        if (save) this.assertNonProduction();
        await this.assertOwnedCase();
        if (!this.ownedSubject) throw new Error("No owned subject was recorded.");
        const original = this.ownedSubject;
        if (!this.selectedCaseNumber) throw new Error("No owned case number was recorded.");
        await this.page.getByRole("tab", { name: new RegExp(`^${this.selectedCaseNumber}\\s`) }).getByRole("button", { name: "Close tab" }).click();
        const edited = await this.checkedSubject("case subject edit");
        await this.searchSelectedCase();
        await this.openSelectedCase();
        await this.assertOwnedCase();
        await this.openEdit();
        await this.editDialog().getByRole("textbox", { name: "Case Subject" }).fill(edited);
        if (save) {
            this.editedOriginal = original;
            this.editedSubject = edited;
            await this.editDialog().getByRole("button", { name: "Save", exact: true }).click();
            await expect(this.editDialog()).toBeHidden();
            await this.closeSuccessDialog();
            this.ownedSubject = edited;
        } else {
            await this.editDialog().getByRole("button", { name: "Cancel", exact: true }).click();
            await expect(this.editDialog()).toBeHidden();
        }
    }

    async expectOwnedSubject(): Promise<void> {
        if (!this.ownedSubject) throw new Error("No owned subject was recorded.");
        await expect(this.field("Subject")).toHaveText(this.ownedSubject);
    }

    async reloadAndExpectSubject(): Promise<void> {
        await this.page.reload({ waitUntil: "domcontentloaded" });
        await this.expectSelectedCase();
        await this.expectOwnedSubject();
    }

    async cleanupOwnedEdits(): Promise<void> {
        await this.closeSuccessDialog();
        if (this.restoreAssignment) {
            this.assertNonProduction();
            await this.reopenSelectedIfNeeded();
            await this.assertOwnedCase();
            if ((await this.field("Agent").innerText()).trim() === "—") await this.assignToMe();
            this.restoreAssignment = false;
        }
        if (!this.editedOriginal || !this.editedSubject) return;
        this.assertNonProduction();
        await this.reopenSelectedIfNeeded();
        await expect(this.field("Account Number", "last")).toContainText(this.ownedCustomer!);
        const current = (await this.field("Subject").innerText()).trim();
        if (current === this.editedOriginal) return;
        if (current !== this.editedSubject) throw new Error("The owned case subject changed unexpectedly; automatic restoration was stopped.");
        await this.openEdit();
        await this.editDialog().getByRole("textbox", { name: "Case Subject" }).fill(this.editedOriginal);
        await this.editDialog().getByRole("button", { name: "Save", exact: true }).click();
        await expect(this.editDialog()).toBeHidden();
        await this.closeSuccessDialog();
        await expect(this.field("Subject")).toHaveText(this.editedOriginal);
    }

    private async closeSuccessDialog(): Promise<void> {
        const dialog = this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: "Success", exact: true }) });
        if (await dialog.isVisible().catch(() => false)) await dialog.getByRole("button", { name: "Close", exact: true }).click();
    }

    private async reopenSelectedIfNeeded(): Promise<void> {
        if (!this.selectedCaseNumber) throw new Error("No owned case number was recorded for restoration.");
        const tab = this.page.getByRole("tab", { name: new RegExp(`^${this.selectedCaseNumber}\\s`) });
        if (await tab.isVisible().catch(() => false)) return;
        await this.navigateTo();
        await this.searchFor(this.selectedCaseNumber);
        await this.openSelectedCase();
    }

    async prepareUnassignedOwned(): Promise<void> {
        await this.openOwnedCase("In Progress", true);
        await this.unassignOwned();
    }

    async unassignOwned(): Promise<void> {
        this.assertNonProduction();
        await this.assertOwnedCase();
        this.restoreAssignment = true;
        await this.openMoreActions();
        await this.page.getByRole("menuitem", { name: "Unassign Case", exact: true }).click();
        const dialog = this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: "Unassign Case", exact: true }) });
        await expect(dialog).toContainText(this.selectedCaseNumber!);
        await dialog.getByRole("button", { name: "Unassign", exact: true }).click();
        const success = this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: "Unassign Case Success", exact: true }) });
        await expect(success).toContainText(this.selectedCaseNumber!);
        await success.getByRole("button", { name: "Close", exact: true }).click();
        await this.expectUnassigned();
    }

    async assignToMe(): Promise<void> {
        this.assertNonProduction();
        await this.assertOwnedCase();
        await this.openMoreActions();
        await this.page.getByRole("menuitem", { name: "Assign to Me", exact: true }).click();
        const confirm = this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: "Assign Case to Yourself", exact: true }) });
        await confirm.getByRole("button", { name: "Confirm", exact: true }).click();
        const success = this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: "Successfully Assigned this Case to Yourself", exact: true }) });
        await expect(success).toContainText(this.selectedCaseNumber!);
        await success.getByRole("button", { name: "Close", exact: true }).click();
        await this.expectAssignedToMe();
        this.restoreAssignment = false;
    }

    async expectUnassigned(): Promise<void> { await expect(this.field("Agent")).toHaveText("—"); }

    async expectAssignedToMe(): Promise<void> {
        const greeting = (await this.page.getByText(/^Hi, /).innerText()).trim().replace(/^Hi,\s*/, "");
        if (!greeting) throw new Error("The signed-in agent could not be identified.");
        await expect(this.field("Agent")).toHaveText(greeting);
    }

    async prepareStart(): Promise<void> {
        try {
            await this.openOwnedCase("Assigned", true);
        } catch (error) {
            if (!(error instanceof CasesPrerequisiteError)) throw error;
            this.assertNonProduction();
            await this.prepareCreate();
            await this.submitCreate();
            await this.expectCreatedCase();
            await this.assertOwnedCase();
            await this.expectStatus("Assigned");
            await this.expectAssignedToMe();
        }
        await this.openMoreActions();
        await expect(this.page.getByRole("menuitem", { name: "Start Case", exact: true })).toBeVisible();
        await this.page.keyboard.press("Escape");
    }

    async startOwned(): Promise<void> {
        this.assertNonProduction();
        await this.assertOwnedCase();
        await this.openMoreActions();
        await this.page.getByRole("menuitem", { name: "Start Case", exact: true }).click();
        const dialog = this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: /Start Case/ }) });
        await expect(dialog).toBeVisible();
        await dialog.getByRole("button", { name: "Yes", exact: true }).click();
        const close = this.page.getByRole("dialog").getByRole("button", { name: "Close", exact: true });
        if (await close.isVisible().catch(() => false)) await close.click();
    }

    private systemEmailEntries(): Locator {
        return this.page.getByRole("button", { name: /Your Case Is Now In Progress|We.ve Received Your Request/i });
    }

    async prepareEmailFeed(): Promise<void> {
        await this.openOwnedCase();
        const external = this.page.getByRole("button", { name: "Switch to External", exact: true });
        if (await external.isVisible().catch(() => false)) await external.click();
        await this.page.getByRole("tab", { name: "All", exact: true }).click();
        await expect.poll(() => this.systemEmailEntries().count()).toBeGreaterThan(0);
    }

    async openAllFeed(): Promise<void> { await this.page.getByRole("tab", { name: "All", exact: true }).click(); }
    async expectEmailEntries(): Promise<void> { await expect.poll(() => this.systemEmailEntries().count()).toBeGreaterThan(0); }

    async prepareEmptyInternalFeed(): Promise<void> {
        await this.openOwnedCase();
        await this.openInternalFeed();
        await this.expectInternalMessage("No messages in the Internal Feed yet.");
    }

    async openInternalFeed(): Promise<void> {
        const toggle = this.page.getByRole("button", { name: "Switch to Internal", exact: true });
        if (await toggle.isVisible().catch(() => false)) await toggle.click();
        await expect(this.page.getByRole("button", { name: "Switch to External", exact: true })).toBeVisible();
    }

    async expectInternalMessage(message: string): Promise<void> { await expect(this.page.getByText(message, { exact: true })).toBeVisible(); }

    async expectCreateChoice(label: "Priority" | "Severity", value: string): Promise<void> {
        await expect(this.createDialog.getByRole("button", { name: `Case ${label} *`, exact: true })).toContainText(value);
    }

    async expectList(): Promise<void> {
        await expect(this.search).toBeVisible();
    }

    async cancelPopulatedCreate(): Promise<void> {
        let subject: string | null = null;
        for (const label of ["case cancellation", "case cancellation retry"]) {
            const candidate = e2eValue(label);
            await this.searchFor(candidate);
            const empty = this.page.getByRole("heading", { name: "No Data Available", exact: true });
            if (await empty.isVisible({ timeout: 10_000 }).catch(() => false)) {
                subject = candidate;
                break;
            }
        }
        if (!subject) throw new Error("Could not establish a unique subject for the canceled create form.");
        this.canceledSubject = subject;
        await this.page.getByTestId("btn-clear-filters").click();
        await this.openCreate();
        await this.createDialog.getByRole("textbox", { name: "Case Subject", exact: true }).fill(subject);
        await this.cancelCreate();
    }

    async expectCanceledSubjectAbsent(): Promise<void> {
        if (!this.canceledSubject) throw new Error("No canceled case subject was recorded.");
        await this.searchFor(this.canceledSubject);
        await this.expectEmptyMessage("No Data Available");
        await this.expectNoRows();
    }

    async selectFirstAccessibleCase(): Promise<void> {
        await this.navigateTo();
        const row = this.rows.first();
        await expect(row).toBeVisible({ timeout: 30_000 });
        const number = (await row.getByRole("cell").first().innerText()).trim();
        if (!number) throw new Error("The first case row has no case number.");
        this.selectedCaseNumber = number;
    }

    async selectCorrespondentCase(): Promise<void> {
        await this.navigateTo();
        await this.selectPipeline("All");
        const row = this.rows.filter({ has: this.page.getByRole("cell", { name: "Correspondent Agent", exact: true }) }).first();
        await expect(row).toBeVisible({ timeout: 30_000 });
        const number = (await row.getByRole("cell").first().innerText()).trim();
        if (!number) throw new Error("The Correspondent Agent case has no case number.");
        this.selectedCaseNumber = number;
        await this.openSelectedCase();
    }

    async openSelectedCase(): Promise<void> {
        if (!this.selectedCaseNumber) throw new Error("No case was selected from the list.");
        await this.searchFor(this.selectedCaseNumber);
        await expect(this.rows).toHaveCount(1, { timeout: 30_000 });
        const row = this.rows.filter({ has: this.page.getByText(this.selectedCaseNumber, { exact: true }) });
        await expect(row).toHaveCount(1, { timeout: 30_000 });
        await row.click();
        await this.page.getByRole("button", { name: "View Case Detail", exact: true }).click();
        await this.expectSelectedCase();
    }

    async expectSelectedCase(): Promise<void> {
        if (!this.selectedCaseNumber) throw new Error("No case was selected from the list.");
        await expect(this.page.getByRole("tab", { name: new RegExp(`^${this.selectedCaseNumber}\\s`) })).toBeVisible();
        await expect(this.page.getByText("Case Information", { exact: true })).toBeVisible();
    }

    async expectCaseInformation(): Promise<void> {
        for (const label of ["Case Number", "Category", "Type", "Sub-Type", "Subject", "Team Status"]) {
            const term = this.page.getByRole("term").filter({ has: this.page.getByText(label, { exact: true }) }).first();
            const value = term.locator("../..").getByRole("definition");
            await expect(value).toBeVisible();
            await expect(value).not.toHaveText(/^\s*$/);
        }
        if (!this.selectedCaseNumber) throw new Error("No case was selected from the list.");
        const caseNumber = this.page.getByRole("term").filter({ has: this.page.getByText("Case Number", { exact: true }) }).locator("../..").getByRole("definition");
        await expect(caseNumber).toContainText(this.selectedCaseNumber);
    }

    async expectTeamFields(): Promise<void> {
        for (const label of ["Team", "Agent"]) {
            const term = this.page.getByRole("term").filter({ has: this.page.getByText(label, { exact: true }) }).first();
            await expect(term.locator("../..").getByRole("definition")).toBeVisible();
        }
    }

    async expectCustomerSections(): Promise<void> {
        for (const label of ["Customer Details", "Service Address", "Billing Address", "Customer Billing Details"]) {
            await expect(this.page.getByText(label, { exact: true })).toBeVisible();
        }
    }

    async openMoreActions(): Promise<void> {
        await this.page.getByRole("button", { name: "More Actions", exact: true }).click();
    }

    async expectCancelDisabled(): Promise<void> {
        await expect(this.page.getByRole("menuitem", { name: "Cancel Case", exact: true })).toBeDisabled();
    }

    async expectWorkflowAvailable(): Promise<void> {
        await this.openMoreActions();
        await expect(this.page.getByRole("menuitem", { name: "View Workflow", exact: true })).toBeVisible();
    }

    async openWorkflow(): Promise<void> {
        await this.page.getByRole("menuitem", { name: "View Workflow", exact: true }).click();
    }

    async expectNumberedWorkflow(): Promise<void> {
        const dialog = this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: /View Workflow/ }) });
        await expect(dialog.getByText(/^Step \d+(?:\.\d+)?$/).first()).toBeVisible();
    }

    private field(label: string, position: "first" | "last" = "first"): Locator {
        const terms = this.page.getByRole("term").filter({ has: this.page.getByText(label, { exact: true }) });
        return terms[position]().locator("../..").getByRole("definition");
    }

    private async readFields(labels: string[]): Promise<string[]> {
        const values: string[] = [];
        for (const label of labels) values.push((await this.field(label).innerText()).trim());
        return values;
    }

    async openAccessibleCase(): Promise<void> {
        await this.selectFirstAccessibleCase();
        await this.openSelectedCase();
    }

    async prepareClassificationEdit(): Promise<void> {
        await this.openOwnedCase("In Progress");
        this.savedFields = await this.readFields(["Category", "Type", "Sub-Type"]);
        await this.openMoreActions();
        await expect(this.page.getByRole("menuitem", { name: "Edit CTS", exact: true })).toBeVisible();
    }

    async cancelClassificationEdit(): Promise<void> {
        await this.page.getByRole("menuitem", { name: "Edit CTS", exact: true }).click();
        const dialog = this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: /Edit CTS/ }) });
        await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(dialog).toBeHidden();
    }

    async expectClassificationUnchanged(): Promise<void> {
        expect(this.savedFields).toHaveLength(3);
        expect(await this.readFields(["Category", "Type", "Sub-Type"])).toEqual(this.savedFields);
    }

    async prepareCustomerChange(): Promise<void> {
        await this.openAccessibleCase();
        this.savedFields = [
            (await this.field("Customer Name").innerText()).trim(),
            (await this.field("Account Number", "last").innerText()).trim(),
        ];
        await expect(this.page.getByText("Customer Details", { exact: true })).toBeVisible();
    }

    async cancelCustomerChange(): Promise<void> {
        await this.page.getByRole("button", { name: "Change", exact: true }).click();
        await expect(this.page.getByRole("textbox", { name: "Search Customer Account No/Email" })).toBeVisible();
        await this.page.getByRole("button", { name: "Cancel", exact: true }).click();
    }

    async expectCustomerUnchanged(): Promise<void> {
        expect(this.savedFields).toHaveLength(2);
        await expect(this.field("Customer Name")).toHaveText(this.savedFields[0]);
        await expect(this.field("Account Number", "last")).toHaveText(this.savedFields[1]);
    }

    async prepareChildForm(): Promise<void> {
        await this.selectOwnedCase("In Progress", false, "Request > Billing & Payments > Billing Documents");
        if (!this.selectedCaseNumber) throw new Error("No parent case was selected.");
        this.childSubject = e2eValue("child case cancellation");
        await this.searchFor(this.childSubject);
        await this.expectEmptyMessage("No Data Available");
        await this.expectNoRows();
        await this.searchFor(this.selectedCaseNumber);
        await this.openSelectedCase();
        await this.openMoreActions();
        await expect(this.page.getByRole("menuitem", { name: "Create Child Case", exact: true })).toBeVisible();
    }

    async openChildForm(): Promise<void> {
        await this.page.getByRole("menuitem", { name: "Create Child Case", exact: true }).click();
        await expect(this.childDialog()).toBeVisible();
        if (!this.childSubject) throw new Error("No checked child subject was recorded.");
        await this.childDialog().getByRole("textbox", { name: "Case Subject", exact: true }).fill(this.childSubject);
    }

    private childDialog(): Locator {
        return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: /Create Child Case/ }) });
    }

    async expectChildParent(): Promise<void> {
        if (!this.selectedCaseNumber) throw new Error("No parent case was selected.");
        await expect(this.childDialog().getByRole("textbox", { name: "Search Ticket No" })).toHaveValue(this.selectedCaseNumber);
    }

    async cancelChildForm(): Promise<void> {
        await this.childDialog().getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(this.childDialog()).toBeHidden();
    }

    async expectNoChildCreated(): Promise<void> {
        if (!this.childSubject) throw new Error("No checked child subject was recorded.");
        if (!this.selectedCaseNumber) throw new Error("No parent case was selected.");
        await this.page.getByRole("tab", { name: new RegExp(`^${this.selectedCaseNumber}\\s`) }).getByRole("button", { name: "Close tab" }).click();
        await this.searchFor(this.childSubject);
        await this.expectEmptyMessage("No Data Available");
        await this.expectNoRows();
    }

    private async openDrawer(icon: "i-book" | "i-address-book" | "i-vector-triangle"): Promise<void> {
        await this.page.locator("button").filter({ has: this.page.locator(`i.${icon}`) }).click();
    }

    async prepareKnowledge(): Promise<void> {
        await this.openAccessibleCase();
        await this.openDrawer("i-book");
        await expect(this.page.getByText("No articles found.", { exact: true })).toBeVisible();
    }

    async openKnowledge(): Promise<void> {
        if (!(await this.page.getByText("Knowledge", { exact: true }).isVisible())) await this.openDrawer("i-book");
    }

    async expectKnowledgeMessage(message: string): Promise<void> {
        await expect(this.page.getByText(message, { exact: true })).toBeVisible();
    }

    private watcherRegion(): Locator {
        return this.page.getByText("Watchers", { exact: true }).locator("../../..");
    }

    async prepareWatcher(): Promise<void> {
        await this.openAccessibleCase();
        await this.openDrawer("i-address-book");
        await expect(this.page.getByRole("button", { name: "Add Watcher", exact: true })).toBeVisible();
        this.drawerBefore = await this.watcherRegion().innerText();
    }

    async openWatcher(): Promise<void> {
        await this.page.getByRole("button", { name: "Add Watcher", exact: true }).click();
    }

    private watcherDialog(): Locator {
        return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: /Available Agents/ }) });
    }

    async expectWatcherDialog(): Promise<void> {
        await expect(this.watcherDialog().getByRole("textbox", { name: "Search..." })).toBeVisible();
        await expect(this.watcherDialog().getByRole("button", { name: "Add Agents" })).toBeVisible();
    }

    async expectWatcherAddDisabled(): Promise<void> {
        await expect(this.watcherDialog().getByRole("button", { name: "Add Agents" })).toBeDisabled();
    }

    async cancelWatcher(): Promise<void> {
        await this.watcherDialog().getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(this.watcherDialog()).toBeHidden();
    }

    async expectWatchersUnchanged(): Promise<void> {
        await expect.poll(() => this.watcherRegion().innerText()).toBe(this.drawerBefore);
    }

    async prepareClosedRelation(): Promise<void> {
        await this.navigateTo();
        await this.selectOtherPipeline("Closed");
        const row = this.rows.first();
        await expect(row).toBeVisible({ timeout: 30_000 });
        await expect(row.getByRole("cell").nth(8)).toHaveText("Closed", { timeout: 30_000 });
        this.selectedCaseNumber = (await row.getByRole("cell").first().innerText()).trim();
        if (!this.selectedCaseNumber) throw new Error("The closed case has no case number.");
        await this.openSelectedCase();
        await this.openDrawer("i-vector-triangle");
        this.drawerBefore = await this.relationRegion().innerText();
    }

    private relationRegion(): Locator {
        return this.page.getByRole("button", { name: "Add Case Relation", exact: true }).locator("../..");
    }

    async openRelation(): Promise<void> {
        await this.page.getByRole("button", { name: "Add Case Relation", exact: true }).click();
    }

    private relationDialog(): Locator {
        return this.page.getByRole("dialog").filter({ has: this.page.getByRole("heading", { name: "Add Case Relation", exact: true }) });
    }

    async expectRelationDialog(): Promise<void> {
        await expect(this.relationDialog().getByRole("textbox", { name: "Search Ticket No" })).toBeVisible();
        for (const name of ["Save", "Cancel"]) await expect(this.relationDialog().getByRole("button", { name, exact: true })).toBeVisible();
    }

    async cancelRelation(): Promise<void> {
        await this.relationDialog().getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(this.relationDialog()).toBeHidden();
    }

    async expectRelationsUnchanged(): Promise<void> {
        await expect.poll(() => this.relationRegion().innerText()).toBe(this.drawerBefore);
    }
}
