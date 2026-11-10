/** COM — DetailPanel dock layout (TableRenderer + DetailPanelContainer).
 *
 * Shared across submodules (Users, User Groups, Work Orders, …). Locators target
 * the dock shell + Tabs primitives only — not module-specific header/actions.
 */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class DetailPanelComponent {
    constructor(private readonly page: Page) {}

    /**
     * Dock PanelItem: `ul > li` with resize handle + Tabs.
     * Avoid page-wide `li` filters — nested lists inside tab content must not win.
     */
    get root(): Locator {
        return this.page
            .locator("ul > li")
            .filter({ has: this.page.locator('[role="slider"][aria-orientation="vertical"]') })
            .filter({ has: this.page.locator('[data-slot="tabs"]') })
            .first();
    }

    private get tabsList(): Locator {
        return this.root.locator('[data-slot="tabs-list"]').first();
    }

    private get closeButton(): Locator {
        // CloseDetailPanelButton: icon-only (no accessible label) — present on all panels.
        return this.root.locator("button:has(i.i-x)").first();
    }

    /**
     * Header title variants used across submodules:
     * - `h3` DetailPanel.Title (e.g. User Groups)
     * - `h2` custom title (e.g. Work Orders)
     * - avatar + `p` (e.g. Users)
     */
    private get headerTitle(): Locator {
        return this.root
            .getByRole("heading")
            .or(this.root.locator('[data-testid="avatar-root"]').locator("xpath=following::p[1]"))
            .first();
    }

    /** Visible tab trigger inside the detail tabs list (not the overflow menu). */
    tab(tabName: string): Locator {
        return this.tabsList.locator('[data-slot="tabs-trigger"]', {
            hasText: new RegExp(`^${escapeRegExp(tabName)}$`),
        });
    }

    /** Overflow trigger rendered by Tabs when tabs exceed maxView (e.g. "1 More"). */
    private get moreTabsButton(): Locator {
        return this.tabsList.getByRole("button", { name: /\d+\s+More/i });
    }

    private get overflowMenu(): Locator {
        return this.page.locator('[data-slot="dropdown-menu-content"][data-state="open"]');
    }

    /** Overflow menu item — `button[data-slot=tabs-trigger]` portaled into the menu. */
    private overflowTab(tabName: string): Locator {
        return this.overflowMenu.locator('button[data-slot="tabs-trigger"]', {
            hasText: new RegExp(`^${escapeRegExp(tabName)}$`),
        });
    }

    /**
     * Active trigger for a tab. After an overflow click the trigger remounts into the
     * visible list; match by Radix id suffix so parent (tablist vs menu) does not matter.
     */
    private activeTab(tabName: string): Locator {
        const value = tabValueFromLabel(tabName);
        return this.page
            .locator(`button[data-slot="tabs-trigger"][data-state="active"][id$="-trigger-${value}"]`)
            .or(
                this.page.locator('button[data-slot="tabs-trigger"][data-state="active"]', {
                    hasText: new RegExp(`^${escapeRegExp(tabName)}$`),
                }),
            )
            .first();
    }

    headerButton(name: string | RegExp): Locator {
        return this.root.getByRole("button", { name }).first();
    }

    async clickTab(tabName: string, timeout = 20_000): Promise<void> {
        const tab = this.tab(tabName);
        const isVisible = await tab.isVisible().catch(() => false);

        if (!isVisible) {
            const hasMore = await this.moreTabsButton.isVisible().catch(() => false);
            if (!hasMore) {
                await tab.click({ timeout });
                await expect(this.activeTab(tabName)).toBeVisible({ timeout });
                return;
            }

            await this.moreTabsButton.click();
            await expect(this.overflowMenu).toBeVisible({ timeout: 10_000 });
            const overflowItem = this.overflowTab(tabName);
            await expect(overflowItem).toBeVisible({ timeout: 10_000 });
            await overflowItem.click({ force: true });
        } else {
            await tab.click();
        }

        await expect(this.activeTab(tabName)).toBeVisible({ timeout });
    }

    async close(): Promise<void> {
        await this.closeButton.click();
        await this.root.waitFor({ state: "hidden", timeout: 10_000 });
    }

    async waitForVisible(timeout = 20_000): Promise<void> {
        await this.root.waitFor({ state: "visible", timeout });
    }

    async isVisible(): Promise<boolean> {
        return this.root.isVisible().catch(() => false);
    }

    async expectVisible(timeout = 20_000): Promise<void> {
        await expect(this.root).toBeVisible({ timeout });
    }

    async expectHidden(timeout = 10_000): Promise<void> {
        await expect(this.root).not.toBeVisible({ timeout });
    }

    /** Asserts the panel header has a non-empty title (h2/h3/avatar label). */
    async expectHasTitle(timeout = 10_000): Promise<void> {
        await expect(this.headerTitle).not.toBeEmpty({ timeout });
    }

    async expectShowsTitle(title: string, timeout = 20_000): Promise<void> {
        await expect(this.headerTitle).toHaveText(title, { timeout });
    }

    async expectTabContentVisible(tabName: string, timeout = 20_000): Promise<void> {
        const value = tabValueFromLabel(tabName);
        const panel = this.root
            .locator(`[data-slot="tabs-content"][data-state="active"][id$="-content-${value}"]`)
            .or(this.root.locator('[data-slot="tabs-content"][data-state="active"]'))
            .or(this.root.getByRole("tabpanel"));
        await expect(panel.first()).toBeVisible({ timeout });
        await expect(this.activeTab(tabName)).toBeVisible({ timeout });
    }

    async expectTabVisible(tabName: string, timeout = 10_000): Promise<void> {
        const inList = this.tab(tabName);
        if (await inList.isVisible().catch(() => false)) {
            await expect(inList).toBeVisible({ timeout });
            return;
        }

        const hasMore = await this.moreTabsButton.isVisible().catch(() => false);
        if (hasMore) {
            await this.moreTabsButton.click();
            await expect(this.overflowMenu).toBeVisible({ timeout });
            await expect(this.overflowTab(tabName)).toBeVisible({ timeout });
            await this.page.keyboard.press("Escape");
            return;
        }

        await expect(inList).toBeVisible({ timeout });
    }
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Label → Tabs `value` / Radix id suffix (`Root Cause Analysis` → `root-cause-analysis`). */
function tabValueFromLabel(tabName: string): string {
    return tabName.trim().toLowerCase().replace(/\s+/g, "-");
}
