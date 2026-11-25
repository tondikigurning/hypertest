import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { e2eValue } from "../../utils/e2e-test-data";

const STATUS_TABS = [
    "Published",
    "All",
    "Draft",
    "Pending Approval",
    "Need Revision",
    "Superseded",
    "Archived",
] as const;
const LIST_LOAD_TIMEOUT = 60_000;

const FIRST_VERSION_CONTENT = "Check the connection status and follow the standard troubleshooting procedure.";
const UPDATED_VERSION_CONTENT = "Check the modem status and record the outcome before escalating.";
const REVISION_COMMENT = "Please add the connection checks completed before the escalation guidance.";
const ARTICLE_DESCRIPTION = "Troubleshooting steps for checking a service connection issue.";
const ARTICLE_CATEGORY = "Converge - Complaint > Service > No Connection";

type ArticleStatus = "Draft" | "Pending Approval" | "Needs Revision" | "Published" | "Superseded" | "Archived";

export class KnowledgeManagementPage {
    private readonly ownedArticleTitles = new Set<string>();
    private preparedArticleTitle: string | null = null;
    private lastArchiveSuccessMessage: string | null = null;

    constructor(private readonly page: Page) {}

    async openArticleList(): Promise<void> {
        await this.page.goto("/knowledge-management", { waitUntil: "domcontentloaded" });
        await expect(this.statusTab("All")).toBeVisible({ timeout: LIST_LOAD_TIMEOUT });
        await this.waitForListResults();
        const reset = this.page.getByTestId("btn-clear-filters");
        if (await reset.isVisible().catch(() => false) && await reset.isEnabled().catch(() => false)) {
            await reset.click();
            await expect(this.page.getByPlaceholder("Search...", { exact: true })).toHaveValue("");
        }
    }

    async openCreateDetails(): Promise<void> {
        await this.openArticleList();
        await this.page.getByRole("button", { name: "Create", exact: true }).click();
        await this.waitForDetailsForm();
    }

    async expectCategoryDisabled(): Promise<void> {
        await expect(this.page.getByTestId("dropdown-cts_category")).toBeDisabled();
    }

    async selectConvergeEntity(): Promise<void> {
        await this.page.getByTestId("dropdown-entity").click();
        await this.page.getByRole("menuitem", { name: "Converge", exact: true }).click();
    }

    async expectCategoryEnabled(): Promise<void> {
        await expect(this.page.getByTestId("dropdown-cts_category")).toBeEnabled();
    }

    async prepareCreateForm(scenarioTitle: string): Promise<void> {
        this.preparedArticleTitle = await this.reserveUniqueArticleTitle(scenarioTitle);
        await this.openCreateDetails();
        await this.selectConvergeEntity();
        await this.selectComplaintCategory();
    }

    async createPreparedDraft(): Promise<void> {
        const title = this.requirePreparedTitle();
        await this.fillArticleDetails(title);
        await this.advanceToContentStep();
        await this.fillArticleContent(FIRST_VERSION_CONTENT);
        await this.submitCreateWizard(title);
        this.preparedArticleTitle = null;
    }

    async prepareEmptyDetailsStep(): Promise<void> {
        this.preparedArticleTitle = null;
        await this.openCreateDetails();
    }

    async advanceEmptyDetails(): Promise<void> {
        await this.page.getByRole("button", { name: "Next", exact: true }).click();
    }

    async prepareEmptyContentStep(scenarioTitle: string): Promise<void> {
        await this.prepareCreateForm(scenarioTitle);
        await this.fillArticleDetails(this.requirePreparedTitle());
        await this.advanceToContentStep();
    }

    async advanceEmptyContent(): Promise<void> {
        await this.page.getByRole("button", { name: "Next", exact: true }).click();
    }

    async expectCreateValidation(message: string): Promise<void> {
        await expect(this.page.getByText(message, { exact: true })).toBeVisible();
    }

    async cancelCreateWizard(): Promise<void> {
        await this.page.getByTestId("btn_cancelCreateKnowledgeManagement").click();
    }

    async expectArticleListVisible(): Promise<void> {
        await expect(this.statusTab("All")).toBeVisible();
    }

    async prepareDraftArticle(scenarioTitle: string): Promise<void> {
        await this.createDraftArticle(scenarioTitle, FIRST_VERSION_CONTENT);
    }

    async preparePendingApprovalArticle(scenarioTitle: string): Promise<string> {
        const title = await this.createDraftArticle(scenarioTitle, FIRST_VERSION_CONTENT);
        await this.submitDraftForApproval(title);
        return title;
    }

    async prepareNeedsRevisionArticle(scenarioTitle: string, withUpdatedContent = false): Promise<void> {
        const title = await this.preparePendingApprovalArticle(scenarioTitle);
        await this.requestRevision(title);
        if (withUpdatedContent) {
            await this.saveArticleContent(title, UPDATED_VERSION_CONTENT);
        }
    }

    async preparePublishedArticle(scenarioTitle: string): Promise<void> {
        const title = await this.createDraftArticle(scenarioTitle, FIRST_VERSION_CONTENT);
        await this.submitDraftForApproval(title);
        await this.publishPendingApproval(title);
    }

    async prepareArchivedArticle(scenarioTitle: string): Promise<void> {
        await this.preparePublishedArticle(scenarioTitle);
        await this.archiveArticle(this.requireOwnedArticleTitle(), "Published");
    }

    async preparePublishedArticleWithHistory(scenarioTitle: string): Promise<void> {
        await this.preparePublishedArticle(scenarioTitle);
        const title = this.requireOwnedArticleTitle();
        await this.saveArticleContent(title, UPDATED_VERSION_CONTENT, "Published");
        await this.submitDraftForApproval(title);
        await this.publishPendingApproval(title);
    }

    async createAndPublishSecondVersion(): Promise<void> {
        const title = this.requireOwnedArticleTitle();
        await this.saveArticleContent(title, UPDATED_VERSION_CONTENT, "Published");
        await this.submitDraftForApproval(title);
        await this.publishPendingApproval(title);
    }

    async submitCurrentDraftForApproval(): Promise<void> {
        await this.submitDraftForApproval(this.requireOwnedArticleTitle());
    }

    async cancelCurrentDraftSubmission(): Promise<void> {
        await this.openArticleAction(this.requireOwnedArticleTitle(), "Draft", "Approval");
        const dialog = this.page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: "Submit For Approval", exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    }

    async cancelCurrentApprovalDecision(): Promise<void> {
        await this.openApprovalDecision(this.requireOwnedArticleTitle());
        const dialog = this.page.getByRole("dialog");
        // The dialog's accessible heading has changed between UI builds, while this
        // option identifies the approval decision form the scenario is exercising.
        await expect(dialog.getByText("Approve and publish immediately", { exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(dialog).toBeHidden();
    }

    async requestRevisionForCurrentArticle(): Promise<void> {
        await this.requestRevision(this.requireOwnedArticleTitle());
    }

    async resubmitCurrentArticle(): Promise<void> {
        await this.submitDraftForApproval(this.requireOwnedArticleTitle(), "Needs Revision");
    }

    async updateCurrentArticleContent(): Promise<void> {
        await this.saveArticleContent(this.requireOwnedArticleTitle(), UPDATED_VERSION_CONTENT);
    }

    async expectCurrentArticleStatus(status: ArticleStatus): Promise<void> {
        await this.expectArticleStatus(this.requireOwnedArticleTitle(), status);
    }

    async expectCurrentArticleVersion(version: number, status: ArticleStatus): Promise<void> {
        await this.openListTab(status);
        const title = this.requireOwnedArticleTitle();
        await this.searchArticleTitle(title);
        const row = await this.rowWithStatus(title, status);
        await expect(row.getByRole("cell").nth(2)).toHaveText(String(version));
    }

    async expectCurrentArticleActive(): Promise<void> {
        await this.openListTab("Published");
        const title = this.requireOwnedArticleTitle();
        await this.searchArticleTitle(title);
        const row = await this.rowWithStatus(title, "Published");
        await expect(row.getByRole("cell").nth(1).getByText("Active", { exact: true })).toBeVisible();
    }

    async expectCurrentArticleContent(content = FIRST_VERSION_CONTENT): Promise<void> {
        await this.openArticleDetail(this.requireOwnedArticleTitle(), "Draft");
        await this.openDetailTab("Article");
        await expect(this.page.getByRole("tabpanel", { name: "Article" }).getByText(content, { exact: true })).toBeVisible();
    }

    async expectCurrentUpdatedArticleContent(): Promise<void> {
        await this.openArticleDetail(this.requireOwnedArticleTitle(), "Needs Revision");
        await this.openDetailTab("Article");
        await expect(this.page.getByRole("tabpanel", { name: "Article" }).getByText(UPDATED_VERSION_CONTENT, { exact: true })).toBeVisible();
    }

    async expectCurrentArticleComment(): Promise<void> {
        await this.openArticleForEdit(this.requireOwnedArticleTitle(), "Needs Revision");
        await expect(this.page.getByText(REVISION_COMMENT, { exact: true })).toBeVisible();
    }

    async publishCurrentPendingApproval(): Promise<void> {
        await this.publishPendingApproval(this.requireOwnedArticleTitle());
    }

    async archiveCurrentArticle(): Promise<void> {
        await this.archiveArticle(this.requireOwnedArticleTitle(), "Published");
    }

    async cancelArchiveForCurrentArticle(): Promise<void> {
        await this.openArticleAction(this.requireOwnedArticleTitle(), "Published", "Archive");
        const dialog = this.page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: "Archive Article", exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    }

    async restoreCurrentArticle(): Promise<void> {
        await this.restoreArticle(this.requireOwnedArticleTitle());
    }

    async cancelRestoreForCurrentArticle(): Promise<void> {
        await this.openArticleAction(this.requireOwnedArticleTitle(), "Archived", "Unarchive");
        const dialog = this.page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: "Unarchive Article", exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    }

    async expectCurrentArticleInStatusTab(statusTab: "Published" | "Archived"): Promise<void> {
        await this.openListTab(statusTab);
        await this.searchArticleTitle(this.requireOwnedArticleTitle());
        await expect(this.articleRows(this.requireOwnedArticleTitle()).first()).toBeVisible();
    }

    async expectCurrentArticleAbsentFromStatusTab(statusTab: "Published" | "Archived"): Promise<void> {
        await this.openListTab(statusTab);
        await this.searchArticleTitle(this.requireOwnedArticleTitle(), true);
        await expect(this.articleRows(this.requireOwnedArticleTitle())).toHaveCount(0);
    }

    async expectArchiveSuccessMessage(): Promise<void> {
        const title = this.requireOwnedArticleTitle();
        const expectedMessage = `Article "${title}" archived successfully.`;
        expect(this.lastArchiveSuccessMessage).toBe(expectedMessage);
    }

    async openArticleStatusViews(): Promise<void> {
        await this.openArticleList();
    }

    async expectArticleStatusViews(): Promise<void> {
        for (const tab of STATUS_TABS) {
            await expect(this.statusTab(tab)).toBeVisible();
        }
    }

    async openCurrentArticleDetail(): Promise<void> {
        await this.openArticleDetail(this.requireOwnedArticleTitle(), "Draft");
    }

    async openRevisionTab(): Promise<void> {
        await this.openArticleDetail(this.requireOwnedArticleTitle(), "Published");
        await this.openDetailTab("Revision");
    }

    async expectCurrentArticleSavedContent(content = FIRST_VERSION_CONTENT): Promise<void> {
        await expect(this.page.getByRole("tabpanel", { name: "Article" }).getByText(content, { exact: true })).toBeVisible();
    }

    async openEarlierVersionPreview(): Promise<void> {
        await this.openArticleDetail(this.requireOwnedArticleTitle(), "Published");
        await this.openDetailTab("Revision");
        await this.page.getByRole("tabpanel", { name: "Revision" }).getByRole("button", { name: "Version 1", exact: true }).click();
    }

    async expectEarlierVersionPreview(): Promise<void> {
        await expect(this.page.getByRole("heading", { name: "Version 1", exact: true })).toBeVisible();
        await expect(this.page.getByText(FIRST_VERSION_CONTENT, { exact: true })).toBeVisible();
    }

    async searchForCurrentArticle(): Promise<void> {
        await this.openArticleList();
        await this.searchArticleTitle(this.requireOwnedArticleTitle());
    }

    async expectCurrentArticleSearchResult(): Promise<void> {
        await expect(this.articleRows(this.requireOwnedArticleTitle()).first()).toBeVisible();
    }

    async searchForMissingArticle(scenarioTitle: string): Promise<void> {
        const missingArticleSearchTitle = await this.reserveUniqueArticleTitle(`knowledge search no match ${scenarioTitle}`);
        await this.openArticleList();
        await this.searchArticleTitle(missingArticleSearchTitle, true);
    }

    async expectArticleSearchEmpty(): Promise<void> {
        await expect(this.page.getByRole("heading", { name: "No Data Available", exact: true })).toBeVisible();
        await expect(this.page.getByRole("table").first().locator("tbody tr")).toHaveCount(0);
    }

    async openAddFilters(): Promise<void> {
        await this.openArticleList();
        await this.page.getByTestId("btn-add-filter").click();
    }

    async expectStatusFilterAndSearch(): Promise<void> {
        await expect(this.page.getByTestId("filter-option-article_status")).toBeVisible();
        await expect(this.page.getByPlaceholder("Search...", { exact: true })).toBeVisible();
    }

    async showPublishedFilterResults(): Promise<void> {
        await this.page.getByTestId("btn-add-filter").click();
        await this.page.getByTestId("filter-option-article_status").click();
        const searchForItem = this.page.getByPlaceholder("Search for an item", { exact: true });
        await searchForItem.fill("Published");
        await this.page.getByRole("option", { name: "Published", exact: true }).click();
        await this.page.getByTestId("btn-builder-add-filter").click();
        await this.page.keyboard.press("Escape");
        await this.waitForListResults();
    }

    async expectPublishedFilterResults(): Promise<void> {
        const rows = this.page.getByRole("table").first().locator("tbody tr");
        await expect(rows.first()).toBeVisible();
        const count = await rows.count();
        expect(count).toBeGreaterThan(0);
        for (let index = 0; index < count; index += 1) {
            await expect(rows.nth(index).getByRole("cell").nth(3)).toHaveText("Published");
        }
    }

    async prepareAllArticleListWithPublishedHistory(scenarioTitle: string): Promise<void> {
        await this.preparePublishedArticleWithHistory(scenarioTitle);
        await this.openListTab("All");
    }

    async prepareComplaintCategoryArticle(scenarioTitle: string): Promise<void> {
        await this.createDraftArticle(scenarioTitle, FIRST_VERSION_CONTENT);
        await this.openListTab("All");
    }

    async filterByComplaintCategory(): Promise<void> {
        await this.page.getByTestId("btn-add-filter").click();
        await this.page.getByTestId("filter-option-case_category_id").click();
        const searchForItem = this.page.getByPlaceholder("Search for an item", { exact: true });
        await searchForItem.fill("Complaint");
        await this.page.getByRole("option", { name: "Complaint", exact: true }).click();
        await this.page.getByTestId("btn-builder-add-filter").click();
        await this.page.keyboard.press("Escape");
        await this.waitForListResults();
    }

    async expectComplaintCategoryResult(): Promise<void> {
        const title = this.requireOwnedArticleTitle();
        await this.searchArticleTitle(title);
        const row = await this.rowWithStatus(title, "Draft");
        await expect(row.getByRole("cell").nth(6)).toContainText("Complaint");
    }

    async expectCurrentArticleInFilteredResults(): Promise<void> {
        const title = this.requireOwnedArticleTitle();
        await this.searchArticleTitle(title);
        await expect(this.articleRows(title).first()).toBeVisible();
    }

    async expectNoSupersededFilterResults(): Promise<void> {
        const rows = this.page.getByRole("table").first().locator("tbody tr");
        const count = await rows.count();
        for (let index = 0; index < count; index += 1) {
            await expect(rows.nth(index).getByRole("cell").nth(3)).not.toHaveText("Superseded");
        }
    }

    async expectVersionOneAndTwoInHistory(): Promise<void> {
        const panel = this.page.getByRole("tabpanel", { name: "Revision" });
        await expect(panel.getByRole("button", { name: "Version 1", exact: true })).toBeVisible();
        await expect(panel.getByRole("button", { name: "Version 2", exact: true })).toBeVisible();
    }

    async expectVersionTwoActive(): Promise<void> {
        const panel = this.page.getByRole("tabpanel", { name: "Revision" });
        const versionTwoRow = panel.getByRole("row").filter({ hasText: "Version 2" });
        await expect(versionTwoRow.getByText("Active", { exact: true })).toBeVisible();
    }

    async openCurrentPublishedArticleTab(): Promise<void> {
        await this.openArticleDetail(this.requireOwnedArticleTitle(), "Published");
        await this.openDetailTab("Article");
    }

    async cleanupOwnedArticles(): Promise<void> {
        for (const title of this.ownedArticleTitles) {
            this.assertOwnedTitle(title);
            await this.openListTab("Archived");
            await this.searchArticleTitle(title, true);
            if (await this.articleRows(title).count() > 0) {
                continue;
            }

            await this.openListTab("All");
            await this.searchArticleTitle(title);
            const rows = this.articleRows(title);
            const statuses = new Set<string>();
            for (let index = 0; index < await rows.count(); index += 1) {
                statuses.add((await rows.nth(index).getByRole("cell").nth(3).innerText()).trim());
            }
            if (statuses.size === 1 && statuses.has("Draft")) {
                await this.archiveArticle(title, "Draft");
                await this.expectArticleInStatusTab(title, "Archived");
                continue;
            }

            const published = await this.ensureOwnedArticlePublished(title);
            if (!published) {
                continue;
            }
            await this.archiveArticle(title, "Published", "All");
            await this.expectArticleInStatusTab(title, "Archived");
        }
        this.ownedArticleTitles.clear();
    }

    private async createDraftArticle(scenarioTitle: string, content: string): Promise<string> {
        await this.prepareCreateForm(scenarioTitle);
        const title = this.requirePreparedTitle();
        await this.fillArticleDetails(title);
        await this.advanceToContentStep();
        await this.fillArticleContent(content);
        await this.submitCreateWizard(title);
        this.preparedArticleTitle = null;
        return title;
    }

    private async fillArticleDetails(title: string): Promise<void> {
        await this.page.getByRole("textbox", { name: "Article Name" }).fill(title);
        await this.page.getByRole("textbox", { name: "Description" }).fill(ARTICLE_DESCRIPTION);
        await this.page.getByRole("radio", { name: "Internal", exact: true }).check();
    }

    private async waitForDetailsForm(): Promise<void> {
        await expect(this.page.getByRole("heading", { name: "Details", exact: true })).toBeVisible();
        await expect(this.page.getByRole("textbox", { name: "Article Name" })).toBeVisible();
        await expect(this.page.getByTestId("dropdown-entity")).toBeVisible();
        await expect(this.page.getByTestId("dropdown-cts_category")).toBeVisible();
        await expect(this.page.getByRole("textbox", { name: "Description" })).toBeVisible();
        await expect(this.page.getByRole("radio", { name: "Internal", exact: true })).toBeVisible();
    }

    private async selectComplaintCategory(): Promise<void> {
        await this.page.getByTestId("dropdown-cts_category").click();
        await this.page.getByRole("menuitem", { name: ARTICLE_CATEGORY, exact: true }).click();
    }

    private async advanceToContentStep(): Promise<void> {
        await this.page.getByRole("button", { name: "Next", exact: true }).click();
        await expect(this.page.getByRole("heading", { name: "Content", exact: true })).toBeVisible();
    }

    private async fillArticleContent(content: string): Promise<void> {
        await this.page.getByRole("textbox", { name: "Article content", exact: true }).fill(content);
    }

    private async submitCreateWizard(title: string): Promise<void> {
        await this.page.getByRole("button", { name: "Next", exact: true }).click();
        await expect(this.page.getByRole("heading", { name: "Summary", exact: true })).toBeVisible();
        await expect(this.page.getByText(title, { exact: true })).toBeVisible();
        this.ownedArticleTitles.add(title);
        await this.page.getByRole("button", { name: "Next", exact: true }).click();
        await expect(this.page.getByText("New Article has been successfully created", { exact: true })).toBeVisible({ timeout: 30_000 });
    }

    private async submitDraftForApproval(title: string, status: "Draft" | "Needs Revision" = "Draft"): Promise<void> {
        await this.openArticleAction(title, status, status === "Draft" ? "Approval" : "Approval");
        const dialog = this.page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: "Submit For Approval", exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: "Yes", exact: true }).click();
        await expect(dialog).toBeHidden();
        await this.expectArticleStatus(title, "Pending Approval");
    }

    private async openApprovalDecision(title: string): Promise<void> {
        await this.openArticleAction(title, "Pending Approval", "Submit Approval");
        await expect(this.page.getByRole("dialog")).toBeVisible();
    }

    private async publishPendingApproval(title: string): Promise<void> {
        await this.openApprovalDecision(title);
        const dialog = this.page.getByRole("dialog");
        const publishOption = dialog.getByText("Approve and publish immediately", { exact: true });
        await expect(publishOption).toBeVisible();
        await publishOption.click();
        await dialog.getByRole("button", { name: "Save", exact: true }).click();
        await expect(dialog).toBeHidden();
        // The status transition can complete before the Published view refreshes.
        // Verify and continue from All, which is also the view used by cleanup.
        await this.expectArticleStatus(title, "Published", undefined, "All");
    }

    private async ensureOwnedArticlePublished(title: string): Promise<boolean> {
        await this.openListTab("All");
        await this.searchArticleTitle(title);
        const rows = this.articleRows(title);
        const count = await rows.count();
        if (count === 0) {
            return false;
        }

        const statuses = new Set<string>();
        for (let index = 0; index < count; index += 1) {
            statuses.add((await rows.nth(index).getByRole("cell").nth(3).innerText()).trim());
        }
        if (statuses.has("Published")) {
            return true;
        }
        if (statuses.has("Draft")) {
            await this.submitDraftForApproval(title);
        } else if (statuses.has("Needs Revision")) {
            await this.submitDraftForApproval(title, "Needs Revision");
        }

        await this.openListTab("All");
        await this.searchArticleTitle(title);
        const currentRows = this.articleRows(title);
        for (let index = 0; index < await currentRows.count(); index += 1) {
            const currentStatus = (await currentRows.nth(index).getByRole("cell").nth(3).innerText()).trim();
            if (currentStatus === "Pending Approval") {
                await this.publishPendingApproval(title);
                return true;
            }
            if (currentStatus === "Published") {
                return true;
            }
        }
        return false;
    }

    private async requestRevision(title: string): Promise<void> {
        await this.openApprovalDecision(title);
        const dialog = this.page.getByRole("dialog");
        await dialog.getByText("Request Revision", { exact: true }).click();
        await dialog.getByPlaceholder("Add Comments for the author", { exact: true }).fill(REVISION_COMMENT);
        await dialog.getByRole("button", { name: "Save", exact: true }).click();
        await this.expectArticleStatus(title, "Needs Revision");
    }

    private async saveArticleContent(
        title: string,
        content: string,
        sourceStatus: "Needs Revision" | "Published" = "Needs Revision",
    ): Promise<void> {
        await this.openArticleForEdit(title, sourceStatus);
        await this.page.getByRole("tab", { name: "Content", exact: true }).click();
        await this.fillArticleContent(content);
        await this.page.getByRole("button", { name: "Save", exact: true }).click();
        await expect(this.page.getByText("Article updated successfully", { exact: true })).toBeVisible({ timeout: 30_000 });
        await this.expectArticleStatus(title, sourceStatus === "Needs Revision" ? "Needs Revision" : "Draft");
    }

    private async openArticleForEdit(title: string, status: ArticleStatus): Promise<void> {
        await this.openListTab(status);
        await this.searchArticleTitle(title);
        const row = await this.rowWithStatus(title, status);
        await row.getByTestId("btn_KebabMenu").click();
        await this.page.getByRole("menuitem", { name: "Edit", exact: true }).click();
        await expect(this.page.getByRole("tab", { name: "Details", exact: true })).toBeVisible();
    }

    private async archiveArticle(title: string, status: ArticleStatus, tab: string = status): Promise<void> {
        await this.openArticleAction(title, status, "Archive", tab);
        await this.confirmArchiveDialog(title);
    }

    private async confirmArchiveDialog(title: string): Promise<void> {
        const dialog = this.page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: "Archive Article", exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: "Archive", exact: true }).click();
        const message = `Article "${title}" archived successfully.`;
        await expect(this.page.getByText(message, { exact: true })).toBeVisible({ timeout: 30_000 });
        this.lastArchiveSuccessMessage = message;
    }

    private async restoreArticle(title: string): Promise<void> {
        await this.openArticleAction(title, "Archived", "Unarchive");
        const dialog = this.page.getByRole("dialog");
        await expect(dialog.getByRole("heading", { name: "Unarchive Article", exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: "Unarchive", exact: true }).click();
        await this.expectArticleInStatusTab(title, "Published");
    }

    private async openArticleAction(
        title: string,
        status: ArticleStatus,
        action: string,
        tab: string = status,
    ): Promise<void> {
        await this.openListTab(tab);
        await this.searchArticleTitle(title);
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const row = await this.rowWithStatus(title, status);
            await row.getByRole("button", { name: "Open menu", exact: true }).click();
            const menuItem = this.page.getByRole("menuitem", { name: action, exact: true });
            try {
                await expect(menuItem).toBeVisible({ timeout: 5_000 });
                await menuItem.click();
                return;
            } catch (error) {
                await this.page.keyboard.press("Escape");
                if (attempt === 1) {
                    throw error;
                }
            }
        }
    }

    private async openArticleDetail(title: string, status: ArticleStatus): Promise<void> {
        await this.openListTab(status);
        await this.searchArticleTitle(title);
        const row = await this.rowWithStatus(title, status);
        await row.click();
    }

    private async openDetailTab(tab: "Article" | "Revision"): Promise<void> {
        await this.page.getByRole("tab", { name: tab, exact: true }).last().click();
        await expect(this.page.getByRole("tabpanel", { name: tab })).toBeVisible();
    }

    private async expectArticleStatus(title: string, status: ArticleStatus, version?: number, tab: string = status): Promise<void> {
        await this.openListTab(tab);
        await this.searchArticleTitle(title);
        const row = await this.rowWithStatus(title, status);
        await expect(row.getByRole("cell").nth(3)).toHaveText(status);
        if (version !== undefined) {
            await expect(row.getByRole("cell").nth(2)).toHaveText(String(version));
        }
    }

    private async expectArticleInStatusTab(title: string, tab: "Published" | "Archived"): Promise<void> {
        await this.openListTab(tab);
        await this.searchArticleTitle(title);
        await expect(this.articleRows(title).first()).toBeVisible();
    }

    private async openListTab(tab: string): Promise<void> {
        await this.openArticleList();
        const tabName = tab === "Needs Revision" ? "Need Revision" : tab;
        await this.statusTab(tabName).click();
        await this.waitForListResults();
    }

    private async searchArticleTitle(title: string, allowMissing = false): Promise<void> {
        const search = this.page.getByPlaceholder("Search...", { exact: true });
        await expect(search).toBeVisible();
        await search.fill(title);
        await expect.poll(async () => {
            const hasMatchingRow = await this.articleRows(title).count() > 0;
            if (hasMatchingRow) return true;
            if (!allowMissing) return false;
            return this.page.getByRole("heading", { name: "No Data Available", exact: true }).isVisible().catch(() => false);
        }, { timeout: 30_000 }).toBe(true);
    }

    private async waitForListResults(): Promise<void> {
        await expect.poll(async () => {
            const hasRows = await this.page.getByRole("table").first().locator("tbody tr").count() > 0;
            const isEmpty = await this.page.getByRole("heading", { name: "No Data Available", exact: true }).isVisible().catch(() => false);
            return hasRows || isEmpty;
        }, { timeout: 30_000 }).toBe(true);
    }

    private articleRows(title: string): Locator {
        const titleText = this.page.getByText(title, { exact: true });
        return this.page.getByRole("table").first().locator("tbody tr").filter({ has: titleText });
    }

    private statusTab(name: string): Locator {
        // Status tabs include their dynamic result count in the accessible name.
        return this.page.getByRole("tab", { name });
    }

    private async rowWithStatus(title: string, status: ArticleStatus): Promise<Locator> {
        const rows = this.articleRows(title);
        const count = await rows.count();
        for (let index = 0; index < count; index += 1) {
            const row = rows.nth(index);
            const rowStatus = (await row.getByRole("cell").nth(3).innerText()).trim();
            if (rowStatus === status) {
                return row;
            }
        }
        throw new Error(`The E2E-owned article was not found with status ${status}.`);
    }

    private async titleExists(title: string): Promise<boolean> {
        for (const tab of ["All", "Archived"]) {
            await this.openListTab(tab);
            await this.searchArticleTitle(title, true);
            if (await this.articleRows(title).count() > 0) {
                return true;
            }
        }
        return false;
    }

    private async reserveUniqueArticleTitle(scenarioTitle: string): Promise<string> {
        const readableLabel = scenarioTitle
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const distinctions = ["", " second attempt", " third attempt", " fourth attempt"];
        for (const distinction of distinctions) {
            const title = e2eValue(`knowledge article ${readableLabel}${distinction}`);
            if (!(await this.titleExists(title))) {
                return title;
            }
        }
        throw new Error("Could not reserve a unique E2E article title after checking existing owned records.");
    }

    private requirePreparedTitle(): string {
        if (!this.preparedArticleTitle) {
            throw new Error("No E2E article title was prepared for the current creation wizard.");
        }
        return this.preparedArticleTitle;
    }

    private requireOwnedArticleTitle(): string {
        const title = this.ownedArticleTitles.values().next().value as string | undefined;
        if (!title) {
            throw new Error("No E2E-owned article has been created in this scenario.");
        }
        this.assertOwnedTitle(title);
        return title;
    }

    private assertOwnedTitle(title: string): void {
        if (!title.startsWith("E2E knowledge article ")) {
            throw new Error("Knowledge Management mutations require a tracked E2E-owned article title.");
        }
    }
}
