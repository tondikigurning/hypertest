/**
 * Filter bar interactions for @hyperscal/dataview Filter.Content (wizard entity picker).
 *
 * Differs from FilterComponent (@hyperscal/filters): search uses inputComponent,
 * add-filter/sort use role-based buttons, and popovers portal to document body.
 */
import type { Locator, Page, Response } from "@playwright/test";
import { expect } from "@playwright/test";
import { navigateCalendarToDate } from "./filter/filter-input-helpers";
import type { FilterResult, SortResult } from "./filter/filter-types";
import { checkDateOrder, verifyDateMatch, verifyTextEnumMatch } from "./filter/filter-utils";
import { ENTITIES_UNITS_FILTER_URL } from "../utils/list-page-constants";

export const ENTITY_FILTER_LABELS: Record<string, string> = {
    name: "Company Name",
    created_at: "Created At",
    created_by: "Created By",
    parent: "Parent",
    active_status: "Status",
    unit_type: "Type",
    updated_at: "Updated At",
    updated_by: "Updated By",
};

const DEBOUNCE_MS = 800;

export class DataviewFilterComponent {
    /** List of filterable field names → picker labels (defaults to the entity-picker set). */
    private readonly filterLabels: Record<string, string>;
    /** Endpoint URL regex used to match list/filter responses for this surface. */
    private readonly endpointUrl: RegExp;
    /** Toolbar trigger that opens the filter popover (list surfaces only; wizard shows Add Filter directly). */
    private readonly openTrigger?: Locator;
    /** Toolbar trigger that opens the sort popover (list surfaces only). */
    private readonly sortTrigger?: Locator;
    /** True when constructed with no opts (entity picker) — preserves legacy behaviour. */
    private readonly isDefault: boolean;
    /** Status of the last search response (used for error-state fallbacks). */
    lastSearchStatus: number | null = null;
    /** Round-trip time of the last search response (used for loading-state fallbacks). */
    lastSearchDurationMs: number | null = null;

    constructor(
        private readonly page: Page,
        private readonly scope: Locator,
        opts?: {
            filterLabels?: Record<string, string>;
            endpointUrl?: RegExp;
            openTrigger?: Locator;
            sortTrigger?: Locator;
        },
    ) {
        this.filterLabels = opts?.filterLabels ?? ENTITY_FILTER_LABELS;
        this.endpointUrl = opts?.endpointUrl ?? ENTITIES_UNITS_FILTER_URL;
        this.openTrigger = opts?.openTrigger;
        this.sortTrigger = opts?.sortTrigger;
        this.isDefault = !opts;
    }

    private get searchInput(): Locator {
        return this.scope
            .locator('[data-testid="inputComponent"][placeholder="Search"]')
            .or(this.scope.getByRole("textbox", { name: /search/i }))
            .first();
    }

    private get btnAddFilter(): Locator {
        return this.scope.getByRole("button", { name: /^add filter$/i });
    }

    private get btnAddSort(): Locator {
        return this.scope.getByRole("button", { name: /^add sort$/i });
    }

    private get btnSortApplied(): Locator {
        return this.scope.getByRole("button", { name: /^sort by/i });
    }

    waitForFilterResponse(endpoint: string, timeout = 30_000): Promise<Response | null> {
        return this.page
            .waitForResponse(
                (res) => {
                    const url = res.url();
                    // Wizard uses the configured `endpointUrl` (units filter). List surfaces
                    // (e.g. Knowledge Management) pass their own endpoint regex here.
                    const matchesConfigUrl = this.endpointUrl.test(url);
                    const matchesEndpoint = endpoint ? url.includes(endpoint) : false;
                    return (matchesEndpoint || matchesConfigUrl) && !url.includes("filter-options");
                },
                { timeout },
            )
            .catch(() => null);
    }

    /** Opens the filter popover for list surfaces (where Add Filter lives behind a trigger). */
    private async ensureFilterPopoverOpen(): Promise<void> {
        if (!this.openTrigger) {
            return;
        }
        const addFilterVisible = await this.btnAddFilter.isVisible({ timeout: 1_000 }).catch(() => false);
        if (addFilterVisible) {
            return;
        }
        await this.openTrigger.click();
        await this.btnAddFilter.waitFor({ state: "visible", timeout: 15_000 });
    }

    /** Opens the sort popover for list surfaces (where Add Sort lives behind a trigger). */
    private async ensureSortPopoverOpen(): Promise<void> {
        if (!this.sortTrigger) {
            return;
        }
        const addSortVisible = await this.btnAddSort.isVisible({ timeout: 1_000 }).catch(() => false);
        if (addSortVisible) {
            return;
        }
        await this.sortTrigger.click();
        await this.btnAddSort.waitFor({ state: "visible", timeout: 15_000 }).catch(() => { });
    }

    private tableRows(): Locator {
        return this.scope.locator("table tbody tr");
    }

    private async resolveSortResponse(
        responsePromise: Promise<Response | null>,
    ): Promise<{ apiStatus: number | null; rows: Array<Record<string, unknown>> }> {
        const res = await responsePromise;
        if (res) {
            const rows: Array<Record<string, unknown>> = (await res.json().catch(() => null))?.rows ?? [];
            return { apiStatus: res.status(), rows };
        }

        const hasRows = await expect(async () => {
            const rowCount = await this.tableRows().count();
            expect(rowCount).toBeGreaterThan(0);
        })
            .toPass({ timeout: 10_000 })
            .then(() => true)
            .catch(() => false);

        if (hasRows) {
            return { apiStatus: 200, rows: [] };
        }

        return { apiStatus: null, rows: [] };
    }

    private async clearSearchInput(endpoint: string): Promise<void> {
        const searchValue = (await this.searchInput.inputValue().catch(() => "")).trim();
        if (searchValue.length === 0) {
            return;
        }

        const responsePromise = this.waitForFilterResponse(endpoint, 15_000);
        await this.searchInput.fill("");
        await this.page.waitForTimeout(DEBOUNCE_MS);
        await responsePromise;
    }

    private async removeAppliedFilters(): Promise<void> {
        const removeButtons = this.page.locator('[aria-label="Remove filter"]');
        while ((await removeButtons.count()) > 0) {
            await removeButtons.first().click();
            await this.page.waitForTimeout(300);
        }
    }

    async reset(endpoint: string): Promise<void> {
        await this.removeAppliedFilters();
        await this.clearSearchInput(endpoint);
        await this.ensureNoSort();
        await this.page.waitForTimeout(300);
    }

    private async ensureNoSort(): Promise<void> {
        const hasAppliedSort = await this.btnSortApplied.isVisible({ timeout: 1_000 }).catch(() => false);
        if (!hasAppliedSort) {
            return;
        }

        await this.btnSortApplied.click();
        const sortRows = this.page.locator("div.flex.min-w-\\[240px\\]");
        const count = await sortRows.count();
        for (let i = count - 1; i >= 0; i--) {
            await sortRows.nth(i).locator("button").last().click();
            await this.page.waitForTimeout(200);
        }
        await this.page.keyboard.press("Escape");
    }

    private get filterPickerPopover(): Locator {
        return this.page
            .locator("[data-radix-popper-content-wrapper]")
            .filter({ has: this.page.getByPlaceholder("Type a value or choose options") })
            .last();
    }

    private filterPickerMenuItem(label: string): Locator {
        return this.filterPickerPopover
            .locator("div.flex.cursor-pointer.items-center.gap-2")
            .filter({ hasText: label })
            .first();
    }

    private async openFilterPicker(): Promise<void> {
        await this.btnAddFilter.waitFor({ state: "visible", timeout: 15_000 });
        await this.btnAddFilter.click();
        await this.page.getByPlaceholder("Type a value or choose options").waitFor({ state: "visible", timeout: 10_000 });
    }

    private async closeOpenPopover(): Promise<void> {
        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(200);
    }

    private filterValueInput(): Locator {
        // Exact match — substring would also hit the picker search
        // ("Type a value or choose options") and fill the wrong field.
        return this.page.getByPlaceholder("Type a value", { exact: true }).first();
    }

    private filterValueCalendar(): Locator {
        return this.page.locator('[data-slot="calendar"]').last();
    }

    private filterValueCombobox(): Locator {
        // @hyperscal/ui ComboBox uses a plain input, not role="combobox".
        return this.page
            .getByPlaceholder("Search or select an item...")
            .or(this.page.getByRole("combobox"))
            .last();
    }

    private async selectFilterField(label: string): Promise<void> {
        await this.ensureFilterPopoverOpen();
        await this.openFilterPicker();
        await this.filterPickerMenuItem(label).click();
        // Wait for the field picker to close so its search placeholder cannot
        // be mistaken for the text filter value input.
        await this.page
            .getByPlaceholder("Type a value or choose options")
            .waitFor({ state: "hidden", timeout: 5_000 })
            .catch(() => { });
        await this.filterValueInput()
            .or(this.filterValueCalendar())
            .or(this.filterValueCombobox())
            .first()
            .waitFor({ state: "visible", timeout: 10_000 });
    }

    private async detectFilterInputType(): Promise<FilterResult["inputType"]> {
        const textInput = this.filterValueInput();
        const isText = await textInput.isVisible({ timeout: 2_000 }).catch(() => false);
        if (isText) return "text";

        const calendar = this.filterValueCalendar();
        const isDate = await calendar.isVisible({ timeout: 2_000 }).catch(() => false);
        if (isDate) return "date";

        const combobox = this.filterValueCombobox();
        const isEnum = await combobox.isVisible({ timeout: 5_000 }).catch(() => false);
        if (isEnum) return "enum";

        return "unknown";
    }

    private async applyTextFilterValue(value: string, endpoint: string): Promise<Response | null> {
        const textInput = this.filterValueInput();
        await textInput.waitFor({ state: "visible", timeout: 10_000 });
        const responsePromise = this.waitForFilterResponse(endpoint, 25_000);
        await textInput.click();
        await textInput.fill(value);
        await this.page.waitForTimeout(DEBOUNCE_MS);
        return responsePromise;
    }

    private async applyDateFilterValue(
        targetDateISO: string | undefined,
        endpoint: string,
    ): Promise<{ response: Response | null; selectedValue: string | null }> {
        const calendar = this.filterValueCalendar();
        await calendar.waitFor({ state: "visible", timeout: 5_000 }).catch(() => { });

        const finalTargetDate = targetDateISO || new Date().toISOString().split("T")[0];
        const targetBtn = await navigateCalendarToDate(this.page, calendar, finalTargetDate);

        if (!(await targetBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
            return { response: null, selectedValue: null };
        }

        const ariaLabel = await targetBtn.getAttribute("aria-label").catch(() => null);
        const selectedValue = ariaLabel?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? finalTargetDate;
        const responsePromise = this.waitForFilterResponse(endpoint, 20_000);
        await targetBtn.click();
        await this.page.waitForTimeout(DEBOUNCE_MS);
        const response = await responsePromise;
        return { response, selectedValue };
    }

    private async applyEnumFilterValue(
        providedValue: string | undefined,
        endpoint: string,
    ): Promise<{ response: Response | null; selectedValue: string | null }> {
        const combobox = this.filterValueCombobox();
        await combobox.click();
        await this.page.waitForTimeout(300);

        const options = this.page.getByRole("option");
        const optionCount = await options.count();
        if (optionCount === 0) {
            return { response: null, selectedValue: null };
        }

        const option = providedValue
            ? options.filter({ hasText: providedValue }).first()
            : options.first();
        const selectedValue = (await option.textContent())?.trim() ?? null;
        if (!selectedValue) {
            return { response: null, selectedValue: null };
        }

        const responsePromise = this.waitForFilterResponse(endpoint, 20_000);
        await option.click();
        await this.page.waitForTimeout(DEBOUNCE_MS);
        const response = await responsePromise;
        return { response, selectedValue };
    }

    async searchFilter(endpoint: string, value: string): Promise<boolean> {
        const allMatch = await this.searchFilterKeep(endpoint, value);
        await this.reset(endpoint);
        return allMatch;
    }

    /**
     * Same as `searchFilter` but leaves the search term applied. Needed for dataviews
     * embedded in an overlay/panel: the filtered result set must stay visible for the
     * next assertion, and Escape-based cleanup would close the host panel.
     */
    async searchFilterKeep(endpoint: string, value: string): Promise<boolean> {
        const searchInput = this.searchInput;
        await searchInput.waitFor({ state: "visible" });
        await searchInput.click();
        await searchInput.fill("");

        const deadline = Date.now() + 25_000;
        const startedAt = Date.now();
        let responsePromise = this.waitForFilterResponse(endpoint, 25_000);
        await searchInput.fill(value);
        await this.page.waitForTimeout(DEBOUNCE_MS);

        while (Date.now() < deadline) {
            const response = await responsePromise;
            this.lastSearchStatus = response?.status() ?? null;
            this.lastSearchDurationMs = response ? Date.now() - startedAt : null;
            if (response === null || response.status() !== 200) {
                return false;
            }

            const body = await response.json().catch(() => null);
            const rows: unknown[] = body?.rows ?? [];
            if (rows.length === 0) {
                return true;
            }

            if (rows.every((row) => JSON.stringify(row).toLowerCase().includes(value.toLowerCase()))) {
                return true;
            }

            // The response belonged to the clear-then-type sequence; wait for the next one.
            responsePromise = this.waitForFilterResponse(endpoint, Math.max(1_000, deadline - Date.now()));
        }

        return false;
    }

    async applyAllFilters(endpoint: string, fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        const defaultTextValue = "test";
        const results: FilterResult[] = [];

        for (const filterName of Object.keys(this.filterLabels)) {
            const result = await this.applyFilterByNameWithEndpoint(filterName, endpoint, fieldValues, defaultTextValue);
            await this.reset(endpoint);
            results.push(result);
        }

        return results;
    }

    async applySingleFilter(
        endpoint: string,
        filterName: string,
        fieldValues?: Record<string, string>,
    ): Promise<FilterResult[]> {
        const result = await this.applyFilterByNameWithEndpoint(filterName, endpoint, fieldValues, "test");
        await this.reset(endpoint);
        return [result];
    }

    private async applyFilterByNameWithEndpoint(
        filterName: string,
        endpoint: string,
        fieldValues: Record<string, string> | undefined,
        defaultTextValue: string,
    ): Promise<FilterResult> {
        const label = this.filterLabels[filterName] ?? filterName;
        const providedValue = fieldValues?.[filterName];

        await this.removeAppliedFilters();
        await this.selectFilterField(label);

        const inputType = await this.detectFilterInputType();
        let response: Response | null = null;
        let selectedValue: string | null = null;

        if (inputType === "text") {
            const textValue = (providedValue && providedValue.trim()) || defaultTextValue;
            response = await this.applyTextFilterValue(textValue, endpoint);
            selectedValue = textValue;
        } else if (inputType === "date") {
            const result = await this.applyDateFilterValue(providedValue, endpoint);
            response = result.response;
            selectedValue = result.selectedValue;
        } else if (inputType === "enum") {
            const result = await this.applyEnumFilterValue(providedValue, endpoint);
            response = result.response;
            selectedValue = result.selectedValue;
        }

        await this.closeOpenPopover();

        const apiStatus = response?.status() ?? null;
        const body = await response?.json().catch(() => null);
        const rows: unknown[] = body?.rows ?? [];

        let rowsMatchFilter: boolean | null = null;
        if (selectedValue !== null && (inputType === "text" || inputType === "enum")) {
            rowsMatchFilter = verifyTextEnumMatch(rows, selectedValue, filterName);
        } else if (selectedValue !== null && inputType === "date") {
            rowsMatchFilter = verifyDateMatch(rows, selectedValue, filterName);
        }

        return {
            filterTestId: `filter-option-${filterName}`,
            filterName,
            inputType,
            apiStatus,
            rowCount: rows.length,
            selectedValue,
            rowsMatchFilter,
        };
    }

    private async openAddSortPicker(): Promise<void> {
        await this.ensureSortPopoverOpen();
        const addSortVisible = await this.btnAddSort.isVisible({ timeout: 2_000 }).catch(() => false);
        if (addSortVisible) {
            await this.btnAddSort.click();
            await this.page.getByPlaceholder("Type a value or choose options").waitFor({ state: "visible", timeout: 10_000 });
            return;
        }

        await this.btnSortApplied.click();
        await this.page.getByText("Add Sort", { exact: true }).click();
        await this.page.getByPlaceholder("Type a value or choose options").waitFor({ state: "visible", timeout: 10_000 });
    }

    /** Opens the dataview sort picker and clicks the first available option (no sort-option-* testids). */
    async applyFirstAvailableSort(): Promise<void> {
        await this.openAddSortPicker();
        const firstOption = this.page
            .locator("[data-radix-popper-content-wrapper]")
            .locator("div.flex.cursor-pointer.items-center.gap-2")
            .first();
        await firstOption.waitFor({ state: "visible", timeout: 10_000 });
        await firstOption.click();
    }

    private async selectSortOption(label: string): Promise<void> {
        await this.filterPickerMenuItem(label).click();
        await this.page.waitForTimeout(300);
    }

    private sortRow(label: string): Locator {
        return this.page.locator("div.flex.min-w-\\[240px\\]").filter({ hasText: label }).first();
    }

    private async toggleSortDirection(label: string): Promise<void> {
        await this.sortRow(label).locator("button").first().click();
        await this.page.waitForTimeout(DEBOUNCE_MS);
    }

    private async removeSortByLabel(label: string): Promise<void> {
        const row = this.sortRow(label);
        if (await row.isVisible({ timeout: 1_000 }).catch(() => false)) {
            await row.locator("button").last().click();
            await this.page.waitForTimeout(300);
        }
    }

    private async openSortPopover(): Promise<void> {
        await this.btnSortApplied.waitFor({ state: "visible", timeout: 10_000 });
        await this.btnSortApplied.click();
    }

    async applyAllSorts(endpoint: string): Promise<SortResult[]> {
        // Legacy entity-picker behaviour is preserved when constructed with no opts.
        if (this.isDefault) {
            return this.applyAllSortsLegacy(endpoint);
        }
        return this.applyAllSortsGeneric(endpoint);
    }

    private async applyAllSortsLegacy(endpoint: string): Promise<SortResult[]> {
        const SORT_TIMEOUT = 10_000; // shorter timeout: resolveSortResponse handles null gracefully
        const results: SortResult[] = [];
        const createdAtLabel = ENTITY_FILTER_LABELS.created_at;
        const createdAtName = "created_at";

        await this.ensureNoSort();
        await this.openAddSortPicker();
        await this.selectSortOption(createdAtLabel);
        await this.closeOpenPopover();

        await this.openSortPopover();
        {
            const responsePromise = this.waitForFilterResponse(endpoint, SORT_TIMEOUT);
            await this.toggleSortDirection(createdAtLabel);
            const { apiStatus, rows } = await this.resolveSortResponse(responsePromise);
            results.push({
                sortOptionName: createdAtName,
                direction: "desc",
                apiStatus,
                rows,
                orderConsistent: checkDateOrder(rows, createdAtName, "desc"),
            });
        }

        {
            const responsePromise = this.waitForFilterResponse(endpoint, SORT_TIMEOUT);
            await this.toggleSortDirection(createdAtLabel);
            const { apiStatus, rows } = await this.resolveSortResponse(responsePromise);
            results.push({
                sortOptionName: createdAtName,
                direction: "asc",
                apiStatus,
                rows,
                orderConsistent: checkDateOrder(rows, createdAtName, "asc"),
            });
        }

        await this.closeOpenPopover();

        const sortNames = Object.keys(ENTITY_FILTER_LABELS).filter((name) => name !== createdAtName);

        for (const sortName of sortNames) {
            const label = ENTITY_FILTER_LABELS[sortName];

            await this.ensureNoSort();
            await this.openAddSortPicker();
            await this.selectSortOption(label);
            await this.closeOpenPopover();

            await this.openSortPopover();

            {
                const responsePromise = this.waitForFilterResponse(endpoint, SORT_TIMEOUT);
                await this.toggleSortDirection(label);
                const { apiStatus, rows } = await this.resolveSortResponse(responsePromise);
                results.push({
                    sortOptionName: sortName,
                    direction: "desc",
                    apiStatus,
                    rows,
                    orderConsistent: checkDateOrder(rows, sortName, "desc"),
                });
            }

            {
                const responsePromise = this.waitForFilterResponse(endpoint, SORT_TIMEOUT);
                await this.toggleSortDirection(label);
                const { apiStatus, rows } = await this.resolveSortResponse(responsePromise);
                results.push({
                    sortOptionName: sortName,
                    direction: "asc",
                    apiStatus,
                    rows,
                    orderConsistent: checkDateOrder(rows, sortName, "asc"),
                });
            }

            await this.closeOpenPopover();
            await this.removeSortByLabel(label);
        }

        await this.ensureNoSort();
        return results;
    }

    /** List-surface variant (e.g. Knowledge Management): iterates the configured labels,
     *  opens the sort popover via `sortTrigger`, and only runs date-order checks on date fields. */
    private async applyAllSortsGeneric(endpoint: string): Promise<SortResult[]> {
        const SORT_TIMEOUT = 10_000;
        const results: SortResult[] = [];
        const dateFieldPattern = /(created_at|updated_at|last_updated|date_created|created|updated)/i;

        for (const sortName of Object.keys(this.filterLabels)) {
            const label = this.filterLabels[sortName];
            const isDateField = dateFieldPattern.test(sortName);

            await this.ensureNoSort();
            await this.openAddSortPicker();
            await this.selectSortOption(label);
            await this.closeOpenPopover();

            await this.openSortPopover();
            {
                const responsePromise = this.waitForFilterResponse(endpoint, SORT_TIMEOUT);
                await this.toggleSortDirection(label);
                const { apiStatus, rows } = await this.resolveSortResponse(responsePromise);
                results.push({
                    sortOptionName: sortName,
                    direction: "desc",
                    apiStatus,
                    rows,
                    orderConsistent: isDateField ? checkDateOrder(rows, sortName, "desc") : null,
                });
            }

            {
                const responsePromise = this.waitForFilterResponse(endpoint, SORT_TIMEOUT);
                await this.toggleSortDirection(label);
                const { apiStatus, rows } = await this.resolveSortResponse(responsePromise);
                results.push({
                    sortOptionName: sortName,
                    direction: "asc",
                    apiStatus,
                    rows,
                    orderConsistent: isDateField ? checkDateOrder(rows, sortName, "asc") : null,
                });
            }

            await this.closeOpenPopover();
            await this.removeSortByLabel(label);
        }

        await this.ensureNoSort();
        return results;
    }
}
