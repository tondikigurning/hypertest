import { createBdd } from "playwright-bdd";
import { test } from "../../fixtures/base.fixture";

const { Given, When, Then } = createBdd(test);

When("the user opens Report Templates from Reports", async ({ reportTemplatesPage }) => { await reportTemplatesPage.openFromReports(); });
Given("the Report Templates list is open", async ({ reportTemplatesPage }) => { await reportTemplatesPage.navigate(); });
Then("the report template list is visible with Report Name, Description, Created By and Created At columns", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectList(); });
Then("the list shows its current page and pagination controls", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectPagination(); });

Given("the Report Templates list contains templates", async ({ reportTemplatesPage, $testInfo }) => {
    await reportTemplatesPage.navigate();
    $testInfo.skip(!(await reportTemplatesPage.hasRows()), "The template list is empty.");
});
Given("a search term is known not to match any template", async ({ reportTemplatesPage, $testInfo }) => {
    await reportTemplatesPage.searchNoMatchCandidate();
    $testInfo.skip(!(await reportTemplatesPage.isNoMatch()), "The candidate search term matches data or its result is not yet available.");
    await reportTemplatesPage.reset();
});
Given("a report name value is known not to match any template", async ({ reportTemplatesPage, $testInfo }) => {
    await reportTemplatesPage.filterNoMatchCandidate();
    $testInfo.skip(!(await reportTemplatesPage.isNoMatch()), "The candidate filter value matches data or its result is not yet available.");
    await reportTemplatesPage.reset();
});
When("the user searches for that term", async ({ reportTemplatesPage }) => { await reportTemplatesPage.searchNoMatchCandidate(); });
When("the user filters Report Name using Contains All and that value", async ({ reportTemplatesPage }) => { await reportTemplatesPage.filterNoMatchCandidate(); });
Then("the template list displays {string} and {string}", async ({ reportTemplatesPage }, heading: string, detail: string) => { await reportTemplatesPage.expectNoMatch(heading, detail); });
Then("the template list displays {string}", async ({ reportTemplatesPage }, heading: string) => { await reportTemplatesPage.expectNoMatch(heading); });
When("the user resets the list search", async ({ reportTemplatesPage }) => { await reportTemplatesPage.reset(); });
When("the user resets the list filters", async ({ reportTemplatesPage }) => { await reportTemplatesPage.reset(); });
Then("the populated template list is visible again", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectPopulated(); });

Given("the Report Templates list has more than one page of results", async ({ reportTemplatesPage, $testInfo }) => {
    await reportTemplatesPage.prepareFirstPage();
    $testInfo.skip(!(await reportTemplatesPage.hasNextPage()), "The list has fewer than two pages of results.");
});
Given("the first page is displayed", async ({ reportTemplatesPage }) => { await reportTemplatesPage.prepareFirstPage(); });
When("the user navigates to the next page", async ({ reportTemplatesPage }) => { await reportTemplatesPage.nextPage(); });
When("the user navigates to the previous page", async ({ reportTemplatesPage }) => { await reportTemplatesPage.previousPage(); });
Then("the displayed row range advances to the next page", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectRangeChanged(); });
Then("the displayed row range returns to the first page", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectRangeRestored(); });

Given("the Report Templates list is open for an account with no available saved views", async ({ reportTemplatesPage, page, $testInfo }) => {
    await reportTemplatesPage.navigate();
    await reportTemplatesPage.openViews();
    $testInfo.skip(!(await reportTemplatesPage.viewsEmpty()), "The account has available saved views.");
    await page.keyboard.press("Escape");
});
When("the user opens Load Views", async ({ reportTemplatesPage }) => { await reportTemplatesPage.openViews(); });
Then("the saved views dialog displays {string}", async ({ reportTemplatesPage }, text: string) => { await reportTemplatesPage.expectViewsMessage(text); });

When("the user selects Create New", async ({ reportTemplatesPage }) => { await reportTemplatesPage.openCreate(); });
Then("Next is disabled until a report type is selected", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectNextDisabled(); });
When("the user selects a Case Management report type", async ({ reportTemplatesPage }) => { await reportTemplatesPage.selectCaseType(); });
Then("the selected report type's fields are previewed and Next is enabled", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectTypePreview(); });
When("the user selects Next", async ({ reportTemplatesPage }) => { await reportTemplatesPage.nextToEditor(); });
Then("the create template editor shows the selected report type, available fields, Values, grouping areas and preview", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectEditor(); });
Then("the Date Filter is {string}", async ({ reportTemplatesPage }, value: string) => { await reportTemplatesPage.expectDate(value); });
Given("the create template editor is open for a Case Management report type", async ({ reportTemplatesPage }) => { await reportTemplatesPage.openEditor(); });
Given("the unchanged create template editor is open for a Case Management report type", async ({ reportTemplatesPage }) => { await reportTemplatesPage.openEditor(); });
Given("the template name and Values are empty", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectEmptyEditor(); });
When("the user selects Save & Continue", async ({ reportTemplatesPage }) => { await reportTemplatesPage.save(); });
Then("the editor remains open and displays {string}", async ({ reportTemplatesPage }, text: string) => { await reportTemplatesPage.expectEditor(); await reportTemplatesPage.expectValidation(text); });
Then("the editor displays {string}", async ({ reportTemplatesPage }, text: string) => { await reportTemplatesPage.expectValidation(text); });
When("the user cancels creation", async ({ reportTemplatesPage }) => { await reportTemplatesPage.cancel(); });
Then("the Report Templates list is visible", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectList(); });
