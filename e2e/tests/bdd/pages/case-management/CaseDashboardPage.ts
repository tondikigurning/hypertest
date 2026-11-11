/**
 * POM — /case-management/dashboard (SUPERVISOR view: summary tiles + 3 layer tabs).
 *
 * Locators grounded in source (components/case-management-dashboard/supervisor/):
 *   • Layer tabs .......... index.tsx → @hyperscal/ui <Tabs items=[…]> triggers
 *                           "Layer 1: Operational Health", "Layer 2: Intake & Flow Diagnostic",
 *                           "Layer 3: Trends & Performance" (rendered as Radix tabs-trigger)
 *   • Summary tiles ....... summary-section.tsx → 5-col grid, cards are API-driven (rows[].name/value)
 *
 * NOTE: only renders when currentRole === "SUPERVISOR" (dashboard.page.tsx). If the session user is
 * an agent, the agent dashboard renders instead and these locators will not be found.
 * // VERIFY-ON-RUN: the summary grid has no data-testid — the class-based locator below should be
 * // swapped for a testid if one is added to SummarySection.
 */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";

const CASE_DASHBOARD_PATH = "/case-management/dashboard";

export class CaseDashboardPage {
    constructor(private readonly page: Page) {}

    private tab(label: string): Locator {
        return this.page
            .locator('[data-slot="tabs-trigger"]', { hasText: label })
            .or(this.page.getByRole("tab", { name: label }))
            .first();
    }

    private activeTab(label: string): Locator {
        return this.page
            .locator('[data-slot="tabs-trigger"][data-state="active"]', { hasText: label })
            .first();
    }

    /** SummarySection 5-column KPI grid (cards are backend-driven — assert the grid, not labels). */
    private get summaryTiles(): Locator {
        return this.page.locator("div.grid.grid-cols-5").first();
    }

    async navigateTo(): Promise<void> {
        await this.page.goto(CASE_DASHBOARD_PATH, { waitUntil: "domcontentloaded" });
        await this.expectLoaded();
        await dismissTencentWorkbenchIfPresent(this.page);
    }

    async expectLoaded(): Promise<void> {
        await this.page.waitForURL(/\/case-management\/dashboard/, { timeout: 30_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
    }

    async expectSummaryTilesVisible(): Promise<void> {
        await expect(this.summaryTiles).toBeVisible({ timeout: 30_000 });
    }

    async expectLayerTabVisible(label: string): Promise<void> {
        await expect(this.tab(label)).toBeVisible({ timeout: 30_000 });
    }

    async selectLayerTab(label: string): Promise<void> {
        await this.tab(label).click();
    }

    async expectLayerTabActive(label: string): Promise<void> {
        await expect(this.activeTab(label)).toBeVisible({ timeout: 20_000 });
    }
}
