import { createBdd } from "playwright-bdd";
import { test } from "../../fixtures/base.fixture";

const { Given, When, Then } = createBdd(test);

Given("the user is on the survey template manager page", async ({ pageContext, surveyTemplateManagerPage }) => {
    pageContext.setCurrentPage("survey-template-manager");
    await surveyTemplateManagerPage.navigateTo();
});

Given("more than one page of survey templates is available", async ({ pageContext, surveyTemplateManagerPage, $testInfo }) => {
    pageContext.setCurrentPage("survey-template-manager");
    await surveyTemplateManagerPage.navigateTo();
    if (!(await surveyTemplateManagerPage.hasNextTemplatePage())) {
        $testInfo.skip(true, "Pagination requires more than one page of survey templates in the environment.");
    }
});

Given("an E2E-owned survey template with one required text question has been created", async ({ surveyTemplateManagerPage, $testInfo }) => {
    const name = await surveyTemplateManagerPage.createTemplateForLifecycleScenario();
    if (!name) {
        $testInfo.skip(true, "Survey template creation requires an available domain and the Converge entity.");
    }
});

Given("a read-only survey template with responses is available", async ({ surveyTemplateManagerPage, $testInfo }) => {
    const name = await surveyTemplateManagerPage.findFirstTemplateWithResponses();
    if (!name) {
        $testInfo.skip(true, "Reports require at least one existing survey template with responses.");
    }
});

When("the user moves to the next survey template page", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.goToNextTemplatePage();
});

Then("the next page shows a different set of survey templates", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.expectNextTemplatePageChanged();
});

When("the user creates a survey template with one required text question and a unique E2E name", async ({ surveyTemplateManagerPage, $testInfo }) => {
    const name = await surveyTemplateManagerPage.createE2EOwnedTemplate();
    if (!name) {
        $testInfo.skip(true, "Survey template creation requires an available domain and the Converge entity.");
    }
});

Then("the survey template creation confirmation is shown", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.expectCreationConfirmation();
});

Then("the created survey template appears in the list", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.expectCreatedTemplateInList();
});

When("the user changes the created survey template name", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.changeCreatedTemplateName();
});

Then("the survey template update confirmation is shown", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.expectTemplateUpdateConfirmation();
});

Then("the updated survey template name appears in the list", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.expectUpdatedTemplateInList();
});

When("the user deletes the created survey template", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.deleteCreatedTemplate();
});

Then("the survey template deletion confirmation is shown", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.expectTemplateDeletionConfirmation();
});

Then("the deleted survey template no longer appears in the list", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.expectDeletedTemplateAbsent();
});

When("the user opens that survey template's reports", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.openSelectedTemplateReports();
});

Then("the response analysis is visible", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.expectResponseAnalysisVisible();
});

When("the user exports the responses and logs", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.exportResponsesAndLogs();
});

Then("both survey export files are downloaded successfully", async ({ surveyTemplateManagerPage }) => {
    await surveyTemplateManagerPage.expectExportsDownloaded();
});
