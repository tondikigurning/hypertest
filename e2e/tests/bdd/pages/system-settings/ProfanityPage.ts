import type { Locator, Page, Response } from "@playwright/test";
import { expect } from "@playwright/test";
import { DataTableComponent } from "../../components/DataTableComponent";
import { DataviewFilterComponent } from "../../components/dataview-filter-component";
import type { FilterResult, SortResult } from "../../components/filter/filter-types";
import {
    PROFANITY_SETTINGS_PATH,
    PROFANITY_WORDS_FILTER_API,
    PROFANITY_WORDS_FILTER_URL,
} from "../../utils/list-page-constants";
import { e2eValue } from "../../utils/e2e-test-data";
import { dismissTencentWorkbenchIfPresent } from "../../utils/tencent-workbench-utils";

type FilterStatus = "Active" | "Inactive";

/** Mirrors the server's word collation: case-insensitive, whitespace-insensitive. */
function normalizeWord(value: string): string {
    return value.toLowerCase().replace(/\s+/g, "");
}

/**
 * System Settings → Profanity Settings.
 *
 * The word list is a @hyperscal/dataview mounted inside a DetailPanel overlay whose
 * heading is "Settings". Shared list/filter/sort steps cannot drive it (they press
 * Escape, which closes the overlay), so this POM keeps every interaction panel-scoped
 * and closes popovers by clicking their trigger instead of pressing Escape.
 */
export class ProfanityPage {
    readonly table: DataTableComponent;
    readonly filters: DataviewFilterComponent;

    lastSearchKeyword: string | null = null;
    lastFilterResults: FilterResult[] = [];
    lastSortResults: SortResult[] = [];

    selectedWord: string | null = null;
    lastCreatedWord: string | null = null;
    lastUpdatedWord: string | null = null;

    private recordedFilterStatus: FilterStatus | null = null;
    private readonly ownedWords = new Set<string>();

    constructor(private readonly page: Page) {
        this.table = new DataTableComponent(page);
        this.filters = new DataviewFilterComponent(page, this.panel, {
            filterLabels: { word: "Word/Phrase" },
            endpointUrl: PROFANITY_WORDS_FILTER_URL,
        });
    }

    // ─── Locators ────────────────────────────────────────────────────────

    private get pageHeading(): Locator {
        return this.page.getByRole("heading", { name: "Profanity Filter", level: 2 });
    }

    private get filterCard(): Locator {
        return this.page.getByTestId("profanity-filter-card");
    }

    private get filterStatusLabel(): Locator {
        return this.page.getByTestId("profanity-switch-label");
    }

    private get filterSwitch(): Locator {
        return this.page.getByTestId("profanity-switch");
    }

    private get manageAction(): Locator {
        return this.page.getByRole("button", { name: "Manage", exact: true });
    }

    private get panel(): Locator {
        return this.page
            .getByRole("dialog")
            .filter({ has: this.page.getByRole("heading", { name: "Settings", exact: true, level: 2 }) })
            .first();
    }

    private get addWordInput(): Locator {
        return this.panel.getByTestId("profanity-add-word-input");
    }

    private get addWordButton(): Locator {
        return this.panel.getByTestId("profanity-add-word-button");
    }

    private get appliedSortButton(): Locator {
        return this.panel.getByRole("button", { name: /^sort by/i });
    }

    private get sortRow(): Locator {
        // SortItemApplied wrapper (packages/dataview sort-item-applied.tsx).
        return this.page.locator("div.flex.min-w-\\[240px\\]").first();
    }

    private get filterConfirmDialog(): Locator {
        return this.page
            .getByRole("dialog")
            .filter({ has: this.page.getByRole("heading", { name: /(Disable|Enable) Profanity Filter\?/ }) })
            .first();
    }

    private get editDialog(): Locator {
        return this.page
            .getByRole("dialog")
            .filter({ has: this.page.getByRole("heading", { name: /edit custom word\/phrase/i }) })
            .first();
    }

    private get deleteConfirmDialog(): Locator {
        return this.page.getByRole("dialog", { name: "Delete Profanity Word?" });
    }

    private get editWordInput(): Locator {
        return this.editDialog.getByRole("textbox", { name: /word\/ ?phrase/i }).first();
    }

    private get updateWordButton(): Locator {
        return this.editDialog.getByRole("button", { name: "Update" });
    }

    private get nextPageButton(): Locator {
        return this.panel.getByRole("button", { name: "Next Page" });
    }

    private get previousPageButton(): Locator {
        return this.panel.getByRole("button", { name: "Previous Page" });
    }

    private get wordListError(): Locator {
        return this.panel.getByRole("alert").filter({ hasText: /failed to retrieve data/i }).first();
    }

    private get wordListLoading(): Locator {
        // MimicLoadingProgress (2px top bar) plus common loading primitives.
        return this.panel
            .locator(
                [
                    '[role="progressbar"]',
                    '[role="status"]',
                    '[aria-busy="true"]',
                    ".skeleton",
                    '[data-testid*="loading"]',
                    "div.pointer-events-none.absolute.inset-x-0.top-0.z-50",
                ].join(", "),
            )
            .first();
    }

    private wordCell(index = 0): Locator {
        return this.table.rows.nth(index).locator("td").first();
    }

    private rowForWord(word: string): Locator {
        // Text-based (not role-based) on purpose: an open confirmation modal marks the
        // rest of the page aria-hidden, which would hide the table from getByRole().
        return this.table.rows.filter({ has: this.page.getByText(word, { exact: true }) }).first();
    }

    private get sortPickerOption(): Locator {
        return this.page
            .locator("[data-radix-popper-content-wrapper]")
            .locator("div.flex.cursor-pointer.items-center.gap-2")
            .filter({ hasText: "Word/Phrase" })
            .first();
    }

    private editButtonIn(row: Locator): Locator {
        return row.locator('[data-testid^="btn-edit-profanity-settings-"]').first();
    }

    private deleteButtonIn(row: Locator): Locator {
        return row.locator('[data-testid^="btn-delete-profanity-settings-"]').first();
    }

    private waitForFilterResponse(timeout = 30_000): Promise<Response | null> {
        return this.page
            .waitForResponse((res) => PROFANITY_WORDS_FILTER_URL.test(res.url()), { timeout })
            .catch(() => null);
    }

    private expectToast(type: "success" | "error", text: RegExp): Promise<void> {
        return expect(
            this.page
                .locator(`[data-sonner-toast][data-type="${type}"]`)
                .filter({ hasText: text })
                .first(),
        ).toBeVisible({ timeout: 20_000 });
    }

    // ─── Navigation ──────────────────────────────────────────────────────

    async navigateTo(): Promise<void> {
        await this.page.goto(PROFANITY_SETTINGS_PATH, { waitUntil: "domcontentloaded" });
        await this.page.waitForURL(/\/system-settings\/profanity(?:\?|$)/, { timeout: 30_000 });
        await expect(this.page).not.toHaveURL(/\/login/, { timeout: 30_000 });
        await dismissTencentWorkbenchIfPresent(this.page);
        await this.expectPageLoaded();
    }

    async openFromSystemSettingsSidebar(label: string): Promise<void> {
        const menuItem = this.page.getByRole("menuitem", { name: label, exact: true });
        await expect(menuItem).toBeVisible({ timeout: 20_000 });
        await menuItem.click();
    }

    async expectPageLoaded(): Promise<void> {
        await this.pageHeading.waitFor({ state: "visible", timeout: 30_000 });
        await expect(this.filterCard).toBeVisible({ timeout: 10_000 });
        await expect(this.manageAction).toBeVisible({ timeout: 10_000 });
    }

    // ─── Filter card / toggle ────────────────────────────────────────────

    async expectFilterCardVisible(): Promise<void> {
        await expect(this.filterCard).toBeVisible({ timeout: 10_000 });
    }

    async expectFilterStatusShown(): Promise<void> {
        await expect(this.filterStatusLabel).toHaveText(/Filter is (Active|Inactive)/i, { timeout: 10_000 });
    }

    async expectManageActionVisible(): Promise<void> {
        await expect(this.manageAction).toBeVisible({ timeout: 10_000 });
    }

    async recordFilterStatus(): Promise<FilterStatus> {
        await expect(this.filterStatusLabel).toHaveText(/Filter is (Active|Inactive)/i, { timeout: 10_000 });
        const text = (await this.filterStatusLabel.textContent()) ?? "";
        this.recordedFilterStatus = /inactive/i.test(text) ? "Inactive" : "Active";
        return this.recordedFilterStatus;
    }

    async toggleFilter(): Promise<void> {
        await expect(this.filterSwitch).toBeEnabled({ timeout: 20_000 });
        await this.filterSwitch.click();
    }

    async expectFilterConfirmationVisible(): Promise<void> {
        await expect(this.filterConfirmDialog).toBeVisible({ timeout: 10_000 });
    }

    async expectFilterConfirmationHidden(): Promise<void> {
        await expect(this.filterConfirmDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async confirmFilterChange(): Promise<void> {
        await this.filterConfirmDialog.getByRole("button", { name: "Confirm" }).click();
    }

    async cancelFilterChange(): Promise<void> {
        await this.filterConfirmDialog.getByRole("button", { name: "Cancel" }).click();
    }

    async expectFilterSuccessToast(): Promise<void> {
        await this.expectToast("success", /successfully updated profanity filter/i);
    }

    async expectFilterErrorToast(): Promise<void> {
        await this.expectToast("error", /failed to update profanity filter/i);
    }

    async expectFilterStatusMatchesRecorded(): Promise<void> {
        const status = this.recordedFilterStatus ?? (await this.recordFilterStatus());
        await expect(this.filterStatusLabel).toHaveText(new RegExp(`Filter is ${status}`, "i"), { timeout: 20_000 });
    }

    /** Restore shared setting state and remove only words created by this scenario. */
    async cleanupAfterScenario(): Promise<void> {
        try {
            await this.restoreRecordedFilterStatus();
        } finally {
            await this.cleanupOwnedWords();
        }
    }

    private async restoreRecordedFilterStatus(): Promise<void> {
        if (!this.recordedFilterStatus || this.page.isClosed()) return;

        // Reload from the server so cleanup observes the persisted state, even if the
        // test failed between opening the confirmation and checking the result.
        await this.navigateTo();
        if (await this.filterConfirmDialog.isVisible().catch(() => false)) {
            await this.cancelFilterChange();
        }

        const currentText = (await this.filterStatusLabel.textContent()) ?? "";
        const currentStatus: FilterStatus = /inactive/i.test(currentText) ? "Inactive" : "Active";
        if (currentStatus === this.recordedFilterStatus) return;

        await this.toggleFilter();
        await this.expectFilterConfirmationVisible();
        await this.confirmFilterChange();
        await expect(this.filterStatusLabel).toHaveText(
            new RegExp(`Filter is ${this.recordedFilterStatus}`, "i"),
            { timeout: 20_000 },
        );
    }

    private async cleanupOwnedWords(): Promise<void> {
        if (this.ownedWords.size === 0 || this.page.isClosed()) return;

        await this.navigateTo();
        await this.openManagePanel();
        for (const word of this.ownedWords) {
            await this.searchWordsKeep(word);
            const row = this.rowForWord(word);
            if (!(await row.isVisible().catch(() => false))) continue;

            await this.deleteButtonIn(row).click();
            await this.expectDeleteConfirmationVisible();
            await this.confirmDeleteWord();
            await expect(row).toHaveCount(0, { timeout: 20_000 });
        }
        this.ownedWords.clear();
    }

    async expectFilterStatusOppositeOfRecorded(): Promise<void> {
        const status = this.recordedFilterStatus ?? (await this.recordFilterStatus());
        const opposite = status === "Active" ? "Inactive" : "Active";
        await expect(this.filterStatusLabel).toHaveText(new RegExp(`Filter is ${opposite}`, "i"), { timeout: 20_000 });
    }

    // ─── Word list panel ─────────────────────────────────────────────────

    async openManagePanel(): Promise<void> {
        if (await this.panel.isVisible().catch(() => false)) {
            await this.table.expectVisible();
            return;
        }

        // A click can land before hydration attaches the panel handler (button focuses,
        // nothing opens). Reloading between attempts resets that state — re-clicking on
        // the same page would toggle a panel that opened just after the wait expired.
        for (let attempt = 1; attempt <= 2; attempt++) {
            await this.manageAction.click();
            const opened = await this.panel
                .waitFor({ state: "visible", timeout: 10_000 })
                .then(() => true)
                .catch(() => false);
            if (opened) {
                await this.table.expectVisible();
                return;
            }

            if (attempt === 1) {
                await this.page.reload({ waitUntil: "domcontentloaded" });
                await this.expectPageLoaded();
            }
        }

        throw new Error("Could not open the Manage Word/Phrase panel.");
    }

    async expectWordListVisible(): Promise<void> {
        await this.table.expectVisible();
    }

    async expectColumnVisible(label: string): Promise<void> {
        // Header cells render as `cell`, not `columnheader`, so match the text.
        await expect(this.panel.getByRole("table").getByText(label, { exact: true }).first()).toBeVisible({
            timeout: 10_000,
        });
    }

    async expectCustomRowsHaveActions(): Promise<void> {
        const row = this.table.rows
            .filter({ has: this.page.getByRole("cell", { name: "Custom", exact: true }) })
            .first();
        await expect(row).toBeVisible({ timeout: 20_000 });
        await expect(this.editButtonIn(row)).toBeVisible({ timeout: 10_000 });
        await expect(this.deleteButtonIn(row)).toBeVisible({ timeout: 10_000 });
    }

    /** Returns false when the environment has no default words to inspect. */
    async expectDefaultRowsReadOnly(): Promise<boolean> {
        const row = this.table.rows
            .filter({ has: this.page.getByRole("cell", { name: "Default", exact: true }) })
            .first();
        const hasDefaultRow = await row.isVisible({ timeout: 10_000 }).catch(() => false);
        if (!hasDefaultRow) {
            return false;
        }
        await expect(this.editButtonIn(row)).toHaveCount(0);
        await expect(this.deleteButtonIn(row)).toHaveCount(0);
        return true;
    }

    // ─── Search / filter / sort (panel-scoped) ───────────────────────────

    async getFirstVisibleWord(): Promise<string> {
        await this.table.expectHasRows();
        const word = (await this.wordCell(0).textContent())?.trim();
        if (!word) {
            throw new Error("First profanity word row has no word text.");
        }
        return word;
    }

    async searchWordsKeep(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        return await this.filters.searchFilterKeep(PROFANITY_WORDS_FILTER_API, value);
    }

    async expectOnlyMatchingWordsVisible(): Promise<void> {
        const keyword = (this.lastSearchKeyword ?? "").toLowerCase();
        await this.table.expectHasRows();
        await expect
            .poll(
                async () => {
                    const count = await this.table.rows.count();
                    if (count === 0) {
                        return false;
                    }
                    for (let index = 0; index < Math.min(count, 10); index++) {
                        const word = ((await this.wordCell(index).textContent()) ?? "").toLowerCase();
                        if (!word.includes(keyword)) {
                            return false;
                        }
                    }
                    return true;
                },
                { timeout: 15_000 },
            )
            .toBe(true);
    }

    async expectEmptyState(): Promise<void> {
        await this.table.expectEmptyState();
    }

    async applyWordFilter(word: string): Promise<FilterResult[]> {
        this.selectedWord = word;
        this.lastFilterResults = await this.filters.applySingleFilter(PROFANITY_WORDS_FILTER_API, "word", { word });
        return this.lastFilterResults;
    }

    async expectFilterResultsContainSelectedWord(): Promise<void> {
        expect(this.lastFilterResults).toHaveLength(1);
        const [result] = this.lastFilterResults;
        expect(result.apiStatus, "Filter request should return HTTP 200").toBe(200);
        expect(result.rowsMatchFilter, `Filtered rows should contain "${this.selectedWord}"`).toBe(true);
    }

    async sortWordsBothDirections(): Promise<SortResult[]> {
        const results: SortResult[] = [];

        await this.panel.getByRole("button", { name: /^add sort$/i }).click();
        const picker = this.page.getByPlaceholder("Type a value or choose options");
        await picker.waitFor({ state: "visible", timeout: 10_000 });

        const initialResponse = this.waitForFilterResponse(10_000);
        await this.sortPickerOption.click();
        results.push(await this.captureSort("asc", initialResponse));
        await picker.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});

        await this.openAppliedSortPopover();
        results.push(await this.toggleSortAndCapture("desc"));
        results.push(await this.toggleSortAndCapture("asc"));

        // Close the popover by re-clicking the trigger — Escape would close the whole panel.
        await this.appliedSortButton.click();
        await this.sortRow.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});

        this.lastSortResults = results;
        return results;
    }

    async expectWordSortRequestsSucceeded(): Promise<void> {
        const observed = this.lastSortResults.filter((result) => result.apiStatus !== null);
        expect(observed.length, "Expected at least one sort change to reach the API").toBeGreaterThan(0);
        for (const result of observed) {
            expect(result.apiStatus, `Sort (${result.direction}) should return HTTP 200`).toBe(200);
        }
    }

    async expectWordSortOrder(): Promise<void> {
        for (const result of this.lastSortResults) {
            const words = result.rows.map((row) => String(row.word ?? ""));
            expect(words.length, `Sort (${result.direction}) should render rows`).toBeGreaterThan(0);
            for (let index = 1; index < words.length; index++) {
                const previous = words[index - 1];
                const current = words[index];
                // The API sorts case-insensitively and ignores spaces ("siraulo" precedes
                // "sira ulo"), so normalize both before checking direction.
                const comparison = normalizeWord(previous).localeCompare(normalizeWord(current));
                const ordered = result.direction === "asc" ? comparison <= 0 : comparison >= 0;
                expect(
                    ordered,
                    `Sort (${result.direction}) rows should be ordered: "${previous}" → "${current}"`,
                ).toBe(true);
            }
        }
    }

    /**
     * Re-applying a direction that is already cached does not fire a request, so the
     * rows are read from the rendered grid after the trigger label flips. `apiStatus`
     * stays null in that case and is ignored by the request assertion.
     */
    private async toggleSortAndCapture(direction: "asc" | "desc"): Promise<SortResult> {
        const response = this.waitForFilterResponse(10_000);
        await this.sortRow.locator("button").first().click();
        return this.captureSort(direction, response);
    }

    private async captureSort(
        direction: "asc" | "desc",
        responsePromise: Promise<Response | null>,
    ): Promise<SortResult> {
        const arrow = direction === "asc" ? "↑" : "↓";
        await expect(this.appliedSortButton).toHaveText(new RegExp(`Sort By Word\\/Phrase ${arrow}`), {
            timeout: 10_000,
        });

        const response = await responsePromise;
        await this.page.waitForTimeout(400);

        return {
            sortOptionName: "word",
            direction,
            apiStatus: response?.status() ?? null,
            rows: await this.readVisibleWordRows(),
            orderConsistent: null,
        };
    }

    private async readVisibleWordRows(): Promise<Array<Record<string, unknown>>> {
        const count = await this.table.rows.count();
        const rows: Array<Record<string, unknown>> = [];
        for (let index = 0; index < count; index++) {
            rows.push({ word: ((await this.wordCell(index).textContent()) ?? "").trim() });
        }
        return rows;
    }

    private async openAppliedSortPopover(): Promise<void> {
        await this.appliedSortButton.waitFor({ state: "visible", timeout: 10_000 });
        await expect(async () => {
            if (!(await this.sortRow.isVisible().catch(() => false))) {
                await this.appliedSortButton.click();
            }
            await expect(this.sortRow).toBeVisible({ timeout: 2_000 });
        }).toPass({ timeout: 15_000 });
    }

    // ─── Pagination ──────────────────────────────────────────────────────

    async hasMoreThanOnePage(): Promise<boolean> {
        await this.table.expectHasRows();
        const deadline = Date.now() + 10_000;
        while (Date.now() < deadline) {
            if (await this.nextPageButton.isEnabled().catch(() => false)) {
                return true;
            }
            await this.page.waitForTimeout(250);
        }
        return false;
    }

    private get pageRangeLabel(): Locator {
        return this.panel.getByText(/\d+-\d+ of \d+/).first();
    }

    async goToNextPage(): Promise<void> {
        await this.changePage(this.nextPageButton);
    }

    async goToPreviousPage(): Promise<void> {
        await this.changePage(this.previousPageButton);
    }

    /** Waits for the "1-50 of N" range to change — pagination can be served from cache. */
    private async changePage(button: Locator): Promise<void> {
        const before = (await this.pageRangeLabel.textContent())?.trim();
        await button.click();
        await expect
            .poll(async () => (await this.pageRangeLabel.textContent())?.trim(), { timeout: 20_000 })
            .not.toBe(before);
    }

    async expectPreviousPageEnabled(): Promise<void> {
        await expect(this.previousPageButton).toBeEnabled({ timeout: 10_000 });
    }

    async expectPreviousPageDisabled(): Promise<void> {
        await expect(this.previousPageButton).toBeDisabled({ timeout: 10_000 });
    }

    // ─── Create ──────────────────────────────────────────────────────────

    async createUniqueE2EWord(): Promise<string> {
        const word = e2eValue("profanity word");
        this.ownedWords.add(word);
        this.lastCreatedWord = word;
        await this.addWordInput.fill(word);
        await this.addWordButton.click();
        return word;
    }

    async expectCreatedWordVisible(): Promise<void> {
        if (!this.lastCreatedWord) {
            throw new Error("No profanity word was created in this scenario.");
        }
        await this.expectWordVisible(this.lastCreatedWord);
    }

    async expectAddWordInputEmpty(): Promise<void> {
        await expect(this.addWordInput).toHaveValue("", { timeout: 10_000 });
    }

    async enterAddWord(value: string): Promise<void> {
        await this.addWordInput.fill(value);
    }

    async expectAddWordInputInvalid(): Promise<void> {
        await expect(this.addWordInput).toHaveAttribute("aria-invalid", "true", { timeout: 10_000 });
    }

    async expectAddWordDisabled(): Promise<void> {
        await expect(this.addWordButton).toBeDisabled({ timeout: 10_000 });
    }

    async expectWordCreatedToast(): Promise<void> {
        await this.expectToast("success", /profanity word created successfully/i);
    }

    // ─── Edit ────────────────────────────────────────────────────────────

    async openEditForWord(word: string): Promise<void> {
        const row = await this.requireRowForWord(word);
        await this.editButtonIn(row).click();
        await expect(this.editDialog).toBeVisible({ timeout: 10_000 });
        this.selectedWord = word;
    }

    async openEditForFirstE2EWord(): Promise<void> {
        await this.openEditForWord(await this.getFirstVisibleWord());
    }

    async enterInvalidEditWord(): Promise<void> {
        await this.editWordInput.fill("bad*word");
    }

    async updateWordToNewE2EValue(): Promise<string> {
        const word = `${e2eValue("profanity word")} edited`;
        this.ownedWords.add(word);
        await this.editWordInput.fill(word);
        await this.updateWordButton.click();
        this.lastUpdatedWord = word;
        return word;
    }

    async cancelEditDialog(): Promise<void> {
        await this.editDialog.getByRole("button", { name: "Cancel" }).click();
    }

    async expectEditDialogHidden(): Promise<void> {
        await expect(this.editDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectEditInvalidWordMessage(): Promise<void> {
        await expect(this.editDialog.getByText(/is not allowed\. Please use a different word\./i)).toBeVisible({
            timeout: 10_000,
        });
    }

    async expectUpdateWordDisabled(): Promise<void> {
        await expect(this.updateWordButton).toBeDisabled({ timeout: 10_000 });
    }

    async expectWordUpdatedToast(): Promise<void> {
        await this.expectToast("success", /profanity word updated successfully/i);
    }

    async expectUpdatedWordVisible(): Promise<void> {
        if (!this.lastUpdatedWord) {
            throw new Error("No profanity word was updated in this scenario.");
        }
        await this.expectWordVisible(this.lastUpdatedWord);
    }

    // ─── Delete ──────────────────────────────────────────────────────────

    async openDeleteForWord(word: string): Promise<void> {
        const row = await this.requireRowForWord(word);
        await this.deleteButtonIn(row).click();
        await this.expectDeleteConfirmationVisible();
        this.selectedWord = word;
    }

    async openDeleteForFirstE2EWord(): Promise<void> {
        await this.openDeleteForWord(await this.getFirstVisibleWord());
    }

    async confirmDeleteWord(): Promise<void> {
        await this.deleteConfirmDialog.getByRole("button", { name: "Delete" }).click();
    }

    async cancelDeleteWord(): Promise<void> {
        await this.deleteConfirmDialog.getByRole("button", { name: "Cancel" }).click();
    }

    async expectDeleteConfirmationVisible(): Promise<void> {
        await expect(this.deleteConfirmDialog).toBeVisible({ timeout: 10_000 });
    }

    async expectDeleteConfirmationHidden(): Promise<void> {
        await expect(this.deleteConfirmDialog).not.toBeVisible({ timeout: 10_000 });
    }

    async expectWordDeletedToast(): Promise<void> {
        await this.expectToast("success", /profanity word successfully deleted/i);
    }

    async expectWordDeleteErrorToast(): Promise<void> {
        await this.expectToast("error", /profanity word deletion failed/i);
    }

    // ─── Row assertions ──────────────────────────────────────────────────

    async expectWordVisible(word: string): Promise<void> {
        await expect(this.rowForWord(word)).toBeVisible({ timeout: 20_000 });
    }

    async expectWordAbsent(word: string): Promise<void> {
        await expect(this.rowForWord(word)).toHaveCount(0, { timeout: 20_000 });
    }

    async expectSelectedWordUnchanged(): Promise<void> {
        if (!this.selectedWord) {
            throw new Error("No profanity word was selected in this scenario.");
        }
        await this.expectWordVisible(this.selectedWord);
    }

    async expectSelectedWordRemains(): Promise<void> {
        await this.expectSelectedWordUnchanged();
    }

    // ─── Error / loading states ──────────────────────────────────────────

    async expectWordListErrorState(): Promise<void> {
        const errorVisible = await this.wordListError.isVisible({ timeout: 15_000 }).catch(() => false);
        if (errorVisible) {
            return;
        }
        expect(
            this.filters.lastSearchStatus ?? 0,
            "Expected an error UI or a mocked 500 from the profanity word list API",
        ).toBeGreaterThanOrEqual(500);
    }

    async expectWordListLoadingState(): Promise<void> {
        const loadingVisible = await this.wordListLoading.isVisible({ timeout: 1_000 }).catch(() => false);
        if (loadingVisible) {
            return;
        }
        // The search step awaits the response, so the (already completed) delay is the
        // observable signal when the 2px progress bar is too fast to catch.
        expect(
            this.filters.lastSearchDurationMs ?? 0,
            "Expected a loading indicator or a delayed profanity word list response",
        ).toBeGreaterThanOrEqual(2_500);
    }

    // ─── E2E data safety ─────────────────────────────────────────────────

    /** Create and track a word owned by this scenario before it is edited or deleted. */
    async ensureE2EWordAvailable(): Promise<string> {
        await this.createUniqueE2EWord();
        await this.expectWordCreatedToast();
        const createdWord = this.lastCreatedWord;
        if (!createdWord) {
            throw new Error("Failed to create an E2E profanity word.");
        }
        await this.searchWordsKeep(createdWord);
        await this.expectWordVisible(createdWord);
        return createdWord;
    }

    private async requireRowForWord(word: string): Promise<Locator> {
        const row = this.rowForWord(word);
        await expect(row).toBeVisible({ timeout: 20_000 });
        return row;
    }
}
