import { expect, type Page } from "@playwright/test";

/** Read-only list and unsaved editor interactions for Report Templates. */
export class ReportTemplatesPage {
    private initialRange = "";
    private detailHref = "";
    private detailName = "";
    constructor(private readonly page: Page) {}

    private get table() { return this.page.getByRole("table").first(); }
    private get selector() { return this.page.getByRole("dialog").filter({ has: this.page.getByText("Select Report Type", { exact: true }) }); }

    private async waitForListReady() {
        await expect(this.page.getByTestId("filter-search-input")).toBeVisible({ timeout: 30_000 });
        await expect(this.table.getByRole("button", { name: "Report Name", exact: true })).toBeVisible({ timeout: 30_000 });
    }

    async navigate() {
        await this.page.goto("/reports/templates", { waitUntil: "domcontentloaded" });
        await expect(this.page).not.toHaveURL(/\/login/);
        await expect(this.page.getByRole("button", { name: "Create New" })).toBeVisible();
        await this.waitForListReady();
    }
    async openFromReports() {
        await this.page.goto("/reports/all-reports", { waitUntil: "domcontentloaded" });
        await this.page.getByTestId("reports-templates-menu-item").click();
        await expect(this.page.getByRole("button", { name: "Create New" })).toBeVisible();
        await this.waitForListReady();
    }
    async expectList() {
        await expect(this.page.getByRole("button", { name: "Create New" })).toBeVisible();
        for (const column of ["Report Name", "Description", "Created By", "Created At"]) {
            await expect(this.table.getByRole("button", { name: column, exact: true })).toBeVisible();
        }
    }
    async expectPagination() {
        await expect(this.page.getByRole("button", { name: "Previous Page" })).toBeVisible();
        await expect(this.page.getByRole("button", { name: "Next Page" })).toBeVisible();
    }
    private async rangeText() {
        const pagination = this.page.getByRole("button", { name: "Next Page" }).locator("..");
        return (await pagination.innerText()).trim();
    }
    async prepareFirstPage() {
        await this.navigate();
        const search = this.page.getByTestId("filter-search-input");
        const clear = this.page.getByTestId("btn-clear-filters");
        const hadCriteria = (await search.inputValue()) !== "" || await clear.isVisible();
        const previousRange = hadCriteria ? await this.rangeText().catch(() => "") : "";
        if (hadCriteria) {
            await this.reset();
            await expect(search).toBeEmpty();
            await expect(clear).toBeHidden();
        }
        await expect.poll(async () => {
            const range = await this.rangeText().catch(() => "");
            return this.parseRange(range) !== null && (!hadCriteria || range !== previousRange);
        }, { message: "The unfiltered pagination range did not settle after clearing list criteria" }).toBe(true);
        const previous = this.page.getByRole("button", { name: "Previous Page" });
        while (await previous.isEnabled()) await previous.click();
        this.initialRange = await this.rangeText();
    }
    async hasNextPage() {
        const range = this.parseRange(this.initialRange);
        if (!range) throw new Error("The first-page pagination range is unavailable");
        const next = this.page.getByRole("button", { name: "Next Page" });
        if (range.end < range.total) {
            await expect(next).toBeEnabled();
            return true;
        }
        await expect(next).toBeDisabled();
        return false;
    }
    async nextPage() { await this.page.getByRole("button", { name: "Next Page" }).click(); }
    async previousPage() { await this.page.getByRole("button", { name: "Previous Page" }).click(); }
    private parseRange(text: string) {
        const match = text.match(/([\d,]+)\s*[-–]\s*([\d,]+)\s+of\s+([\d,]+)/);
        return match ? {
            start: Number(match[1].replaceAll(",", "")),
            end: Number(match[2].replaceAll(",", "")),
            total: Number(match[3].replaceAll(",", "")),
        } : null;
    }
    private rangeStart(text: string) {
        const match = this.parseRange(text);
        if (!match) throw new Error(`Cannot parse the displayed row range: ${text}`);
        return match.start;
    }
    async expectRangeChanged() {
        const first = this.rangeStart(this.initialRange);
        await expect.poll(async () => this.rangeStart(await this.rangeText())).toBeGreaterThan(first);
    }
    async expectRangeRestored() { await expect.poll(() => this.rangeText()).toBe(this.initialRange); }

    async hasRows() {
        return this.table.getByRole("row").nth(1).waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
    }
    async searchNoMatchCandidate() { await this.page.getByTestId("filter-search-input").fill("E2E"); }
    async filterNoMatchCandidate() {
        await this.page.getByTestId("btn-add-filter").click();
        await this.page.getByTestId("filter-option-name").click();
        await this.page.getByTestId("input-filter-value").fill("E2E");
    }
    async isNoMatch() {
        return this.page.getByRole("heading", { name: "No Data Available" }).waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
    }
    async expectNoMatch(heading: string, detail?: string) {
        await expect(this.page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
        if (detail) await expect(this.page.getByText(detail, { exact: true })).toBeVisible();
    }
    async reset() {
        await this.page.keyboard.press("Escape");
        await this.page.getByTestId("btn-clear-filters").click();
        await expect(this.page.getByTestId("filter-search-input")).toBeEmpty();
        await this.expectPopulated();
    }
    async expectPopulated() { await expect.poll(() => this.hasRows()).toBe(true); }
    async openCreate() { await this.page.getByRole("button", { name: "Create New" }).click(); }
    async expectNextDisabled() { await expect(this.selector.getByRole("button", { name: "Next" })).toBeDisabled(); }
    async selectCaseType() {
        await this.selector.getByRole("button", { name: "Case Management", exact: true }).click();
        await this.selector.getByRole("radio", { name: "OLA Breached Active Cases", exact: true }).check();
    }
    async expectTypePreview() {
        await expect(this.selector.getByRole("radio", { name: "OLA Breached Active Cases", exact: true })).toBeChecked();
        await expect(this.selector.getByRole("button", { name: "Next" })).toBeEnabled();
        // A known field from the selected report type must be visible in the preview,
        // not merely in the list of report type names.
        await expect(this.selector.getByText("Case Number", { exact: true })).toBeVisible();
    }
    async nextToEditor() { await this.selector.getByRole("button", { name: "Next" }).click(); }
    async openEditor() { await this.navigate(); await this.openCreate(); await this.selectCaseType(); await this.nextToEditor(); }
    async expectEditor() {
        await expect(this.page.getByText("OLA Breached Active Cases", { exact: true })).toBeVisible();
        await expect(this.page.getByRole("textbox", { name: "Search fields" })).toBeVisible();
        for (const id of ["report-drop-zone-columns", "report-drop-zone-group-rows", "report-drop-zone-group-columns"]) {
            await expect(this.page.getByTestId(id)).toBeVisible();
        }
        await expect(this.page.getByText("Preview", { exact: true })).toBeVisible();
    }
    async expectDate(value: string) { await expect(this.page.getByTestId("dropdown-date-range")).toContainText(value); }
    async expectEmptyEditor() {
        await expect(this.page.getByRole("textbox", { name: "Template name" })).toBeEmpty();
        await expect(this.page.getByTestId("report-drop-zone-columns")).toContainText("Drop a Dimension or Measure here");
    }
    async save() { await this.page.getByTestId("report-pivot-save-btn").click(); }
    async expectValidation(text: string) {
        await expect(this.page.getByText(text, { exact: true })).toBeVisible();
    }
    async cancel() { await this.page.getByTestId("report-pivot-cancel-btn").click(); }
    async findCaseTemplate() {
        // The observed system template is a read-only reference, not an owned mutation target.
        // Search by its visible name, then validate the linked detail's type before using it.
        await this.navigate();
        await this.page.getByTestId("filter-search-input").fill("Case Performance Report");
        const link = this.table.getByRole("link", { name: "Case Performance Report", exact: true }).first();
        if (!(await link.waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false))) return false;
        const href = await link.getAttribute("href");
        if (!href || !/^\/reports\/templates\/[a-zA-Z0-9-]+$/.test(href)) return false;
        await link.click();
        const type = this.page.getByText("(View Case Reporting Base)", { exact: true });
        if (!(await type.waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false))) return false;
        this.detailHref = href;
        this.detailName = "Case Performance Report";
        await this.navigate();
        await this.page.getByTestId("filter-search-input").fill(this.detailName);
        await expect(this.table.locator(`a[href="${this.detailHref}"]`)).toBeVisible();
        return true;
    }
    async openIdentifiedTemplate() {
        if (!this.detailHref) throw new Error("No verified Case Management template selected");
        await this.table.locator(`a[href="${this.detailHref}"]`).click();
    }
    async expectTemplateDetail() {
        await expect(this.page).toHaveURL(new RegExp(`${this.detailHref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?.*)?$`));
        await expect(this.page.getByText(this.detailName, { exact: true })).toBeVisible();
        await expect(this.page.getByText("(View Case Reporting Base)", { exact: true })).toBeVisible();
        await expect(this.page.getByRole("table").first()).toBeVisible();
    }
    async openConfiguration() { await this.page.getByTestId("report-pivot-config-trigger").click(); }
    async expectConfiguration() {
        const summary = this.page.getByTestId("report-pivot-config-summary");
        await expect(summary.getByText("Date Filter", { exact: true })).toBeVisible();
        await expect(summary.getByText("Values", { exact: true })).toBeVisible();
    }
    async openViews() { await this.page.getByTestId("btn-load-saved-views").click(); }
    async viewsEmpty() { return this.page.getByRole("dialog").getByText("No available saved views found.", { exact: true }).waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false); }
    async expectViewsMessage(message: string) { await expect(this.page.getByRole("dialog").getByText(message, { exact: true })).toBeVisible(); }
}
