/** POM — /organization-management/{orgId}/entities (entities list, create dialog, row actions). */
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

export const ENTITIES_LIST_PATH = "/organization-management";
export const ENTITIES_FILTER_API = "/organization/tenant/sub-tenants/[orgId]/units/filter";

export class EntitiesPage {
    static readonly ENTITIES_FILTER_API = ENTITIES_FILTER_API;

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

    private orgId: string | null = null;

    constructor(public readonly page: Page) {
        this.pipeline = new PipelineComponent(page);
        this.table = new DataTableComponent(page);
        this.detailPanel = new OrgDetailPanelComponent(page);
        this.filters = new FilterComponent(page);
        this.confirmModal = new ConfirmModalComponent(page);
        this.responseModal = new ResponseModalComponent(page);
    }

    private get createButton(): Locator {
        return this.page.getByTestId("page-header").getByRole("button", { name: /create|new entity/i }).first();
    }

    async navigateTo(orgId?: string): Promise<void> {
        this.orgId = orgId || this.orgId;
        const url = this.orgId ? `${ENTITIES_LIST_PATH}/${this.orgId}/entities` : ENTITIES_LIST_PATH;
        await this.page.goto(url, { waitUntil: "domcontentloaded" });
        await this.expectLoaded();
        await dismissTencentWorkbenchIfPresent(this.page);

        if (await this.detailPanel.isVisible()) {
            await this.detailPanel.close();
        }

        await this.page.keyboard.press("Escape");
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

    async openFirstEntityDetail(): Promise<void> {
        await this.table.openRowDetail(0);
        await this.page.waitForURL(/\/organization-management\/[^/]+\/entities\/[^/]+/, { timeout: 30_000 });
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
        this.lastSearchMatched = await this.filters.searchFilter(EntitiesPage.ENTITIES_FILTER_API, value);
        return this.lastSearchMatched;
    }

    async applySingleFilter(filterName: string, fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        return this.filters.applySingleFilter(EntitiesPage.ENTITIES_FILTER_API, filterName, fieldValues);
    }

    async applyAllFilters(fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applyAllFilters(EntitiesPage.ENTITIES_FILTER_API, fieldValues);
        return this.lastFilterResults;
    }

    async applyAllSorts(): Promise<SortResult[]> {
        this.lastSortResults = await this.filters.applyAllSorts(EntitiesPage.ENTITIES_FILTER_API);
        return this.lastSortResults;
    }

    async expectLoaded(): Promise<void> {
        await this.page.waitForURL(/\/organization-management\/[^/]+\/entities/, { timeout: 60_000 });
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
