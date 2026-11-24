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

Given("an accessible active case has recorded SLA usage and team details", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareSla("active")); });
Given("an accessible closed case has recorded SLA usage", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareSla("closed")); });
Given("an accessible case displays the Escalated case flag", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareSla("escalated")); });
Given("an accessible escalated case has SLA usage recorded for multiple teams", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareSla("multi-team")); });
Given("an accessible Escalated case is returned by the Breached SLA Status filter", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareSla("breached")); });
When("the user opens SLA Usage History", async ({ casesEvidencePage }) => { await casesEvidencePage.openSla(); });
Then("the drawer shows the total SLA, percentage used, used time and remaining time", async ({ casesEvidencePage }) => { await casesEvidencePage.expectSlaUsage(true); });
Then("the drawer shows the total SLA, used time and remaining time", async ({ casesEvidencePage }) => { await casesEvidencePage.expectSlaUsage(false); });
Then("the drawer shows the team usage details", async ({ casesEvidencePage }) => { await casesEvidencePage.expectTeamUsage(); });
Then("the drawer shows a separate usage entry for each recorded team", async ({ casesEvidencePage }) => { await casesEvidencePage.expectTeamUsage(true); });
Then("the drawer shows more than 100 percent of the SLA used", async ({ casesEvidencePage }) => { await casesEvidencePage.expectOverduePercentage(); });
Then("the drawer shows an overdue duration", async ({ casesEvidencePage }) => { await casesEvidencePage.expectOverdue(); });
When("the user opens the Escalated pipeline and searches for that case number", async ({ casesEvidencePage }) => { await casesEvidencePage.searchEscalatedPipeline(); });
Then("the identified case appears in the pipeline", async ({ casesEvidencePage }) => { await casesEvidencePage.expectCaseInPipeline(); });

Given("an accessible case has no related work orders", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareWorkOrder("empty")); });
Given("an accessible case flagged Endorse to WFM has a related work order", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareWorkOrder("linked")); });
Given("an accessible case has a related unassigned work order without a technician", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareWorkOrder("unassigned")); });
When("the user opens Work Orders", async ({ casesEvidencePage }) => { await casesEvidencePage.openWorkOrders(); });
Then("the drawer shows {string}", async ({ casesEvidencePage }, message: string) => { await casesEvidencePage.expectWorkOrderEmpty(message); });
Then("the drawer shows the linked work-order reference", async ({ casesEvidencePage }) => { await casesEvidencePage.expectWorkOrderReference(); });
Then("its details include status, priority, assignment and scheduling information", async ({ casesEvidencePage }) => { await casesEvidencePage.expectWorkOrderFields(); });
Then("that work order shows status Unassigned", async ({ casesEvidencePage }) => { await casesEvidencePage.expectWorkOrderField("Status", "Unassigned"); });
Then("its assigned technician is shown as {string}", async ({ casesEvidencePage }, value: string) => { await casesEvidencePage.expectWorkOrderField("Assigned Technician", value); });

Given("an accessible case has another ticket in its case summary", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareSummary("history-other")); });
Given("an accessible case has tickets in its case summary", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareSummary("history-any")); });
Given("an accessible case has no child cases", async ({ casesEvidencePage }) => { await withPrerequisite(() => casesEvidencePage.prepareSummary("child")); });
When("the user opens the case summary", async ({ casesEvidencePage }) => { await casesEvidencePage.openSummary(); });
Then("Ticket History shows the current case and another ticket", async ({ casesEvidencePage }) => { await casesEvidencePage.expectHistory(); });
When("the user opens the other ticket from Ticket History", async ({ casesEvidencePage }) => { await casesEvidencePage.openOtherHistoryCase(); });
Then("that ticket opens in a separate case workspace tab", async ({ casesEvidencePage }) => { await casesEvidencePage.expectHistoryTab(); });
Then("a displayed ticket shows its case number, classification, subject, status and date", async ({ casesEvidencePage }) => { await casesEvidencePage.expectHistoryDetails(); });
Then("the open case is marked Current", async ({ casesEvidencePage }) => { await casesEvidencePage.expectCurrentTicket(); });
Then("the Child Case count is zero", async ({ casesEvidencePage }) => { await casesEvidencePage.expectNoChildCount(); });
Then("the summary shows {string}", async ({ casesEvidencePage }, message: string) => { await casesEvidencePage.expectSummaryMessage(message); });
