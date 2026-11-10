import type { Download, Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { FilterComponent } from "../../components/FilterComponent";
import { ResponseModalComponent } from "../../components/ResponseModalComponent";
import type { FilterResult, SortResult } from "../../components/filter/filter-types";
import { e2eValue } from "../../utils/e2e-test-data";
import {
    SURVEY_TEMPLATE_MANAGER_FILTER_API,
    SURVEY_TEMPLATE_MANAGER_LIST_PATH,
} from "../../utils/list-page-constants";

const LIST_API = SURVEY_TEMPLATE_MANAGER_FILTER_API;
const CREATE_PATH = `${SURVEY_TEMPLATE_MANAGER_LIST_PATH}/create`;
const CREATED_COPY = "New Survey Template has been successfully created";
const TEMPLATE_DESCRIPTION = "Collect feedback about recent customer support interactions.";

export class SurveyTemplateManagerPage {
    private readonly filters: FilterComponent;
    private readonly responseModal: ResponseModalComponent;
    private readonly ownedTemplateNames = new Set<string>();
    private selectedTemplateName: string | null = null;
    private createdTemplateName: string | null = null;
    private updatedTemplateName: string | null = null;
    private deletedTemplateName: string | null = null;
    private previousPageNames: string[] = [];
    private nextPageNames: string[] = [];
    private completedExportFilenames: string[] = [];

    lastSearchKeyword: string | null = null;
    lastSearchMatched = false;
    lastFilterResults: FilterResult[] = [];
    lastSortResults: SortResult[] = [];

    constructor(private readonly page: Page) {
        this.filters = new FilterComponent(page);
        this.responseModal = new ResponseModalComponent(page);
    }

    private get templateCards(): Locator {
        return this.page.locator('ul.h-full.space-y-3 > li > [role="button"][aria-pressed]');
    }

    private get searchInput(): Locator {
        return this.page.getByTestId("filter-search-input");
    }

    private get nextPageButton(): Locator {
        return this.page.getByRole("button", { name: "Next Page" });
    }

    private get previewRegion(): Locator {
        return this.page.locator("div.h-full.p-4").last();
    }

    private get reportsTab(): Locator {
        return this.page.getByRole("tab", { name: "Reports", exact: true });
    }

    private get responseAnalysis(): Locator {
        return this.page.getByText("Response Analysis", { exact: true });
    }

    private get emptyResponses(): Locator {
        return this.page.getByText("No responses yet.", { exact: true });
    }

    private cardFor(name: string): Locator {
        const escapedName = escapeRegExp(name);
        return this.page.getByRole("button", {
            name: new RegExp(`^${escapedName} - \\d+ questions?$`, "i"),
        });
    }

    private previewTitle(name: string): Locator {
        return this.previewRegion.getByText(name, { exact: true }).first();
    }

    async navigateTo(): Promise<void> {
        await this.page.goto(SURVEY_TEMPLATE_MANAGER_LIST_PATH, { waitUntil: "domcontentloaded" });
        await this.searchInput.waitFor({ state: "visible", timeout: 30_000 });
        await expect.poll(() => this.templateCards.count(), { timeout: 45_000 }).toBeGreaterThan(0);
    }

    async hasTemplateCards(): Promise<boolean> {
        return (await this.templateCards.count()) > 0;
    }

    async firstTemplateName(): Promise<string> {
        return this.templateNameFromCard(this.templateCards.first());
    }

    private async templateNameFromCard(card: Locator): Promise<string> {
        const label = await card.getAttribute("aria-label");
        const name = label?.replace(/\s-\s\d+\squestions?$/i, "").trim();
        if (!name) {
            throw new Error("The survey template card did not expose its source-backed accessible name.");
        }
        return name;
    }

    private async visibleTemplateNames(): Promise<string[]> {
        const count = await this.templateCards.count();
        const names: string[] = [];
        for (let index = 0; index < count; index += 1) {
            names.push(await this.templateNameFromCard(this.templateCards.nth(index)));
        }
        return names;
    }

    async openFirstTemplatePreview(): Promise<void> {
        const card = this.templateCards.first();
        await expect(card).toBeVisible({ timeout: 20_000 });
        this.selectedTemplateName = await this.templateNameFromCard(card);
        await card.click();
        await expect(this.previewTitle(this.selectedTemplateName)).toBeVisible({ timeout: 30_000 });
        await expect(this.previewRegion.getByText("Filter Responses By Date", { exact: true })).toBeVisible();
    }

    async openDetailPanel(): Promise<void> {
        if (this.selectedTemplateName) {
            const selectedCard = this.cardFor(this.selectedTemplateName);
            if (await selectedCard.getAttribute("aria-pressed") === "true") return;
        }
        await this.openFirstTemplatePreview();
    }

    async expectDetailPanelVisible(): Promise<void> {
        await expect(this.previewRegion.getByText("Filter Responses By Date", { exact: true })).toBeVisible();
    }

    async expectDetailPanelHasTitle(): Promise<void> {
        if (!this.selectedTemplateName) {
            throw new Error("No survey template was selected before asserting its preview title.");
        }
        await expect(this.previewTitle(this.selectedTemplateName)).toBeVisible();
    }

    async closeDetailPanel(): Promise<void> {
        await this.previewRegion.locator('button:has(i.i-x)').click();
        await expect(this.page.getByText("Choose a template to preview", { exact: true })).toBeVisible();
        this.selectedTemplateName = null;
    }

    async expectDetailPanelHidden(): Promise<void> {
        await expect(this.page.getByText("Choose a template to preview", { exact: true })).toBeVisible();
    }

    async clickDetailPanelTab(tabName: string): Promise<void> {
        await this.page.getByRole("tab", { name: tabName, exact: true }).click();
    }

    async expectDetailTabContentVisible(tabName: string): Promise<void> {
        const tab = this.page.getByRole("tab", { name: tabName, exact: true });
        await expect(tab).toHaveAttribute("data-state", "active");
        if (tabName.toLowerCase() === "reports") {
            await this.waitForReportOutcome();
        } else {
            await expect(this.previewRegion.getByText("Filter Responses By Date", { exact: true })).toBeVisible();
        }
    }

    async getFirstRowFieldValue(field: string): Promise<string> {
        if (field !== "template_name" && field !== "name") {
            throw new Error(`Survey template search does not support the requested list field: ${field}`);
        }
        await expect(this.templateCards.first()).toBeVisible({ timeout: 20_000 });
        return this.templateNameFromCard(this.templateCards.first());
    }

    async searchFilterKeep(value: string): Promise<boolean> {
        this.lastSearchKeyword = value;
        this.lastSearchMatched = await this.filters.searchFilterKeep(LIST_API, value);
        return this.lastSearchMatched;
    }

    async buildFilterFieldValuesFromFirstRow(): Promise<Record<string, string>> {
        return { template_name: await this.getFirstRowFieldValue("template_name") };
    }

    async applySingleFilter(filterOption: string, fieldValues?: Record<string, string>): Promise<FilterResult[]> {
        this.lastFilterResults = await this.filters.applySingleFilter(LIST_API, filterOption, fieldValues);
        return this.lastFilterResults;
    }

    async applyAllSorts(): Promise<SortResult[]> {
        this.lastSortResults = await this.filters.applyAllSorts(LIST_API);
        return this.lastSortResults;
    }

    async hasNextTemplatePage(): Promise<boolean> {
        return this.nextPageButton.isEnabled().catch(() => false);
    }

    async goToNextTemplatePage(): Promise<void> {
        this.previousPageNames = await this.visibleTemplateNames();
        const responsePromise = this.page.waitForResponse(
            (response) => response.url().includes(LIST_API) && response.request().method() === "POST",
            { timeout: 30_000 },
        );
        await this.nextPageButton.click();
        await responsePromise;
        await expect.poll(() => this.visibleTemplateNames(), { timeout: 30_000 }).not.toEqual(this.previousPageNames);
        this.nextPageNames = await this.visibleTemplateNames();
    }

    async expectNextTemplatePageChanged(): Promise<void> {
        expect(this.previousPageNames.length, "The first template page should contain cards.").toBeGreaterThan(0);
        expect(this.nextPageNames).not.toEqual(this.previousPageNames);
    }

    async createE2EOwnedTemplate(): Promise<string | null> {
        const name = e2eValue("survey template");
        const uniqueSuffix = name.match(/\d{12}$/)?.[0] ?? name;
        const questionHeader = `E2E survey header ${uniqueSuffix}`;
        const questionText = `E2E support question ${uniqueSuffix}`;
        this.createdTemplateName = name;
        this.selectedTemplateName = null;

        await this.page.goto(CREATE_PATH, { waitUntil: "domcontentloaded" });
        const templateName = this.page.getByPlaceholder("Template Name");
        await templateName.waitFor({ state: "visible", timeout: 30_000 });
        await templateName.fill(name);
        await this.page.getByPlaceholder("Fill description for the template").fill(TEMPLATE_DESCRIPTION);

        if (!(await this.selectFirstOption("Choose Domain"))) return null;
        if (!(await this.selectFirstOption("Choose Entity", "Converge"))) return null;

        await this.page.getByRole("button", { name: "Add new rule" }).last().click();
        await this.page.locator('input[id^="question_header_report_text"]').first().fill(questionHeader);
        await this.page.locator('input[id^="question_primary_"]').first().fill(questionText);

        // The template is tracked before submission so teardown can still find it if a
        // later assertion or navigation fails after the backend accepted the create.
        this.ownedTemplateNames.add(name);
        await this.page.getByRole("button", { name: "Next", exact: true }).click();
        await this.page.getByText("Preview and Confirm Template", { exact: true }).waitFor({ state: "visible" });
        await this.page.getByRole("button", { name: "Next", exact: true }).click();
        await this.page.getByText(CREATED_COPY, { exact: true }).waitFor({ state: "visible", timeout: 45_000 });
        return name;
    }

    private async selectFirstOption(placeholder: string, optionLabel?: string): Promise<boolean> {
        const byPlaceholder = this.page.getByPlaceholder(placeholder);
        const field = (await byPlaceholder.count()) > 0
            ? byPlaceholder.first()
            : this.page.getByText(placeholder, { exact: true }).last();
        await field.waitFor({ state: "visible", timeout: 15_000 });
        await field.click();
        const options = this.page.getByRole("option", optionLabel
            ? { name: optionLabel, exact: true }
            : undefined);
        const menuItems = this.page.getByRole("menuitem", optionLabel
            ? { name: optionLabel, exact: true }
            : undefined);
        const firstOption = (await options.count()) > 0 ? options.first() : menuItems.first();
        try {
            await firstOption.waitFor({ state: "visible", timeout: 10_000 });
        } catch {
            await this.page.keyboard.press("Escape");
            return false;
        }
        await firstOption.click();
        return true;
    }

    async expectCreationConfirmation(): Promise<void> {
        await expect(this.page.getByText(CREATED_COPY, { exact: true })).toBeVisible({ timeout: 20_000 });
    }

    async returnToManagerAndFind(name: string): Promise<void> {
        const backButton = this.page.getByRole("button", { name: "Ok, Back to Homepage", exact: true });
        if (await backButton.isVisible().catch(() => false)) {
            await backButton.click();
        } else if (!this.page.url().includes(SURVEY_TEMPLATE_MANAGER_LIST_PATH)) {
            await this.page.goto(SURVEY_TEMPLATE_MANAGER_LIST_PATH, { waitUntil: "domcontentloaded" });
        }
        await this.searchInput.waitFor({ state: "visible", timeout: 30_000 });
        await this.searchTemplateByName(name);
        await expect(this.cardFor(name)).toBeVisible({ timeout: 30_000 });
    }

    async expectCreatedTemplateInList(): Promise<void> {
        if (!this.createdTemplateName) throw new Error("No E2E-owned survey template was created in this scenario.");
        await this.returnToManagerAndFind(this.createdTemplateName);
    }

    async createTemplateForLifecycleScenario(): Promise<string | null> {
        const name = await this.createE2EOwnedTemplate();
        if (name) {
            await this.expectCreationConfirmation();
            await this.returnToManagerAndFind(name);
        }
        return name;
    }

    async changeCreatedTemplateName(): Promise<void> {
        const currentName = this.createdTemplateName;
        if (!currentName) throw new Error("No E2E-owned survey template is available to edit.");
        await this.openTemplateByName(currentName);

        const editButton = this.page.getByRole("button", { name: "Edit Template", exact: true });
        await editButton.click();
        const editDialog = this.page.getByRole("dialog").filter({ hasText: "Edit Template" }).last();
        const updatedName = `${currentName} edited`;
        this.updatedTemplateName = updatedName;
        this.ownedTemplateNames.add(updatedName);
        await editDialog.getByLabel("Template Name").fill(updatedName);
        await editDialog.getByRole("button", { name: "Preview", exact: true }).click();
        await editDialog.getByRole("button", { name: "Save Changes", exact: true }).click();
        await this.page.getByText(`Template ${updatedName} has been successfully updated.`, { exact: true })
            .waitFor({ state: "visible", timeout: 30_000 });
    }

    async expectTemplateUpdateConfirmation(): Promise<void> {
        if (!this.updatedTemplateName) throw new Error("No updated survey template name was recorded.");
        await expect(this.page.getByText(`Template ${this.updatedTemplateName} has been successfully updated.`, { exact: true }))
            .toBeVisible({ timeout: 15_000 });
    }

    async expectUpdatedTemplateInList(): Promise<void> {
        if (!this.updatedTemplateName) throw new Error("No updated survey template name was recorded.");
        await this.page.goto(SURVEY_TEMPLATE_MANAGER_LIST_PATH, { waitUntil: "domcontentloaded" });
        await this.searchInput.waitFor({ state: "visible", timeout: 30_000 });
        await this.searchTemplateByName(this.updatedTemplateName);
        await expect(this.cardFor(this.updatedTemplateName)).toBeVisible({ timeout: 30_000 });
    }

    async deleteCreatedTemplate(): Promise<void> {
        const name = this.updatedTemplateName ?? this.createdTemplateName;
        if (!name) throw new Error("No E2E-owned survey template is available to delete.");
        await this.openTemplateByName(name);
        await this.deleteSelectedTemplate(name);
        this.deletedTemplateName = name;
    }

    private async openTemplateByName(name: string): Promise<void> {
        if (!(await this.cardFor(name).isVisible().catch(() => false))) {
            await this.page.goto(SURVEY_TEMPLATE_MANAGER_LIST_PATH, { waitUntil: "domcontentloaded" });
            await this.searchInput.waitFor({ state: "visible", timeout: 30_000 });
            const found = await this.searchTemplateByName(name);
            if (!found) throw new Error(`The E2E-owned survey template "${name}" was not found in the list.`);
        }
        const card = this.cardFor(name).first();
        await card.click();
        this.selectedTemplateName = name;
        await expect(this.previewTitle(name)).toBeVisible({ timeout: 30_000 });
    }

    private async deleteSelectedTemplate(name: string): Promise<void> {
        // The menu trigger has no accessible name or test ID. This class comes directly
        // from the inspected SurveyTemplatePreview source and is scoped to its preview.
        const menuTrigger = this.previewRegion.locator(
            "button.cursor-pointer.border-1.border-neutral-70.p-2.outline-none",
        );
        await menuTrigger.click();
        await this.page.getByText("Delete", { exact: true }).last().click();

        const deleteDialog = this.page.getByRole("dialog").filter({
            hasText: "Are you sure you want to delete template",
        }).last();
        await expect(deleteDialog).toBeVisible({ timeout: 15_000 });
        await deleteDialog.getByRole("button", { name: "Yes", exact: true }).click();
        await this.responseModal.expectVisible(/Template Deleted/);
        await expect(this.page.getByText(`Template "${name}" has been successfully deleted.`, { exact: true }))
            .toBeVisible({ timeout: 20_000 });
    }

    async expectTemplateDeletionConfirmation(): Promise<void> {
        if (!this.deletedTemplateName) throw new Error("No survey template deletion was performed.");
        await this.responseModal.expectVisible(/Template Deleted/);
        await expect(this.page.getByText(`Template "${this.deletedTemplateName}" has been successfully deleted.`, { exact: true }))
            .toBeVisible();
    }

    async expectDeletedTemplateAbsent(): Promise<void> {
        if (!this.deletedTemplateName) throw new Error("No deleted survey template name was recorded.");
        await this.responseModal.close();
        await this.page.goto(SURVEY_TEMPLATE_MANAGER_LIST_PATH, { waitUntil: "domcontentloaded" });
        await this.searchInput.waitFor({ state: "visible", timeout: 30_000 });
        const stillListed = await this.searchTemplateByName(this.deletedTemplateName);
        expect(stillListed, `Deleted E2E-owned template "${this.deletedTemplateName}" should not be listed.`).toBe(false);
        await expect(this.cardFor(this.deletedTemplateName)).toHaveCount(0);
    }

    async findFirstTemplateWithResponses(): Promise<string | null> {
        await this.navigateTo();
        const visited = new Set<string>();
        while (true) {
            const cardCount = await this.templateCards.count();
            for (let index = 0; index < cardCount; index += 1) {
                const card = this.templateCards.nth(index);
                const name = await this.templateNameFromCard(card);
                if (visited.has(name)) continue;
                visited.add(name);
                await card.click();
                this.selectedTemplateName = name;
                await expect(this.previewTitle(name)).toBeVisible({ timeout: 30_000 });
                await this.ensureReportsTabActive();
                await this.waitForReportOutcome();

                if (await this.responseAnalysis.isVisible().catch(() => false)) {
                    return name;
                }
            }
            if (!(await this.hasNextTemplatePage())) break;
            await this.goToNextTemplatePage();
        }
        return null;
    }

    private async waitForReportOutcome(): Promise<void> {
        await expect.poll(
            async () =>
                (await this.responseAnalysis.isVisible().catch(() => false))
                || (await this.emptyResponses.isVisible().catch(() => false)),
            { timeout: 30_000 },
        ).toBe(true);
    }

    private async ensureReportsTabActive(): Promise<void> {
        const tab = this.reportsTab;
        await tab.waitFor({ state: "visible", timeout: 15_000 });
        const isActive = (await tab.getAttribute("data-state")) === "active"
            || (await tab.getAttribute("aria-selected")) === "true";
        if (!isActive) await tab.click();
    }

    async openSelectedTemplateReports(): Promise<void> {
        if (!this.selectedTemplateName) throw new Error("No response-bearing survey template was selected.");
        await this.ensureReportsTabActive();
        await expect(this.responseAnalysis).toBeVisible({ timeout: 30_000 });
    }

    async expectResponseAnalysisVisible(): Promise<void> {
        await expect(this.responseAnalysis).toBeVisible({ timeout: 20_000 });
    }

    async exportResponsesAndLogs(): Promise<void> {
        this.completedExportFilenames = [];
        await this.captureExport("Export Responses");
        await this.captureExport("Export Logs");
    }

    private async captureExport(buttonName: string): Promise<void> {
        const button = this.page.getByRole("button", { name: buttonName, exact: true });
        await expect(button).toBeEnabled({ timeout: 15_000 });
        const downloadPromise = this.page.waitForEvent("download", { timeout: 60_000 });
        await button.click();
        const download: Download = await downloadPromise;
        const failure = await download.failure();
        if (failure) throw new Error(`${buttonName} failed: ${failure}`);
        this.completedExportFilenames.push(download.suggestedFilename());
        await download.delete();
    }

    async expectExportsDownloaded(): Promise<void> {
        expect(this.completedExportFilenames).toHaveLength(2);
        expect(this.completedExportFilenames.every((filename) => filename.trim().length > 0)).toBe(true);
    }

    async cleanupOwnedTemplates(): Promise<void> {
        if (this.ownedTemplateNames.size === 0 || this.page.isClosed()) return;

        const cleanupErrors: string[] = [];
        for (const name of this.ownedTemplateNames) {
            try {
                await this.page.goto(SURVEY_TEMPLATE_MANAGER_LIST_PATH, { waitUntil: "domcontentloaded" });
                await this.searchInput.waitFor({ state: "visible", timeout: 30_000 });
                const found = await this.searchTemplateByName(name);
                if (!found) continue;
                await this.openTemplateByName(name);
                await this.deleteSelectedTemplate(name);
                await this.responseModal.close();
            } catch (error) {
                cleanupErrors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        this.ownedTemplateNames.clear();

        if (cleanupErrors.length > 0) {
            throw new Error(`Failed to clean up E2E-owned survey template(s): ${cleanupErrors.join("; ")}`);
        }
    }

    private async searchTemplateByName(name: string): Promise<boolean> {
        await this.searchInput.waitFor({ state: "visible", timeout: 20_000 });
        const responsePromise = this.page.waitForResponse(
            (response) => response.url().includes(LIST_API) && response.request().method() === "POST",
            { timeout: 30_000 },
        );
        await this.searchInput.fill(name);
        await this.searchInput.press("Enter");
        const response = await responsePromise;
        if (response.status() >= 400) {
            throw new Error(`Survey template search returned HTTP ${response.status()}.`);
        }
        const rows: Array<Record<string, unknown>> = (await response.json().catch(() => null))?.rows ?? [];
        const found = rows.some((row) => row.template_name === name);
        if (found) {
            await expect(this.cardFor(name).first()).toBeVisible({ timeout: 20_000 });
        } else {
            await expect(this.cardFor(name)).toHaveCount(0, { timeout: 20_000 });
        }
        return found;
    }
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
