/** COM — DataViewRenderer table (rows, kebab menu, empty state, status settle). */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class DataTableComponent {
    constructor(private readonly page: Page) { }

    private get tableRoot(): Locator {
        return this.page.locator('[data-testid="data-table"], table, [role="table"]').first();
    }

    get rows(): Locator {
        return this.tableRoot.locator("tbody tr");
    }

    /** Column headers (th / [role="columnheader"]). */
    get headers(): Locator {
        return this.tableRoot.locator("thead th, [role='columnheader']");
    }

    rowActionsButton(rowIndex = 0): Locator {
        return this.rows.nth(rowIndex).getByRole("button", { name: "Open menu" })
            .or(this.rows.nth(rowIndex).getByRole("button", { name: "Work Order Actions" }));
    }

    /**
     * Target that opens the detail panel for a row.
     * - Users: avatar/display-name control (`user-cell-displayname`)
     * - User groups: name is a link (or plain text) — first `td` may be a hidden uuid column,
     *   so prefer row-scoped link / visible text cell / the row itself.
     */
    rowDetailTarget(rowIndex = 0): Locator {
        const row = this.rows.nth(rowIndex);
        return row
            .getByTestId("user-cell-displayname")
            .or(row.getByRole("link").first())
            .or(row.locator("td").filter({ hasNot: this.page.locator('[aria-hidden="true"]') }).filter({ hasText: /\S/ }).first())
            .or(row);
    }

    /** @deprecated Prefer rowDetailTarget — kept for callers that assert display-name text. */
    rowDisplayNameLink(rowIndex = 0): Locator {
        return this.rowDetailTarget(rowIndex);
    }

    menuItem(label: string): Locator {
        return this.page.getByRole("menuitem", { name: label });
    }

    private get emptyState(): Locator {
        return this.page
            .locator(
                [
                    '[data-testid="empty-state"]',
                    '[data-empty="true"]',
                    'h3:has-text("No Data")',
                    'h3:has-text("No Data Available")',
                    'h2:has-text("No Data")',
                    'td:has-text("No Data")',
                ].join(", "),
            )
            .first();
    }

    private get nextPageButton(): Locator {
        return this.page.getByRole("button", { name: "Next Page" });
    }

    private get prevPageButton(): Locator {
        return this.page.getByRole("button", { name: "Previous Page" });
    }

    async openRowDetail(rowIndex = 0): Promise<void> {
        await this.expectHasRows();
        await expect(async () => {
            // Prefer an in-row link/name control; fall back to clicking the row for onRowClick.
            const row = this.rows.nth(rowIndex);
            const namedTarget = row.getByTestId("user-cell-displayname").or(row.getByRole("link").first());
            if (await namedTarget.isVisible().catch(() => false)) {
                await namedTarget.click({ timeout: 5_000 });
                return;
            }

            // Dataview modules (e.g. Knowledge Management) open the detail panel via a
            // clickable title span (class `cursor-pointer`), not a link. Click that element
            // directly — a click on the parent <td> does NOT bubble to the child's React
            // onClick, so the panel would otherwise never open.
            const titleClickable = row.locator("td").first().locator(".cursor-pointer").first();
            if (await titleClickable.isVisible().catch(() => false)) {
                await titleClickable.click({ timeout: 5_000 });
                return;
            }

            const visibleCell = row.locator("td").filter({ hasText: /\S/ }).first();
            if (await visibleCell.isVisible().catch(() => false)) {
                await visibleCell.click({ timeout: 5_000 });
                return;
            }

            await expect(row).toBeVisible({ timeout: 5_000 });
            await row.click({ timeout: 5_000 });
        }).toPass({ timeout: 35_000, intervals: [400, 800, 1_500, 2_500, 4_000] });
    }

    /** Opens the row kebab; retries when grid refresh closes the menu before it settles. */
    async openRowMenu(rowIndex = 0): Promise<void> {
        await this.expectHasRows();
        const openMenu = this.page.locator('[data-slot="dropdown-menu-content"][role="menu"][data-state="open"]');
        await expect(async () => {
            if (await openMenu.isVisible().catch(() => false)) {
                return;
            }

            await this.page.keyboard.press("Escape");
            const btn = this.rowActionsButton(rowIndex);
            await expect(btn).toBeVisible({ timeout: 5_000 });
            await btn.click({ timeout: 5_000 });
            await expect(openMenu).toBeVisible({ timeout: 3_000 });
        }).toPass({ timeout: 35_000, intervals: [400, 800, 1_500, 2_500, 4_000] });
    }

    /** Re-opens menu and retries click — grid auto-refresh dismisses the popover mid-action. */
    async clickMenuItem(label: string, rowIndex = 0): Promise<void> {
        await expect(async () => {
            const item = this.page.getByRole("menuitem", { name: label });
            if (!(await item.isVisible().catch(() => false))) {
                await this.page.keyboard.press("Escape");
                await this.openRowMenu(rowIndex);
                await expect(item).toBeVisible({ timeout: 3_000 });
            }
            await item.click({ timeout: 3_000 });
        }).toPass({ timeout: 35_000, intervals: [400, 800, 1_500, 2_500, 4_000] });
    }

    async isEmptyStateVisible(): Promise<boolean> {
        return this.emptyState.isVisible().catch(() => false);
    }

    /** Poll until first row matches pipeline status tab or tab is empty (avoids stale-row kebab). */
    async waitForStatusSettled(status: string): Promise<void> {
        const normalizedStatus = status.toLowerCase();
        const statusKeyword = status.split(/\s+/).pop()?.toLowerCase() ?? normalizedStatus;

        await expect
            .poll(
                async () => {
                    if (await this.isEmptyStateVisible()) {
                        return "ready";
                    }

                    const rowCount = await this.rows.count();
                    if (rowCount === 0) {
                        return "loading";
                    }

                    const firstRowText = ((await this.rows.first().textContent()) ?? "").toLowerCase();
                    if (!firstRowText.trim()) {
                        return "loading";
                    }

                    if (firstRowText.includes(normalizedStatus) || firstRowText.includes(statusKeyword)) {
                        return "ready";
                    }

                    return "stale";
                },
                { timeout: 45_000 },
            )
            .toBe("ready");
    }

    async expectVisible(): Promise<void> {
        await expect(this.tableRoot).toBeVisible({ timeout: 25_000 });
    }

    async expectHasRows(): Promise<void> {
        await expect(this.rows.first()).toBeVisible({ timeout: 20_000 });
    }

    async expectEmptyState(): Promise<void> {
        await expect(this.emptyState).toBeVisible({ timeout: 20_000 });
    }
}
