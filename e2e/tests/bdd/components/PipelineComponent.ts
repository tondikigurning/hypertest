/** COM — PipelineRenderer tab bar (shared across list pages). */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class PipelineComponent {
    constructor(private readonly page: Page) { }

    private get tabList(): Locator {
        // Prefer the tablist that actually contains pipeline status tabs. The cases page
        // renders a header CasesTabs bar (case-number tabs) BEFORE the PipelineRenderer, so
        // "first()" would target the wrong tablist. The pipeline tablist is uniquely
        // identified by containing a tab with one of the known pipeline labels.
        return this.page
            .getByRole("tablist")
            .filter({
                has: this.page.getByRole("tab", { name: /Assigned to Me|All|Active|Suspended/i }).first(),
            })
            .first()
            .or(this.page.getByRole("tablist").first());
    }

    private get othersButton(): Locator {
        return this.page.getByRole("button", { name: /others/i }).first();
    }

    /**
     * Finds a pipeline tab by label, anchored to the FULL tab name (end-anchored).
     * Tab accessible names include the count, e.g. "Assigned 1" and "Assigned to Me 0",
     * and counts can be thousands with commas ("All 241,981"). A plain `\bAssigned\b`
     * would match BOTH "Assigned" and "Assigned to Me", so require the name to END after
     * the label + optional count (digits, commas, spaces).
     */
    tab(label: string): Locator {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return this.tabList.getByRole("tab", {
            name: new RegExp(`\\b${escaped}\\b(?:\\s*[\\d,]+)?$`, "i"),
        });
    }

    /**
     * Clicks a pipeline tab, first opening the "Others" overflow dropdown if the target
     * tab is not directly visible in the tab bar.
     */
    async selectTab(label: string): Promise<void> {
        const tab = this.tab(label);

        // The pipeline partition is computed asynchronously; re-check visibility before
        // concluding the tab is in the "Others" overflow (avoids a race on first paint).
        let isVisible = await tab.isVisible().catch(() => false);
        if (!isVisible) {
            await tab.waitFor({ state: "visible", timeout: 3_000 }).catch(() => { });
            isVisible = await tab.isVisible().catch(() => false);
        }

        // The pipeline bar partitions tabs between the main bar and the "Others" overflow
        // in a post-paint measurement pass. Until that settles, EVERY tab reports as
        // hidden — the bar renders only the "Others" button — so a one-shot isVisible()
        // check can wrongly fall through to the "Others" dropdown for a tab that IS in
        // the main bar, where it can then no longer be found (the overflow set has
        // re-partitioned). Wait for the bar to render a real tab before deciding.
        if (await this.isTabInBar(tab)) {
            await tab.click();
            await expect(tab).toHaveAttribute("data-state", "active", { timeout: 20_000 });
            return;
        }

        // Tab is hidden under "Others" overflow — open the dropdown first.
        await this.othersButton.waitFor({ state: "visible", timeout: 10_000 });
        await this.othersButton.click();

        const dropdownItem = this.page.getByRole("menuitem", {
            name: new RegExp(label, "i"),
        });

        try {
            await dropdownItem.waitFor({ state: "visible", timeout: 10_000 });
            await dropdownItem.click();
            // After selection from overflow, verify the dropdown closed as proof of success.
            await dropdownItem.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => { });
        } catch {
            // Fallback: the tab may actually be visible (e.g. it just finished rendering).
            await tab.click();
            await expect(tab).toHaveAttribute("data-state", "active", { timeout: 20_000 });
        }
    }

    /**
     * True when the given tab is rendered (and visible) in the main tab bar, i.e. NOT
     * folded into the "Others" overflow. Waits for the bar's post-paint measurement pass
     * to settle first — until it settles the bar shows only the "Others" button and zero
     * visible tabs, which would make a directly-visible tab look like an overflow tab.
     */
    private async isTabInBar(tab: Locator): Promise<boolean> {
        // The bar is settled once at least one real tab is rendered (the all-overflow
        // placeholder phase renders zero role="tab" elements).
        try {
            await expect
                .poll(
                    async () => (await this.tabList.getByRole("tab").count().catch(() => 0)) > 0,
                    { timeout: 15_000, intervals: [100, 250, 500, 1_000] },
                )
                .toBe(true);
        } catch {
            return false;
        }
        return await tab.isVisible().catch(() => false);
    }

    /** Asserts that the given tab has the "active" data state. */
    async expectTabActive(label: string): Promise<void> {
        // Same end-anchored match as tab() — "Assigned" must not match "Assigned to Me".
        const tabInList = this.tab(label);
        const inListCount = await tabInList.count().catch(() => 0);
        if (inListCount > 0) {
            await expect(tabInList.first()).toHaveAttribute("data-state", "active", { timeout: 10_000 });
            return;
        }

        // Overflow tab — the "Others" button gets bg-white + font-semibold when any overflow tab is active.
        await expect(this.othersButton).toBeVisible({ timeout: 10_000 });
    }

    /** Asserts that the pipeline bar is visible on the page. */
    async expectVisible(): Promise<void> {
        await expect(this.tabList.getByRole("tab").first()).toBeVisible({ timeout: 20_000 });
    }
}
