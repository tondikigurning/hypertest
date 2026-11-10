/** POM — /workforce-management/work-orders (pipeline, table, filters, detail panel, kebab menu). */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { ConfirmModalComponent } from "../../components/ConfirmModalComponent";
import { DataTableComponent } from "../../components/DataTableComponent";
import { DetailPanelComponent } from "../../components/DetailPanelComponent";
import { FilterComponent } from "../../components/FilterComponent";
import { PipelineComponent } from "../../components/PipelineComponent";
import { ResponseModalComponent } from "../../components/ResponseModalComponent";
import type { FilterResult, SortResult } from "../../components/filter/filter-types";
import { ensureListPageCleanState, waitForListTableRows } from "../../utils/list-page-network-utils";
import { WORK_ORDERS_FILTER_API, WORK_ORDERS_LIST_PATH } from "../../utils/list-page-constants";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";

export class WorkOrdersPage {
    static readonly WORK_ORDERS_FILTER_API = WORK_ORDERS_FILTER_API;

    readonly pipeline: PipelineComponent;
    readonly table: DataTableComponent;
    readonly detailPanel: DetailPanelComponent;
    readonly filters: FilterComponent;
    readonly confirmModal: ConfirmModalComponent;
    readonly responseModal: ResponseModalComponent;

    lastSearchKeyword: string | null = null;
    lastSearchMatched = false;
    lastFilterResults: FilterResult[] = [];
    lastSortResults: SortResult[] = [];

    constructor(private readonly page: Page) {
        this.pipeline = new PipelineComponent(page);
        this.table = new DataTableComponent(page);
        this.detailPanel = new DetailPanelComponent(page);
        this.filters = new FilterComponent(page);
        this.confirmModal = new ConfirmModalComponent(page);
        this.responseModal = new ResponseModalComponent(page);
    }

    private get createButton(): Locator {
        return this.page.getByTestId("page-header").getByRole("button", { name: "Create" });
    }

    private get exportButton(): Locator {
        return this.page.getByRole("button", { name: "Export" });
    }

    lastFilterResponse: Record<string, unknown> | null = null;

    /** Select a pipeline tab with a network wait for the filter API response. */
    async selectPipelineTab(tab: string): Promise<void> {
        const responsePromise = this.page
            .waitForResponse(
                (res) =>
                    res.url().includes(WorkOrdersPage.WORK_ORDERS_FILTER_API)
                    && !res.url().includes("filter-options")
                    && res.request().method() === "POST",
                { timeout: 45_000 },
            )
            .catch(() => null);

        await this.pipeline.selectTab(tab);
        const response = await responsePromise
        if (response) {
            try {
                const json = await response.json();
                this.lastFilterResponse = json;
                const firstRow = (json.rows ?? [])[0];
            } catch {
                this.lastFilterResponse = null;
            }
        } else {
            this.lastFilterResponse = null;
        }
    }

    /** Navigate to the work orders list and wait for the table to be ready. */
    async navigateTo(): Promise<void> {
        await this.page.goto(WORK_ORDERS_LIST_PATH, { waitUntil: "domcontentloaded" });
        await this.expectLoaded();
        await dismissTencentWorkbenchIfPresent(this.page);

        if (await this.detailPanel.isVisible()) {
            await this.detailPanel.close();
        }

        await this.page.keyboard.press("Escape");
        await ensureListPageCleanState(this.page, WorkOrdersPage.WORK_ORDERS_FILTER_API);
        await waitForListTableRows(this.page, WorkOrdersPage.WORK_ORDERS_FILTER_API);
    }

    /** Click the Create button that navigates to the wizard. */
    async clickCreate(): Promise<void> {
        await this.createButton.waitFor({ state: "visible", timeout: 15_000 });
        await this.createButton.click();
        await this.page.waitForURL(/\/workforce-management\/work-orders\/create/, { timeout: 30_000 });
    }

    /** Open the detail panel via the first row's Work Order ID button. */
    async openDetailPanel(): Promise<void> {
        if (await this.detailPanel.isVisible()) {
            return;
        }
        await this.table.openRowDetail(0);
        await this.detailPanel.waitForVisible();
    }

    async closeDetailPanel(): Promise<void> {
        await this.detailPanel.close();
    }

    async clickDetailPanelTab(tabName: string): Promise<void> {
        await this.detailPanel.clickTab(tabName);
    }

    async getFirstRowFieldValue(_field: string): Promise<string> {
        return this.getFirstRowDisplayName();
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
        this.lastSearchMatched = await this.filters.searchFilter(WorkOrdersPage.WORK_ORDERS_FILTER_API, value);
        return this.lastSearchMatched;
    }

    async searchFilterKeep(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilterKeep(WorkOrdersPage.WORK_ORDERS_FILTER_API, value);
        return this.lastSearchMatched;
    }

    async buildFilterFieldValuesFromFirstRow(): Promise<Record<string, string>> {
        const displayName = await this.getFirstRowDisplayName();
        return {
            customer_account_number: "test",
            agent_code: "test",
            agent_name: "test",
            assigned_user_display_name: displayName,
            customer_name: displayName,
            customer_city: "test",
            customer_phone: "test",
            // customer_type is an enum filter — leave undefined so applyEnumValue picks the first option
            // customer_type: "test",
            remarks: "test",
            wo_source_reference_no: displayName,
            code: displayName,
        };
    }

    async applyAllFilters(fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applyAllFilters(WorkOrdersPage.WORK_ORDERS_FILTER_API, fieldValues);
        return this.lastFilterResults;
    }

    async applySingleFilter(filterOption: string, fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applySingleFilter(
            WorkOrdersPage.WORK_ORDERS_FILTER_API,
            filterOption,
            fieldValues,
        );
        return this.lastFilterResults;
    }

    async applyAllSorts(): Promise<SortResult[]> {
        this.lastSortResults = await this.filters.applyAllSorts(WorkOrdersPage.WORK_ORDERS_FILTER_API);
        return this.lastSortResults;
    }

    // ── Assertions ──────────────────────────────────────────────────────────

    private dialog(title: string): Locator {
        return this.page.getByRole("dialog", { name: title })
            .or(this.page.getByRole("dialog").filter({ hasText: title }));
    }

    async expectDialogVisible(title: string): Promise<void> {
        await expect(this.dialog(title)).toBeVisible({ timeout: 10_000 });
    }

    async expectDialogHidden(title: string): Promise<void> {
        await expect(this.dialog(title)).not.toBeVisible({ timeout: 10_000 });
    }

    async cancelDialog(title: string): Promise<void> {
        const dialogEl = this.dialog(title);
        await this.page.keyboard.press("Escape");
        await dialogEl.waitFor({ state: "hidden", timeout: 10_000 });
    }

    async expectLoaded(): Promise<void> {
        await this.page.waitForURL(/\/workforce-management\/work-orders/, { timeout: 30_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
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
}
