/**
 * POM — /case-management/cases
 *   (pipeline view tabs, case table, filter builder, create dialog).
 *
 * All locators below were verified against the running app (playwright-cli exploration),
 * not derived from memory:
 *   • Create New button ............ CasesPageHeader → <Button>Create New</Button>
 *   • Filter trigger .............. "Add Filters" button (FilterPanel trigger)
 *   • Filter builder ............... Popover opened by the trigger (dropdown-add-filter);
 *                                   selecting a field reveals the "Where" builder grid
 *                                   (field/operator/value) with Add Filter / Add Group /
 *                                   Clear Filter actions (btn-builder-* / btn-clear-filter).
 *   • Pipeline tabs ................ PipelineRenderer (shared PipelineComponent)
 *                                   magnifier button is not rendered in the default column config.
 *   • Full case detail (workbench) . CaseDetailsTabContent, reached by activating the case
 *                                   (onLinkClick → handleChangeTab). The "View Case Detail" button
 *                                   in the panel header is permission-gated and may be hidden, so we
 *                                   drive navigation via the case-number link instead.
 *   • Create New Case dialog ....... Radix dialog; heading "Create New Case Close Dialog";
 *                                   footer "Cancel" / disabled "Create Case" buttons.
 *   • Conversation panel ........... right-bar feeds; anchored by "Pop out chat" /
 *                                   "Switch to Internal" controls.
 */
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { DataTableComponent } from "../../components/DataTableComponent";
import { FilterComponent } from "../../components/FilterComponent";
import { PipelineComponent } from "../../components/PipelineComponent";
import { ResponseModalComponent } from "../../components/ResponseModalComponent";
import type { SortResult } from "../../components/filter/filter-types";
import { CASES_FILTER_API, CASES_LIST_PATH } from "../../utils/list-page-constants";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class CasesPage {
    static readonly CASES_FILTER_API = CASES_FILTER_API;

    readonly pipeline: PipelineComponent;
    readonly table: DataTableComponent;
    readonly filters: FilterComponent;
    readonly responseModal: ResponseModalComponent;

    lastSearchKeyword: string | null = null;
    lastSearchMatched = false;
    lastSortResults: SortResult[] = [];
    /** Account number captured from the case list (Customer No column) before the
     *  create dialog opens — the dialog overlays the list, so it must be read first. */
    lastCustomerAccount: string | null = null;

    constructor(private readonly page: Page) {
        this.pipeline = new PipelineComponent(page);
        this.table = new DataTableComponent(page);
        this.filters = new FilterComponent(page);
        this.responseModal = new ResponseModalComponent(page);
    }

    // ── list header controls ────────────────────────────────────────────────
    private get createNewButton(): Locator {
        return this.page.getByRole("button", { name: "Create New", exact: true });
    }

    /** Selects a pipeline tab and waits for the list refetch to complete so kebab
     *  actions never race stale/absent rows (mirrors UsersPage.selectPipelineTab). */
    async selectPipelineTab(tab: string): Promise<void> {
        const responsePromise = this.page
            .waitForResponse(
                (res) =>
                    res.url().includes(CASES_FILTER_API)
                    && !res.url().includes("filter-options")
                    && res.request().method() === "POST",
                { timeout: 45_000 },
            )
            .catch(() => null);

        await this.pipeline.selectTab(tab);
        await responsePromise;
    }

    /** "Add Filters" button that toggles the filter builder popover. */
    private get filterTrigger(): Locator {
        return this.page.getByRole("button", { name: "Add Filters", exact: true });
    }

    /** First data row's case-number link. */
    private caseNumberLink(rowIndex = 0): Locator {
        // The first cell renders a checkbox + the case-number button (case_number column).
        return this.table.rows
            .nth(rowIndex)
            .locator("td")
            .first()
            .getByRole("button")
            .first();
    }

    /**
     * A non-interactive text cell in the first row — clicking it triggers the row's
     * onRowClick (opens the docked panel). The first cell contains the case-number
     * button (onLinkClick → workbench), so we must NOT click it.
     */
    private caseRowTextCell(rowIndex = 0): Locator {
        return this.table.rows
            .nth(rowIndex)
            .locator("td")
            .nth(1);
    }

    // ── docked detail panel (case-specific — DetailPanelContainer without Tabs) ──
    /**
     * The docked case detail panel. Cases uses a DetailPanelContainer WITHOUT
     * Tabs (single InfoPanel stack), so DetailPanelComponent.root (requires
     * [data-slot="tabs"]) does NOT match — this custom locator targets the
     * panel li by its vertical resize slider + "Case#" header instead.
     */
    private get detailPanelRoot(): Locator {
        return this.page
            .locator("ul > li")
            .filter({ has: this.page.locator('[role="slider"][aria-orientation="vertical"]') })
            .filter({ hasText: "Case#" })
            .first();
    }

    private get detailPanelHeader(): Locator {
        return this.detailPanelRoot.locator("div").filter({ hasText: "Case#" }).first();
    }

    private get detailPanelCloseButton(): Locator {
        // CloseDetailPanelButton: icon-only (no accessible label).
        return this.detailPanelRoot.locator("button:has(i.i-x)").first();
    }

    private get detailPanelTitle(): Locator {
        return this.detailPanelHeader.locator("p").first();
    }

    // ── full case detail workbench (CaseDetailsTabContent) ───────────────────
    /** Header case tab in the tab bar (e.g. "HS-110826-278899 Close tab"). */
    private caseHeaderTab(caseNumber?: string): Locator {
        const tab = caseNumber
            ? this.page.getByRole("tab", { name: new RegExp(`^${escapeRegExp(caseNumber)}`), exact: false })
            : this.page.getByRole("tab").filter({ hasText: /HS-/ }).first();
        return tab;
    }

    /** Left info section — Case Information / Team / Customer Details panels. */
    private get workbenchInfoSection(): Locator {
        return this.page
            .locator("main")
            .filter({ hasText: /Case Information|Team|Customer Details/ })
            .first();
    }

    /** Conversation feeds panel — anchored by its stable controls. */
    private get workbenchFeeds(): Locator {
        return this.page
            .getByRole("button", { name: /Pop out chat|Switch to Internal/i })
            .first();
    }

    /**
     * Vertical tab rail buttons — icon-only (label lives in the Tooltip on hover).
     * The rail is the ONLY group of `[data-slot="tabs-trigger"]` buttons with no
     * text; header case tab and feeds tabs (All/Email/Merged Cases) all have text.
     * Icons render as `<i>` (Hyperscal Icon), not `<svg>`.
     */
    private get verticalTabRail(): Locator {
        return this.page
            .locator('button[data-slot="tabs-trigger"]')
            .filter({ has: this.page.locator("i, svg") })
            .filter({ hasNotText: /\S/ });
    }

    /**
     * Finds a vertical rail button by hovering it and matching the tooltip label.
     * Robust against layout differences (compact mode prepends "Messages").
     */
    async expectWorkbenchVerticalTab(tabName: string): Promise<void> {
        const rail = this.verticalTabRail;
        const count = await rail.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const button = rail.nth(i);
            await button.hover();
            const tooltip = this.page
                .getByRole("tooltip")
                .filter({ hasText: new RegExp(`^${escapeRegExp(tabName)}$`, "i") })
                .first();
            try {
                // Radix Tooltip has an open delay (~700ms) — poll for visibility.
                await expect(tooltip).toBeVisible({ timeout: 3_000 });
                return;
            } catch {
                // Not this button — continue to the next rail item.
            }
        }

        throw new Error(`Vertical tab "${tabName}" not found in the case detail workbench.`);
    }

    // ── detail panel — actions (shared view-detail steps) ────────────────────

    async openDetailPanel(): Promise<void> {
        if (await this.detailPanelRoot.isVisible().catch(() => false)) {
            return;
        }
        // Click a non-interactive text cell (Case Source) — clicking the first cell
        // would hit the case-number button (onLinkClick → workbench) instead of
        // the row's onRowClick (docked panel).
        await this.table.expectHasRows();
        await expect(async () => {
            const cell = this.caseRowTextCell(0);
            await expect(cell).toBeVisible({ timeout: 5_000 });
            await cell.click({ timeout: 5_000 });
        }).toPass({ timeout: 35_000, intervals: [400, 800, 1_500, 2_500, 4_000] });
        await this.detailPanelRoot.waitFor({ state: "visible", timeout: 20_000 });
    }

    async closeDetailPanel(): Promise<void> {
        await this.detailPanelCloseButton.click();
        await this.detailPanelRoot.waitFor({ state: "hidden", timeout: 10_000 });
    }

    async clickDetailPanelTab(_tabName: string): Promise<void> {
        // The cases docked panel has no tabs — no-op for contract compatibility.
    }

    // ── full case detail workbench — actions ─────────────────────────────────

    /** Open the full case detail workbench via the first row's case-number link. */
    async openFirstCaseFromList(): Promise<void> {
        await this.table.expectHasRows();
        await this.caseNumberLink(0).click();
        // The workbench detail fetch (GET /casemgmt/tenant/cases/{case_number})
        // fires on navigation — wait for the URL so @mock 500/delay assertions
        // (waitForMocked500 / waitForDelayedListResponse) can observe it.
        await this.page.waitForURL(/case-number=/, { timeout: 30_000 });
    }

    // ── detail panel — assertions (shared view-detail steps) ─────────────────

    async expectDetailPanelVisible(): Promise<void> {
        await expect(this.detailPanelRoot).toBeVisible({ timeout: 20_000 });
    }

    async expectDetailPanelHidden(): Promise<void> {
        await expect(this.detailPanelRoot).not.toBeVisible({ timeout: 10_000 });
    }

    async expectDetailPanelHasTitle(): Promise<void> {
        await expect(this.detailPanelTitle).not.toBeEmpty({ timeout: 10_000 });
    }

    async expectDetailTabContentVisible(_tabName: string): Promise<void> {
        // No tabs in the cases docked panel — contract no-op.
    }

    // ── full case detail workbench — assertions ──────────────────────────────

    async expectWorkbenchVisible(): Promise<void> {
        await this.page.waitForURL(/case-number=/, { timeout: 30_000 });
        await expect(this.workbenchInfoSection).toBeVisible({ timeout: 30_000 });
    }

    async expectWorkbenchInfoSectionVisible(): Promise<void> {
        await expect(this.workbenchInfoSection).toBeVisible({ timeout: 30_000 });
    }

    async expectWorkbenchCaseTabVisible(caseNumber?: string): Promise<void> {
        await expect(this.caseHeaderTab(caseNumber)).toBeVisible({ timeout: 20_000 });
    }

    async expectWorkbenchInformationField(field: string): Promise<void> {
        // InfoField renders <dt> label; assert the term label is visible.
        await expect(
            this.workbenchInfoSection.locator("dt").filter({ hasText: new RegExp(`^${escapeRegExp(field)}$`, "i") }).first(),
        ).toBeVisible({ timeout: 20_000 });
    }

    async expectWorkbenchFeedsVisible(): Promise<void> {
        await expect(this.workbenchFeeds).toBeVisible({ timeout: 20_000 });
    }

    /** Conversation/feeds right bar — anchored by its stable controls. */
    private get conversationPanel(): Locator {
        return this.page
            .getByRole("button", { name: /Pop out chat|Switch to Internal/i })
            .first();
    }

    // ── create dialog ───────────────────────────────────────────────────────
    /** Matches BOTH modes of the shared CaseCreateDialog component ("Create New Case" and "Create Child Case"). */
    private get createCaseDialog(): Locator {
        return this.page.getByRole("dialog").filter({ hasText: /Create New Case|Create Child Case/ });
    }

    /** "Create Case" submit button in the dialog footer. */
    private get createCaseButton(): Locator {
        return this.createCaseDialog.getByRole("button", { name: /^Create Case$/ }).first();
    }

    /** Case Template dropdown trigger ("Select a Template..." → menu "dropdown-case-template options"). */
    private get caseTemplateDropdown(): Locator {
        return this.createCaseDialog
            .getByRole("button", { name: /Select a Template|Case Template/i })
            .first();
    }

    /** Template option menu — options render as menuitems under the template dropdown menu. */
    private get caseTemplateMenu(): Locator {
        return this.page.getByRole("menu", { name: /dropdown-case-template/i });
    }

    /** FormGenerator dropdown trigger — matches by the visible label text on the button. */
    private formFieldDropdown(label: string): Locator {
        return this.createCaseDialog.getByRole("button", { name: new RegExp(`^${label}$`, "i") }).first();
    }

    private get caseSubjectInput(): Locator {
        return this.createCaseDialog.getByRole("textbox", { name: /Case Subject/i }).first();
    }

    private get duplicateCaseDialog(): Locator {
        return this.page.getByRole("dialog").filter({ hasText: "Duplicate Case Detected" });
    }

    /** Sonner success toast (matches the app's toast.success usage). */
    private successToast(text: RegExp): Locator {
        return this.page.locator('[data-sonner-toast][data-type="success"]').filter({ hasText: text }).first();
    }

    // ── navigation ──────────────────────────────────────────────────────────
    async navigateTo(): Promise<void> {
        await this.page.goto(CASES_LIST_PATH, { waitUntil: "domcontentloaded" });
        await this.expectLoaded();
        await dismissTencentWorkbenchIfPresent(this.page);
    }

    async expectLoaded(): Promise<void> {
        await this.page.waitForURL(/\/case-management\/cases/, { timeout: 30_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
        await this.table.expectVisible();
    }

    // ── list assertions ─────────────────────────────────────────────────────
    async expectTableVisible(): Promise<void> {
        await this.table.expectVisible();
    }

    async expectColumnVisible(column: string): Promise<void> {
        // Column headers only render once the table has data; wait for rows first so a
        // transient empty table (data still loading) doesn't fail a valid column check.
        await expect(async () => {
            const rowCount = await this.table.rows.count();
            expect(rowCount).toBeGreaterThan(0);
        }).toPass({ timeout: 45_000 });

        // The cases DataViewRenderer renders header cells as <th> without role="columnheader"
        // (exposed as "cell"), so match the header cell by text instead of getByRole.
        await expect(
            this.page
                .locator("thead th")
                .filter({ hasText: new RegExp(`^${column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
                .first(),
        ).toBeVisible({ timeout: 20_000 });
    }

    async expectPipelineTabVisible(tab: string): Promise<void> {
        await expect(this.pipeline.tab(tab)).toBeVisible({ timeout: 20_000 });
    }

    // ── filter builder ──────────────────────────────────────────────────────
    /** "Add Filters" popover — renders as a dialog listing available filter fields. */
    private get filterBuilder(): Locator {
        return this.page.getByRole("dialog").filter({
            has: this.page.locator('[data-testid^="filter-option-"]').first(),
        });
    }

    /** The advanced "Where" builder — appears after selecting a field (grid + actions). */
    private get whereBuilder(): Locator {
        return this.page.getByTestId("btn-builder-add-filter").locator("xpath=ancestor::div[contains(@class,'grid')]").first();
    }

    async openFilterBuilder(): Promise<void> {
        await this.filterTrigger.click();
        await expect(this.filterBuilder).toBeVisible({ timeout: 20_000 });
        // Selecting the first available field reveals the "Where" clause
        // (field / operator / value) and the Add Filter / Add Group / Clear Filter actions.
        const firstField = this.filterBuilder.locator('[data-testid^="filter-option-"]').first();
        await firstField.click();
        await expect(this.page.getByText("Where", { exact: true }).first()).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectFilterBuilderVisible(): Promise<void> {
        // After a field is selected the option list closes and the "Where" builder dialog
        // is what remains visible — assert on the builder itself.
        await expect(this.whereBuilder).toBeVisible({ timeout: 20_000 });
    }

    async expectWhereClauseControls(): Promise<void> {
        await expect(this.page.getByText("Where", { exact: true }).first()).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectFilterAction(label: string): Promise<void> {
        await expect(
            this.whereBuilder.getByRole("button", { name: new RegExp(label, "i") }).first(),
        ).toBeVisible({ timeout: 20_000 });
    }

    // ── search & sort (shared FSR/SAP steps) ─────────────────────────────────
    /** First visible row's case number (first column value). */
    async getFirstRowFieldValue(_field: string): Promise<string> {
        await this.table.expectVisible();
        await expect(async () => {
            const rowCount = await this.table.rows.count();
            expect(rowCount).toBeGreaterThan(0);
        }).toPass({ timeout: 15_000 });

        const firstCell = this.table.rows.first().locator("td").first();
        await expect(firstCell).toBeVisible({ timeout: 10_000 });
        const value = ((await firstCell.textContent()) ?? "").trim();
        if (value) {
            return value;
        }

        throw new Error("No case number found in the first table row.");
    }

    async searchFilter(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilter(CASES_FILTER_API, value);
        return this.lastSearchMatched;
    }

    async searchFilterKeep(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilterKeep(CASES_FILTER_API, value);
        return this.lastSearchMatched;
    }

    async applyAllSorts(): Promise<SortResult[]> {
        this.lastSortResults = await this.filters.applyAllSorts(CASES_FILTER_API);
        return this.lastSortResults;
    }

    // ── full case detail page ───────────────────────────────────────────────
    async clickViewCaseDetail(): Promise<void> {
        // Activate the case (onLinkClick → handleChangeTab) to open the full case detail workbench.
        await this.caseNumberLink(0).click();
    }

    async expectCaseDetailSection(section: string): Promise<void> {
        await expect(this.page.getByText(new RegExp(section, "i")).first()).toBeVisible({
            timeout: 30_000,
        });
    }

    async expectConversationPanel(): Promise<void> {
        await expect(this.conversationPanel).toBeVisible({ timeout: 30_000 });
    }

    // ── create dialog ───────────────────────────────────────────────────────
    async clickCreateNew(): Promise<void> {
        // The create dialog overlays the list, so capture a Customer No (needed to
        // fill Customer Details) BEFORE opening it. Prefer the "All" pipeline tab,
        // which always has rows (e.g. solved cases), over the default empty tabs.
        await this.ensureCustomerAccountCaptured();
        await this.createNewButton.click();
    }

    /**
     * Captures a Customer No from the case list into {@link lastCustomerAccount}.
     * Skips if already captured; otherwise switches to the "All" tab, waits for
     * rows, and reads the first solved case's Customer No.
     */
    private async ensureCustomerAccountCaptured(): Promise<void> {
        if (this.lastCustomerAccount) {
            return;
        }
        try {
            await this.selectPipelineTab("All");
            await expect(async () => {
                expect(await this.table.rows.count()).toBeGreaterThan(0);
            }).toPass({ timeout: 30_000 });
            this.lastCustomerAccount = await this.getFirstCustomerAccount();
        } catch {
            // Fall back to whatever rows the current tab shows (may throw later if none).
            this.lastCustomerAccount = await this.getFirstCustomerAccount().catch(() => null);
        }
    }

    async expectCreateCaseDialogVisible(): Promise<void> {
        await expect(this.createCaseDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectCreateCaseDialogNotVisible(): Promise<void> {
        await expect(this.createCaseDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectCreateCaseDialogField(field: string): Promise<void> {
        await expect(
            this.createCaseDialog.getByText(new RegExp(field, "i")).first(),
        ).toBeVisible({ timeout: 20_000 });
    }

    async cancelCreateCaseDialog(): Promise<void> {
        const closeBtn = this.createCaseDialog
            .getByRole("button", { name: /Cancel|Close Dialog/i })
            .first();
        await closeBtn.click();
        await expect(this.createCaseDialog).not.toBeVisible({ timeout: 10_000 });
    }

    // ── create dialog — fill & submit (TEN_CAS_CREATE_FLOW) ─────────────────

    /**
     * Selects the given entity in the create dialog (e.g. "Converge").
     * The Entity ComboBox is a SINGLE-select: clicking the trigger input opens the
     * popover with the options listed DIRECTLY (no separate "search..." input —
     * verified via diagnostic run).
     * NOTE: attribute-based locator — the trigger input LOSES its placeholder-
     * derived accessible name once a value is auto-selected (first option), so
     * getByRole(name) stops matching. The placeholder attribute is stable.
     */
    async selectCaseEntity(entity: string): Promise<void> {
        const dialog = this.createCaseDialog;
        const entityInput = dialog.locator('input[placeholder="Search Main Entity..."]').first();
        await entityInput.waitFor({ state: "visible", timeout: 20_000 });
        await entityInput.click();
        const option = this.page.getByRole("option", { name: new RegExp(entity, "i") }).first();
        try {
            // Options render async — auto-wait instead of an instant visibility check.
            await expect(option).toBeVisible({ timeout: 10_000 });
        } catch {
            // Option not in the unfiltered list — type into the trigger input to filter.
            await entityInput.fill(entity);
            await expect(option).toBeVisible({ timeout: 20_000 });
        }
        try {
            await option.click({ timeout: 5_000 });
        } catch {
            // Invisible Radix overlay can intercept — force the click.
            await option.click({ force: true, timeout: 5_000 });
        }
        await expect(async () => {
            const visibleText = ((await entityInput.inputValue()).trim() ?? "").toLowerCase();
            expect(visibleText).toContain(entity.toLowerCase());
        }).toPass({ timeout: 15_000 });
    }

    /** Selects the given case template (e.g. "Trouble Case"). */
    async selectCaseTemplate(template: string): Promise<void> {
        await this.caseTemplateDropdown.click();
        const menu = this.caseTemplateMenu;
        await menu.waitFor({ state: "visible", timeout: 20_000 });
        const option = menu.getByRole("menuitem", { name: new RegExp(template, "i") });
        await option.waitFor({ state: "visible", timeout: 20_000 });
        await option.click();
        await menu.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
    }

    async fillRequiredCaseFieldsWithFirstAvailableValues(): Promise<void> {
        // Fill the Customer Account first — the duplicate check + create payload use
        // account_number, so without it the case either won't match duplicates or is
        // rejected (422 not-a-member / missing account). Grab an account number from
        // the case list (still in the DOM behind the dialog) and select it.
        await this.fillCustomerAccountFromList();
        await this.fillRemainingCaseFields();
    }

    /**
     * Same as {@link fillRequiredCaseFieldsWithFirstAvailableValues} but captures the
     * customer account from a NON-E2E case row first. The create-success scenario needs
     * an account that has no leftover E2E-created case, otherwise the real duplicate
     * check reports the previous run's case and shows the duplicate dialog instead.
     */
    async fillRequiredCaseFieldsWithCleanCustomerAccount(): Promise<void> {
        const account = await this.getFirstCustomerAccount(true);
        await this.fillCustomerAccount(account);
        await this.fillRemainingCaseFields();
    }

    /** Fills every dropdown + subject after the customer account is already set. */
    private async fillRemainingCaseFields(): Promise<void> {
        // Case Category (first available option) → enables Case Type → Sub-type.
        const categoryBtn = this.formFieldDropdown("Case Category");
        await categoryBtn.waitFor({ state: "visible", timeout: 20_000 });
        await categoryBtn.click();
        await this.clickFirstMenuOption("case_category_id", categoryBtn);

        const typeBtn = this.formFieldDropdown("Case Type");
        await expect(typeBtn).toBeEnabled({ timeout: 20_000 });
        await typeBtn.click();
        await this.clickFirstMenuOption("case_type_id", typeBtn);

        const subtypeBtn = this.formFieldDropdown("Case Sub-type");
        await expect(subtypeBtn).toBeEnabled({ timeout: 20_000 });
        await subtypeBtn.click();
        await this.clickFirstMenuOption("case_sub_type_id", subtypeBtn);

        const priorityBtn = this.formFieldDropdown("Case Priority");
        await priorityBtn.click();
        await this.clickFirstMenuOption("case_priority_id", priorityBtn);

        const severityBtn = this.formFieldDropdown("Case Severity");
        await severityBtn.click();
        await this.clickFirstMenuOption("case_severity_id", severityBtn);

        // Required subject text — dynamic value to avoid collisions.
        const subject = `E2E-CAS-${Date.now()}`;
        await this.caseSubjectInput.fill(subject);

        // Template-driven dynamic fields (e.g. "Case Source") may add MORE required
        // dropdowns — fill any remaining required dropdown that still shows a placeholder.
        await this.fillRemainingRequiredDropdowns();
        await this.closeAnyOpenMenu();
    }

    /**
     * Reads an account number (Customer No column) from the case list.
     * Mirrors the work-orders pattern: find the column index from the header (instead of
     * hardcoding), then read the first data row that has a real account number.
     * Prefers rows whose Status cell reads "Solved" — solved cases reliably carry a
     * Customer No (matches the work-orders "use an account from a completed item" idea).
     *
     * @param preferClean when true, skips accounts whose rows carry an "E2E-…" subject —
     *   those belong to cases created by previous test runs and would trip the duplicate
     *   check on the next create (the create-success scenario needs a pristine account).
     */
    private async getFirstCustomerAccount(preferClean = false): Promise<string> {
        await this.table.expectVisible();
        await expect(async () => {
            const rowCount = await this.table.rows.count();
            expect(rowCount).toBeGreaterThan(0);
        }).toPass({ timeout: 20_000 });

        // Locate the "Customer No" column by header text.
        const headers = this.page.locator('thead tr th, thead tr [role="columnheader"]');
        const headerCount = await headers.count();
        let colIdx = -1;
        for (let i = 0; i < headerCount; i++) {
            const text = ((await headers.nth(i).textContent()) ?? "").trim();
            if (/customer\s*no/i.test(text)) {
                colIdx = i;
                break;
            }
        }
        if (colIdx === -1) {
            throw new Error("Customer No column not found in the case list.");
        }

        // Locate the "Status" column (to prefer Solved rows) — optional.
        let statusIdx = -1;
        for (let i = 0; i < headerCount; i++) {
            const text = ((await headers.nth(i).textContent()) ?? "").trim();
            if (/^status$/i.test(text)) {
                statusIdx = i;
                break;
            }
        }
        // Locate the "Subject" column (to skip E2E-created rows when preferClean).
        let subjectIdx = -1;
        if (preferClean) {
            for (let i = 0; i < headerCount; i++) {
                const text = ((await headers.nth(i).textContent()) ?? "").trim();
                if (/^subject$/i.test(text)) {
                    subjectIdx = i;
                    break;
                }
            }
        }

        const rowCount = await this.table.rows.count();
        const readAccount = async (i: number): Promise<string | null> => {
            const cell = this.table.rows.nth(i).locator("td, [role='cell']").nth(colIdx);
            const value = ((await cell.textContent()) ?? "").trim();
            // Account numbers are long digit strings (e.g. 1575702015593) — skip "—"/"-" placeholders.
            return value && value !== "-" && value !== "—" && /\d{5,}/.test(value) ? value : null;
        };
        const rowStatus = async (i: number): Promise<string> =>
            statusIdx === -1
                ? ""
                : ((await this.table.rows.nth(i).locator("td, [role='cell']").nth(statusIdx).textContent()) ?? "").trim();
        const rowSubject = async (i: number): Promise<string> =>
            subjectIdx === -1
                ? ""
                : ((await this.table.rows.nth(i).locator("td, [role='cell']").nth(subjectIdx).textContent()) ?? "").trim();

        // preferClean: build the set of accounts that carry an E2E-created case, then
        // never pick those (the duplicate check would flag the leftover case).
        const pollutedAccounts = new Set<string>();
        if (preferClean && subjectIdx !== -1) {
            for (let i = 0; i < Math.min(rowCount, 50); i++) {
                if (/^E2E-/i.test(await rowSubject(i))) {
                    const account = await readAccount(i);
                    if (account) pollutedAccounts.add(account);
                }
            }
        }
        const isClean = async (i: number): Promise<boolean> => {
            if (!preferClean) return true;
            const account = await readAccount(i);
            return account !== null && !pollutedAccounts.has(account);
        };
        // First pass: solved/closed rows that are clean.
        for (let i = 0; i < Math.min(rowCount, 50); i++) {
            if (statusIdx !== -1 && !/solved|closed/i.test(await rowStatus(i))) {
                continue;
            }
            if (!(await isClean(i))) {
                continue;
            }
            const account = await readAccount(i);
            if (account) {
                return account;
            }
        }
        // Second pass: any clean row (any status).
        for (let i = 0; i < Math.min(rowCount, 50); i++) {
            if (!(await isClean(i))) {
                continue;
            }
            const account = await readAccount(i);
            if (account) {
                return account;
            }
        }
        // Third pass: any row with a real account number (preferClean may find nothing).
        for (let i = 0; i < Math.min(rowCount, 50); i++) {
            const account = await readAccount(i);
            if (account) {
                return account;
            }
        }
        throw new Error("No customer account number found in the first case list rows.");
    }

    /** Fills the Customer Account search and selects the first matching result. */
    private async fillCustomerAccount(accountNumber: string): Promise<void> {
        // The customer search is a ComboBox with a debounced (500ms) account query —
        // locate by its stable placeholder (grounded in case-create-dropdown-customer-detail.tsx
        // → CustomerDetailSearchSection → ComboBox placeholder="Search Customer Account No/Email").
        // Scope to the page (not the dialog) — the input is unique and survives re-renders.
        const search = this.page.getByPlaceholder("Search Customer Account No/Email").first();
        await search.waitFor({ state: "visible", timeout: 30_000 });
        await search.click();
        await search.pressSequentially(accountNumber, { delay: 30 });
        // Verify the keystrokes actually landed in the input (ComboBox may swallow them).
        await expect(async () => {
            expect(await search.inputValue()).toContain(accountNumber.slice(0, 6));
        }).toPass({ timeout: 10_000 });

        // Options are custom Cards (AccountNumberOptionCustom) wrapped in role="option"
        // items rendered in the ComboBox popover (a separate dialog) — wait for the
        // option containing the typed account number, then click it.
        const option = this.page
            .getByRole("option")
            .filter({ hasText: accountNumber })
            .first();
        await expect(option).toBeVisible({ timeout: 45_000 });
        await option.click({ force: true });
        // Let the selected customer detail panel render.
        await this.page.waitForTimeout(2_000);
    }

    /** Fills the Customer Account from a case-list account number (Customer No column). */
    private async fillCustomerAccountFromList(): Promise<void> {
        const account = this.lastCustomerAccount ?? (await this.getFirstCustomerAccount());
        await this.fillCustomerAccount(account);
    }

    /** Fills any remaining required dropdown fields left as "Select an option..." */
    private async fillRemainingRequiredDropdowns(): Promise<void> {
        // The template-driven dynamic fields (e.g. Case Source) render AFTER the base
        // fields are set — wait for them to appear before attempting to fill.
        // NOTE: match by text content — the button's accessible name is the field label
        // (e.g. "Case Source"), while the placeholder text is "Select an option...".
        const unselectedButtons = () =>
            this.createCaseDialog.locator('button:has-text("Select an option...")');
        const scrollBodyToBottom = async () => {
            await this.createCaseDialog
                .locator('[class*="overflow"], [data-slot*="scroll"]')
                .first()
                .evaluate((el) => {
                    el.scrollTop = el.scrollHeight;
                })
                .catch(() => {});
            await this.page.waitForTimeout(300);
        };

        // Wait for at least one unselected required dropdown to render.
        await expect
            .poll(
                async () => {
                    await scrollBodyToBottom();
                    return await unselectedButtons().count();
                },
                { timeout: 90_000, intervals: [1_000, 2_000, 5_000] },
            )
            .toBeGreaterThan(0);

        // Keep filling until every "Select an option..." is resolved (some dynamic
        // fields sit below the fold and only appear as you scroll/fill).
        for (let pass = 0; pass < 8; pass++) {
            await scrollBodyToBottom();
            const buttons = unselectedButtons();
            const count = await buttons.count().catch(() => 0);
            if (count === 0) {
                return;
            }
            const trigger = buttons.first();
            await trigger.waitFor({ state: "visible", timeout: 20_000 });
            await trigger.scrollIntoViewIfNeeded();
            await trigger.click();
            // Wait for the menu that just opened — a visible open menu (a stale hidden
            // menu from a previous selection can linger with data-state="open").
            const openMenu = this.page
                .locator('[role="menu"][data-state="open"]:visible')
                .last();
            await openMenu.waitFor({ state: "visible", timeout: 20_000 });
            // The menu may need a moment to load its remote options — retry a few times.
            const option = openMenu.locator('[role="menuitem"]:not([data-disabled])').first();
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await option.waitFor({ state: "visible", timeout: 10_000 });
                    await option.click({ timeout: 10_000 });
                    break;
                } catch {
                    // Invisible overlay intercepts the click — force it, then verify.
                    try {
                        await option.click({ force: true, timeout: 10_000 });
                        await this.page.waitForTimeout(500);
                        const stillOpen = await this.page
                            .locator('[role="menu"][data-state="open"]:visible')
                            .count();
                        if (stillOpen === 0) {
                            break;
                        }
                    } catch {
                        // fall through to Escape + reopen
                    }
                    await this.page.keyboard.press("Escape");
                    await this.page.waitForTimeout(500);
                    await trigger.click();
                    await openMenu.waitFor({ state: "visible", timeout: 10_000 });
                }
            }
            // Confirm the pick registered before moving on (retry the whole loop if not).
            await expect(async () => {
                const remainingCount = await this.createCaseDialog
                    .locator('button:has-text("Select an option...")')
                    .count();
                expect(remainingCount).toBeLessThan(count);
            }).toPass({ timeout: 15_000 });
            // Ensure no dropdown menu is left open overlaying the footer.
            await this.closeAnyOpenMenu();
        }
    }

    /** Closes any still-open Radix dropdown menu (Escape closes the menu, not the dialog). */
    private async closeAnyOpenMenu(): Promise<void> {
        const openMenu = this.page.locator('[role="menu"][data-state="open"]:visible');
        if (await openMenu.count().catch(() => 0) > 0) {
            await this.page.keyboard.press("Escape");
            await this.page.waitForTimeout(400);
        }
        // Radix can leave aria-expanded stuck on the trigger even after the menu DOM is gone,
        // which keeps an invisible focus trap active. Click the dialog header to fully dismiss.
        const header = this.createCaseDialog.getByRole("heading").first();
        if (await header.isVisible().catch(() => false)) {
            await header.click({ position: { x: 5, y: 5 } }).catch(() => {});
            await this.page.waitForTimeout(300);
        }
    }

    /**
     * Clicks the first selectable menuitem in the menu labeled "<fieldName> options".
     * Uses a DOM attribute locator (aria-label) — getByRole("menu") can miss the
     * portaled menu in some runs. If the menu is not open yet, re-clicks the trigger.
     */
    private async clickFirstMenuOption(fieldName: string, trigger?: Locator): Promise<void> {
        const menu = this.page
            .locator(`[role="menu"][aria-label="${fieldName} options"][data-state="open"]:visible`)
            .last();
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await menu.waitFor({ state: "visible", timeout: 8_000 });
            } catch {
                // Menu not open — the trigger click may have been swallowed. Re-click it.
                if (trigger) {
                    await trigger.click().catch(() => {});
                    await this.page.waitForTimeout(500);
                }
                await menu.waitFor({ state: "visible", timeout: 15_000 });
            }
            const option = menu.locator('[role="menuitem"]:not([data-disabled])').first();
            await option.waitFor({ state: "visible", timeout: 15_000 });
            try {
                await option.click({ timeout: 10_000 });
            } catch {
                // Element is visible/stable but an invisible overlay intercepts the click
                // (common with Radix portaled menus). Force the click to dispatch anyway.
                await option.click({ force: true, timeout: 10_000 });
            }
            try {
                // Menu should close after selection — confirms the pick registered.
                await menu.waitFor({ state: "hidden", timeout: 12_000 });
                return;
            } catch {
                // Selection didn't register — the menu is still open. Close it and retry.
                await this.page.keyboard.press("Escape");
                await this.page.waitForTimeout(500);
            }
        }
        throw new Error(`Failed to select an option from the "${fieldName}" dropdown after 3 attempts.`);
    }

    async expectCreateCaseButtonDisabled(): Promise<void> {
        await expect(this.createCaseButton).toBeDisabled({ timeout: 20_000 });
    }

    async expectCreateCaseButtonEnabled(): Promise<void> {
        await expect(this.createCaseButton).toBeEnabled({ timeout: 20_000 });
    }

    async submitCreateCase(): Promise<void> {
        // Release any Radix focus trap left by a dropdown before clicking the footer button.
        await this.closeAnyOpenMenu();
        await expect(this.createCaseButton).toBeEnabled({ timeout: 10_000 });
        await this.createCaseButton.scrollIntoViewIfNeeded();
        await this.createCaseButton.click();
    }

    async expectCreateCaseSuccessToast(): Promise<void> {
        await expect(this.successToast(/case created successfully/i)).toBeVisible({ timeout: 30_000 });
    }

    /** The app opens a new case tab + URL ?case-number=… after creation (case-created event). */
    async expectNewCaseTabOpened(): Promise<void> {
        await expect(async () => {
            const url = this.page.url();
            expect(url).toContain("case-number=");
        }).toPass({ timeout: 20_000 });
    }

    async expectDuplicateCaseDialogVisible(): Promise<void> {
        await expect(this.duplicateCaseDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectDuplicateCaseAlert(): Promise<void> {
        await expect(this.duplicateCaseDialog.getByText(/Duplicate Case Detected/i).first()).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectDuplicateCaseActions(actions: [string, string]): Promise<void> {
        for (const action of actions) {
            await expect(
                this.duplicateCaseDialog.getByRole("button", { name: new RegExp(action, "i") }).first(),
            ).toBeVisible({ timeout: 20_000 });
        }
    }

    // ── assign flow (TEN_CAS_ASSIGN_FLOW) ────────────────────────────────────
    /** Assign/Reassign dialog (CaseAssignDialog) — header mentions the case number. */
    private get assignDialog(): Locator {
        return this.page
            .getByRole("dialog")
            .filter({ hasText: /Assign Agent to Case|Reassign Agent to Case/ });
    }

    /**
     * Opens the row kebab menu for the given row. The cases kebab button is
     * icon-only (no accessible name), unlike users/work-orders "Open menu" —
     * target the last cell's icon button instead.
     */
    private async openRowKebab(rowIndex: number): Promise<void> {
        const openMenu = this.page.locator('[data-slot="dropdown-menu-content"][role="menu"][data-state="open"]');
        await expect(async () => {
            if (await openMenu.isVisible().catch(() => false)) {
                return;
            }
            await this.page.keyboard.press("Escape");
            const btn = this.table.rows
                .nth(rowIndex)
                .locator("td")
                .last()
                .locator("button:has(i), button:has(svg)")
                .first();
            await expect(btn).toBeVisible({ timeout: 5_000 });
            await btn.click({ timeout: 5_000 });
            await expect(openMenu).toBeVisible({ timeout: 3_000 });
        }).toPass({ timeout: 35_000, intervals: [400, 800, 1_500, 2_500, 4_000] });
    }

    /** "Available Agents" heading inside the assign dialog. */
    private get availableAgentsTitle(): Locator {
        return this.assignDialog.getByText("Available Agents", { exact: true }).first();
    }

    private get assignNextButton(): Locator {
        return this.assignDialog.getByRole("button", { name: /^Next$/ }).first();
    }

    private get assignCancelButton(): Locator {
        return this.assignDialog.getByRole("button", { name: /^Cancel$/ }).first();
    }

    /** Confirmation dialog ("Assign Confirmation" / "Reassign Confirmation"). */
    private get assignConfirmationDialog(): Locator {
        return this.page
            .getByRole("dialog")
            .filter({ hasText: /Assign Confirmation|Reassign Confirmation/ });
    }

    private get assignConfirmButton(): Locator {
        return this.assignConfirmationDialog.getByRole("button", { name: "Confirm & Assign" }).first();
    }

    /** Bulk Assign dialog (list mass action). */
    private get bulkAssignDialog(): Locator {
        return this.page.getByRole("dialog").filter({ hasText: /Bulk Assign/ });
    }

    private get bulkTargetAgentComboBox(): Locator {
        return this.bulkAssignDialog.getByRole("textbox", { name: /Search or select an item/i }).first();
    }

    private get bulkAssignSubmitButton(): Locator {
        return this.bulkAssignDialog.getByRole("button", { name: /^Bulk Assign$/ }).first();
    }

    /**
     * Opens the Assign (no owner) or Transfer (has owner) dialog by scanning row
     * kebab menus for the matching item. Returns false when no suitable case exists
     * (caller skips). Real-backend friendly — does not mutate anything.
     */
    async openAssignCaseDialog(mode: "assign" | "transfer"): Promise<boolean> {
        const itemName = mode === "assign" ? "Assign Case" : "Transfer Case";

        // The pipeline switch (or page load) refetches the list asynchronously — rows
        // can be momentarily absent right after a tab is selected, which would report
        // "no assignable case" and skip. Wait for rows to render before scanning; if
        // the pipeline genuinely has no rows, keep the data-safe skip behavior.
        try {
            await this.table.expectHasRows();
        } catch {
            return false;
        }

        const rowCount = await this.table.rows.count();
        for (let i = 0; i < rowCount; i++) {
            // Grid auto-refresh can close the menu mid-click — retry open+click a few
            // times, but bail out of this row quickly when its menu lacks the item.
            for (let attempt = 0; attempt < 3; attempt++) {
                await this.page.keyboard.press("Escape").catch(() => {});
                await this.openRowKebab(i);
                const item = this.page.getByRole("menuitem", { name: itemName }).first();
                if (!(await item.isVisible().catch(() => false))) {
                    break;
                }
                await item.click({ timeout: 3_000 }).catch(() => {});
                if (await this.assignDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
                    return true;
                }
            }
        }
        return false;
    }

    async expectAssignDialogVisible(): Promise<void> {
        await expect(this.assignDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectAssignDialogNotVisible(): Promise<void> {
        await expect(this.assignDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectAssignDialogHeader(): Promise<void> {
        // Header contains "Assign Agent to Case #<n>" (or Reassign ... From <owner>).
        await expect(this.assignDialog.locator("h2").first()).toContainText(/Agent to Case #/i, {
            timeout: 20_000,
        });
    }

    async expectAvailableAgentsList(): Promise<void> {
        await expect(this.availableAgentsTitle).toBeVisible({ timeout: 20_000 });
    }

    async expectAssignDialogActions(): Promise<void> {
        await expect(this.assignCancelButton).toBeVisible({ timeout: 20_000 });
        await expect(this.assignNextButton).toBeVisible({ timeout: 20_000 });
    }

    async expectAssignNextDisabled(): Promise<void> {
        await expect(this.assignNextButton).toBeDisabled({ timeout: 20_000 });
    }

    async expectAssignNextEnabled(): Promise<void> {
        await expect(this.assignNextButton).toBeEnabled({ timeout: 20_000 });
    }

    async selectFirstAvailableAgent(): Promise<boolean> {
        // The agent cell renders a checkbox + a [data-testid="user-cell"] div as
        // siblings inside the same <td>. The presence dot is green (bg-success-500)
        // only when the agent's presence_status is "Available" — the backend rejects
        // assignment to any other status with a 409, so a qualifying row needs BOTH an
        // enabled checkbox and a green dot. Disabled rows (Full/current-owner) are
        // skipped by checking the checkbox's enabled state.
        const candidates = this.assignDialog
            .locator("td")
            .filter({ has: this.page.locator('[data-testid="user-cell"]') })
            .filter({ has: this.page.locator('[role="checkbox"]') })
            .filter({ has: this.page.locator("span.bg-success-500") });

        const count = await candidates.count().catch(() => 0);
        for (let i = 0; i < count; i++) {
            const cell = candidates.nth(i);
            if (!(await cell.isVisible().catch(() => false))) {
                continue;
            }
            const checkbox = cell.locator('[role="checkbox"]').first();
            if (!(await checkbox.isVisible().catch(() => false))) {
                continue;
            }
            // Skip disabled checkboxes (aria-disabled, data-disabled, or native disabled)
            const ariaDisabled = await checkbox.getAttribute("aria-disabled").catch(() => null);
            const dataDisabled = await checkbox.getAttribute("data-disabled").catch(() => null);
            const nativeDisabled = await checkbox.isDisabled().catch(() => false);
            if (ariaDisabled === "true" || dataDisabled !== null || nativeDisabled) {
                continue;
            }
            // Also check the parent row — some implementations disable via parent
            const isEnabled = await checkbox.isEnabled().catch(() => false);
            if (!isEnabled) {
                continue;
            }
            await checkbox.click();
            return true;
        }
        return false;
    }

    async clickAssignNext(): Promise<void> {
        await expect(this.assignNextButton).toBeEnabled({ timeout: 20_000 });
        await this.assignNextButton.click();
        await this.assignConfirmationDialog.waitFor({ state: "visible", timeout: 20_000 });
    }

    async cancelAssignDialog(): Promise<void> {
        await this.assignCancelButton.click();
        await this.assignDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    async expectAssignConfirmationVisible(): Promise<void> {
        await expect(this.assignConfirmationDialog).toBeVisible({ timeout: 20_000 });
    }

    async clickAssignConfirm(): Promise<void> {
        // Release any Radix focus trap left by a dropdown before clicking the footer button.
        await this.closeAnyOpenMenu();
        await expect(this.assignConfirmButton).toBeEnabled({ timeout: 10_000 });
        await this.assignConfirmButton.scrollIntoViewIfNeeded();
        await this.assignConfirmButton.click();
        // Mutation completes when the confirmation dialog closes (onSuccess closes it).
        // The backend may reject with "Agent status is not Available" (409) — the dialog
        // stays open and a failure toast appears instead; the caller decides whether to skip.
        await this.page
            .waitForTimeout(2_000)
            .catch(() => {});
    }

    /** True when the assign failure toast is currently visible. */
    async isAssignFailureToastVisible(): Promise<boolean> {
        return this.page
            .locator('[data-sonner-toast][data-type="error"]')
            .filter({ hasText: /Failed to assign case/i })
            .isVisible({ timeout: 2_000 })
            .catch(() => false);
    }

    async expectAssignDialogClosedAfterConfirm(): Promise<void> {
        await expect
            .poll(async () => {
                const dialogOpen = await this.assignConfirmationDialog.isVisible().catch(() => false);
                return !dialogOpen;
            }, { timeout: 30_000, intervals: [1_000, 2_000, 3_000] })
            .toBe(true);
    }

    async expectAssignSuccessModal(): Promise<void> {
        // ResponseModal: "Case <n> has been assigned to <agent>"
        await this.responseModal.expectVisible(/has been assigned to/i);
    }

    async expectReassignSuccessModal(): Promise<void> {
        await this.responseModal.expectVisible(/has been reassigned to/i);
    }

    async expectAssignFailureToast(): Promise<void> {
        await expect(
            this.page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: /Failed to assign case/i }).first(),
        ).toBeVisible({ timeout: 30_000 });
    }

    // ── bulk assign ──────────────────────────────────────────────────────────

    /** Selects (checks) the first data row's checkbox. */
    async selectFirstRow(): Promise<void> {
        await this.table.expectHasRows();
        const selectedText = this.page.getByText(/1 row selected|2 rows selected/i).first();
        await expect(async () => {
            const firstRowCheckbox = this.table.rows
                .first()
                .locator("td")
                .first()
                .locator('[role="checkbox"]')
                .first();
            if (await firstRowCheckbox.isVisible().catch(() => false)) {
                await firstRowCheckbox.click({ timeout: 5_000 }).catch(() => {});
            }
            await expect(selectedText).toBeVisible({ timeout: 5_000 });
        }).toPass({ timeout: 35_000, intervals: [800, 1_500, 3_000] });
    }

    /** Selects the first data row, then opens the "Bulk Assign" mass-action dialog. */
    async openBulkAssignDialog(): Promise<void> {
        await this.selectFirstRow();
        const assignCasesBtn = this.page.getByRole("button", { name: "Assign Cases" }).first();
        await expect(assignCasesBtn).toBeVisible({ timeout: 20_000 });
        await assignCasesBtn.click();
        await this.bulkAssignDialog.waitFor({ state: "visible", timeout: 20_000 });
    }

    async expectBulkAssignDialogVisible(): Promise<void> {
        await expect(this.bulkAssignDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectBulkAssignSelectedCaseIds(): Promise<void> {
        await expect(this.bulkAssignDialog.getByText("Selected Case IDs", { exact: true })).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectBulkAssignTargetAgentField(): Promise<void> {
        await expect(this.bulkTargetAgentComboBox).toBeVisible({ timeout: 20_000 });
    }

    async expectBulkAssignSubmitDisabled(): Promise<void> {
        await expect(this.bulkAssignSubmitButton).toBeDisabled({ timeout: 20_000 });
    }

    async selectBulkTargetAgent(): Promise<void> {
        await this.bulkTargetAgentComboBox.click();
        // ComboBox opens a dropdown — pick the first option. Options render with
        // role=option (sidebar uses role=menuitem, so it is excluded automatically).
        const option = this.page.getByRole("option").filter({ visible: true }).first();
        await option.waitFor({ state: "visible", timeout: 20_000 });
        await option.click();
    }

    async submitBulkAssign(): Promise<void> {
        await expect(this.bulkAssignSubmitButton).toBeEnabled({ timeout: 20_000 });
        await this.bulkAssignSubmitButton.click();
        // The bulk-assign flow first validates via postValidateAssignee.
        // If the chosen agent's team is not eligible for the selected case(s),
        // the dialog shows a warning "Agent's team (Billing) is not eligible..."
        // with an "Exclude Invalid Cases" tag. Clicking it filters out the
        // invalid cases and the second Bulk Assign click succeeds.
        const excludeTag = this.bulkAssignDialog.getByText("Exclude Invalid Cases").first();
        try {
            await expect(excludeTag).toBeVisible({ timeout: 5_000 });
            await excludeTag.click();
            // After excluding, the dialog re-enables Bulk Assign if valid cases remain
            await expect(this.bulkAssignSubmitButton).toBeEnabled({ timeout: 20_000 });
            await this.bulkAssignSubmitButton.click();
        } catch {
            // No validation warning — proceed to success modal
        }
    }

    async expectBulkAssignSuccessModal(): Promise<void> {
        await this.responseModal.expectVisible(/Cases assigned successfully/i);
    }

    // ── unassign flow (TEN_CAS_UNASSIGN_FLOW) ────────────────────────────────

    /**
     * Opens the row kebab menu of the first case whose menu contains the given
     * action (e.g. "Unassign Case"). Returns false when no row offers it.
     *
     * NOTE: the UI sometimes renders "Start Case" for rows whose status is already
     * In Progress (a backend 409 on start-working). To keep the test honest, rows
     * whose status column is In Progress/Solved/Cancelled are skipped entirely.
     *
     * For "Resolve Case", only In Progress / Escalated rows qualify
     * (`isCaseHasStarted`) — other statuses are skipped to save scan time.
     */
    async openRowActionsMenuFor(action: string, enabledOnly = false): Promise<boolean> {
        // Same async-refetch caveat as openAssignCaseDialog — wait for rows to load
        // before scanning, or a momentarily empty list skips the scan entirely. If the
        // pipeline genuinely has no rows, keep the data-safe skip behavior.
        try {
            await this.table.expectHasRows();
        } catch {
            return false;
        }
        const rowCount = await this.table.rows.count();
        const statusIdx = await this.findColumnIndex(/^status$/i);
        for (let i = 0; i < rowCount; i++) {
            // Skip rows that cannot meaningfully perform the action (UI menu bug).
            if (statusIdx !== -1 && action === "Start Case") {
                const status = ((await this.table.rows
                    .nth(i)
                    .locator("td, [role='cell']")
                    .nth(statusIdx)
                    .textContent()
                    .catch(() => "")) ?? "").trim();
                if (/^(In Progress|Solved|Cancelled|Cancel)$/i.test(status)) {
                    continue;
                }
            }
            // Resolve requires isCaseHasStarted (status IN_PROGRESS or ESCALATED).
            // Pending to customer reply / Edit CTS require isInProgress (same statuses).
            // Skip rows whose status is anything else — the kebab won't offer these
            // actions for them anyway, so we save the scan time.
            if (
                statusIdx !== -1
                && (action === "Resolve Case" || action === "Pending to customer reply" || action === "Edit CTS")
            ) {
                const status = ((await this.table.rows
                    .nth(i)
                    .locator("td, [role='cell']")
                    .nth(statusIdx)
                    .textContent()
                    .catch(() => "")) ?? "").trim();
                if (!/^(In Progress|Escalated)$/i.test(status)) {
                    continue;
                }
            }
            await this.openRowKebab(i);
            const item = this.page.getByRole("menuitem", { name: action }).first();
            if (await item.isVisible().catch(() => false)) {
                if (enabledOnly && (await item.isDisabled().catch(() => false))) {
                    await this.page.keyboard.press("Escape");
                    continue;
                }
                return true;
            }
            await this.page.keyboard.press("Escape");
        }
        return false;
    }

    /** Finds the 0-based index of the table column whose header matches the regex. */
    private async findColumnIndex(pattern: RegExp): Promise<number> {
        const headers = this.table.headers;
        const count = await headers.count().catch(() => 0);
        for (let i = 0; i < count; i++) {
            const text = ((await headers.nth(i).textContent()) ?? "").trim();
            if (pattern.test(text)) return i;
        }
        return -1;
    }
    async expectRowActionsMenuShows(action: string): Promise<void> {
        await expect(this.page.getByRole("menuitem", { name: action }).first()).toBeVisible({
            timeout: 10_000,
        });
    }

    async clickRowMenuItem(action: string): Promise<void> {
        const item = this.page.getByRole("menuitem", { name: action }).first();
        await expect(item).toBeVisible({ timeout: 10_000 });
        await item.click();
    }

    /** ConfirmModal "Unassign Case" (title matches; confirm label "Unassign"). */
    private get unassignConfirmDialog(): Locator {
        return this.page.getByRole("dialog", { name: /Unassign Case/i });
    }

    async expectUnassignConfirmDialogVisible(): Promise<void> {
        await expect(this.unassignConfirmDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectUnassignConfirmDialogNotVisible(): Promise<void> {
        await expect(this.unassignConfirmDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectUnassignConfirmShowsCaseAndOwner(): Promise<void> {
        await expect(this.unassignConfirmDialog.getByText(/Are you sure you want to unassign Case/i)).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectUnassignConfirmShowsNote(note: string): Promise<void> {
        // The note may render with quotes around the queue name, e.g. "the 'Unassigned' queue".
        const escaped = note.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const flexible = escaped.replace(/ /g, "[ ']*");
        await expect(this.unassignConfirmDialog.getByText(new RegExp(flexible, "i"))).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectUnassignConfirmActions(): Promise<void> {
        await expect(this.unassignConfirmDialog.getByRole("button", { name: /^Cancel$/ })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.unassignConfirmDialog.getByRole("button", { name: /^Unassign$/ })).toBeVisible({
            timeout: 20_000,
        });
    }

    async cancelUnassignConfirm(): Promise<void> {
        await this.unassignConfirmDialog.getByRole("button", { name: /^Cancel$/ }).click();
        await this.unassignConfirmDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    async confirmUnassign(): Promise<void> {
        const btn = this.unassignConfirmDialog.getByRole("button", { name: /^Unassign$/ });
        await expect(btn).toBeEnabled({ timeout: 10_000 });
        await btn.click();
    }

    async expectUnassignSuccessModal(): Promise<void> {
        await this.responseModal.expectVisible(/has been set to Unassigned/i);
    }

    async expectUnassignFailureToast(): Promise<void> {
        await expect(
            this.page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: /Failed to unassign case/i }).first(),
        ).toBeVisible({ timeout: 30_000 });
    }

    // ── assign-to-me flow (TEN_CAS_ASSIGN_TO_ME_FLOW) ─────────────────────────

    /** ConfirmModal "Assign Case to Yourself" (title matches; confirm label "Confirm"). */
    private get assignToMeConfirmDialog(): Locator {
        return this.page.getByRole("dialog", { name: /Assign Case to Yourself/i });
    }

    async expectAssignToMeConfirmDialogVisible(): Promise<void> {
        await expect(this.assignToMeConfirmDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectAssignToMeConfirmDialogNotVisible(): Promise<void> {
        await expect(this.assignToMeConfirmDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectAssignToMeConfirmShowsTitleAndDescription(): Promise<void> {
        await expect(this.assignToMeConfirmDialog.getByRole("heading", { name: /Assign Case to Yourself/i })).toBeVisible({
            timeout: 20_000,
        });
        await expect(
            this.assignToMeConfirmDialog.getByText(/Are you sure you want to assign this case to yourself/i),
        ).toBeVisible({ timeout: 20_000 });
    }

    async expectAssignToMeConfirmActions(): Promise<void> {
        await expect(this.assignToMeConfirmDialog.getByRole("button", { name: /^Cancel$/ })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.assignToMeConfirmDialog.getByRole("button", { name: /^Confirm$/ })).toBeVisible({
            timeout: 20_000,
        });
    }

    async cancelAssignToMeConfirm(): Promise<void> {
        await this.assignToMeConfirmDialog.getByRole("button", { name: /^Cancel$/ }).click();
        await this.assignToMeConfirmDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    async confirmAssignToMe(): Promise<void> {
        const btn = this.assignToMeConfirmDialog.getByRole("button", { name: /^Confirm$/ });
        await expect(btn).toBeEnabled({ timeout: 10_000 });
        await btn.click();
    }

    async expectAssignToMeSuccessModal(): Promise<void> {
        await this.responseModal.expectVisible(/has been assigned to you/i);
    }

    async expectAssignToMeErrorModal(): Promise<void> {
        await this.responseModal.expectVisible(/Failed to Assign Case to Yourself/i);
    }

    // ── pending-reply flow (TEN_CAS_PENDING_REPLY_FLOW) ───────────────────────

    /** ConfirmModal "Pending Case" (title matches; confirm label "Yes"). */
    private get pendingCaseConfirmDialog(): Locator {
        return this.page.getByRole("dialog", { name: /Pending Case/i });
    }

    async expectPendingCaseConfirmDialogVisible(): Promise<void> {
        await expect(this.pendingCaseConfirmDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectPendingCaseConfirmDialogNotVisible(): Promise<void> {
        await expect(this.pendingCaseConfirmDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectPendingCaseConfirmShowsTitleAndDescription(): Promise<void> {
        await expect(this.pendingCaseConfirmDialog.getByRole("heading", { name: /Pending Case/i })).toBeVisible({
            timeout: 20_000,
        });
        await expect(
            this.pendingCaseConfirmDialog.getByText(/Are you sure you want to set this case to pending/i),
        ).toBeVisible({ timeout: 20_000 });
    }

    async expectPendingCaseConfirmActions(): Promise<void> {
        await expect(this.pendingCaseConfirmDialog.getByRole("button", { name: /^Cancel$/ })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.pendingCaseConfirmDialog.getByRole("button", { name: /^Yes$/ })).toBeVisible({
            timeout: 20_000,
        });
    }

    async cancelPendingCaseConfirm(): Promise<void> {
        await this.pendingCaseConfirmDialog.getByRole("button", { name: /^Cancel$/ }).click();
        await this.pendingCaseConfirmDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    async confirmPendingCase(): Promise<void> {
        const btn = this.pendingCaseConfirmDialog.getByRole("button", { name: /^Yes$/ });
        await expect(btn).toBeEnabled({ timeout: 10_000 });
        await btn.click();
    }

    async expectPendingCaseSuccessToast(): Promise<void> {
        await expect(
            this.successToast(/changed to pending customer reply/i),
        ).toBeVisible({ timeout: 30_000 });
    }

    async expectPendingCaseFailureToast(): Promise<void> {
        await expect(
            this.page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: /Failed to change the case status/i }).first(),
        ).toBeVisible({ timeout: 30_000 });
    }

    // ── edit-cts flow (TEN_CAS_EDIT_CTS_FLOW) ────────────────────────────────

    /**
     * Edit CTS 4-step wizard dialog. The header title changes per step
     * (Edit CTS → Confirm CTS Changes → Manual Routing → Apply Changes
     * Confirmation), so match any of them.
     */
    private get editCtsDialog(): Locator {
        return this.page
            .getByRole("dialog")
            .filter({
                has: this.page
                    .locator('[data-testid="dialog-header"]')
                    .filter({
                        hasText: /Edit CTS|Confirm CTS Changes|Manual Routing|Apply Changes Confirmation/,
                    }),
            })
            .first();
    }

    /** CTS form dropdown trigger (dropdown-field renders data-testid="dropdown-<name>"). */
    private editCtsDropdown(name: string): Locator {
        return this.editCtsDialog.locator(`[data-testid="dropdown-${name}"]`).first();
    }

    private get editCtsNextButton(): Locator {
        return this.editCtsDialog.getByRole("button", { name: /^Next$/ });
    }

    private get editCtsCancelButton(): Locator {
        return this.editCtsDialog.getByRole("button", { name: /^Cancel$/ });
    }

    async expectEditCtsDialogVisible(): Promise<void> {
        await expect(this.editCtsDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectEditCtsDialogNotVisible(): Promise<void> {
        await expect(this.editCtsDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectEditCtsStepTitle(): Promise<void> {
        await expect(this.editCtsDialog.getByRole("heading", { name: /Edit CTS/i })).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectEditCtsFormField(field: string): Promise<void> {
        await expect(this.editCtsDialog.getByText(new RegExp(field, "i")).first()).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectEditCtsStepOneActions(): Promise<void> {
        await expect(this.editCtsCancelButton).toBeVisible({ timeout: 20_000 });
        await expect(this.editCtsNextButton).toBeVisible({ timeout: 20_000 });
    }

    /** Selects the first enabled option in the Case Category dropdown. */
    async selectFirstCaseCategory(): Promise<void> {
        const trigger = this.editCtsDropdown("case_category_id");
        await expect(trigger).toBeVisible({ timeout: 20_000 });
        await trigger.click();
        await this.clickFirstMenuOption("case_category_id", trigger);
    }

    /** Selects the first enabled option in the Case Type dropdown (enabled after category). */
    async selectFirstCaseType(): Promise<void> {
        const trigger = this.editCtsDropdown("case_type_id");
        await expect(trigger).toBeEnabled({ timeout: 20_000 });
        await trigger.click();
        await this.clickFirstMenuOption("case_type_id", trigger);
    }

    /** Selects the first enabled option in the Case Sub-type dropdown (enabled after type). */
    async selectFirstCaseSubType(): Promise<void> {
        const trigger = this.editCtsDropdown("case_sub_type_id");
        await expect(trigger).toBeEnabled({ timeout: 20_000 });
        await trigger.click();
        await this.clickFirstMenuOption("case_sub_type_id", trigger);
    }

    async cancelEditCtsDialog(): Promise<void> {
        await this.editCtsCancelButton.click();
        await this.editCtsDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    /**
     * Step 1 → Step 2 for the REAL-backend happy path. After Next, either the
     * Step 2 "Confirm CTS Changes" heading appears (no duplicate → true), or the
     * "Possible Duplicate Case" panel is shown inside Step 1 (duplicate → false,
     * caller skips). Returns false when the duplicate branch blocks progression.
     */
    async proceedToCtsConfirmChangesWithoutDuplicates(): Promise<boolean> {
        await expect(this.editCtsNextButton).toBeEnabled({ timeout: 20_000 });
        await this.editCtsNextButton.click();

        const step2Heading = this.page.getByRole("heading", { name: /Confirm CTS Changes/i });
        try {
            await expect(step2Heading).toBeVisible({ timeout: 25_000 });
            return true;
        } catch {
            const duplicatePanel = this.editCtsDialog.getByText(/Possible Duplicate Case/i);
            if (await duplicatePanel.isVisible().catch(() => false)) {
                return false;
            }
            throw new Error("Neither the Confirm CTS Changes step nor the possible-duplicate panel appeared after Next.");
        }
    }

    /** Step 2 → Step 3. */
    async proceedToCtsManualRouting(): Promise<void> {
        await expect(this.editCtsNextButton).toBeEnabled({ timeout: 20_000 });
        await this.editCtsNextButton.click();
        await expect(this.page.getByRole("heading", { name: /Manual Routing/i })).toBeVisible({
            timeout: 20_000,
        });
    }

    /**
     * Step 3: fills Next Workflow Step + Team/Resolver (both required).
     * Returns false when the cts-workflow response provides no workflow-step
     * options (Step 3 cannot be filled) so the caller skips.
     */
    async fillCtsManualRouting(): Promise<boolean> {
        const stepTrigger = this.editCtsDropdown("next_workflow_step_id");
        await expect(stepTrigger).toBeVisible({ timeout: 20_000 });
        await stepTrigger.click();

        const menu = this.page
            .locator('[role="menu"][aria-label="next_workflow_step_id options"][data-state="open"]:visible')
            .last();
        await menu.waitFor({ state: "visible", timeout: 20_000 });
        if (await menu.getByText("No options found").isVisible().catch(() => false)) {
            return false;
        }
        await this.clickFirstMenuOption("next_workflow_step_id", stepTrigger);

        const deptTrigger = this.editCtsDropdown("department_resolver_id");
        await expect(deptTrigger).toBeEnabled({ timeout: 20_000 });
        await deptTrigger.click();
        await this.clickFirstMenuOption("department_resolver_id", deptTrigger);
        return true;
    }

    /** Step 3 → Step 4. */
    async proceedToCtsApplyConfirmation(): Promise<void> {
        await expect(this.editCtsNextButton).toBeEnabled({ timeout: 20_000 });
        await this.editCtsNextButton.click();
        await expect(this.page.getByRole("heading", { name: /Apply Changes Confirmation/i })).toBeVisible({
            timeout: 20_000,
        });
    }

    /** Step 4: clicks Save → triggers the cts-workflow mutation. */
    async saveCtsChanges(): Promise<void> {
        const saveBtn = this.editCtsDialog.getByRole("button", { name: /^Save$/ });
        await expect(saveBtn).toBeEnabled({ timeout: 20_000 });
        await saveBtn.click();
    }

    async expectEditCtsSuccessModal(): Promise<void> {
        await this.responseModal.expectVisible(/has been successfully updated/i);
    }

    // ── edit-case flow (TEN_CAS_EDIT_FLOW) ───────────────────────────────────

    /** Edit Case dialog (edit-ticket.tsx) — header title "Edit Case". */
    private get editCaseDialog(): Locator {
        return this.page
            .getByRole("dialog")
            .filter({
                has: this.page
                    .locator('[data-testid="dialog-header"]')
                    .filter({ hasText: /Edit Case/ }),
            })
            .first();
    }

    async expectEditCaseDialogVisible(): Promise<void> {
        await expect(this.editCaseDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectEditCaseDialogNotVisible(): Promise<void> {
        await expect(this.editCaseDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectEditCaseTitle(): Promise<void> {
        await expect(this.editCaseDialog.getByRole("heading", { name: /Edit Case/i })).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectEditCaseField(field: string): Promise<void> {
        await expect(this.editCaseDialog.getByText(new RegExp(field, "i")).first()).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectEditCaseActions(): Promise<void> {
        await expect(this.editCaseDialog.getByRole("button", { name: /^Cancel$/ })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.editCaseDialog.getByRole("button", { name: /^Save$/ })).toBeVisible({
            timeout: 20_000,
        });
    }

    async cancelEditCaseDialog(): Promise<void> {
        await this.editCaseDialog.getByRole("button", { name: /^Cancel$/ }).click();
        await this.editCaseDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    /** Clicks Save — submits the (pre-filled) current values to PUT .../{uuid}/update. */
    async saveEditCase(): Promise<void> {
        const saveBtn = this.editCaseDialog.getByRole("button", { name: /^Save$/ });
        await expect(saveBtn).toBeEnabled({ timeout: 20_000 });
        await saveBtn.click();
    }

    /** True when the "Failed" error ResponseModal is visible (backend rejected the update). */
    async isEditCaseFailureModalVisible(): Promise<boolean> {
        return this.page
            .getByRole("dialog")
            .filter({ hasText: /The data has failed to update/i })
            .isVisible({ timeout: 5_000 })
            .catch(() => false);
    }

    async expectEditCaseSuccessModal(): Promise<void> {
        await this.responseModal.expectVisible(/has been updated/i);
    }

    // ── view-workflow flow (TEN_CAS_WORKFLOW_FLOW) ────────────────────────────

    /**
     * Opens the "More Actions" kebab in the case detail workbench header
     * (CaseInformationSection renders CaseActionKebabMenu with title="More Actions").
     * View Workflow is only reachable from here, not from the case-list kebab.
     */
    async openWorkbenchMoreActions(): Promise<void> {
        const openMenu = this.page.locator('[data-slot="dropdown-menu-content"][role="menu"][data-state="open"]');
        await expect(async () => {
            if (await openMenu.isVisible().catch(() => false)) {
                return;
            }
            await this.page.keyboard.press("Escape");
            const moreBtn = this.page.getByRole("button", { name: /More Actions/i }).first();
            await expect(moreBtn).toBeVisible({ timeout: 10_000 });
            await moreBtn.click({ timeout: 10_000 });
            await expect(openMenu).toBeVisible({ timeout: 5_000 });
        }).toPass({ timeout: 35_000, intervals: [500, 1_000, 2_000] });
    }

    /** View Workflow dialog (view-workflow.tsx) — header title "View Workflow". */
    private get viewWorkflowDialog(): Locator {
        return this.page
            .getByRole("dialog")
            .filter({
                has: this.page
                    .locator('[data-testid="dialog-header"]')
                    .filter({ hasText: /View Workflow/ }),
            })
            .first();
    }

    async expectViewWorkflowDialogVisible(): Promise<void> {
        await expect(this.viewWorkflowDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectViewWorkflowDialogNotVisible(): Promise<void> {
        await expect(this.viewWorkflowDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectViewWorkflowTitle(): Promise<void> {
        await expect(this.viewWorkflowDialog.getByRole("heading", { name: /View Workflow/i })).toBeVisible({
            timeout: 20_000,
        });
    }

    /** Asserts the workflow diagram rendered — at least one "Step" card is visible. */
    async expectViewWorkflowDiagram(): Promise<void> {
        await expect(
            this.viewWorkflowDialog.getByText(/^Step \d/i).first(),
        ).toBeVisible({ timeout: 30_000 });
    }

    /** Closes the dialog via the header close (X) button. */
    async closeViewWorkflowDialog(): Promise<void> {
        const closeBtn = this.viewWorkflowDialog.locator("button:has(i.i-x)").first();
        await expect(closeBtn).toBeVisible({ timeout: 10_000 });
        await closeBtn.click();
        await this.viewWorkflowDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    // ── child-case flow (TEN_CAS_CHILD_CASE_FLOW) ─────────────────────────────

    /** "Create Child Case" dialog — same component as create, mode="child-case". */
    private get createChildCaseDialog(): Locator {
        return this.page.getByRole("dialog").filter({ hasText: "Create Child Case" });
    }

    async expectCreateChildCaseDialogVisible(): Promise<void> {
        await expect(this.createChildCaseDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectCreateChildCaseDialogNotVisible(): Promise<void> {
        await expect(this.createChildCaseDialog).not.toBeVisible({ timeout: 10_000 });
    }

    /** Asserts the Case Parent section renders with the parent case pre-filled. */
    async expectChildCaseParentPrefilled(): Promise<void> {
        // The parent ComboBox is disabled (pre-filled) and shows the parent card
        // with the case number below it.
        await expect(this.createChildCaseDialog.getByText(/^Case Parent$/i).first()).toBeVisible({
            timeout: 20_000,
        });
        await expect(
            this.createChildCaseDialog.getByRole("textbox", { name: /Search Ticket No/i }).first(),
        ).toBeDisabled({ timeout: 20_000 });
    }

    async expectCreateChildCaseField(field: string): Promise<void> {
        await expect(this.createChildCaseDialog.getByText(new RegExp(field, "i")).first()).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectCreateChildCaseActions(): Promise<void> {
        await expect(this.createChildCaseDialog.getByRole("button", { name: /^Cancel$/ })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.createChildCaseDialog.getByRole("button", { name: /^Create Case$/ })).toBeVisible({
            timeout: 20_000,
        });
    }

    async cancelCreateChildCaseDialog(): Promise<void> {
        await this.createChildCaseDialog.getByRole("button", { name: /^Cancel$/ }).click();
        await this.createChildCaseDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    /**
     * Fills the required child-case fields — Customer is INHERITED from the parent
     * (no search input in child mode), so only Entity/Template + remaining fields
     * are filled. Reuses the create-flow field helpers.
     */
    async fillRequiredChildCaseFieldsWithFirstAvailableValues(): Promise<void> {
        await this.fillRemainingCaseFields();
    }

    // ── related-case flow (TEN_CAS_RELATED_CASE_FLOW) ─────────────────────────

    /**
     * Clicks a vertical rail tab in the case workbench (mirrors
     * {@link expectWorkbenchVerticalTab} but clicks the button once its tooltip
     * matches).
     */
    async openWorkbenchVerticalTab(tabName: string): Promise<void> {
        const rail = this.verticalTabRail;
        const count = await rail.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const button = rail.nth(i);
            await button.hover();
            const tooltip = this.page
                .getByRole("tooltip")
                .filter({ hasText: new RegExp(`^${escapeRegExp(tabName)}$`, "i") })
                .first();
            try {
                await expect(tooltip).toBeVisible({ timeout: 3_000 });
                await button.click();
                return;
            } catch {
                // Not this button — continue to the next rail item.
            }
        }

        throw new Error(`Vertical tab "${tabName}" not found in the case detail workbench.`);
    }

    /**
     * The Related Case tab content root — innermost div containing both the
     * section header and the Add Case Relation button.
     */
    private get relatedTabContent(): Locator {
        return this.page
            .locator("div")
            .filter({ has: this.page.getByText("RELATION & DUPLICATION CASE") })
            .filter({ has: this.page.getByRole("button", { name: /Add Case Relation/i }) })
            .last();
    }

    async expectRelatedCaseSectionVisible(): Promise<void> {
        await expect(this.relatedTabContent.getByText("RELATION & DUPLICATION CASE")).toBeVisible({
            timeout: 20_000,
        });
        await expect(
            this.relatedTabContent.getByRole("button", { name: /Add Case Relation/i }),
        ).toBeVisible({ timeout: 20_000 });
    }

    async openAddCaseRelationDialog(): Promise<void> {
        await this.relatedTabContent.getByRole("button", { name: /Add Case Relation/i }).click();
    }

    /** "Add Case Relation" dialog (related-case.tsx). */
    private get addRelationDialog(): Locator {
        return this.page.getByRole("dialog", { name: /Add Case Relation/i });
    }

    async expectAddRelationDialogVisible(): Promise<void> {
        await expect(this.addRelationDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectAddRelationDialogSearchAndActions(): Promise<void> {
        await expect(
            this.addRelationDialog.locator('input[placeholder="Search Ticket No"]').first(),
        ).toBeVisible({ timeout: 20_000 });
        await expect(this.addRelationDialog.getByRole("button", { name: /^Cancel$/ })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.addRelationDialog.getByRole("button", { name: /^Save$/ })).toBeVisible({
            timeout: 20_000,
        });
    }

    /**
     * Case numbers already related to the opened case — read from the related
     * card headings in the tab (each card renders its case number as a heading
     * button). Used to skip options that would hit the backend's duplicate-
     * relation rejection.
     */
    private async getExistingRelatedCaseNumbers(): Promise<Set<string>> {
        const numbers = new Set<string>();
        const cardNumbers = this.relatedTabContent.getByRole("heading").getByRole("button");
        const count = await cardNumbers.count().catch(() => 0);
        for (let i = 0; i < count; i++) {
            const text = ((await cardNumbers.nth(i).textContent().catch(() => "")) ?? "").trim();
            if (text) {
                numbers.add(text);
            }
        }
        return numbers;
    }

    /**
     * Opens the ComboBox and clicks the first option whose case number is NOT
     * already related (scanning from `startIndex`). Throws when no qualifying
     * option exists.
     */
    private async selectRelatedCaseOptionExcluding(exclude: Set<string>, startIndex: number): Promise<void> {
        const searchInput = this.addRelationDialog.locator('input[placeholder="Search Ticket No"]').first();
        await expect(searchInput).toBeVisible({ timeout: 20_000 });
        await searchInput.click();
        const options = this.page.getByRole("option");
        await expect(options.first()).toBeVisible({ timeout: 15_000 });
        const count = await options.count();
        for (let i = startIndex; i < count; i++) {
            const text = ((await options.nth(i).textContent().catch(() => "")) ?? "");
            // Option cards embed the case number — skip any already-related one.
            if ([...exclude].some((n) => n && text.includes(n))) {
                continue;
            }
            await options
                .nth(i)
                .click({ force: true, timeout: 5_000 })
                .catch(() => options.nth(i).click({ timeout: 5_000 }));
            // Selection registered when the card preview renders (footer switches to Back + Save).
            await expect(this.addRelationDialog.getByRole("button", { name: /^Back$/ })).toBeVisible({
                timeout: 10_000,
            });
            return;
        }
        throw new Error("Every returned case option is already related to this case.");
    }

    async selectFirstRelatedCaseOption(): Promise<boolean> {
        const searchInput = this.addRelationDialog.locator('input[placeholder="Search Ticket No"]').first();
        await expect(searchInput).toBeVisible({ timeout: 20_000 });
        await searchInput.click();
        const options = this.page.getByRole("option");
        try {
            await expect(options.first()).toBeVisible({ timeout: 15_000 });
        } catch {
            return false;
        }
        const exclude = await this.getExistingRelatedCaseNumbers();
        try {
            await this.selectRelatedCaseOptionExcluding(exclude, 0);
        } catch {
            return false;
        }
        return true;
    }

    /**
     * Saves the relation, retrying with the NEXT not-yet-related case option
     * when the backend rejects the save (duplicate-relation guard). Up to 3
     * options tried.
     */
    async saveCaseRelation(): Promise<void> {
        const exclude = await this.getExistingRelatedCaseNumbers();
        const maxAttempts = 3;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const saveBtn = this.addRelationDialog.getByRole("button", { name: /^Save$/ });
            await expect(saveBtn).toBeEnabled({ timeout: 10_000 });
            await saveBtn.click();
            if ((await this.waitForRelationSaveOutcome()) === "success") {
                return;
            }
            // Rejected — go Back and pick a different (not-yet-related) case.
            await this.addRelationDialog.getByRole("button", { name: /^Back$/ }).click();
            await expect(
                this.addRelationDialog.locator('input[placeholder="Search Ticket No"]').first(),
            ).toBeVisible({ timeout: 10_000 });
            await this.selectRelatedCaseOptionExcluding(exclude, attempt + 1);
        }
        throw new Error("Failed to create a case relation — the backend rejected 3 different case options.");
    }

    /** Polls ~8s for the success or error toast after saving a relation. */
    private async waitForRelationSaveOutcome(): Promise<"success" | "error"> {
        const success = this.successToast(/is now related to/i);
        const error = this.page.locator('[data-sonner-toast][data-type="error"]').first();
        for (let i = 0; i < 16; i++) {
            if (await success.isVisible().catch(() => false)) {
                return "success";
            }
            if (await error.isVisible().catch(() => false)) {
                return "error";
            }
            await this.page.waitForTimeout(500);
        }
        return "error";
    }

    async expectRelationSuccessToast(): Promise<void> {
        await expect(this.successToast(/is now related to/i)).toBeVisible({ timeout: 30_000 });
    }

    /**
     * Opens the kebab (icon-only dots button) of the first relation/duplicate
     * card inside the Related Case tab content.
     */
    async openFirstRelationCardActionsMenu(): Promise<void> {
        const openMenu = this.page.locator('[data-slot="dropdown-menu-content"][role="menu"][data-state="open"]');
        await expect(async () => {
            if (await openMenu.isVisible().catch(() => false)) {
                return;
            }
            await this.page.keyboard.press("Escape");
            const kebab = this.relatedTabContent
                .locator("button")
                .filter({ has: this.page.locator("i") })
                .filter({ hasNotText: /\S/ })
                .first();
            await expect(kebab).toBeVisible({ timeout: 10_000 });
            await kebab.click({ timeout: 5_000 });
            await expect(openMenu).toBeVisible({ timeout: 5_000 });
        }).toPass({ timeout: 35_000, intervals: [500, 1_000, 2_000] });
    }

    /**
     * Opens the kebab of the first card in the "Possible Duplicate" section —
     * scoped so a related-card kebab (whose menu only offers "Remove Relation")
     * is never clicked by mistake.
     */
    async openFirstDuplicateCardActionsMenu(): Promise<void> {
        const openMenu = this.page.locator('[data-slot="dropdown-menu-content"][role="menu"][data-state="open"]');
        const duplicateSection = this.page
            .locator("div")
            .filter({ has: this.page.getByText(/^Possible Duplicate/) })
            .filter({ has: this.page.locator("button:has(i)") })
            .last();
        await expect(async () => {
            if (await openMenu.isVisible().catch(() => false)) {
                return;
            }
            await this.page.keyboard.press("Escape");
            const kebab = duplicateSection
                .locator("button")
                .filter({ has: this.page.locator("i") })
                .filter({ hasNotText: /\S/ })
                .first();
            await expect(kebab).toBeVisible({ timeout: 10_000 });
            await kebab.click({ timeout: 5_000 });
            await expect(openMenu).toBeVisible({ timeout: 5_000 });
        }).toPass({ timeout: 35_000, intervals: [500, 1_000, 2_000] });
    }

    /** Clicks a text item inside the currently open dropdown menu (not all menu items use role=menuitem). */
    async clickOpenMenuItem(action: string): Promise<void> {
        const openMenu = this.page.locator('[data-slot="dropdown-menu-content"][role="menu"][data-state="open"]');
        const item = openMenu.getByText(action, { exact: true }).first();
        await expect(item).toBeVisible({ timeout: 10_000 });
        await item.click();
    }

    /** "Remove Relation" confirmation dialog. */
    private get removeRelationDialog(): Locator {
        return this.page.getByRole("dialog", { name: /Remove Relation/i });
    }

    async expectRemoveRelationDialogVisible(): Promise<void> {
        await expect(this.removeRelationDialog).toBeVisible({ timeout: 20_000 });
    }

    async confirmRemoveRelation(): Promise<void> {
        const btn = this.removeRelationDialog.getByRole("button", { name: /^Remove$/ });
        await expect(btn).toBeEnabled({ timeout: 10_000 });
        await btn.click();
    }

    async expectRemoveRelationSuccessToast(): Promise<void> {
        await expect(this.successToast(/Related case removed successfully/i)).toBeVisible({
            timeout: 30_000,
        });
    }

    /** Merge ConfirmModal "Action Confirmation" (confirm label "Yes"). */
    private get mergeConfirmDialog(): Locator {
        return this.page.getByRole("dialog", { name: /Action Confirmation/i });
    }

    async expectMergeConfirmDialogVisible(): Promise<void> {
        await expect(this.mergeConfirmDialog).toBeVisible({ timeout: 20_000 });
    }

    async confirmMerge(): Promise<void> {
        const btn = this.mergeConfirmDialog.getByRole("button", { name: /^Yes$/ });
        await expect(btn).toBeEnabled({ timeout: 10_000 });
        await btn.click();
    }

    async expectMergeFailureToast(): Promise<void> {
        // The onError toast shows error.message when present (e.g. the mocked
        // "Internal Server Error") and only falls back to "Failed to merge
        // duplicated cases." when the message is empty — match both.
        await expect(
            this.page
                .locator('[data-sonner-toast][data-type="error"]')
                .filter({ hasText: /Failed to merge duplicated cases|Internal Server Error/i })
                .first(),
        ).toBeVisible({ timeout: 30_000 });
    }

    // ── start flow (TEN_CAS_START_FLOW) ───────────────────────────────────────

    /** ConfirmModal "Start Case" (title matches; confirm label "Yes"). */
    private get startConfirmDialog(): Locator {
        return this.page.getByRole("dialog", { name: /Start Case/i });
    }

    async expectStartConfirmDialogVisible(): Promise<void> {
        await expect(this.startConfirmDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectStartConfirmDialogNotVisible(): Promise<void> {
        await expect(this.startConfirmDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectStartConfirmShowsTitleAndDescription(): Promise<void> {
        await expect(this.startConfirmDialog.getByRole("heading", { name: /Start Case/i })).toBeVisible({
            timeout: 20_000,
        });
        await expect(
            this.startConfirmDialog.getByText(/Are you sure you want to start this case/i),
        ).toBeVisible({ timeout: 20_000 });
    }

    async expectStartConfirmActions(): Promise<void> {
        await expect(this.startConfirmDialog.getByRole("button", { name: /^Cancel$/ })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.startConfirmDialog.getByRole("button", { name: /^Yes$/ })).toBeVisible({
            timeout: 20_000,
        });
    }

    async cancelStartConfirm(): Promise<void> {
        await this.startConfirmDialog.getByRole("button", { name: /^Cancel$/ }).click();
        await this.startConfirmDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    async confirmStart(): Promise<void> {
        const btn = this.startConfirmDialog.getByRole("button", { name: /^Yes$/ });
        await expect(btn).toBeEnabled({ timeout: 10_000 });
        await btn.click();
    }

    async expectCaseStartedSuccessToast(): Promise<void> {
        await expect(this.successToast(/started successfully/i)).toBeVisible({ timeout: 30_000 });
    }

    async expectStartFailureToast(): Promise<void> {
        await expect(
            this.page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: /Failed to start the case/i }).first(),
        ).toBeVisible({ timeout: 30_000 });
    }

    // ── resolve flow (TEN_CAS_RESOLVE_FLOW) ───────────────────────────────

    /** ConfirmModal "Resolve Case" (title matches; confirm label "Yes"). */
    private get resolveConfirmDialog(): Locator {
        return this.page.getByRole("dialog", { name: /Resolve Case/i });
    }

    async expectResolveConfirmDialogVisible(): Promise<void> {
        await expect(this.resolveConfirmDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectResolveConfirmDialogNotVisible(): Promise<void> {
        await expect(this.resolveConfirmDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectResolveConfirmShowsTitleAndDescription(): Promise<void> {
        await expect(this.resolveConfirmDialog.getByRole("heading", { name: /Resolve Case/i })).toBeVisible({
            timeout: 20_000,
        });
        await expect(
            this.resolveConfirmDialog.getByText(/Are you sure you want to resolve this case/i),
        ).toBeVisible({ timeout: 20_000 });
    }

    async expectResolveConfirmForm(): Promise<void> {
        // FormGenerator — Reason (Optional) textarea is always rendered.
        // The Resolution dropdown is OPTIONAL (schema: rules.required: false), so the
        // dialog may render WITHOUT it when the API returns no options or fails.
        // Assert only the textarea (always present).
        await expect(this.resolveConfirmDialog.locator("textarea").first()).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectResolveConfirmActions(): Promise<void> {
        await expect(this.resolveConfirmDialog.getByRole("button", { name: /^Cancel$/ })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.resolveConfirmDialog.getByRole("button", { name: /^Yes$/ })).toBeVisible({
            timeout: 20_000,
        });
    }

    async cancelResolveConfirm(): Promise<void> {
        await this.resolveConfirmDialog.getByRole("button", { name: /^Cancel$/ }).click();
        await this.resolveConfirmDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    async confirmResolve(): Promise<void> {
        const btn = this.resolveConfirmDialog.getByRole("button", { name: /^Yes$/ });
        await expect(btn).toBeEnabled({ timeout: 10_000 });
        await btn.click();
    }

    /**
     * Picks the first enabled option in the Resolution dropdown (remote options).
     * The Resolution field is OPTIONAL (schema: rules.required: false) — if the
     * dropdown isn't rendered (API failure, no options, etc.), skip silently;
     * resolving still works without selecting a resolution.
     */
    async fillResolutionWithFirstAvailable(): Promise<void> {
        const trigger = this.resolveConfirmDialog
            .locator('[data-testid="dropdown-case_resolution"]')
            .first();
        const visible = await trigger.isVisible({ timeout: 3_000 }).catch(() => false);
        if (!visible) {
            return;
        }
        await trigger.click();
        await this.clickFirstMenuOption("case_resolution", trigger);
    }

    async expectResolveSuccessModal(): Promise<void> {
        await this.responseModal.expectVisible(/has been successfully resolved/i);
    }

    async expectResolveFailureToast(): Promise<void> {
        await expect(
            this.page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: /Failed to resolve the case/i }).first(),
        ).toBeVisible({ timeout: 30_000 });
    }

    // ── close flow (TEN_CAS_CLOSE_FLOW) ───────────────────────────────────

    /** ConfirmModal "Close Case" (title matches; confirm label "Yes"). */
    private get closeConfirmDialog(): Locator {
        return this.page.getByRole("dialog", { name: /Close Case/i });
    }

    async expectCloseConfirmDialogVisible(): Promise<void> {
        await expect(this.closeConfirmDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectCloseConfirmDialogNotVisible(): Promise<void> {
        await expect(this.closeConfirmDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectCloseConfirmShowsTitleAndDescription(): Promise<void> {
        await expect(this.closeConfirmDialog.getByRole("heading", { name: /Close Case/i })).toBeVisible({
            timeout: 20_000,
        });
        await expect(
            this.closeConfirmDialog.getByText(/Are you sure you want to close this case/i),
        ).toBeVisible({ timeout: 20_000 });
    }

    async expectCloseConfirmActions(): Promise<void> {
        await expect(this.closeConfirmDialog.getByRole("button", { name: /^Cancel$/ })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.closeConfirmDialog.getByRole("button", { name: /^Yes$/ })).toBeVisible({
            timeout: 20_000,
        });
    }

    async cancelCloseConfirm(): Promise<void> {
        await this.closeConfirmDialog.getByRole("button", { name: /^Cancel$/ }).click();
        await this.closeConfirmDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    async confirmClose(): Promise<void> {
        const btn = this.closeConfirmDialog.getByRole("button", { name: /^Yes$/ });
        await expect(btn).toBeEnabled({ timeout: 10_000 });
        await btn.click();
    }

    async expectCloseSuccessModal(): Promise<void> {
        await this.responseModal.expectVisible(/has been closed/i);
    }

    /** True when the close failure toast is currently visible. */
    async isCloseFailureToastVisible(): Promise<boolean> {
        return this.page
            .locator('[data-sonner-toast][data-type="error"]')
            .filter({ hasText: /Failed to close the case/i })
            .isVisible({ timeout: 2_000 })
            .catch(() => false);
    }

    async expectCloseFailureToast(): Promise<void> {
        await expect(
            this.page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: /Failed to close the case/i }).first(),
        ).toBeVisible({ timeout: 30_000 });
    }

    // ── cancel flow (TEN_CAS_CANCEL_FLOW) ─────────────────────────────────

    /** Cancel Case Reason dialog (case-cancel-reason.tsx) — header title. */
    private get cancelReasonDialog(): Locator {
        return this.page.getByRole("dialog", { name: /Cancel Case Reason/i });
    }

    async expectCancelReasonDialogVisible(): Promise<void> {
        await expect(this.cancelReasonDialog).toBeVisible({ timeout: 20_000 });
    }

    async expectCancelReasonDialogNotVisible(): Promise<void> {
        await expect(this.cancelReasonDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectCancelReasonDialogShowsDropdown(): Promise<void> {
        await expect(this.cancelReasonDialog.getByText("Choose Cancel Reason", { exact: true })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.cancelReasonDialog.locator('[data-testid="dropdown-dropdown-case-cancel-reason"]')).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectCancelReasonDialogActions(): Promise<void> {
        await expect(this.cancelReasonDialog.getByRole("button", { name: /^Back$/ })).toBeVisible({
            timeout: 20_000,
        });
        await expect(this.cancelReasonDialog.getByRole("button", { name: /^Confirm Cancel$/ })).toBeVisible({
            timeout: 20_000,
        });
    }

    async expectConfirmCancelDisabled(): Promise<void> {
        await expect(
            this.cancelReasonDialog.getByRole("button", { name: /^Confirm Cancel$/ }),
        ).toBeDisabled({ timeout: 10_000 });
    }

    async goBackFromCancelReason(): Promise<void> {
        await this.cancelReasonDialog.getByRole("button", { name: /^Back$/ }).click();
        await this.cancelReasonDialog.waitFor({ state: "hidden", timeout: 10_000 });
    }

    /** Selects the first available cancel reason from the reason Dropdown. */
    async selectFirstCancelReason(): Promise<void> {
        const trigger = this.cancelReasonDialog.locator('[data-testid="dropdown-dropdown-case-cancel-reason"]');
        await trigger.click();
        await this.clickFirstMenuOption("dropdown-case-cancel-reason", trigger);
    }

    async confirmCancelCase(): Promise<void> {
        const btn = this.cancelReasonDialog.getByRole("button", { name: /^Confirm Cancel$/ });
        await expect(btn).toBeEnabled({ timeout: 10_000 });
        await btn.click();
    }

    async expectCancelSuccessModal(): Promise<void> {
        await this.responseModal.expectVisible(/has been closed/i);
    }

    async expectCancelFailureToast(): Promise<void> {
        await expect(
            this.page.locator('[data-sonner-toast][data-type="error"]').filter({ hasText: /Failed to close\./i }).first(),
        ).toBeVisible({ timeout: 30_000 });
    }
}
