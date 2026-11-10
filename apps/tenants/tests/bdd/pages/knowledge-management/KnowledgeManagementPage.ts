/**
 * POM — /knowledge-management (pipeline, table, filters, detail panel, kebab actions).
 *
 * Source-of-truth locators from production code
 * (apps/tenants/app/features/knowledge-management):
 *  - Route list:           /knowledge-management                      (_knowledge-management._index)
 *  - Route create:         /knowledge-management/create               (_knowledge-management.create)
 *  - Create button:        PageHeader primary <Button> text "Create"  (knowledge-management-header.tsx)
 *  - Pipeline:             <PipelineRenderer> (shared @hyperscal/dataview) — tabs: All, Draft,
 *                          Pending Approval, Needs Revision, Archived, Published, Active
 *  - Table:                <DataViewRenderer> (shared @hyperscal/dataview)
 *  - Detail panel:         opens on row title click (use-knowledge-management.tsx); tabs:
 *                          Details, Article, Revision
 *  - Kebab actions:        Edit, Approval, Submit Approval, Publish, Delete
 *                          (knowledge-management-actions.tsx) — permission/status gated
 *  - Delete dialog:        ConfirmModal title "Delete Article", confirmLabel "Delete"
 *  - Submit approval:      ConfirmModal title "Submit For Approval", confirmLabel "Yes"
 *  - Approval dialog:      Dialog title "Approval Article"; radio "Approve and publish immediately"
 *                          (default) / "Request Revision"; primary "Save"
 *  - Publish (kebab):      ConfirmModal confirmLabel "Publish Article"
 *
 * API endpoints (packages/internal/api …/articlesApi):
 *  - List/filter:  POST /knowledge/tenant/articles/filter
 *  - Create:       POST /knowledge/tenant/articles
 *  - Delete:       DELETE /knowledge/tenant/articles/:a/locales/:l/versions/:v
 *  - Publish:      POST …/versions/:v/publish
 *  - Submit approv:POST …/versions/:v/submit-for-approval
 *  - Request rev:  POST …/versions/:v/request-revision
 *  - Update:       PUT  …/versions/:v
 */
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
import {
    KNOWLEDGE_MANAGEMENT_CREATE_API,
    KNOWLEDGE_MANAGEMENT_FILTER_API,
    KNOWLEDGE_MANAGEMENT_LIST_PATH,
} from "../../utils/list-page-constants";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";

/** Filter picker labels for the KM list (knowledge-management-filter.schema.ts). */
const KM_FILTER_LABELS: Record<string, string> = {
    Title: "Title",
    Category: "Category",
    Status: "Status",
    "Created By": "Created By",
    "Version Number": "Version Number",
};

export class KnowledgeManagementPage {
    static readonly KNOWLEDGE_MANAGEMENT_FILTER_API = KNOWLEDGE_MANAGEMENT_FILTER_API;
    static readonly KNOWLEDGE_MANAGEMENT_CREATE_API = KNOWLEDGE_MANAGEMENT_CREATE_API;

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
    lastFilterResponse: Record<string, unknown> | null = null;

    constructor(private readonly page: Page) {
        this.pipeline = new PipelineComponent(page);
        this.table = new DataTableComponent(page);
        this.detailPanel = new DetailPanelComponent(page);
        this.filters = new FilterComponent(page);
        this.confirmModal = new ConfirmModalComponent(page);
        this.responseModal = new ResponseModalComponent(page);
    }

    private get createButton(): Locator {
        return this.page.getByRole("button", { name: "Create", exact: true }).first();
    }

    private get successToast(): Locator {
        return this.page.locator('[data-sonner-toast][data-type="success"]');
    }

    // ─── Navigation ──────────────────────────────────────────────────────────────

    async navigateTo(): Promise<void> {
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            await this.page.goto(KNOWLEDGE_MANAGEMENT_LIST_PATH, { waitUntil: "domcontentloaded" });

            // Transient 503 / "Can't reach the server" pages are environmental blips — retry
            // rather than failing. A legitimate /login redirect is NOT treated as unreachable.
            if (await this.isUnreachablePage()) {
                lastError = new Error("Server unreachable (503) on knowledge-management navigation");
                await this.page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
                continue;
            }

            await this.expectLoaded();
            await dismissTencentWorkbenchIfPresent(this.page);

            if (await this.detailPanel.isVisible()) {
                await this.detailPanel.close();
            }

            await this.page.keyboard.press("Escape");
            await ensureListPageCleanState(this.page, KnowledgeManagementPage.KNOWLEDGE_MANAGEMENT_FILTER_API);
            await waitForListTableRows(this.page, KnowledgeManagementPage.KNOWLEDGE_MANAGEMENT_FILTER_API);
            return;
        }

        throw lastError ?? new Error("navigateTo failed");
    }

    /** Detects browser-level server-error/connection pages (e.g. 503, ERR_CONNECTION). */
    private async isUnreachablePage(): Promise<boolean> {
        return this.page
            .evaluate(() => {
                const text = document.body?.innerText ?? "";
                return /503|Can.?t reach the server|This site can.?t be reached|ERR_/i.test(text);
            })
            .catch(() => false);
    }

    async clickCreate(): Promise<void> {
        await this.createButton.waitFor({ state: "visible", timeout: 15_000 });
        await this.createButton.click();
        await this.page.waitForURL(/\/knowledge-management\/create/, { timeout: 30_000 });
    }

    // ─── Page state assertions ───────────────────────────────────────────────────

    async expectLoaded(): Promise<void> {
        await this.page.waitForURL(/\/knowledge-management/, { timeout: 30_000 });
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

    /** Asserts the permission fallback (no module access) is shown. */
    async expectPermissionFallbackVisible(): Promise<void> {
        await expect(
            this.page.getByText(/don't have permission to view Knowledge Management/i).first(),
        ).toBeVisible({ timeout: 15_000 });
    }

    // ─── Pipeline ────────────────────────────────────────────────────────────────

    /** Select a pipeline tab with a network wait for the filter API response. */
    async selectPipelineTab(tab: string): Promise<void> {
        const responsePromise = this.page
            .waitForResponse(
                (res) =>
                    res.url().includes(KnowledgeManagementPage.KNOWLEDGE_MANAGEMENT_FILTER_API)
                    && !res.url().includes("filter-options")
                    && res.request().method() === "POST",
                { timeout: 45_000 },
            )
            .catch(() => null);

        await this.pipeline.selectTab(tab);
        const response = await responsePromise;
        if (response) {
            try {
                const json = await response.json();
                this.lastFilterResponse = json;
            } catch {
                this.lastFilterResponse = null;
            }
        } else {
            this.lastFilterResponse = null;
        }
    }

    // ─── Detail panel ────────────────────────────────────────────────────────────

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

    // ─── Kebab row actions (list) ────────────────────────────────────────────────

    async openFirstRowActionsMenu(): Promise<void> {
        await this.table.openRowMenu(0);
    }

    async clickRowActionsMenuItem(label: string): Promise<void> {
        await this.table.clickMenuItem(label);
    }

    /**
     * The "Publish" kebab item (knowledge-management-actions.tsx:139) is only rendered for rows
     * whose status is PUBLISHED and which are NOT the current version. The first row in the
     * "Published" pipeline tab is typically the current version, so it has no "Publish" action.
     * This walks the published rows, opens each kebab, and clicks "Publish" on the first row that
     * actually exposes it. Throws (and retries via toPass) if no such row exists in the tab.
     */
    async clickPublishOnAvailableRow(): Promise<void> {
        const openMenuSel = '[data-slot="dropdown-menu-content"][role="menu"][data-state="open"]';
        await expect(async () => {
            const count = await this.table.rows.count();
            if (count === 0) {
                throw new Error("No knowledge article rows in the Published pipeline tab.");
            }

            for (let i = 0; i < count; i++) {
                await this.page.keyboard.press("Escape");
                const btn = this.table.rowActionsButton(i);
                if (!(await btn.isVisible().catch(() => false))) {
                    continue;
                }
                await btn.click({ timeout: 3_000 });
                const openMenu = this.page.locator(openMenuSel);
                await expect(openMenu).toBeVisible({ timeout: 3_000 });
                const item = this.page.getByRole("menuitem", { name: "Publish", exact: true });
                if (await item.isVisible().catch(() => false)) {
                    await item.click({ timeout: 3_000 });
                    return;
                }
                await this.page.keyboard.press("Escape");
            }

            throw new Error('No knowledge article row with a "Publish" action in the Published pipeline tab.');
        }).toPass({ timeout: 45_000, intervals: [500, 1_000, 2_000, 3_000, 5_000] });
    }

    // ─── Dialog assertions ───────────────────────────────────────────────────────

    private dialogByTitle(title: string): Locator {
        return this.page.getByRole("dialog", { name: title })
            .or(this.page.getByRole("dialog").filter({ hasText: title }));
    }

    async expectDialogVisible(title: string): Promise<void> {
        await expect(this.dialogByTitle(title)).toBeVisible({ timeout: 10_000 });
    }

    async expectDialogHidden(title: string): Promise<void> {
        await expect(this.dialogByTitle(title)).not.toBeVisible({ timeout: 10_000 });
    }

    async cancelDialog(title: string): Promise<void> {
        const dialogEl = this.dialogByTitle(title);
        await this.page.keyboard.press("Escape");
        await dialogEl.waitFor({ state: "hidden", timeout: 10_000 });
    }

    // ─── Create / Edit / Delete / Approval flows ─────────────────────────────────

    /** Edit Article dialog (opens from kebab "Edit" on a row or in the detail panel). */
    async expectEditDialogVisible(): Promise<void> {
        await expect(
            this.page.getByRole("dialog").filter({ hasText: /Update Article/i }),
        ).toBeVisible({ timeout: 15_000 });
    }

    async expectEditDialogHidden(): Promise<void> {
        await expect(
            this.page.getByRole("dialog").filter({ hasText: /Update Article/i }),
        ).not.toBeVisible({ timeout: 15_000 });
    }

    /** Confirm the Delete Article ConfirmModal. */
    async confirmDeleteArticle(): Promise<void> {
        await this.confirmModal.confirm("Delete");
    }

    async cancelDeleteArticle(): Promise<void> {
        await this.confirmModal.cancel();
    }

    /** Confirm the Submit For Approval ConfirmModal ("Yes"). */
    async confirmSubmitForApproval(): Promise<void> {
        await this.confirmModal.confirm("Yes");
    }

    async cancelSubmitForApproval(): Promise<void> {
        await this.confirmModal.cancel();
    }

    /** Confirm the Publish Article ConfirmModal ("Publish Article"). */
    async confirmPublishArticle(): Promise<void> {
        await this.confirmModal.confirm("Publish Article");
    }

    /** Approval dialog — choose Approve and publish immediately (default) then Save. */
    async approveArticleFromApprovalDialog(): Promise<void> {
        // While permissions/data load the dialog shows the title "Publish Article" (spinner
        // wrapper), then swaps to "Approval Article". Match both so a slow load doesn't time out,
        // and wait for the Save button — the reliable signal the full dialog is rendered.
        const dialog = this.page.getByRole("dialog").filter({ hasText: /Approval Article|Publish Article/i });
        await expect(dialog).toBeVisible({ timeout: 25_000 });
        const saveBtn = dialog.getByRole("button", { name: "Save" });
        await expect(saveBtn).toBeVisible({ timeout: 25_000 });
        const approveRadio = dialog.getByRole("radio", { name: /approve and publish immediately/i });
        if (await approveRadio.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await approveRadio.click();
        }
        await saveBtn.click();
    }

    /** Approval dialog — choose Request Revision, fill optional comment, then Save. */
    async requestRevisionFromApprovalDialog(comment: string): Promise<void> {
        const dialog = this.page.getByRole("dialog").filter({ hasText: /Approval Article|Publish Article/i });
        await expect(dialog).toBeVisible({ timeout: 25_000 });
        const saveBtn = dialog.getByRole("button", { name: "Save" });
        await expect(saveBtn).toBeVisible({ timeout: 25_000 });
        await dialog.getByRole("radio", { name: /request revision/i }).click();
        const ta = dialog.getByRole("textbox").or(dialog.locator("textarea")).first();
        if (await ta.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await ta.fill(comment);
        }
        await saveBtn.click();
    }

    async cancelApprovalDialog(): Promise<void> {
        // The "Approval" kebab item on a DRAFT row opens the "Submit For Approval" dialog
        // (knowledge-management.page.tsx:349-362 swaps the dialog wiring). Match both so
        // cancelling either the submit-for-approval or the approval dialog closes it.
        const dialog = this.page.getByRole("dialog").filter({ hasText: /Approval Article|Publish Article|Submit For Approval/i });
        await this.page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden", timeout: 15_000 });
    }

    // ─── Success toasts ──────────────────────────────────────────────────────────

    async expectSuccessToast(text: string): Promise<void> {
        await expect(this.successToast.filter({ hasText: text })).toBeVisible({ timeout: 15_000 });
    }

    // ─── Shared filter / sort / search methods (used by _shared steps) ────────────

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

        throw new Error("No display name found in the first Knowledge Management table row.");
    }

    async searchFilter(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilter(
            KnowledgeManagementPage.KNOWLEDGE_MANAGEMENT_FILTER_API,
            value,
        );
        return this.lastSearchMatched;
    }

    async searchFilterKeep(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilterKeep(
            KnowledgeManagementPage.KNOWLEDGE_MANAGEMENT_FILTER_API,
            value,
        );
        return this.lastSearchMatched;
    }

    /** Reads the first table row's cells to build real per-field filter values.
     *  Keys match the actual backend filter option names exposed by the KM schema. */
    async buildFilterFieldValuesFromFirstRow(): Promise<Record<string, string>> {
        const row = this.table.rows.first();
        const cells = row.locator("td");
        const textOf = async (i: number): Promise<string> => (await cells.nth(i).textContent().catch(() => ""))?.trim() ?? "";
        // CTS Category is an enum whose option label is the leaf of the breadcrumb path
        // (e.g. "CVG003 - Complaint > Email to Case > ResQ" → "ResQ"), so use the leaf
        // for the "Category" filter value to match the enum picker.
        const ctsRaw = await textOf(2);
        const categoryLeaf = ctsRaw.split(">").pop()?.trim() || ctsRaw;
        return {
            Title: await textOf(0),
            Category: categoryLeaf,
            Status: await textOf(7),
            "Created By": await textOf(6),
            "Version Number": await textOf(3),
        };
    }

    async applyAllFilters(fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applyAllFilters(
            KnowledgeManagementPage.KNOWLEDGE_MANAGEMENT_FILTER_API,
            fieldValues,
        );
        return this.lastFilterResults;
    }

    async applySingleFilter(filterOption: string, fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applySingleFilter(
            KnowledgeManagementPage.KNOWLEDGE_MANAGEMENT_FILTER_API,
            filterOption,
            fieldValues,
            KM_FILTER_LABELS[filterOption],
        );
        return this.lastFilterResults;
    }

    async applyFirstAvailableFilterOption(): Promise<FilterResult[]> {
        const first = Object.keys(KM_FILTER_LABELS)[0];
        this.lastFilterResults = await this.filters.applySingleFilter(
            KnowledgeManagementPage.KNOWLEDGE_MANAGEMENT_FILTER_API,
            first,
            undefined,
            KM_FILTER_LABELS[first],
        );
        return this.lastFilterResults;
    }

    async applyAllSorts(): Promise<SortResult[]> {
        this.lastSortResults = await this.filters.applyAllSorts(
            KnowledgeManagementPage.KNOWLEDGE_MANAGEMENT_FILTER_API,
        );
        return this.lastSortResults;
    }

    async applyFirstAvailableSortOption(): Promise<SortResult[]> {
        return this.applyAllSorts();
    }
}
