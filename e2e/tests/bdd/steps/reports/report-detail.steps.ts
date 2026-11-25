import { createBdd } from "playwright-bdd";
import { test } from "../../fixtures/base.fixture";

const { Given, When, Then } = createBdd(test);

Given("the Report Templates list contains an accessible Case Management template", async ({ reportTemplatesPage, $testInfo }) => {
    $testInfo.skip(!(await reportTemplatesPage.findCaseTemplate()), "The verified Case Management reference template is unavailable.");
});
When("the user opens that template", async ({ reportTemplatesPage }) => { await reportTemplatesPage.openIdentifiedTemplate(); });
Then("the template detail shows its name, report type and report table", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectTemplateDetail(); });
When("the user opens Show Configuration", async ({ reportTemplatesPage }) => { await reportTemplatesPage.openConfiguration(); });
Then("the configuration displays the date filter and Values", async ({ reportTemplatesPage }) => { await reportTemplatesPage.expectConfiguration(); });
