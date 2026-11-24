import { createBdd } from "playwright-bdd";
import { e2eValue } from "../../utils/e2e-test-data";
import { test } from "../../fixtures/base.fixture";
import { CasesPrerequisiteError } from "../../pages/case-management/CasesPage";

const { Given, When, Then } = createBdd(test);

Given("the Cases list is open", async ({ casesPage }) => {
    await casesPage.navigateTo();
});
Given("the Cases list is open in an authorized non-production environment", async ({ casesPage }) => { await casesPage.navigateTo(); });
Given("the configured case customer is available", async ({ casesPage }) => {
    try { await casesPage.prepareCreate(); }
    catch (error) {
        if (!(error instanceof CasesPrerequisiteError)) throw error;
        test.skip(true, error.message);
    }
});
When("the user creates a case for that customer with a unique E2E subject and valid required details", async ({ casesPage }) => { await casesPage.submitCreate(); });
Then("the newly created case workspace identifies the new case", async ({ casesPage }) => { await casesPage.expectCreatedCase(); });
Then("the new case shows the E2E subject", async ({ casesPage }) => { await casesPage.expectNewCaseSubject(); });
Given("an active case already exists for the configured customer and selected CTS", async ({ casesPage }) => {
    try { await casesPage.prepareDuplicate(); }
    catch (error) {
        if (!(error instanceof CasesPrerequisiteError)) throw error;
        test.skip(true, error.message);
    }
});
When("the user submits a new case with the same customer and CTS", async ({ casesPage }) => { await casesPage.submitCreate(); });
Then("the duplicate warning identifies the existing case", async ({ casesPage }) => { await casesPage.expectDuplicateWarning(); });
When("the duplicate warning appears", async ({ casesPage }) => { await casesPage.expectDuplicateWarning(); });
When("the user chooses View Existing Case", async ({ casesPage }) => { await casesPage.viewDuplicate(); });
Then("the existing case opens", async ({ casesPage }) => { await casesPage.expectExistingDuplicate(); });
When("the user chooses Go Back & Edit", async ({ casesPage }) => { await casesPage.editDuplicate(); });
Then("the populated form retains the new case subject", async ({ casesPage }) => { await casesPage.expectDuplicateFormRetained(); });
Then("the new case subject is not created", async ({ casesPage }) => { await casesPage.expectAttemptNotCreated(); });

Given(/^an identified E2E(?:-owned)? case is In Progress$/, async ({ casesPage }) => { await casesPage.selectOwnedCase("In Progress"); });
Given("an identified E2E-owned case is assigned to the signed-in agent", async ({ casesPage }) => { await casesPage.selectOwnedCase(undefined, true); });
Given("an identified E2E-owned case has a unique subject", async ({ casesPage }) => { await casesPage.selectOwnedCase(); });
Given("the Cases list is searched for that case", async ({ casesPage }) => { await casesPage.searchSelectedCase(); });
When("the user searches for that exact subject", async ({ casesPage }) => { await casesPage.searchOwnedSubject(); });
Then(/^the (?:matching case|identified case) appears in the (?:Cases list|results)$/, async ({ casesPage }) => { await casesPage.expectSelectedRow(); });
When(/^the user filters the Cases list by (?:the )?(In Progress|Closed)(?: case status)?$/, async ({ casesPage }, status: string) => { await casesPage.filterStatus(status); });
Then("the identified case is shown with status In Progress", async ({ casesPage }) => { await casesPage.expectSelectedRow("In Progress"); });
Then("the identified case is not shown", async ({ casesPage }) => { await casesPage.expectSelectedRowAbsent(); });
Given("the Cases list has a search query and a filter applied", async ({ casesPage }) => { await casesPage.prepareReset(); });
When("the user resets the Cases list criteria", async ({ casesPage }) => { await casesPage.resetCriteria(); });
Then("the search query is cleared", async ({ casesPage }) => { await casesPage.expectSearchCleared(); });
Then("the applied filters are removed", async ({ casesPage }) => { await casesPage.expectFiltersCleared(); });
Then("the Cases list returns to its unfiltered results", async ({ casesPage }) => { await casesPage.expectUnfilteredResults(); });

When("the user searches for a case number that does not match an accessible case", async ({ casesPage }) => {
    // The value is used only for a read-only search, never as a mutation target.
    await casesPage.searchFor(e2eValue("case search with no match"));
});

Then("the Cases list has no rows", async ({ casesPage }) => {
    await casesPage.expectNoRows();
});

Then("the Cases list shows {string}", async ({ casesPage }, message: string) => {
    await casesPage.expectEmptyMessage(message);
});

When(/^the user selects the (Open|Assigned|In Progress|Assigned to Me) pipeline tab$/, async ({ casesPage }, name: string) => {
    await casesPage.selectPipeline(name);
});

When(/^the user opens the (Closed|Solved) pipeline$/, async ({ casesPage }, name: string) => {
    await casesPage.selectOtherPipeline(name);
});

When("the user opens the Pending Customer Reply pipeline", async ({ casesPage }) => {
    await casesPage.selectOtherPipeline("Pending Customer Reply");
});

Then(/^every displayed case has status (Open|Assigned|In Progress|Closed|Solved|Pending Customer Reply)$/, async ({ casesPage }, status: string) => {
    await casesPage.expectStatuses(status);
});

When("the user opens the Cases list actions menu", async ({ casesPage }) => {
    await casesPage.openListActionsMenu();
});

Then("the Cases list actions menu offers Export", async ({ casesPage }) => {
    await casesPage.expectExportMenuItem();
});

Given("a Cases pipeline has more results than the current page can display", async ({ casesPage }) => {
    await casesPage.prepareNextPage();
});

When("the user moves to the next page", async ({ casesPage }) => {
    await casesPage.nextPage();
});

Then("a different page of cases is displayed", async ({ casesPage }) => {
    await casesPage.expectDifferentPage();
});

When("the user opens Others", async ({ casesPage }) => {
    await casesPage.openOthers();
});

Then("the menu lists Escalated, Pending Customer Reply, Solved, Closed, Cancelled, Action Required, Watched by Me, Live Agent and Hotline", async ({ casesPage }) => {
    await casesPage.expectOtherPipelines([
        "Escalated", "Pending Customer Reply", "Solved", "Closed", "Cancelled", "Action Required", "Watched by Me", "Live Agent", "Hotline",
    ]);
});

When("the user opens Add Filters", async ({ casesPage }) => {
    await casesPage.openFilterFields();
});

When("the user sorts the Cases list by Updated At", async ({ casesPage }) => { await casesPage.sortByUpdatedAt(); });
Then("cases are ordered by their last updated time", async ({ casesPage }) => { await casesPage.expectUpdatedAtOrder(); });

Then("the available filters include Assigned Agent, Case Flag, Case Number, Case Source, Case Status, Case Sub Type, Case Template, Case Type, Category, Closed At, Closed By, Created At, Created By, Customer Name, Customer No, Customer Product, Customer Type, Last Updated At, Last Updated By, OLA Status, Parent Case Number, Priority, SLA Status, Solved At, Subject and Team", async ({ casesPage }) => {
    await casesPage.expectFilterFields([
        "Assigned Agent", "Case Flag", "Case Number", "Case Source", "Case Status", "Case Sub Type", "Case Template", "Case Type", "Category", "Closed At", "Closed By", "Created At", "Created By", "Customer Name", "Customer No", "Customer Product", "Customer Type", "Last Updated At", "Last Updated By", "OLA Status", "Parent Case Number", "Priority", "SLA Status", "Solved At", "Subject", "Team",
    ]);
});

When("the user opens the Create New Case form", async ({ casesPage }) => {
    await casesPage.openCreate();
});

When("the user cancels the Create New Case form", async ({ casesPage }) => {
    await casesPage.cancelCreate();
});

Then("the Cases list is shown", async ({ casesPage }) => {
    await casesPage.expectList();
});

Then("Create Case is disabled while the required details are missing", async ({ casesPage }) => {
    await casesPage.expectCreateDisabled();
});

When("the user enters a unique E2E subject and cancels the Create New Case form", async ({ casesPage }) => {
    await casesPage.cancelPopulatedCreate();
});

Then("the case form closes", async ({ casesPage }) => {
    await casesPage.expectList();
});

Then("searching for that subject returns no case", async ({ casesPage }) => {
    await casesPage.expectCanceledSubjectAbsent();
});

Then("Entity is preselected as Converge", async ({ casesPage }) => {
    await casesPage.expectCreateDefaults();
});

Then("Case Template is preselected as Trouble Case", async ({ casesPage }) => {
    await casesPage.expectCreateDefaults();
});

Then("Case Severity has a visible required marker", async ({ casesPage }) => {
    await casesPage.expectCreateMarkers();
});

Then("Description has no visible required marker", async ({ casesPage }) => {
    await casesPage.expectCreateMarkers();
});

When("the user selects Request, Billing & Payments, Billing Documents and Statement of Account", async ({ casesPage }) => {
    await casesPage.selectBillingClassification();
});
Then("Priority is populated as Medium", async ({ casesPage }) => {
    await casesPage.expectCreateChoice("Priority", "Medium");
});
Then("Severity is populated as Complex", async ({ casesPage }) => {
    await casesPage.expectCreateChoice("Severity", "Complex");
});

Given(/^the Cases list contains an accessible case( with customer details)?$/, async ({ casesPage }, withCustomerDetails?: string) => {
    if (withCustomerDetails) {
        try {
            await casesPage.selectAccessibleCaseWithCustomerDetails();
        } catch (error) {
            if (!(error instanceof CasesPrerequisiteError)) throw error;
            test.skip(true, error.message);
        }
        return;
    }
    await casesPage.selectFirstAccessibleCase();
});

When("the user opens that case by its case number", async ({ casesPage }) => {
    await casesPage.openSelectedCase();
});

Then("the case workspace identifies the same case", async ({ casesPage }) => {
    await casesPage.expectSelectedCase();
});

Then("Case Information shows its case number, status, classification and subject", async ({ casesPage }) => {
    await casesPage.expectCaseInformation();
});

Then("the case workspace shows the assigned team and agent fields", async ({ casesPage }) => {
    await casesPage.expectTeamFields();
});

Then("Customer Details, Service Address, Billing Address and Customer Billing Details are visible", async ({ casesPage }) => {
    await casesPage.expectCustomerSections();
});

Given("an accessible case offers View Workflow", async ({ casesPage }) => {
    await casesPage.selectFirstAccessibleCase();
    await casesPage.openSelectedCase();
    await casesPage.expectWorkflowAvailable();
});

When("the user opens View Workflow", async ({ casesPage }) => {
    await casesPage.openWorkflow();
});

Then("the workflow dialog shows the case's numbered workflow steps", async ({ casesPage }) => {
    await casesPage.expectNumberedWorkflow();
});

Given("an accessible Correspondent Agent case is open", async ({ casesPage }) => {
    await casesPage.selectCorrespondentCase();
});

When("the user opens More Actions", async ({ casesPage }) => {
    await casesPage.openMoreActions();
});

Then("Cancel Case is disabled", async ({ casesPage }) => {
    await casesPage.expectCancelDisabled();
});

Given("an accessible case offers Edit CTS", async ({ casesPage }) => {
    await casesPage.prepareClassificationEdit();
});
When("the user opens and cancels the classification editor", async ({ casesPage }) => {
    await casesPage.cancelClassificationEdit();
});
Then("the case keeps its previously saved category, type and sub-type", async ({ casesPage }) => {
    await casesPage.expectClassificationUnchanged();
});
Given("an accessible case shows Customer Details", async ({ casesPage }) => {
    await casesPage.prepareCustomerChange();
});
When("the user opens and cancels Change Customer", async ({ casesPage }) => {
    await casesPage.cancelCustomerChange();
});
Then("the case remains linked to its previously selected customer", async ({ casesPage }) => {
    await casesPage.expectCustomerUnchanged();
});
Given("an accessible parent case offers Create Child Case", async ({ casesPage }) => {
    await casesPage.prepareChildForm();
});
When("the user opens and cancels the child case form", async ({ casesPage }) => {
    await casesPage.openChildForm();
    await casesPage.cancelChildForm();
});
Then("the parent case remains open", async ({ casesPage }) => {
    await casesPage.expectSelectedCase();
});
When("the user opens the child case form", async ({ casesPage }) => {
    await casesPage.openChildForm();
});
Then("the form is prefilled for the parent case", async ({ casesPage }) => {
    await casesPage.expectChildParent();
});
When("the user cancels the child case form", async ({ casesPage }) => {
    await casesPage.cancelChildForm();
});
Then("no child case is created", async ({ casesPage }) => {
    await casesPage.expectNoChildCreated();
});

Given("an accessible case has no matching knowledge articles", async ({ casesPage }) => { await casesPage.prepareKnowledge(); });
When("the user opens Knowledge", async ({ casesPage }) => { await casesPage.openKnowledge(); });
Then("the knowledge drawer shows {string}", async ({ casesPage }, message: string) => { await casesPage.expectKnowledgeMessage(message); });
Given("an accessible case offers Add Watcher", async ({ casesPage }) => { await casesPage.prepareWatcher(); });
When(/^the user opens Add Watcher(?: without selecting an agent)?$/, async ({ casesPage }) => { await casesPage.openWatcher(); });
Then("the Available Agents dialog provides search and Add Agents", async ({ casesPage }) => { await casesPage.expectWatcherDialog(); });
Then("Add Agents is disabled", async ({ casesPage }) => { await casesPage.expectWatcherAddDisabled(); });
When("the user cancels the dialog without selecting an agent", async ({ casesPage }) => { await casesPage.cancelWatcher(); });
Then("no watcher is added", async ({ casesPage }) => { await casesPage.expectWatchersUnchanged(); });
Given("an accessible closed case offers Add Case Relation", async ({ casesPage }) => { await casesPage.prepareClosedRelation(); });
When("the user opens Add Case Relation", async ({ casesPage }) => { await casesPage.openRelation(); });
Then("the dialog provides ticket number search, Save and Cancel", async ({ casesPage }) => { await casesPage.expectRelationDialog(); });
Then("no case relation is added", async ({ casesPage }) => { await casesPage.expectRelationsUnchanged(); });

Given("an identified E2E-owned In Progress case is open", async ({ casesPage }) => { await casesPage.openOwnedCase("In Progress", false, false); });
When("the user opens Pending to Customer Reply and cancels the confirmation", async ({ casesPage }) => { await casesPage.cancelStatusAction("Pending to customer reply"); });
When("the user opens Resolve Case and cancels the resolution form", async ({ casesPage }) => { await casesPage.cancelStatusAction("Resolve Case"); });
Then("the case remains In Progress", async ({ casesPage }) => { await casesPage.expectStatus("In Progress"); });
Given("an identified E2E-owned case offers Edit Case", async ({ casesPage }) => { await casesPage.openActiveE2EOwnedCase(); });
When("the user changes its E2E subject and saves the case", async ({ casesPage }) => { await casesPage.editSubject(true); });
When("the user changes its subject and cancels the edit", async ({ casesPage }) => { await casesPage.editSubject(false); });
Then("that case shows the updated subject", async ({ casesPage }) => { await casesPage.expectOwnedSubject(); });
Then("the updated subject remains visible after reloading the case", async ({ casesPage }) => { await casesPage.reloadAndExpectSubject(); });
Then("the case keeps its previously saved subject", async ({ casesPage }) => { await casesPage.expectOwnedSubject(); });
Given("an identified E2E-owned In Progress case is unassigned", async ({ casesPage }) => { await casesPage.prepareUnassignedOwned(); });
Given("an identified E2E-owned In Progress case is assigned to the current agent", async ({ casesPage }) => { await casesPage.openOwnedCase("In Progress", true); });
When("the current agent chooses Assign to Me and confirms", async ({ casesPage }) => { await casesPage.assignToMe(); });
Then("the case shows the current agent as its assigned agent", async ({ casesPage }) => { await casesPage.expectAssignedToMe(); });
When("the user confirms Unassign Case", async ({ casesPage }) => { await casesPage.unassignOwned(); });
Then("the case has no assigned agent", async ({ casesPage }) => { await casesPage.expectUnassigned(); });
Then("the observed case status remains In Progress", async ({ casesPage }) => { await casesPage.expectStatus("In Progress"); });
Given("an identified E2E-owned case is Assigned and offers Start Case", async ({ casesPage }) => {
    try { await casesPage.prepareStart(); }
    catch (error) {
        if (!(error instanceof CasesPrerequisiteError)) throw error;
        test.skip(true, error.message);
    }
});
When("the user confirms Start Case for that case", async ({ casesPage }) => { await casesPage.startOwned(); });
Then("that case shows status In Progress", async ({ casesPage }) => { await casesPage.expectStatus("In Progress"); });
Given("an accessible case has system email entries in its external feed", async ({ casesPage }) => { await casesPage.prepareEmailFeed(); });
When("the user opens the case's All feed", async ({ casesPage }) => { await casesPage.openAllFeed(); });
Then("the external feed shows the recorded email entries", async ({ casesPage }) => { await casesPage.expectEmailEntries(); });
Given("an E2E-owned case has no internal messages", async ({ casesPage }) => { await casesPage.prepareEmptyInternalFeed(); });
When("the user switches to the Internal feed", async ({ casesPage }) => { await casesPage.openInternalFeed(); });
Then("the internal feed shows {string}", async ({ casesPage }, message: string) => { await casesPage.expectInternalMessage(message); });
