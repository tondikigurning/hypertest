import { createBdd } from "playwright-bdd";
import { test } from "../../fixtures/base.fixture";

const { Given, When, Then } = createBdd(test);

Given("the user opens Bulk from the Cases list", async ({ casesBulkPage }) => { await casesBulkPage.open(); });
When("no bulk action is selected", async () => {});
Then("Next is disabled", async ({ casesBulkPage }) => { await casesBulkPage.expectNextDisabled(); });
When(/^the user (?:selects|has selected) (Resolve|Close) and continues to Upload File List$/, async ({ casesBulkPage }, action: "Resolve" | "Close") => { await casesBulkPage.continueToUpload(action); });
Then("Apply Bulk Operation is disabled while no file is selected", async ({ casesBulkPage }) => { await casesBulkPage.expectApplyEnabled(false); });
When("the user returns to the bulk action selection", async ({ casesBulkPage }) => { await casesBulkPage.back(); });
Then(/^the summary (?:still )?shows (Closed|Resolved) as the selected action$/, async ({ casesBulkPage }, action: "Closed" | "Resolved") => { await casesBulkPage.expectAction(action); });
When(/^the user cancels the bulk workflow(?: without applying it)?$/, async ({ casesBulkPage }) => { await casesBulkPage.cancel(); });
Then("the Cases list is displayed", async ({ casesBulkPage }) => { await casesBulkPage.expectList(); });
When("the user downloads the template", async ({ casesBulkPage }) => { await casesBulkPage.downloadTemplate(); });
Then('the downloaded CSV has the columns "Case Number" and "Remarks"', async ({ casesBulkPage }) => { casesBulkPage.expectTemplateColumns(); });
When("the user selects a synthetic CSV containing only the template headers", async ({ casesBulkPage }) => { await casesBulkPage.selectFile("csv"); });
When("the user selects a synthetic text file with no case numbers", async ({ casesBulkPage }) => { await casesBulkPage.selectFile("text"); });
Then(/^the (?:selected file|CSV|same selected file) (?:appears|remains) in the summary$/, async ({ casesBulkPage }) => { await casesBulkPage.expectSelectedFile(); });
Then("Apply Bulk Operation is enabled", async ({ casesBulkPage }) => { await casesBulkPage.expectApplyEnabled(true); });
Then("Apply Bulk Operation is disabled", async ({ casesBulkPage }) => { await casesBulkPage.expectApplyEnabled(false); });
When("the user removes the selected file", async ({ casesBulkPage }) => { await casesBulkPage.removeSelectedFile(); });
Then("the summary shows that no file is uploaded", async ({ casesBulkPage }) => { await casesBulkPage.expectNoFile(); });
Then("the upload shows {string}", async ({ casesBulkPage }, message: string) => { await casesBulkPage.expectFileError(true, message); });
Then("the unsupported file type message is removed", async ({ casesBulkPage }) => { await casesBulkPage.expectFileError(false); });
When("the user replaces it with a synthetic CSV containing only the template headers", async ({ casesBulkPage }) => { await casesBulkPage.selectFile("csv"); });
When("the user goes back and changes the bulk action to Resolve", async ({ casesBulkPage }) => { await casesBulkPage.back(); await casesBulkPage.selectAction("Resolve"); });
Given(/^the user has selected (an unsupported synthetic text file|a synthetic header-only CSV) (?:in|for) Bulk Close$/, async ({ casesBulkPage }, file: string) => {
    await casesBulkPage.open();
    await casesBulkPage.continueToUpload("Close");
    await casesBulkPage.selectFile(file.startsWith("an unsupported") ? "text" : "csv");
});
