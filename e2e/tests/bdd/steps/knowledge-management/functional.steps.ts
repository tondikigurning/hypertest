import { createBdd } from "playwright-bdd";
import { expect, test } from "../../fixtures/base.fixture";

const { Given, When, Then } = createBdd(test);

Given("the author has selected an available entity and CTS category", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.prepareCreateForm($testInfo.title);
});

When("the author creates an internal article with a unique E2E title, description, and content", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.createPreparedDraft();
});

Then("the article list shows that title as version 1 Draft", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleVersion(1, "Draft");
});

Then("the article detail shows the saved content", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleContent();
});

Given("the author is on the article creation Details step", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.prepareEmptyDetailsStep();
});

Then("the CTS Category field is disabled", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCategoryDisabled();
});

When("the author selects the available Converge entity", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.selectConvergeEntity();
});

Then("the CTS Category field becomes enabled", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCategoryEnabled();
});

When("the author selects Next with all Details fields empty", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.advanceEmptyDetails();
});

Then("the Details step remains open", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Details", exact: true })).toBeVisible();
});

Then("the form shows {string}", async ({ knowledgeManagementPage }, message: string) => {
    await knowledgeManagementPage.expectCreateValidation(message);
});

When("the author selects Cancel without submitting the form", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.cancelCreateWizard();
});

Then("the article creation wizard closes", async ({ page }) => {
    await expect(page).not.toHaveURL(/\/knowledge-management\/create(?:\?|$)/);
});

Then("the article list is shown", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectArticleListVisible();
});

Given("the author has completed article Details and is on the Content step", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.prepareEmptyContentStep($testInfo.title);
});

When("the author selects Next without adding content", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.advanceEmptyContent();
});

Then("the Content step remains open", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Content", exact: true })).toBeVisible();
});

Given("an E2E-owned article is in Draft status", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.prepareDraftArticle($testInfo.title);
});

When("the author confirms Approval for that article", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.submitCurrentDraftForApproval();
});

Then("the same article appears in Pending Approval", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleStatus("Pending Approval");
});

Given("an E2E-owned draft article is awaiting approval", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.preparePendingApprovalArticle($testInfo.title);
});

When("the approver saves the immediate approval and publication decision", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.publishCurrentPendingApproval();
});

Then("the same article appears as Published with an Active badge", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleStatus("Published");
    await knowledgeManagementPage.expectCurrentArticleActive();
});

When("the user cancels the Submit For Approval confirmation", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.cancelCurrentDraftSubmission();
});

Then("the same article remains in Draft", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleStatus("Draft");
});

Given("an E2E-owned article is in Pending Approval", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.preparePendingApprovalArticle($testInfo.title);
});

When("the user cancels the Approval Article decision", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.cancelCurrentApprovalDecision();
});

Then("the same article remains in Pending Approval", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleStatus("Pending Approval");
});

When("the user requests a revision with a comment", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.requestRevisionForCurrentArticle();
});

Then("the article appears as Needs Revision", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleStatus("Needs Revision");
});

Then("the comment appears in the article's edit comments", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleComment();
});

Given("an E2E-owned article is in Needs Revision with updated content", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.prepareNeedsRevisionArticle($testInfo.title, true);
});

When("the user confirms Submit For Approval", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.resubmitCurrentArticle();
});

Given("an E2E-owned article has a Published version 1", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.preparePublishedArticle($testInfo.title);
});

When("the author creates and publishes version 2 with updated content", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.createAndPublishSecondVersion();
});

Then("version 2 appears Published with an Active badge", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleVersion(2, "Published");
    await knowledgeManagementPage.expectCurrentArticleActive();
});

Then("version 1 appears in Superseded", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleVersion(1, "Superseded");
});

Given("an E2E-owned article is in Needs Revision with reviewer feedback", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.prepareNeedsRevisionArticle($testInfo.title);
});

When("the user saves updated article content", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.updateCurrentArticleContent();
});

Then("the article detail shows the updated content", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentUpdatedArticleContent();
});

Then("the article remains in Needs Revision", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleStatus("Needs Revision");
});

Given("an E2E-owned article is Published", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.preparePublishedArticle($testInfo.title);
});

When("the author confirms Archive for that article", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.archiveCurrentArticle();
});

Then("the article disappears from Published", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleAbsentFromStatusTab("Published");
});

Then("the same article appears in Archived", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleInStatusTab("Archived");
});

Then("the same article appears in Published", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleInStatusTab("Published");
});

Then(/the success message is "Article \\"<article title>\\" archived successfully\."/, async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectArchiveSuccessMessage();
});

Given("an E2E-owned article is Archived", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.prepareArchivedArticle($testInfo.title);
});

When("the author confirms Unarchive for that article", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.restoreCurrentArticle();
});

Then("the article disappears from Archived", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleAbsentFromStatusTab("Archived");
});

When("the user cancels the Archive confirmation", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.cancelArchiveForCurrentArticle();
});

Then("the same article remains in Published", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleStatus("Published");
});

When("the user cancels the Unarchive confirmation", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.cancelRestoreForCurrentArticle();
});

Then("the same article remains in Archived", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleInStatusTab("Archived");
});

When("the user opens the Knowledge Management article list", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.openArticleStatusViews();
});

Then("the list offers Published, All, Draft, Pending Approval, Need Revision, Superseded, and Archived views", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectArticleStatusViews();
});

Given("an E2E-owned article has been created as a draft", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.prepareDraftArticle($testInfo.title);
});

When("the user opens that article's detail", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.openCurrentArticleDetail();
});

Then("the detail shows the content saved for the article", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleSavedContent();
});

Given("an E2E-owned article has a Published version 2 and a Superseded version 1", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.preparePublishedArticleWithHistory($testInfo.title);
});

When("the user opens the article's Revision tab", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.openRevisionTab();
});

Then("the revision history lists versions 1 and 2", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectVersionOneAndTwoInHistory();
});

Then("version 2 is marked Active", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectVersionTwoActive();
});

Given("an E2E-owned article has more than one version", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.preparePublishedArticleWithHistory($testInfo.title);
});

When("the user selects an earlier version in the revision history", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.openEarlierVersionPreview();
});

Then("the version preview shows that version's saved content", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectEarlierVersionPreview();
});

When("the user opens Add Filters on the article list", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.openAddFilters();
});

Then("the filter choices include Status", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectStatusFilterAndSearch();
});

Then("the article list provides a search field", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectStatusFilterAndSearch();
});

Given("an E2E-owned article has a known unique title", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.prepareDraftArticle($testInfo.title);
});

When("the user searches for that exact title", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.searchForCurrentArticle();
});

Then("the matching article appears in the search results", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleSearchResult();
});

When("the user searches for a title that matches no article", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.searchForMissingArticle($testInfo.title);
});

Then("the article list shows {string}", async ({ page }, message: string) => {
    await expect(page.getByRole("heading", { name: message, exact: true })).toBeVisible();
});

Then("the list has no article results", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectArticleSearchEmpty();
});

Given("the user is viewing the All article list", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.prepareAllArticleListWithPublishedHistory($testInfo.title);
});

When("the user applies the Status filter for Published", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.showPublishedFilterResults();
});

Then("the results include Published articles", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectPublishedFilterResults();
});

Then("the results exclude Superseded articles", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectNoSupersededFilterResults();
});

Given("an E2E-owned article belongs to a category under Complaint", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.prepareComplaintCategoryArticle($testInfo.title);
});

When("the user filters the article list by the Complaint category", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.filterByComplaintCategory();
});

Then("the results include the E2E-owned article", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleInFilteredResults();
});

Then("its category path is under Complaint", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectComplaintCategoryResult();
});

Given("an E2E-owned article is Published with saved content", async ({ knowledgeManagementPage, $testInfo }) => {
    await knowledgeManagementPage.preparePublishedArticle($testInfo.title);
});

When("the user opens the article's Article tab", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.openCurrentPublishedArticleTab();
});

Then("the article tab shows the published content", async ({ knowledgeManagementPage }) => {
    await knowledgeManagementPage.expectCurrentArticleSavedContent();
});
