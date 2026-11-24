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

Given("an accessible case is opened by the signed-in user", async ({ casesActivityPage }) => { await casesActivityPage.prepare(); });
Given("an accessible case has activity entries", async ({ casesActivityPage }) => { await casesActivityPage.prepareWithEntries(); });
Given("an accessible case has recorded agent-view activities", async ({ casesActivityPage }) => { await casesActivityPage.prepareWithEntries(); });
Given("an accessible case has a recorded status change in Activities", async ({ casesActivityPage }) => { await withPrerequisite(() => casesActivityPage.prepareStatusChange()); });
Given("an accessible case has more activity entries than fit on one page", async ({ casesActivityPage }) => { await withPrerequisite(() => casesActivityPage.prepareMultiplePages()); });
When("the user opens Activities", async ({ casesActivityPage }) => { await casesActivityPage.open(); });
Then("Activities shows an entry for viewing that case", async ({ casesActivityPage }) => { await casesActivityPage.expectViewEntry(); });
Then("the entry shows the user who viewed it and the action time", async ({ casesActivityPage }) => { await casesActivityPage.expectEntryActorAndTime("view"); });
When("the user searches Activities for a value that matches no entries", async ({ casesActivityPage }) => { await casesActivityPage.searchMissing(); });
Then("Activities shows {string}", async ({ casesActivityPage }, message: string) => { await casesActivityPage.expectEmpty(message); });
When("the user resets the activity search", async ({ casesActivityPage }) => { await casesActivityPage.reset(); });
Then("the search is cleared and activity entries are shown again", async ({ casesActivityPage }) => { await casesActivityPage.expectResetEntries(); });
Then("the status-change entry identifies the previous and new status", async ({ casesActivityPage }) => { await casesActivityPage.expectStatusChange(); });
Then("the entry shows the actor and action time", async ({ casesActivityPage }) => { await casesActivityPage.expectEntryActorAndTime("status"); });
When("the user moves to the next Activities page", async ({ casesActivityPage }) => { await casesActivityPage.nextPage(); });
Then("a different page of that case's activities is displayed", async ({ casesActivityPage }) => { await casesActivityPage.expectDifferentPage(); });
When("the user returns to the previous Activities page", async ({ casesActivityPage }) => { await casesActivityPage.previousPage(); });
Then("the original page of that case's activities is displayed", async ({ casesActivityPage }) => { await casesActivityPage.expectPreviousPage(); });
When("the user filters Activities by event type ViewedByAgent", async ({ casesActivityPage }) => { await casesActivityPage.filterAgentViews(); });
Then("the displayed activities describe agents viewing the case", async ({ casesActivityPage }) => { await casesActivityPage.expectAgentViews(); });
When("the user resets the activity filters", async ({ casesActivityPage }) => { await casesActivityPage.reset(); });
Then("the unfiltered case activities are displayed", async ({ casesActivityPage }) => { await casesActivityPage.expectResetEntries(); });
