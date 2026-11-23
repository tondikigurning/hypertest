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
Given("an accessible case has no related cases and offers Add Case Relation", async ({ casesRelationPage }) => { await withPrerequisite(() => casesRelationPage.prepareEmpty()); });
Given("another accessible E2E case is available as a reference", async ({ casesRelationPage }) => { await withPrerequisite(() => casesRelationPage.prepareReference()); });
When("the user searches for a ticket number that does not match a case", async ({ casesRelationPage }) => { await casesRelationPage.searchMissing(); });
Then("the case search shows {string}", async ({ casesRelationPage }, message: string) => { await casesRelationPage.expectMissing(message); });
When("the user closes the search and cancels Add Case Relation", async ({ casesRelationPage }) => { await casesRelationPage.cancelSearch(); });
When("the user searches for and selects that case by ticket number", async ({ casesRelationPage }) => { await casesRelationPage.searchAndSelect(); });
Then("the dialog shows the selected case number and summary", async ({ casesRelationPage }) => { await casesRelationPage.expectSelected(); });
When("the user returns to ticket search and cancels Add Case Relation", async ({ casesRelationPage }) => { await casesRelationPage.backAndCancel(); });
Then("the related case list remains empty", async ({ casesRelationPage }) => { await casesRelationPage.expectEmpty(); });
