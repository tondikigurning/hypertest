/** POM — /organization-management (organizations list, create dialog, row actions). */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { ConfirmModalComponent } from "../../components/ConfirmModalComponent";
import { DataTableComponent } from "../../components/DataTableComponent";
import { OrgDetailPanelComponent } from "../../components/OrgDetailPanelComponent";
import { FilterComponent } from "../../components/FilterComponent";
import { PipelineComponent } from "../../components/PipelineComponent";
import { ResponseModalComponent } from "../../components/ResponseModalComponent";
import type { FilterResult, SortResult } from "../../components/filter/filter-types";
import {
    ensureListPageCleanState,
    ORG_LIST_ROW_TIMEOUT,
    waitForListTableRows,
} from "../../utils/list-page-network-utils";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";

export const ORGANIZATIONS_LIST_PATH = "/organization-management";
export const ORGANIZATIONS_FILTER_API = "/organization/tenant/sub-tenants/filter";

export class OrganizationsPage {
    static readonly ORGANIZATIONS_FILTER_API = ORGANIZATIONS_FILTER_API;

    readonly pipeline: PipelineComponent;
    readonly table: DataTableComponent;
    readonly detailPanel: OrgDetailPanelComponent;
    readonly filters: FilterComponent;
    readonly confirmModal: ConfirmModalComponent;
    readonly responseModal: ResponseModalComponent;

    lastSearchKeyword: string | null = null;
    lastSearchMatched = false;
    lastFilterResults: FilterResult[] = [];
    lastSortResults: SortResult[] = [];

    constructor(public readonly page: Page) {
        this.pipeline = new PipelineComponent(page);
        this.table = new DataTableComponent(page);
        this.detailPanel = new OrgDetailPanelComponent(page);
        this.filters = new FilterComponent(page);
        this.confirmModal = new ConfirmModalComponent(page);
        this.responseModal = new ResponseModalComponent(page);
    }

    private get createButton(): Locator {
        return this.page.getByTestId("page-header").getByRole("button", { name: /create|new/i }).first();
    }

    async navigateTo(): Promise<void> {
        await this.page.goto(ORGANIZATIONS_LIST_PATH, { waitUntil: "domcontentloaded" });
        await this.expectLoaded();
        await dismissTencentWorkbenchIfPresent(this.page);

        if (await this.detailPanel.isVisible()) {
            await this.detailPanel.close();
        }

        await this.page.keyboard.press("Escape");
        await ensureListPageCleanState(this.page, OrganizationsPage.ORGANIZATIONS_FILTER_API);
        await waitForListTableRows(this.page, OrganizationsPage.ORGANIZATIONS_FILTER_API, {
            timeout: ORG_LIST_ROW_TIMEOUT,
        });
    }

    async clickCreate(): Promise<void> {
        await this.createButton.waitFor({ state: "visible", timeout: 15_000 });
        await this.createButton.click();
    }

    async openDetailPanel(): Promise<void> {
        if (await this.detailPanel.isVisible()) {
            return;
        }
        await this.table.openRowDetail(0);
        await this.detailPanel.waitForVisible();
    }

    /**
     * Opens the Entities list for the first organization that actually has entities.
     * Falls back to the first organization's (possibly empty) list when no org has
     * entities, so callers that only need the list (not a specific row) still work.
     */
    async openEntitiesForFirstRow(): Promise<void> {
        const orgRows = this.table.rows;
        const count = await orgRows.count();
        for (let i = 0; i < count; i++) {
            const entitiesBtn = orgRows.nth(i).getByRole("button", { name: /entities/i }).first();
            if (!(await entitiesBtn.count())) {
                continue;
            }
            await expect(entitiesBtn).toBeVisible({ timeout: 10_000 });
            await entitiesBtn.click();
            await this.page.waitForURL(/\/organization-management\/[^/]+\/entities/, { timeout: 60_000 });
            if (await this.pollForEntityRows()) {
                return;
            }
            // This org has no entities — go back to the list and try the next one.
            await this.page.goto(ORGANIZATIONS_LIST_PATH, { waitUntil: "domcontentloaded" });
            await this.expectLoaded();
            await waitForListTableRows(this.page, OrganizationsPage.ORGANIZATIONS_FILTER_API, {
                timeout: ORG_LIST_ROW_TIMEOUT,
            });
        }
        // No org with entities found — fall back to the first org's entities list.
        const firstBtn = this.table.rows.first().getByRole("button", { name: /entities/i }).first();
        await expect(firstBtn).toBeVisible({ timeout: 10_000 });
        await firstBtn.click();
        await this.page.waitForURL(/\/organization-management\/[^/]+\/entities/, { timeout: 60_000 });
    }

    /** Wait (poll) for the entities grid to render at least one row. */
    private async pollForEntityRows(): Promise<boolean> {
        await this.page.waitForSelector("table tbody tr", { timeout: 30_000 }).catch(() => undefined);
        try {
            await expect.poll(async () => (await this.table.rows.count()) > 0, {
                timeout: 15_000,
                intervals: [500, 1_000, 2_000],
            });
            return true;
        } catch {
            return false;
        }
    }

    async openSettingsForFirstRow(): Promise<void> {
        const firstRow = this.table.rows.first();
        const settingsBtn = firstRow.getByRole("button", { name: /settings/i });
        await expect(settingsBtn).toBeVisible({ timeout: 10_000 });
        await settingsBtn.click();
        await this.page.waitForURL(/\/organization-management\/[^/]+\/general/, { timeout: 60_000 });
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
        this.lastSearchMatched = await this.filters.searchFilter(OrganizationsPage.ORGANIZATIONS_FILTER_API, value);
        return this.lastSearchMatched;
    }

    async applySingleFilter(filterName: string, fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        return this.filters.applySingleFilter(OrganizationsPage.ORGANIZATIONS_FILTER_API, filterName, fieldValues);
    }

    async applyAllFilters(fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applyAllFilters(OrganizationsPage.ORGANIZATIONS_FILTER_API, fieldValues);
        return this.lastFilterResults;
    }

    async applyAllSorts(): Promise<SortResult[]> {
        this.lastSortResults = await this.filters.applyAllSorts(OrganizationsPage.ORGANIZATIONS_FILTER_API);
        return this.lastSortResults;
    }

    async expectLoaded(): Promise<void> {
        await this.page.waitForURL(/\/organization-management/, { timeout: 60_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 60_000 });
        await this.table.expectVisible();
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

    async clickDetailPanelTab(tabName: string): Promise<void> {
        await this.detailPanel.clickTab(tabName);
    }

    async closeDetailPanel(): Promise<void> {
        await this.detailPanel.close();
    }
}
