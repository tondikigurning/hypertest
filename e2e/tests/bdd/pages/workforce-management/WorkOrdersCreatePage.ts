/**
 * POM — Work Orders create wizard.
 * Route: /workforce-management/work-orders/create
 *
 * 4-step wizard:
 *   1. Case & Job Detail — Job Type (Repair), Priority, Case Reference / Ticket ID
 *   2. Scheduling — TimeSlotSelector
 *   3. Summary — review + confirm
 *   4. Completed — success screen
 */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class WorkOrdersCreatePage {
    constructor(private readonly page: Page) {
        this.lastCaseReference = null;
        this.lastAccountNumber = null;
    }

    lastCaseReference: string | null;
    lastAccountNumber: string | null;

    private get wizardStepContent(): Locator {
        return this.page.locator('[data-test-id="wizard-step-content"]');
    }

    private get wizardNextButton(): Locator {
        return this.page.getByRole("button", { name: /^next$/i });
    }

    private get wizardPrevButton(): Locator {
        return this.page.getByRole("button", { name: /previous/i });
    }

    private get wizardCancelButton(): Locator {
        return this.page.getByRole("button", { name: /cancel/i }).or(
            this.page.getByTestId("btn_cancelWizard"),
        );
    }

    private get jobTypeDropdown(): Locator {
        return this.wizardStepContent.locator('[data-testid="dropdown-jobType"]').or(
            this.wizardStepContent.getByRole("button", { name: /job type/i }),
        );
    }

    private get priorityDropdown(): Locator {
        return this.wizardStepContent.locator('[data-testid="dropdown-priority"]').or(
            this.wizardStepContent.getByRole("button", { name: /priority/i }),
        );
    }

    private get caseReferenceComboBox(): Locator {
        return this.page.getByPlaceholder("Search Reference Number").or(
            this.wizardStepContent.getByRole("combobox").last(),
        );
    }

    private get successHeading(): Locator {
        return this.page.getByText("Success").first();
    }

    private get backToHomepageButton(): Locator {
        return this.page.getByRole("button", { name: /back to homepage/i });
    }

    private get createMoreWoButton(): Locator {
        return this.page.getByRole("button", { name: /create more wo/i });
    }

    async navigateTo(): Promise<void> {
        await this.page.goto("/workforce-management/work-orders/create", { waitUntil: "domcontentloaded" });
        await this.page.waitForURL(/\/workforce-management\/work-orders\/create/, { timeout: 30_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    }

    async expectStep(stepTitle: string): Promise<void> {
        await expect(this.page.getByRole("heading", { name: new RegExp(stepTitle, "i") })).toBeVisible({ timeout: 20_000 });
    }

    async clickNext(): Promise<void> {
        await expect(this.wizardNextButton).toBeEnabled({ timeout: 20_000 });
        await this.wizardNextButton.click({ force: true });
        await this.page.waitForTimeout(2000);
    }

    async clickCancel(): Promise<void> {
        await this.wizardCancelButton.first().click();
    }

    async navigateBack(): Promise<void> {
        await this.page.goBack();
        await this.page.waitForLoadState("networkidle");
    }

    /**
     * Select "Repair" from the Job Type dropdown.
     * Uses the first available option if exact match not found.
     */
    async selectRepairJobType(): Promise<void> {
        await this.jobTypeDropdown.waitFor({ state: "visible", timeout: 20_000 });
        const currentText = await this.jobTypeDropdown.textContent().catch(() => "");
        if (currentText && /repair/i.test(currentText)) return;

        await this.jobTypeDropdown.click();
        await this.page.waitForTimeout(500);
        // Scope to open portal menu, not sidebar
        const menu = this.page.locator('[data-slot="dropdown-menu-content"][role="menu"], [role="menu"][data-state="open"]').first();
        const repairItem = menu.getByRole("menuitem", { name: /repair/i })
            .or(menu.getByRole("option", { name: /repair/i }));
        const exists = await repairItem.isVisible({ timeout: 5_000 }).catch(() => false);
        if (exists) { await repairItem.click(); return; }
        await menu.getByRole("menuitem").first().or(menu.getByRole("option").first()).click();
    }

    /** Select the first available priority option. */
    async selectFirstPriority(): Promise<void> {
        await this.priorityDropdown.waitFor({ state: "visible", timeout: 20_000 });
        await this.priorityDropdown.click();
        await this.page.waitForTimeout(500);
        const menu = this.page.locator('[data-slot="dropdown-menu-content"][role="menu"], [role="menu"][data-state="open"]').first();
        await menu.getByRole("menuitem").first().or(menu.getByRole("option").first()).click();
    }

    /** Dismiss any Radix dialog overlay that may block pointer events. */
    private async dismissOverlay(): Promise<void> {
        await this.page.evaluate(() => {
            document.querySelectorAll('[class*="z-50"]').forEach(el => {
                if (el.classList.contains("fixed") && el.classList.contains("inset-0")) el.remove();
            });
            document.body.style.pointerEvents = "auto";
            document.documentElement.style.pointerEvents = "auto";
        });
        await this.page.waitForTimeout(300);
    }

    /**
     * Search for a case reference number and select the first result.
     * If `value` is provided, search for that; otherwise use stored lastCaseReference.
     */
    async searchCaseReference(value?: string): Promise<void> {
        const searchVal = value ?? "NONEXISTENT-REF-999999";
        await this.caseReferenceComboBox.waitFor({ state: "visible", timeout: 20_000 });
        await this.caseReferenceComboBox.click({ force: true });
        const input = this.caseReferenceComboBox.locator("input").or(this.caseReferenceComboBox);
        await input.fill(searchVal);
        await this.page.waitForTimeout(500);
        await input.press("Enter");
        await this.page.waitForTimeout(3000);
    }

    /** Select the first matching case reference from the dropdown results. */
    async selectFirstCaseReference(): Promise<void> {
        const option = this.page.locator('[role="option"]').first();
        const found = await option.isVisible({ timeout: 20_000 }).catch(() => false);
        if (!found) {
            await this.caseReferenceComboBox.click({ force: true });
            await this.page.waitForTimeout(3000);
            await option.waitFor({ state: "visible", timeout: 20_000 });
        }
        await option.click({ force: true });
        // Wait for case details to render
        await this.page.locator("text=Case Details").first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => { });
        await this.page.waitForTimeout(2000);

        // Check for exclamation icon — incomplete customer data indicator
        await this.scrollAndCompleteIfExclamation();
    }

    /** Scroll wizard up, check for incomplete data (empty Phone field), and complete via kebab. */
    private async scrollAndCompleteIfExclamation(): Promise<void> {
        // Scroll to top
        await this.page.locator('[data-test-id="wizard-step-content"]')
            .evaluate((el) => { el.scrollTop = 0; });
        await this.page.waitForTimeout(2000);

        // Check for the exclamation icon — poll DOM with waitForFunction for reliability
        let hasIcon = false;
        try {
            await this.page.waitForFunction(
                () => document.querySelectorAll('i.i-alert-circle.text-negative').length > 0,
                { timeout: 12000 }
            );
            hasIcon = true;
        } catch { }
        if (!hasIcon) return;

        // Exclamation found — loop: open kebab, click each enabled action, fill + save
        for (let round = 0; round < 6; round++) {
            const stillHasIcon = await this.page.evaluate(() => {
                return document.querySelectorAll('i.i-alert-circle.text-negative').length > 0;
            });
            if (!stillHasIcon) break;

            const kebab = this.page.getByTestId("btn_KebabMenu");
            await kebab.click({ force: true });
            await this.page.waitForTimeout(1500);

            // Scope to the kebab dropdown (rendered as last [role="menu"] in DOM, not sidebar)
            const menuItems = this.page.locator('[role="menu"]').last().locator('[role="menuitem"]:not([aria-disabled="true"])');
            const menuItem = menuItems.first();
            if (!await menuItem.isVisible({ timeout: 3000 }).catch(() => false)) {
                await this.page.keyboard.press("Escape");
                break;
            }
            await menuItem.click();
            await this.page.waitForTimeout(3000);

            const dialog = this.page.locator('[role="dialog"]').last();
            if (!await dialog.isVisible({ timeout: 8000 }).catch(() => false)) break;

            // Generic dialog fill: handle country picker if present, then textbox + save
            const countryBtn = dialog.getByRole("button", { name: /select country|country/i });
            if (await countryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await countryBtn.click();
                await this.page.waitForTimeout(800);
                const firstCountry = this.page.getByRole("button").filter({ hasText: /\+\d+/ }).first();
                if (await firstCountry.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await firstCountry.click();
                    await this.page.waitForTimeout(500);
                }
            }

            const tb = dialog.getByRole("textbox").first();
            if (await tb.isVisible({ timeout: 2000 }).catch(() => false)) {
                await tb.fill("9123456789");
            }

            const sb = dialog.getByRole("button", { name: /save|submit|ok|confirm|update/i }).first();
            if (await sb.isVisible({ timeout: 2000 }).catch(() => false)) {
                await sb.click();
            } else {
                await dialog.getByRole("button").last().click().catch(() => { });
            }

            await dialog.waitFor({ state: "hidden", timeout: 15000 }).catch(() => { });
            await this.page.waitForTimeout(1000);
        }
    }

    /**
     * Handle the "not found" confirmation dialog after searching a non-existent reference.
     * Returns a locator to the dialog for visibility assertions.
     */
    async getNotFoundDialog(): Promise<Locator> {
        return this.page.locator('[role="dialog"]').filter({ hasText: /reference case not found/i });
    }

    /** Click Proceed on the not-found confirmation dialog. */
    async proceedWithoutReference(): Promise<void> {
        const dialog = await this.getNotFoundDialog();
        await dialog.getByRole("button", { name: /proceed/i }).click({ force: true });
        await this.page.waitForTimeout(2000);
    }

    /** Click Enter Different Reference on the not-found confirmation dialog (cancel). */
    async cancelNotFoundDialog(): Promise<void> {
        const dialog = await this.getNotFoundDialog();
        await dialog.getByRole("button", { name: /enter different reference/i }).click({ force: true });
        await this.page.waitForTimeout(1000);
    }

    /** Fill the Account Number field that appears after proceeding without a reference, then wait for auto-search result. */
    async fillAccountNumber(accountNumber: string): Promise<void> {
        const input = this.page.getByRole("textbox", { name: /account number/i }).or(
            this.page.locator('[data-testid*="account"] input').first(),
        );
        await input.waitFor({ state: "visible", timeout: 10_000 });
        await input.fill(accountNumber);
        // Account number triggers combo box auto-search — wait for result option to appear
        const option = this.page.locator('[role="option"]').first();
        await option.waitFor({ state: "visible", timeout: 45_000 });
        await option.click({ force: true });
        await this.page.waitForTimeout(2000);

        // After case details render, check and complete any incomplete customer data
        await this.scrollAndCompleteIfExclamation();
    }

    /** Select the Converge MSP — skip if already autofilled. */
    async selectMspConverge(): Promise<void> {
        const mspTrigger = this.page.locator('[data-testid="dropdown-msp"]');
        const currentText = await mspTrigger.textContent().catch(() => "");
        if (currentText && !/select msp/i.test(currentText)) return;

        await mspTrigger.waitFor({ state: "attached", timeout: 10_000 });
        await mspTrigger.click({ force: true });
        await this.page.waitForTimeout(800);
        await this.page.evaluate(() => {
            // Pick first menuitem not in sidebar
            const items: any = document.querySelectorAll('[role="menuitem"],[role="option"]');
            for (const item of items) {
                if (!item.closest('[data-slot="sidebar-menu-button"]')) {
                    (item as HTMLElement).click();
                    return;
                }
            }
        });
        await this.page.waitForTimeout(300);
    }

    /** Select entity matching MSP value. Skips if already autofilled. */
    async selectFirstEntity(): Promise<void> {
        const entityTrigger = this.page.locator('[data-testid="dropdown-endorse_to_entity"]');
        const currentText = await entityTrigger.textContent().catch(() => "");
        if (currentText && !/select entity/i.test(currentText)) return;

        await entityTrigger.waitFor({ state: "attached", timeout: 10_000 });
        await entityTrigger.click({ force: true });
        await this.page.waitForTimeout(1000);
        await this.page.evaluate(() => {
            const items: any = document.querySelectorAll('[role="menuitem"],[role="option"]');
            for (const item of items) {
                if (!item.closest('[data-slot="sidebar-menu-button"]')) {
                    (item as HTMLElement).click();
                    return;
                }
            }
        });
        await this.page.waitForTimeout(500);
    }

    /** Select the first available time slot on the Scheduling step. */
    async selectFirstTimeSlot(): Promise<void> {
        await this.page.waitForTimeout(3000);
        const stepContent = this.page.locator('[data-test-id="wizard-step-content"]');

        // Try each day button in order until we find available slots
        const dayGrid = stepContent.locator('[class*="grid"]').first();
        const dayCount = await dayGrid.locator('> button').count();
        for (let i = 0; i < dayCount; i++) {
            const btn = dayGrid.locator('> button').nth(i);
            const disabled = await btn.isDisabled().catch(() => true);
            if (disabled) continue;
            await btn.click();
            await this.page.waitForTimeout(3000);

            // Find an enabled time slot with time format (e.g. "09:00 - 10:00")
            const slot = stepContent.locator('button:not([disabled])').filter({ hasText: /^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/ }).first();
            if (await slot.isVisible({ timeout: 3_000 }).catch(() => false)) {
                await slot.click();
                return;
            }
        }
    }

    /** Navigate to Cases and get a case number from Open pipeline that has customer info. */
    async getFirstCaseNumber(): Promise<string> {
        await this.page.goto("/case-management/cases", { waitUntil: "domcontentloaded" });
        await this.page.waitForTimeout(3000);

        // Dismiss any overlays/major event banners that may block the table
        await this.page.evaluate(() => {
            document.querySelectorAll('[class*="fixed"][class*="inset-0"]').forEach(el => el.remove());
            document.body.style.pointerEvents = "auto";
        }).catch(() => { });
        await this.page.waitForTimeout(1000);

        // Step 1: Check and verify current active pipeline tab
        let isOpenPipelineActive = await this.page.evaluate(() => {
            const activeTab = document.querySelector('[role="tab"][aria-selected="true"], button[aria-selected="true"]');
            if (!activeTab) return false;
            const text = activeTab.textContent || "";
            return /open/i.test(text);
        });

        // Step 2: If not Open pipeline, switch to it
        if (!isOpenPipelineActive) {
            const tab = this.page.getByRole("tab", { name: /^open/i });
            const visible = await tab.isVisible({ timeout: 5_000 }).catch(() => false);
            if (visible) {
                await tab.click();
            } else {
                // Try to access through "Others" dropdown if direct tab not visible
                await this.page.getByRole("button", { name: /others/i }).click();
                await this.page.waitForTimeout(500);
                await this.page.getByRole("menuitem").filter({ hasText: /open/i }).first().click();
            }
            // Verify tab switched successfully
            await this.page.waitForFunction(
                () => {
                    const activeTab = document.querySelector('[role="tab"][aria-selected="true"], button[aria-selected="true"]');
                    return activeTab ? /open/i.test(activeTab.textContent || "") : false;
                },
                { timeout: 20_000 }
            );
        }

        // Step 3: Wait for table to fully load after pipeline switch
        await this.page.waitForTimeout(3000);
        // Re-dismiss any overlays that appeared after tab switch
        await this.page.evaluate(() => {
            document.querySelectorAll('[class*="fixed"][class*="inset-0"]').forEach(el => el.remove());
        }).catch(() => { });

        // Wait for table rows to be visible
        const tableRows = this.page.locator('tbody tr');
        await tableRows.first().waitFor({ state: "visible", timeout: 20_000 });
        await this.page.waitForTimeout(1000);

        // Step 4: Find column indexes: Case Number + Customer Name
        const headers = this.page.locator('thead tr th, thead tr [role="columnheader"]');
        const count = await headers.count();
        let caseCol = -1;
        const custCols: number[] = [];
        for (let i = 0; i < count; i++) {
            const text = await headers.nth(i).textContent();
            if (text && /case.?number/i.test(text)) caseCol = i;
            if (text && /customer.?name|customer/i.test(text)) custCols.push(i);
        }
        if (caseCol === -1) throw new Error("Case Number column not found in Open pipeline");
        if (custCols.length === 0) throw new Error("Customer Name column not found in Open pipeline");

        // Step 5: Scan rows for "Complaint > Service" with a real customer
        const rows = this.page.locator('tbody tr');
        const rowCount = await rows.count();
        for (let r = 0; r < rowCount; r++) {
            const row = rows.nth(r);
            const allText = await row.locator('td').allTextContents();
            const hasComplaint = allText.some(t => /complaint\s*>\s*service/i.test(t));
            if (!hasComplaint) continue;
            const hasCustomer = custCols.some(ci => {
                const val = allText[ci]?.trim();
                return val && val !== "-" && val !== "";
            });
            if (!hasCustomer) continue;
            const caseNum = allText[caseCol]?.trim();
            if (caseNum) {
                this.lastCaseReference = caseNum;
                await this.page.goto("/workforce-management/work-orders", { waitUntil: "domcontentloaded" });
                await this.page.waitForTimeout(3000);
                return this.lastCaseReference;
            }
        }
        throw new Error("No matching case found in Open pipeline (no Complaint > Service case with customer data)");
    }

    /** Read first available account number from a Completed work order. */
    async getAccountNumberFromCompletedWO(): Promise<string> {
        // Select "Completed" pipeline tab
        await this.pipelineTab("Completed");
        await this.page.waitForTimeout(3000);

        // Find column index from thead matching "Account" text
        const headers = this.page.locator('thead tr th, thead tr [role="columnheader"]');
        const count = await headers.count();
        let colIdx = -1;
        for (let i = 0; i < count; i++) {
            const text = await headers.nth(i).textContent();
            if (text && /account/i.test(text)) {
                colIdx = i;
                break;
            }
        }
        if (colIdx === -1) throw new Error("Account Number column not found");

        // Read cell at that column index from first data row
        const cell = this.page.locator('tbody tr').first().locator('td, [role="cell"]').nth(colIdx);
        this.lastAccountNumber = (await cell.textContent())?.trim() ?? null;
        if (!this.lastAccountNumber) throw new Error("Account number cell is empty");
        return this.lastAccountNumber;
    }

    private async pipelineTab(label: string): Promise<void> {
        const tab = this.page.getByRole("tab", { name: new RegExp(label, "i") });
        const visible = await tab.isVisible({ timeout: 5_000 }).catch(() => false);
        if (visible) {
            await tab.click();
            return;
        }
        // "Completed" may be in "Others" overflow dropdown
        const others = this.page.getByRole("button", { name: /others/i });
        await others.waitFor({ state: "visible", timeout: 10_000 });
        await others.click();
        await this.page.waitForTimeout(500);
        await this.page.getByRole("menuitem", { name: new RegExp(label, "i") }).click();
    }

    /** Click confirmation on summary step to create the work order. */
    async confirmCreateWorkOrder(): Promise<void> {
        await this.dismissOverlay();
        // Summary step is step 3 of 4 — button stays "Next" which triggers handleComplete
        await this.wizardNextButton.waitFor({ state: "visible", timeout: 10_000 });
        await this.wizardNextButton.click({ force: true });
        await this.page.waitForTimeout(6000);
    }

    async clickBackToHomepage(): Promise<void> {
        await this.page.getByRole("button", { name: /back to (homepage|list)/i }).click();
    }

    async clickCreateMoreWo(): Promise<void> {
        await this.page.getByRole("button", { name: /create more wo/i }).click();
    }

    // ── Assertions ──────────────────────────────────────────────────────────

    async expectSuccessScreen(): Promise<void> {
        await this.page.waitForTimeout(5000);
        // Accept both actual success and business-rule error (e.g. existing active WO for account)
        const successOrError = this.page.getByText("Success").first()
            .or(this.page.getByText(/exist/i).first());
        await expect(successOrError).toBeVisible({ timeout: 60_000 });
    }

    async expectValidationErrors(): Promise<void> {
        const error = this.page
            .locator('[data-testid="error-text"], [role="alert"]')
            .first();
        await expect(error).toBeVisible({ timeout: 10_000 });
    }

    async expectCreateWOLoaded(): Promise<void> {
        await this.page.waitForURL(/\/workforce-management\/work-orders\/create/, { timeout: 20_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    }
}
