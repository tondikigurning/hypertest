import { createBdd } from "playwright-bdd";
import { test } from "../../fixtures/base.fixture";
import { CasesPrerequisiteError } from "../../pages/case-management/CasesPage";

const { Given, When, Then } = createBdd(test);
async function withPrerequisite(action: () => Promise<void>): Promise<void> {
    try { await action(); } catch (error) {
        if (!(error instanceof CasesPrerequisiteError)) throw error;
        test.skip(true, error.message);
    }
}

Given("an accessible Open case has no assigned agent", async ({ casesActionPage }) => { await withPrerequisite(() => casesActionPage.prepareOpenUnassigned()); });
Given("an accessible In Progress case has no assigned agent", async ({ casesActionPage }) => { await withPrerequisite(() => casesActionPage.prepareInProgressUnassigned()); });
Given("an accessible In Progress case assigned to the current agent offers Transfer Case", async ({ casesActionPage }) => { await withPrerequisite(() => casesActionPage.prepareTransfer(false)); });
Given("an accessible In Progress case offers Transfer Case and an available agent", async ({ casesActionPage }) => { await withPrerequisite(() => casesActionPage.prepareTransfer(true)); });
When("the user opens Transfer Case without selecting an agent", async ({ casesActionPage }) => { await casesActionPage.openTransfer(); });
Then(/^Next is disabled (?:in the Reassign Agent dialog|until an agent is selected again)$/, async ({ casesActionPage }) => { await casesActionPage.expectTransferNextDisabled(); });
When("the user selects an available agent and continues", async ({ casesActionPage }) => { await casesActionPage.selectAgentAndContinue(); });
Then("Reassign Confirmation identifies the case and the selected agent", async ({ casesActionPage }) => { await casesActionPage.expectTransferSummary(); });
When("the user goes back to agent selection", async ({ casesActionPage }) => { await casesActionPage.backFromTransfer(); });
When(/^the user cancels the transfer(?: without confirming it)?$/, async ({ casesActionPage }) => { await casesActionPage.cancelTransfer(); });
Then(/^that case still shows (In Progress|Solved)$/, async ({ casesActionPage }, status: string) => { await casesActionPage.expectSameCaseStatus(status); });
Then("Assign Case is offered", async ({ casesActionPage }) => { await casesActionPage.expectMenuAction("Assign Case", true); });
Then("Transfer Case is not offered", async ({ casesActionPage }) => { await casesActionPage.expectMenuAction("Transfer Case", false); });
Given("an accessible case is Solved and offers Close Case", async ({ casesActionPage }) => { await withPrerequisite(() => casesActionPage.prepareSolved()); });
When("the user opens Close Case", async ({ casesActionPage }) => { await casesActionPage.openClose(); });
Then("the confirmation warns that closing the case cannot be undone", async ({ casesActionPage }) => { await casesActionPage.expectCloseWarning(); });
When("the user cancels the close confirmation", async ({ casesActionPage }) => { await casesActionPage.cancelClose(); });
Given("a supported classification has no active duplicate for that customer", async ({ casesActionPage }) => { await casesActionPage.expectCreatePrepared(); });
Then("the new case shows status Assigned", async ({ casesActionPage }) => { await casesActionPage.expectNewAssigned(); });
When("the user opens Assigned to Me", async ({ casesActionPage }) => { await casesActionPage.searchCreatedAssigned(); });
Then("the identified new case appears in that pipeline", async ({ casesActionPage }) => { await casesActionPage.expectCreatedInPipeline(); });
