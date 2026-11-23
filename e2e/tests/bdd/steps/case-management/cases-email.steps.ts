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

Given("an accessible case offers the Email composer", async ({ casesEmailPage }) => { await withPrerequisite(() => casesEmailPage.prepareEditable(false)); });
Given("an accessible case offers a cleared Email composer", async ({ casesEmailPage }) => { await withPrerequisite(() => casesEmailPage.prepareEditable(true)); });
When("the user opens the Email composer", async ({ casesEmailPage }) => { await casesEmailPage.open(); });
When("the user enters a unique E2E subject and a draft email body", async ({ casesEmailPage }) => { await casesEmailPage.enterSubject(); await casesEmailPage.enterBody(); });
When("the user enters an email subject and leaves the body empty", async ({ casesEmailPage }) => { await casesEmailPage.enterSubject(); });
When("the user enters an email subject and body", async ({ casesEmailPage }) => { await casesEmailPage.enterSubject(); await casesEmailPage.enterBody(); });
When("the user clears the subject while retaining the body", async ({ casesEmailPage }) => { await casesEmailPage.clearSubject(); });
When("the user discards the draft without sending it", async ({ casesEmailPage }) => { await casesEmailPage.discard(); });
Then("the email subject and body are cleared", async ({ casesEmailPage }) => { await casesEmailPage.expectCleared(); });
Then(/^Preview & Send is (enabled|disabled)$/, async ({ casesEmailPage }, state: string) => { await casesEmailPage.expectSendEnabled(state === "enabled"); });
Then("the draft subject is not shown in the visible email feed", async ({ casesEmailPage }) => { await casesEmailPage.expectDraftAbsent(); });
Then("the subject, body and Preview & Send controls are disabled", async ({ casesEmailPage }) => { await casesEmailPage.expectBlockedFields(); });
Then("the composer shows {string}", async ({ casesEmailPage }, message: string) => { await casesEmailPage.expectMessage(message); });
