/**
 * BDD steps — Workforce Management / Work Orders (work-orders.feature).
 * Auth via storageState (tests/bdd/setup/auth.setup.ts).
 */
import type { TestInfo } from "@playwright/test";
import { http, HttpResponse } from "msw";
import { createBdd } from "playwright-bdd";
import { expect, test } from "../../fixtures/base.fixture";
import { armListResponseProbe, ensureListResponseTracking, registerListFilterHandler } from "../../utils/list-page-network-utils";
import { WORK_ORDERS_CREATE_API, WORK_ORDERS_LIST_PATH } from "../../utils/list-page-constants";

const { Given, When, Then } = createBdd(test);

// ─── Navigation Givens ───────────────────────────────────────────────────

Given("the user is on the work orders list page", async ({ pageContext, workOrdersPage }) => {
    pageContext.setCurrentPage("work-orders");
    pageContext.setListSurface("list");
    await workOrdersPage.navigateTo();
});

When("the user zooms out to 60%", async ({ page }) => {
    await page.evaluate(() => document.body.style.zoom = "60%");
});

Given("the user is on the create work order wizard", async ({ pageContext, workOrdersCreatePage }) => {
    pageContext.setCurrentPage("work-orders");
    pageContext.setListSurface("list");
    await workOrdersCreatePage.navigateTo();
});

Given("the MSP context is {string}", async () => {
    // MSP selection may be automatic based on user context.
});

// ─── Mock: cancel returns success (only cancel is irreversible) ──────────

Given("the cancel work order API is configured to return success", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/cancel/, () =>
            HttpResponse.json({ message: "Work order cancelled" }, { status: 200 })
        )
    );
});

// ─── Create Work Order wizard steps ──────────────────────────────────────

When("the user clicks the create work order button", async ({ workOrdersPage }) => {
    await workOrdersPage.clickCreate();
});

When("the user opens the create work order wizard", async ({ workOrdersPage }) => {
    await workOrdersPage.clickCreate();
});

When("the user selects the {string} job type", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.selectRepairJobType();
});

When("the user retrieves a case reference number from the cases list", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.getFirstCaseNumber();
});

When("the user selects the first available priority", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.selectFirstPriority();
});

When("the user searches for the case reference number", async ({ workOrdersCreatePage }) => {
    const ref = workOrdersCreatePage.lastCaseReference;
    if (!ref) throw new Error("No case reference stored — did 'retrieves a case reference' run?");
    await workOrdersCreatePage.searchCaseReference(ref);
});

When("the user selects the first matching case reference", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.selectFirstCaseReference();
});

When("the user advances to the scheduling step", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.clickNext();
});

When("the user selects the first available time slot", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.selectFirstTimeSlot();
});

When("the user advances to the summary step", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.clickNext();
});

When("the user confirms the work order creation", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.confirmCreateWorkOrder();
});

When("the user searches for a case reference that does not exist", async ({ workOrdersCreatePage }) => {
    const uniqueRef = "NO-REF-" + Date.now();
    await workOrdersCreatePage.searchCaseReference(uniqueRef);
});

When("the user retrieves an account number from completed work orders", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.getAccountNumberFromCompletedWO();
});

When("the user proceeds without a case reference", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.proceedWithoutReference();
});

When("the user fills the Account Number", async ({ workOrdersCreatePage }) => {
    const accountNumber = workOrdersCreatePage.lastAccountNumber;
    if (!accountNumber) throw new Error("No account number stored");
    await workOrdersCreatePage.fillAccountNumber(accountNumber);
});

When("the user selects the Converge MSP", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.selectMspConverge();
});

When("the user selects the first available entity", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.selectFirstEntity();
});

When("the user does not select a case reference", async () => {
    // Intentionally left blank — the Next button is expected to be disabled
});

When("the user attempts to advance to the scheduling step", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.clickNext();
});

When("the user clicks Next on the work order wizard without filling required fields", async ({ page }) => {
    // Next is expected to be disabled — force click to trigger validation
    await page.getByRole("button", { name: /^next$/i }).click({ force: true });
    await page.waitForTimeout(1000);
});

When("the user navigates back from the create wizard", async ({ page }) => {
    await page.goBack();
    await page.waitForLoadState("networkidle");
});

When("the user cancels the work order create wizard", async ({ workOrdersCreatePage, page }) => {
    await workOrdersCreatePage.clickCancel();
    await page.waitForURL(/\/workforce-management\/work-orders/, { timeout: 30_000 });
});

When("the user completes a work order creation wizard", async ({ workOrdersPage, workOrdersCreatePage }) => {
    await workOrdersPage.clickCreate();
    await workOrdersCreatePage.selectRepairJobType();
    await workOrdersCreatePage.selectFirstPriority();
    await workOrdersCreatePage.searchCaseReference();
    await workOrdersCreatePage.selectFirstCaseReference();
    await workOrdersCreatePage.clickNext();
    await workOrdersCreatePage.selectFirstTimeSlot();
    await workOrdersCreatePage.clickNext();
    await workOrdersCreatePage.confirmCreateWorkOrder();
});

When("the user clicks the work order success screen button {string}", async ({ workOrdersCreatePage }, buttonLabel: string) => {
    if (/back to homepage/i.test(buttonLabel)) {
        await workOrdersCreatePage.clickBackToHomepage();
    } else if (/create more wo/i.test(buttonLabel)) {
        await workOrdersCreatePage.clickCreateMoreWo();
    }
});

When("the user completes the create work order wizard", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.selectRepairJobType();
    await workOrdersCreatePage.selectFirstPriority();
    await workOrdersCreatePage.searchCaseReference();
    await workOrdersCreatePage.selectFirstCaseReference();
    await workOrdersCreatePage.clickNext();
    await workOrdersCreatePage.selectFirstTimeSlot();
    await workOrdersCreatePage.clickNext();
    await workOrdersCreatePage.confirmCreateWorkOrder();
});

When("the user advances the create work order wizard to the summary step", async ({ workOrdersPage, workOrdersCreatePage }) => {
    await workOrdersPage.clickCreate();
    await workOrdersCreatePage.selectRepairJobType();
    await workOrdersCreatePage.selectFirstPriority();
    await workOrdersCreatePage.searchCaseReference();
    await workOrdersCreatePage.selectFirstCaseReference();
    await workOrdersCreatePage.clickNext();
    await workOrdersCreatePage.selectFirstTimeSlot();
    await workOrdersCreatePage.clickNext();
});

Given("the work order creation APIs are mocked for success", async ({ network }) => {
    network.use(
        http.post(/\/api\/v1\.0\/workforcemgmt\/tenant\/work-orders(\?.*)?$/, () =>
            HttpResponse.json({ id: "wo-1", message: "Work order created successfully" }, { status: 200 })
        )
    );
});

// ─── Work Orders list assertions ─────────────────────────────────────────

Then("the work orders data table is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.table.expectVisible();
});

Then("the work order creation success screen is displayed", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.expectSuccessScreen();
});

Then("the work orders list page is displayed", async ({ workOrdersPage }) => {
    await workOrdersPage.expectLoaded();
});

Then("the work order wizard shows required field validation errors", async ({ workOrdersCreatePage }) => {
    await workOrdersCreatePage.expectValidationErrors();
});

Then("the Next button remains disabled", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^next$/i })).toBeDisabled({ timeout: 10_000 });
});

Then("the work order wizard remains on the {string} step", async ({ workOrdersCreatePage }, stepTitle: string) => {
    await workOrdersCreatePage.expectStep(stepTitle);
});

Then("the work order wizard is on the {string} step", async ({ workOrdersCreatePage }, stepTitle: string) => {
    await workOrdersCreatePage.expectStep(stepTitle);
});

Then("the application shows a {string} notification", async ({ page }, notificationText: string) => {
    await expect(page.getByText(notificationText).first()).toBeVisible({ timeout: 10_000 });
});

Then("the case reference validation error is shown", async ({ page }) => {
    const error = page.locator('[data-testid="error-text"]').filter({ hasText: /case reference/i });
    await expect(error.first()).toBeVisible({ timeout: 10_000 });
});

Then("a reference not found dialog is shown", async ({ workOrdersCreatePage }) => {
    const dialog = await workOrdersCreatePage.getNotFoundDialog();
    await expect(dialog).toBeVisible({ timeout: 10_000 });
});

Then("a confirmation dialog is shown indicating the case reference was not found", async ({ workOrdersCreatePage }) => {
    const dialog = await workOrdersCreatePage.getNotFoundDialog();
    await expect(dialog).toBeVisible({ timeout: 10000 });
});

Then("the not-found confirmation dialog is not visible", async ({ workOrdersCreatePage }) => {
    const dialog = await workOrdersCreatePage.getNotFoundDialog();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
});

Then("the summary shows the selected priority and case reference details", async ({ page }) => {
    await expect(page.getByText(/priority/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/case reference|ticket id/i).first()).toBeVisible({ timeout: 5000 });
});

// ─── Row actions (kebab menu) ────────────────────────────────────────────

When("the user opens the first work order row actions menu", async ({ workOrdersPage, $testInfo }) => {
    const rowCount = await workOrdersPage.table.rows.count();
    if (rowCount === 0) {
        ($testInfo as TestInfo).skip(true, "No work orders in the list.");
    }
    await workOrdersPage.table.openRowMenu(0);
});

When("the user clicks {string} from any visible row", async ({ page, workOrdersPage, $testInfo }, menuItemLabel: string) => {
    // For Split WO: find row with comma in product_names from API response
    if (/split/i.test(menuItemLabel)) {
        let body = workOrdersPage.lastFilterResponse;
        // If not stored yet (e.g. @mock path), intercept the filter response
        if (!body) {
            const resp = await page.waitForResponse(
                (res) => res.url().includes(WORK_ORDERS_FILTER_API) && !res.url().includes("filter-options") && res.request().method() === "POST",
                { timeout: 60_000 },
            ).catch(() => null);
            if (resp) {
                try { body = await resp.json(); } catch {}
            }
        }
        const rows = ((body as Record<string, unknown>)?.rows ?? (body as Record<string, unknown>)?.data ?? []) as Array<Record<string, unknown>>;
        let targetIdx = -1;
        if (rows.length > 0) {
            for (let r = 0; r < rows.length; r++) {
                const combined = [rows[r]?.product_name ?? "", rows[r]?.product_names ?? ""].filter(Boolean).join(", ");
                if (combined.includes(",")) { targetIdx = r; break; }
            }
        }
        if (targetIdx >= 0) {
            await workOrdersPage.table.openRowMenu(targetIdx);
            const item = page.getByRole("menuitem", { name: menuItemLabel });
            await expect(async () => {
                if (!(await item.isVisible().catch(() => false))) {
                    await page.keyboard.press("Escape");
                    throw new Error("Menu not visible, retrying");
                }
                await item.click({ force: true, timeout: 3_000 });
            }).toPass({ timeout: 15_000, intervals: [400, 800, 1_500] });
            return;
        }
        // Fallback: iterate rows using the existing openRowMenu + check
        const openMenu = page.locator('[data-slot="dropdown-menu-content"][role="menu"][data-state="open"]');
        for (let i = 0; i < await workOrdersPage.table.rows.count(); i++) {
            const btn = workOrdersPage.table.rowActionsButton(i);
            if (!(await btn.isVisible().catch(() => false))) continue;
            await page.keyboard.press("Escape");
            await expect(async () => {
                if (await openMenu.isVisible().catch(() => false)) return;
                await page.keyboard.press("Escape");
                await expect(btn).toBeVisible({ timeout: 3_000 });
                await btn.click({ timeout: 3_000 });
            }).toPass({ timeout: 15_000, intervals: [400, 800, 1_500] });
            const item = page.getByRole("menuitem", { name: menuItemLabel });
            if (!(await item.isVisible().catch(() => false))) { await page.keyboard.press("Escape"); continue; }
            await expect(async () => {
                if (!(await item.isVisible().catch(() => false))) throw new Error("Menu not visible");
                await item.click({ force: true, timeout: 3_000 });
            }).toPass({ timeout: 15_000, intervals: [400, 800, 1_500] });
            return;
        }
        ($testInfo as TestInfo).skip(true, "No row with Split Work Order action found.");
        return;
    }
    // Non-split: iterate rows to find the menuitem
    const openMenu = page.locator('[data-slot="dropdown-menu-content"][role="menu"][data-state="open"]');
    for (let i = 0; i < await workOrdersPage.table.rows.count(); i++) {
        const btn = workOrdersPage.table.rowActionsButton(i);
        if (!(await btn.isVisible().catch(() => false))) continue;
        await page.keyboard.press("Escape");
        await expect(async () => {
            if (await openMenu.isVisible().catch(() => false)) return;
            await page.keyboard.press("Escape");
            await expect(btn).toBeVisible({ timeout: 3_000 });
            await btn.click({ timeout: 3_000 });
        }).toPass({ timeout: 15_000, intervals: [400, 800, 1_500] });
        const item = page.getByRole("menuitem", { name: menuItemLabel });
        if (!(await item.isVisible().catch(() => false))) { await page.keyboard.press("Escape"); continue; }
        await expect(async () => {
            if (!(await item.isVisible().catch(() => false))) throw new Error("Menu not visible");
            await item.click({ force: true, timeout: 3_000 });
        }).toPass({ timeout: 15_000, intervals: [400, 800, 1_500] });
        return;
    }
    ($testInfo as TestInfo).skip(true, `No row with "${menuItemLabel}" action found.`);
});

When("the user clicks {string} from the row actions menu", async ({ workOrdersPage }, menuItemLabel: string) => {
    await workOrdersPage.table.clickMenuItem(menuItemLabel);
});

When("the user cancels the cancel work order dialog", async ({ page, workOrdersPage }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /cancel work order/i });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await dialog.waitFor({ state: "hidden", timeout: 10000 });
});

When("the user cancels the change priority dialog", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Change Priority");
    await workOrdersPage.cancelDialog("Change Priority");
});

When("the user cancels the reschedule dialog", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Reschedule");
    await workOrdersPage.cancelDialog("Reschedule");
});

When("the user cancels the assign technician dialog", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Assign Work Order");
    await workOrdersPage.cancelDialog("Assign Work Order");
});

When("the user cancels the reassign technician dialog", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Reassign Technician");
    await workOrdersPage.cancelDialog("Reassign Technician");
});

When("the user cancels the on hold dialog", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("On Hold");
    await workOrdersPage.cancelDialog("On Hold");
});

When("the user cancels the transfer to partner dialog", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Transfer to Partner");
    await workOrdersPage.cancelDialog("Transfer to Partner");
});

When("the user selects a cancellation category and reason", async ({ page }) => {
    const categoryField = page.getByRole("combobox", { name: /category/i }).or(page.locator('[data-testid*="category"]').first());
    if (await categoryField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await categoryField.click();
        const firstOption = page.getByRole("option").first();
        if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) await firstOption.click();
    }
    const reasonField = page.getByRole("combobox", { name: /reason/i }).or(page.locator('[data-testid*="reason"]').first());
    if (await reasonField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reasonField.click();
        const firstReason = page.getByRole("option").first();
        if (await firstReason.isVisible({ timeout: 3000 }).catch(() => false)) await firstReason.click();
    }
});

When("the user confirms the cancellation", async ({ workOrdersPage }) => {
    await workOrdersPage.confirmModal.confirm("Yes Cancel Work Order");
});

When("the user selects a new priority", async ({ page }) => {
    const priorityField = page.getByRole("combobox", { name: /priority/i }).or(page.locator('[data-testid*="priority"]').first());
    if (await priorityField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await priorityField.click();
        const firstOption = page.getByRole("option").first();
        if (await firstOption.isVisible({ timeout: 3000 }).catch(() => false)) await firstOption.click();
    }
});

When("the user confirms the priority change", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /change priority/i });
    const btn = dialog.getByRole("button").filter({ hasText: /submit|save|yes|confirm|change priority/i });
    await expect(btn).toBeEnabled({ timeout: 10000 });
    await btn.click();
});

When("the user selects a reschedule category and reason", async ({ page }) => {
    const combos = page.getByRole("combobox");
    const count = await combos.count();
    for (let i = 0; i < count && i < 2; i++) {
        if (await combos.nth(i).isVisible({ timeout: 3000 }).catch(() => false)) {
            await combos.nth(i).click();
            const opt = page.getByRole("option").first();
            if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) await opt.click();
        }
    }
});

When("the user confirms the reschedule", async ({ workOrdersPage }) => {
    await workOrdersPage.confirmModal.confirm("Reschedule");
});

When("the user cancels the requeue dialog", async ({ workOrdersPage }) => {
    await workOrdersPage.cancelDialog("Requeue");
});

When("the user confirms the requeue action", async ({ workOrdersPage }) => {
    await workOrdersPage.confirmModal.confirm("Requeue");
});

When("the user selects the first available technician", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /assign|reassign|transfer/i }).last();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click the first visible row's selection checkbox inside the dialog
    const checkbox = dialog.locator('[data-testid="selection-cell"] button[role="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await checkbox.click();
});

When("the user selects a future schedule", async ({ page }) => {
    const dialog = page.getByRole("dialog", { name: /assign work order/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    for (let attempt = 0; attempt < 14; attempt++) {
        const slots = dialog.locator('button:not([disabled])').filter({ hasText: /^\d{2}:\d{2}/ });
        if (await slots.count() > 0) {
            await slots.first().click();
            return;
        }
        // Navigate to next day — use the header nav area, not table pagination
        await dialog.locator('i.i-chevron-right').first().click();
        await page.waitForTimeout(1000);
    }
});

When("the user confirms the assign action", async ({ page }) => {
    // Step 1: Click "Assign" in the assign dialog to open confirmation
    const assignBtn = page.getByRole("dialog", { name: /assign work order/i })
        .getByRole("button", { name: "Assign", exact: true });
    await expect(assignBtn).toBeEnabled({ timeout: 10_000 });
    await assignBtn.click();

    // Step 2: Click "Confirm & Assign" in the confirmation dialog
    const confirmBtn = page.getByRole("dialog", { name: /assign confirmation/i })
        .getByRole("button", { name: "Confirm & Assign", exact: true });
    await expect(confirmBtn).toBeEnabled({ timeout: 10_000 });
    await confirmBtn.click();
});

When("the user confirms the reassign action", async ({ page }) => {
    // Step 1: Click "Transfer" to proceed to confirmation
    const transferBtn = page.getByRole("button", { name: "Transfer", exact: true });
    await expect(transferBtn).toBeEnabled({ timeout: 10_000 });
    await transferBtn.click();

    // Step 2: Click "Confirm & Reassign"
    const confirmBtn = page.getByRole("button", { name: "Confirm & Reassign", exact: true });
    await expect(confirmBtn).toBeEnabled({ timeout: 10_000 });
    await confirmBtn.click();
});

When("the user cancels the unassign dialog", async ({ workOrdersPage }) => {
    await workOrdersPage.cancelDialog("Unassign");
});

When("the user enters return remarks", async ({ page }) => {
    const ta = page.getByRole("textbox", { name: /remarks|notes/i }).or(page.locator("textarea").first());
    if (await ta.isVisible({ timeout: 3000 }).catch(() => false)) {
        await ta.fill("E2E test return reason");
    }
});

When("the user confirms the return action", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /return/i });
    const btn = dialog.getByRole("button").filter({ hasNotText: /cancel/i }).last();
    await expect(btn).toBeEnabled({ timeout: 10000 });
    await btn.click();
});

When("the user selects an on hold category and reason", async ({ page }) => {
    const combos = page.getByRole("combobox");
    const count = await combos.count();
    for (let i = 0; i < count && i < 2; i++) {
        if (await combos.nth(i).isVisible({ timeout: 3000 }).catch(() => false)) {
            await combos.nth(i).click();
            const opt = page.getByRole("option").first();
            if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) await opt.click();
        }
    }
});

When("the user confirms the on hold action", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /on hold/i });
    // Click the last button in the dialog footer (primary action, not Cancel)
    const buttons = dialog.getByRole("button");
    const btn = buttons.filter({ hasNotText: /cancel/i }).last();
    await expect(btn).toBeEnabled({ timeout: 10000 });
    await btn.click();
});

When("the user selects the first available partner", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /transfer to partner/i });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const checkbox = dialog.locator('[data-testid="selection-cell"] button[role="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await checkbox.click();
});

When("the user confirms the transfer", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Transfer", exact: true })).toBeEnabled({ timeout: 10_000 });
    await page.getByRole("button", { name: "Transfer", exact: true }).click();

    await expect(page.getByRole("button", { name: "Confirm & Transfer", exact: true })).toBeEnabled({ timeout: 10_000 });
    await page.getByRole("button", { name: "Confirm & Transfer", exact: true }).click();
});

When("the user confirms the unassign action", async ({ page }) => {
    // Click the "Requeue" primary action button in the unassign dialog
    const btn = page.getByRole("button").filter({ hasText: "Requeue" });
    await expect(btn.last()).toBeEnabled({ timeout: 10_000 });
    await btn.last().click();
});

When("the user cancels the return work order dialog", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /return/i });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 10000 });
});

// ─── Split Work Order steps ─────────────────────────────────────────────

When("the user selects the first available split job option", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /split/i });
    // Scroll dialog content down so checkbox becomes clickable
    await dialog.locator('[data-slot="dialog-content"]').evaluate((el: HTMLElement) => el.scrollTop = 0);
    await page.waitForTimeout(200);
    const checkbox = dialog.getByRole("checkbox").first();
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await checkbox.click({ timeout: 5000 });
    await page.waitForTimeout(500);
});

When("the user clicks Submit for split", async ({ page }) => {
    const dialog = page.getByRole("dialog").filter({ hasText: /split/i });
    // Scroll dialog content to the bottom so Submit becomes clickable
    await dialog.locator('[data-slot="dialog-content"]').evaluate((el: HTMLElement) => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(200);
    const submitBtn = dialog.getByRole("button", { name: /submit/i });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click({ timeout: 5000 });
    await page.waitForTimeout(500);
});

When("the user cancels the split work order dialog", async ({ workOrdersPage }) => {
    await workOrdersPage.cancelDialog("Split Work Order");
});

Then("the split work order dialog is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Split Work Order");
});

Then("the split work order dialog is not visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogHidden("Split Work Order");
});

Then("the success response shows the work order has been split", async ({ page }) => {
    await expect(page.getByRole("dialog").filter({ hasText: /has been split/i }).last()).toBeVisible({ timeout: 45000 });
});

Given("the split work order API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/splits/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

// ─── Row actions visibility assertions ───────────────────────────────────

Then("the work order row actions menu is visible", async ({ page }) => {
    const menu = page.locator('[data-slot="dropdown-menu-content"][role="menu"]');
    await expect(menu).toBeVisible({ timeout: 10000 });
});

Then("the open row actions menu shows at least one available action", async ({ page }) => {
    const menu = page.locator('[data-slot="dropdown-menu-content"][role="menu"]');
    const menuItem = menu.getByRole("menuitem").or(menu.locator('[role="button"]'));
    const itemCount = await menuItem.count();
    expect(itemCount).toBeGreaterThan(0);
});

Then("the cancel work order confirmation dialog is visible", async ({ page }) => {
    await expect(page.getByRole("dialog").filter({ hasText: /cancel work order/i })).toBeVisible({ timeout: 10000 });
});

Then("the cancel work order confirmation dialog is not visible", async ({ page }) => {
    await expect(page.getByRole("dialog").filter({ hasText: /cancel work order/i })).not.toBeVisible({ timeout: 10000 });
});

Then("the change priority dialog is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Change Priority");
});

Then("the change priority dialog is not visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogHidden("Change Priority");
});

Then("the reschedule work order dialog is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Reschedule");
});

Then("the reschedule work order dialog is not visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogHidden("Reschedule");
});

Then("the requeue work order confirmation dialog is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Requeue");
});

Then("the requeue work order confirmation dialog is not visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogHidden("Requeue");
});

Then("the assign technician dialog is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Assign Work Order");
});

Then("the assign technician dialog is not visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogHidden("Assign Work Order");
});

Then("the reassign technician dialog is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Reassign Technician");
});

Then("the reassign technician dialog is not visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogHidden("Reassign Technician");
});

Then("the unassign work order confirmation dialog is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Unassign");
});

Then("the unassign work order confirmation dialog is not visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogHidden("Unassign");
});

Then("the transfer to partner dialog is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Transfer to Partner");
});

Then("the transfer to partner dialog is not visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogHidden("Transfer to Partner");
});

Then("the on hold work order dialog is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("On Hold");
});

Then("the on hold work order dialog is not visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogHidden("On Hold");
});

Then("the return work order confirmation dialog is visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogVisible("Return WO");
});

Then("the return work order confirmation dialog is not visible", async ({ workOrdersPage }) => {
    await workOrdersPage.expectDialogHidden("Return WO");
});

Then("the success response shows the work order has been cancelled", async ({ workOrdersPage }) => {
    await workOrdersPage.responseModal.expectVisible(/cancelled|cancel/i);
});

Then("the success response shows the priority has been updated", async ({ workOrdersPage }) => {
    await workOrdersPage.responseModal.expectVisible(/priority/i);
});

Then("the success response shows the work order has been rescheduled", async ({ workOrdersPage }) => {
    await workOrdersPage.responseModal.expectVisible(/reschedule/i);
});

Then("the success response shows the work order has been requeued", async ({ workOrdersPage }) => {
    await workOrdersPage.responseModal.expectVisible(/requeue|queue/i);
});

Then("the success response shows the work order has been assigned", async ({ workOrdersPage }) => {
    await workOrdersPage.responseModal.expectVisible(/assign/i);
});

Then("the success response shows the work order has been reassigned", async ({ workOrdersPage }) => {
    await workOrdersPage.responseModal.expectVisible(/reassign/i);
});

Then("the success response shows the work order has been unassigned", async ({ workOrdersPage }) => {
    await workOrdersPage.responseModal.expectVisible(/unassign/i);
});

Then("the success response shows the work order has been transferred", async ({ workOrdersPage }) => {
    await workOrdersPage.responseModal.expectVisible(/transfer/i);
});

Then("the success response shows the work order is on hold", async ({ workOrdersPage }) => {
    await workOrdersPage.responseModal.expectVisible(/on hold/i);
});

Then("the success response shows the work order has been returned", async ({ page }) => {
    await expect(page.getByRole("dialog").filter({ hasText: /returned|success/i }).last()).toBeVisible({ timeout: 45000 });
});

// ─── MSW network resilience steps (@mock) ────────────────────────────────

Given("the work orders API is configured to return a 401 authentication error", async ({ network, pageContext }) => {
    pageContext.setCurrentPage("work-orders");
    registerListFilterHandler(network, pageContext, () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 })
    );
});

Given("the create work order API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/api\/v1\.0\/workforcemgmt\/tenant\/work-orders(\?.*)?$/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the cancel work order API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/cancel/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the change priority API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/change-priority/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the requeue work order API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/unassign/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the assign work order API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/assign/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the reassign work order API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/reassign/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the unassign work order API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/unassign/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the transfer to partner API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/transfer-to-partner/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the on hold work order API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.patch(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/on-hold/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the return work order API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/return-wfm-wo/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

Given("the reschedule work order API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(/\/workforcemgmt\/tenant\/work-orders\/[^/]+\/reschedule/, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })
        )
    );
});

// ─── Navigation-triggered mock: raw navigation ───────────────────────────

When("the user navigates to the work orders list page", async ({ page, pageContext }) => {
    pageContext.setCurrentPage("work-orders");
    ensureListResponseTracking(page, pageContext);
    armListResponseProbe(page, pageContext);
    await page.goto(WORK_ORDERS_LIST_PATH, { waitUntil: "domcontentloaded" });
});
