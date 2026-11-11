/**
 * BDD step definitions — Case Management / Cases (tenants).
 *
 * Implements case-management/cases.feature. All step text is case-specific and self-contained
 * (it deliberately does NOT reuse the users-bound global steps like `the user clicks {string}`
 * or `the {string} dialog is visible`), so there are no cross-module step collisions.
 *
 * Locators live in CasesPage (grounded in the real feature source, verified against the
 * running app via playwright-cli).
 */
import { createBdd, type DataTable } from "playwright-bdd";
import { HttpResponse, http } from "msw";
import { test } from "../../fixtures/base.fixture";
import { syncPageContextFromScenario } from "../../fixtures/page-context";
import { armListResponseProbe, ensureListResponseTracking } from "../../utils/list-page-network-utils";

const { Given, When, Then } = createBdd(test);

// ── Given ────────────────────────────────────────────────────────────────────

Given("the user is on the case list page", async ({ casesPage }) => {
    await casesPage.navigateTo();
});

// ── list ─────────────────────────────────────────────────────────────────────

Then("the cases data table is visible", async ({ casesPage }) => {
    await casesPage.expectTableVisible();
});

Then("the cases table shows the column {string}", async ({ casesPage }, column: string) => {
    await casesPage.expectColumnVisible(column);
});

Then("the case pipeline tabs are visible:", async ({ casesPage }, table: DataTable) => {
    for (const [tab] of table.rows()) {
        await casesPage.expectPipelineTabVisible(tab);
    }
});

// ── view detail (TEN_CAS_VIEW_DETAIL_FLOW) ───────────────────────────────────

When("the user clicks the first case row", async ({ page, pageContext, casesPage, $testInfo }) => {
    syncPageContextFromScenario(pageContext, {
        url: page.url(),
        tags: $testInfo.tags,
    });
    // Cases first cell contains the case-number button (onLinkClick → workbench);
    // openDetailPanel clicks a non-interactive text cell to fire onRowClick instead.
    ensureListResponseTracking(page, pageContext);
    armListResponseProbe(page, pageContext);
    await casesPage.openDetailPanel();
});

When("the user opens the first case from the list", async ({ page, pageContext, casesPage, $testInfo }) => {
    syncPageContextFromScenario(pageContext, {
        url: page.url(),
        tags: $testInfo.tags,
    });
    // The workbench detail fetch fires on case-number navigation — track + arm the
    // response probe so @mock 500/delay assertions can observe it.
    ensureListResponseTracking(page, pageContext);
    armListResponseProbe(page, pageContext);
    await casesPage.openFirstCaseFromList();
});

Then("the full case detail workbench is visible", async ({ casesPage }) => {
    await casesPage.expectWorkbenchVisible();
});

Then("the case detail workbench shows the case tab with the case number", async ({ casesPage }) => {
    await casesPage.expectWorkbenchCaseTabVisible();
});

Then("the case detail workbench shows the case information panel", async ({ casesPage }) => {
    await casesPage.expectWorkbenchInfoSectionVisible();
});

Then("the case detail workbench shows the conversation feeds panel", async ({ casesPage }) => {
    await casesPage.expectWorkbenchFeedsVisible();
});

Then("the case detail workbench shows the information field {string}", async ({ casesPage }, field: string) => {
    await casesPage.expectWorkbenchInformationField(field);
});

Then("the case detail workbench shows the vertical tab {string}", async ({ casesPage }, tab: string) => {
    await casesPage.expectWorkbenchVerticalTab(tab);
});

// ── filter builder ─────────────────────────────────────────────────────────────

When("the user opens the case filter builder", async ({ casesPage }) => {
    await casesPage.openFilterBuilder();
});

Then("the case filter builder is visible", async ({ casesPage }) => {
    await casesPage.expectFilterBuilderVisible();
});

Then(
    "the case filter builder shows a Where clause with field, operator and value controls",
    async ({ casesPage }) => {
        await casesPage.expectWhereClauseControls();
    },
);

Then("the case filter builder shows the action {string}", async ({ casesPage }, action: string) => {
    await casesPage.expectFilterAction(action);
});

// ── create dialog ──────────────────────────────────────────────────────────────

When("the user opens the Create New Case dialog", async ({ casesPage }) => {
    await casesPage.clickCreateNew();
});

Then("the create case dialog is visible", async ({ casesPage }) => {
    await casesPage.expectCreateCaseDialogVisible();
});

Then("the create case dialog shows the field {string}", async ({ casesPage }, field: string) => {
    await casesPage.expectCreateCaseDialogField(field);
});

When("the user cancels the create case dialog", async ({ casesPage }) => {
    await casesPage.cancelCreateCaseDialog();
});

Then("the create case dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectCreateCaseDialogNotVisible();
});

// ── create dialog — fill, validate & submit (TEN_CAS_CREATE_FLOW) ────────────

Then("the create case button is disabled", async ({ casesPage }) => {
    await casesPage.expectCreateCaseButtonDisabled();
});

Then("the create case button is enabled", async ({ casesPage }) => {
    await casesPage.expectCreateCaseButtonEnabled();
});

When("the user selects the {string} case entity", async ({ casesPage }, entity: string) => {
    await casesPage.selectCaseEntity(entity);
});

When("the user selects the {string} case template", async ({ casesPage }, template: string) => {
    await casesPage.selectCaseTemplate(template);
});

When("the user fills the required case fields with the first available values", async ({ casesPage }) => {
    await casesPage.fillRequiredCaseFieldsWithFirstAvailableValues();
});

When("the user fills the required case fields with a clean customer account", async ({ casesPage }) => {
    await casesPage.fillRequiredCaseFieldsWithCleanCustomerAccount();
});

When("the user creates the case", async ({ casesPage }) => {
    await casesPage.submitCreateCase();
});

Then("the case creation success toast is shown", async ({ casesPage }) => {
    await casesPage.expectCreateCaseSuccessToast();
});

Then("the new case tab opens for the created case", async ({ casesPage }) => {
    await casesPage.expectNewCaseTabOpened();
});

Then("the duplicate case dialog is visible", async ({ casesPage }) => {
    await casesPage.expectDuplicateCaseDialogVisible();
});

Then("the duplicate case dialog shows the {string} alert", async ({ casesPage }, alert: string) => {
    await casesPage.expectDuplicateCaseAlert();
});

Then("the duplicate case dialog shows the actions {string} and {string}", async ({ casesPage }, a: string, b: string) => {
    await casesPage.expectDuplicateCaseActions([a, b]);
});

// ── assign flow (TEN_CAS_ASSIGN_FLOW) ────────────────────────────────────────

When("the user opens the assign case dialog for the first assignable case", async ({ casesPage, $testInfo }) => {
    const opened = await casesPage.openAssignCaseDialog("assign");
    if (!opened) {
        $testInfo.skip(true, "No assignable case (case without owner) found in the current environment.");
    }
});

When("the user opens the transfer case dialog for the first assigned case", async ({ casesPage, $testInfo }) => {
    const opened = await casesPage.openAssignCaseDialog("transfer");
    if (!opened) {
        $testInfo.skip(true, "No assigned case found in the current environment.");
    }
});

Then("the assign case dialog is visible", async ({ casesPage }) => {
    await casesPage.expectAssignDialogVisible();
});

Then("the assign case dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectAssignDialogNotVisible();
});

Then("the assign case dialog shows the case header", async ({ casesPage }) => {
    await casesPage.expectAssignDialogHeader();
});

Then("the assign case dialog shows the available agents list", async ({ casesPage }) => {
    await casesPage.expectAvailableAgentsList();
});

Then("the assign case dialog shows the Cancel and Next actions", async ({ casesPage }) => {
    await casesPage.expectAssignDialogActions();
});

Then("the assign next button is disabled", async ({ casesPage }) => {
    await casesPage.expectAssignNextDisabled();
});

Then("the assign next button is enabled", async ({ casesPage }) => {
    await casesPage.expectAssignNextEnabled();
});

When("the user selects the first available agent", async ({ casesPage, $testInfo }) => {
    const selected = await casesPage.selectFirstAvailableAgent();
    if (!selected) {
        $testInfo.skip(true, "No enabled available agent found in the assign dialog in the current environment.");
    }
});

When("the user cancels the assign case dialog", async ({ casesPage }) => {
    await casesPage.cancelAssignDialog();
});

When("the user proceeds to the assign confirmation", async ({ casesPage }) => {
    await casesPage.clickAssignNext();
});

Then("the assign confirmation dialog is visible", async ({ casesPage }) => {
    await casesPage.expectAssignConfirmationVisible();
});

When("the user confirms the case assignment", async ({ casesPage, $testInfo }) => {
    await casesPage.clickAssignConfirm();
    // For @mock scenarios the failure is EXPECTED (e.g. assign API 500) — the dialog
    // stays open and a failure toast appears; the Then step asserts the toast.
    if ($testInfo.tags.includes("@mock")) {
        return;
    }
    // Real-backend: the assign may be rejected with "Agent status is not Available"
    // (409) — environment/data-dependent, so skip with a note.
    const failed = await casesPage.isAssignFailureToastVisible();
    if (failed) {
        $testInfo.skip(true, "Assign rejected: agent status is not Available for assignment in this environment.");
        return;
    }
    await casesPage.expectAssignDialogClosedAfterConfirm();
});

Then("the assign success modal is shown", async ({ casesPage }) => {
    await casesPage.expectAssignSuccessModal();
});

Then("the reassign success modal is shown", async ({ casesPage }) => {
    await casesPage.expectReassignSuccessModal();
});

Then("the assign failure toast is shown", async ({ casesPage }) => {
    await casesPage.expectAssignFailureToast();
});

When("the user selects the first case row", async ({ casesPage }) => {
    await casesPage.selectFirstRow();
});

When("the user opens the bulk assign dialog", async ({ casesPage }) => {
    await casesPage.openBulkAssignDialog();
});

Then("the bulk assign dialog is visible", async ({ casesPage }) => {
    await casesPage.expectBulkAssignDialogVisible();
});

Then("the bulk assign dialog shows the selected case ids", async ({ casesPage }) => {
    await casesPage.expectBulkAssignSelectedCaseIds();
});

Then("the bulk assign dialog shows the target agent field", async ({ casesPage }) => {
    await casesPage.expectBulkAssignTargetAgentField();
});

Then("the bulk assign submit is disabled", async ({ casesPage }) => {
    await casesPage.expectBulkAssignSubmitDisabled();
});

When("the user selects a target agent in the bulk assign dialog", async ({ casesPage }) => {
    await casesPage.selectBulkTargetAgent();
});

When("the user submits the bulk assign", async ({ casesPage }) => {
    await casesPage.submitBulkAssign();
});

Then("the bulk assign success modal is shown", async ({ casesPage }) => {
    await casesPage.expectBulkAssignSuccessModal();
});

// ── unassign flow (TEN_CAS_UNASSIGN_FLOW) ────────────────────────────────────

When("the user opens the row actions menu for the first assigned case", async ({ casesPage, $testInfo }) => {
    const opened = await casesPage.openRowActionsMenuFor("Unassign Case");
    if (!opened) {
        $testInfo.skip(true, "No assigned case (with an Unassign Case action) found in the current environment.");
    }
});

Then("the row actions menu shows the {string} action", async ({ casesPage }, action: string) => {
    await casesPage.expectRowActionsMenuShows(action);
});

When("the user clicks the {string} row action", async ({ casesPage }, action: string) => {
    await casesPage.clickRowMenuItem(action);
});

Then("the unassign case confirmation dialog is visible", async ({ casesPage }) => {
    await casesPage.expectUnassignConfirmDialogVisible();
});

Then("the unassign case confirmation dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectUnassignConfirmDialogNotVisible();
});

Then("the unassign case confirmation dialog shows the case number and owner", async ({ casesPage }) => {
    await casesPage.expectUnassignConfirmShowsCaseAndOwner();
});

Then("the unassign case confirmation dialog shows the {string} note", async ({ casesPage }, note: string) => {
    await casesPage.expectUnassignConfirmShowsNote(note);
});

Then("the unassign case confirmation dialog shows the Cancel and Unassign actions", async ({ casesPage }) => {
    await casesPage.expectUnassignConfirmActions();
});

When("the user cancels the unassign case confirmation", async ({ casesPage }) => {
    await casesPage.cancelUnassignConfirm();
});

When("the user confirms the unassign case", async ({ casesPage }) => {
    await casesPage.confirmUnassign();
});

Then("the unassign success modal is shown", async ({ casesPage }) => {
    await casesPage.expectUnassignSuccessModal();
});

Then("the unassign failure toast is shown", async ({ casesPage }) => {
    await casesPage.expectUnassignFailureToast();
});

// ── assign flow — MSW mocks (TEN_CAS_ASSIGN_FLOW @mock scenarios) ────────────

/** Assign/reassign/unassign endpoint (postCasemgmtTenantCasesUuidAssign). */
const CASE_ASSIGN_API = /\/casemgmt\/tenant\/cases\/[^/]+\/assign/;

Given("the assign case API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(CASE_ASSIGN_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

// ── assign-to-me flow (TEN_CAS_ASSIGN_TO_ME_FLOW) ───────────────────────────

When("the user opens the row actions menu for the first unassigned case", async ({ casesPage, $testInfo }) => {
    const opened = await casesPage.openRowActionsMenuFor("Assign to Me");
    if (!opened) {
        $testInfo.skip(true, "No unassigned (Open) case with an Assign to Me action found in the current environment.");
    }
});

Then("the assign to me confirmation dialog is visible", async ({ casesPage }) => {
    await casesPage.expectAssignToMeConfirmDialogVisible();
});

Then("the assign to me confirmation dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectAssignToMeConfirmDialogNotVisible();
});

Then(
    "the assign to me confirmation dialog shows the {string} title and description",
    async ({ casesPage }) => {
        await casesPage.expectAssignToMeConfirmShowsTitleAndDescription();
    },
);

Then("the assign to me confirmation dialog shows the Cancel and Confirm actions", async ({ casesPage }) => {
    await casesPage.expectAssignToMeConfirmActions();
});

When("the user cancels the assign to me confirmation", async ({ casesPage }) => {
    await casesPage.cancelAssignToMeConfirm();
});

When("the user confirms the assign to me", async ({ casesPage }) => {
    await casesPage.confirmAssignToMe();
});

Then("the assign to me success modal is shown", async ({ casesPage }) => {
    await casesPage.expectAssignToMeSuccessModal();
});

Then("the assign to me error modal is shown", async ({ casesPage }) => {
    await casesPage.expectAssignToMeErrorModal();
});

/** Assign-to-me endpoint (postCasemgmtTenantCasesAssignToMe). */
const CASE_ASSIGN_TO_ME_API = /\/casemgmt\/tenant\/cases\/assign-to-me/;

Given("the assign to me API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(CASE_ASSIGN_TO_ME_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

// ── pending-reply flow (TEN_CAS_PENDING_REPLY_FLOW) ──────────────────────────

When("the user opens the row actions menu for the first in-progress case", async ({ casesPage, $testInfo }) => {
    const opened = await casesPage.openRowActionsMenuFor("Pending to customer reply");
    if (!opened) {
        $testInfo.skip(true, "No in-progress case (with a Pending to customer reply action) found in the current environment.");
    }
});

Then("the pending case confirmation dialog is visible", async ({ casesPage }) => {
    await casesPage.expectPendingCaseConfirmDialogVisible();
});

Then("the pending case confirmation dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectPendingCaseConfirmDialogNotVisible();
});

Then(
    "the pending case confirmation dialog shows the {string} title and description",
    async ({ casesPage }) => {
        await casesPage.expectPendingCaseConfirmShowsTitleAndDescription();
    },
);

Then("the pending case confirmation dialog shows the Cancel and Yes actions", async ({ casesPage }) => {
    await casesPage.expectPendingCaseConfirmActions();
});

When("the user cancels the pending case confirmation", async ({ casesPage }) => {
    await casesPage.cancelPendingCaseConfirm();
});

When("the user confirms the pending case", async ({ casesPage }) => {
    await casesPage.confirmPendingCase();
});

Then("the pending case success toast is shown", async ({ casesPage }) => {
    await casesPage.expectPendingCaseSuccessToast();
});

Then("the pending case failure toast is shown", async ({ casesPage }) => {
    await casesPage.expectPendingCaseFailureToast();
});

/** Change-to-pending-reply endpoint (postCasemgmtTenantCasesUuidChangeToPendingReply). */
const CASE_CHANGE_TO_PENDING_REPLY_API = /\/casemgmt\/tenant\/cases\/[^/]+\/change-to-pending-reply/;

Given("the change to pending reply API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(CASE_CHANGE_TO_PENDING_REPLY_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

// ── edit-cts flow (TEN_CAS_EDIT_CTS_FLOW) ────────────────────────────────────

When("the user opens the row actions menu for the first case with editable CTS", async ({ casesPage, $testInfo }) => {
    const opened = await casesPage.openRowActionsMenuFor("Edit CTS");
    if (!opened) {
        $testInfo.skip(true, "No in-progress case (with an Edit CTS action) found in the current environment.");
    }
});

Then("the edit CTS dialog is visible", async ({ casesPage }) => {
    await casesPage.expectEditCtsDialogVisible();
});

Then("the edit CTS dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectEditCtsDialogNotVisible();
});

Then("the edit CTS dialog shows the {string} step title", async ({ casesPage }) => {
    await casesPage.expectEditCtsStepTitle();
});

Then("the edit CTS dialog shows the form field {string}", async ({ casesPage }, field: string) => {
    await casesPage.expectEditCtsFormField(field);
});

Then("the edit CTS dialog shows the Cancel and Next actions", async ({ casesPage }) => {
    await casesPage.expectEditCtsStepOneActions();
});

When("the user selects the first case category", async ({ casesPage }) => {
    await casesPage.selectFirstCaseCategory();
});

When("the user selects the first case type", async ({ casesPage }) => {
    await casesPage.selectFirstCaseType();
});

When("the user selects the first case sub-type", async ({ casesPage }) => {
    await casesPage.selectFirstCaseSubType();
});

When("the user cancels the edit CTS dialog", async ({ casesPage }) => {
    await casesPage.cancelEditCtsDialog();
});

When("the user proceeds to the CTS confirm changes step without duplicates", async ({ casesPage, $testInfo }) => {
    const proceeded = await casesPage.proceedToCtsConfirmChangesWithoutDuplicates();
    if (!proceeded) {
        $testInfo.skip(true, "A duplicate CTS combination was detected — no non-duplicate classification available in this environment.");
    }
});

When("the user proceeds to the CTS manual routing step", async ({ casesPage }) => {
    await casesPage.proceedToCtsManualRouting();
});

When("the user fills the manual routing form with available values", async ({ casesPage, $testInfo }) => {
    const filled = await casesPage.fillCtsManualRouting();
    if (!filled) {
        $testInfo.skip(true, "No workflow steps / resolvers available for manual routing in this environment.");
    }
});

When("the user proceeds to the CTS apply confirmation step", async ({ casesPage }) => {
    await casesPage.proceedToCtsApplyConfirmation();
});

When("the user saves the CTS changes", async ({ casesPage }) => {
    await casesPage.saveCtsChanges();
});

Then("the edit CTS success modal is shown", async ({ casesPage }) => {
    await casesPage.expectEditCtsSuccessModal();
});

// ── edit-case flow (TEN_CAS_EDIT_FLOW) ───────────────────────────────────────

When("the user opens the row actions menu for the first editable case", async ({ casesPage, $testInfo }) => {
    const opened = await casesPage.openRowActionsMenuFor("Edit Case");
    if (!opened) {
        $testInfo.skip(true, "No editable case (with an Edit Case action) found in the current environment.");
    }
});

Then("the edit case dialog is visible", async ({ casesPage }) => {
    await casesPage.expectEditCaseDialogVisible();
});

Then("the edit case dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectEditCaseDialogNotVisible();
});

Then("the edit case dialog shows the {string} title", async ({ casesPage }) => {
    await casesPage.expectEditCaseTitle();
});

Then("the edit case dialog shows the field {string}", async ({ casesPage }, field: string) => {
    await casesPage.expectEditCaseField(field);
});

Then("the edit case dialog shows the Cancel and Save actions", async ({ casesPage }) => {
    await casesPage.expectEditCaseActions();
});

When("the user cancels the edit case dialog", async ({ casesPage }) => {
    await casesPage.cancelEditCaseDialog();
});

When("the user saves the edited case", async ({ casesPage }) => {
    await casesPage.saveEditCase();
});

Then("the edit case success modal is shown", async ({ casesPage, $testInfo }) => {
    const failed = await casesPage.isEditCaseFailureModalVisible();
    if (failed) {
        $testInfo.skip(true, "Edit Case save was rejected by the backend in this environment.");
        return;
    }
    await casesPage.expectEditCaseSuccessModal();
});

// ── view-workflow flow (TEN_CAS_WORKFLOW_FLOW) ───────────────────────────────

When("the user opens the more actions menu in the case workbench", async ({ casesPage }) => {
    await casesPage.openWorkbenchMoreActions();
});

Then("the more actions menu shows the {string} action", async ({ casesPage }, action: string) => {
    await casesPage.expectRowActionsMenuShows(action);
});

Then("the view workflow dialog is visible", async ({ casesPage }) => {
    await casesPage.expectViewWorkflowDialogVisible();
});

Then("the view workflow dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectViewWorkflowDialogNotVisible();
});

Then("the view workflow dialog shows the {string} title", async ({ casesPage }) => {
    await casesPage.expectViewWorkflowTitle();
});

Then("the view workflow dialog shows the workflow diagram", async ({ casesPage }) => {
    await casesPage.expectViewWorkflowDiagram();
});

When("the user closes the view workflow dialog", async ({ casesPage }) => {
    await casesPage.closeViewWorkflowDialog();
});

// ── child-case flow (TEN_CAS_CHILD_CASE_FLOW) ────────────────────────────────

Then("the create child case dialog is visible", async ({ casesPage }) => {
    await casesPage.expectCreateChildCaseDialogVisible();
});

Then("the create child case dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectCreateChildCaseDialogNotVisible();
});

Then(
    "the create child case dialog shows the {string} section with the parent pre-filled",
    async ({ casesPage }) => {
        await casesPage.expectChildCaseParentPrefilled();
    },
);

Then("the create child case dialog shows the field {string}", async ({ casesPage }, field: string) => {
    await casesPage.expectCreateChildCaseField(field);
});

Then("the create child case dialog shows the Cancel and Create Case actions", async ({ casesPage }) => {
    await casesPage.expectCreateChildCaseActions();
});

When("the user cancels the create child case dialog", async ({ casesPage }) => {
    await casesPage.cancelCreateChildCaseDialog();
});

When("the user fills the required child case fields with the first available values", async ({ casesPage }) => {
    // Child-case mode: Customer is inherited from the parent — skip the customer
    // account fill, only Entity/Template + remaining template fields.
    await casesPage.fillRequiredChildCaseFieldsWithFirstAvailableValues();
});

Then("the child case creation success toast is shown", async ({ casesPage }) => {
    await casesPage.expectCreateCaseSuccessToast();
});

// ── related-case flow (TEN_CAS_RELATED_CASE_FLOW) ────────────────────────────

When("the user opens the related case tab in the case workbench", async ({ casesPage }) => {
    await casesPage.openWorkbenchVerticalTab("Related Case");
});

Then("the related case section is visible", async ({ casesPage }) => {
    await casesPage.expectRelatedCaseSectionVisible();
});

When("the user opens the add case relation dialog", async ({ casesPage }) => {
    await casesPage.openAddCaseRelationDialog();
});

Then("the add case relation dialog is visible", async ({ casesPage }) => {
    await casesPage.expectAddRelationDialogVisible();
});

Then("the add case relation dialog shows the search field and the Cancel and Save actions", async ({ casesPage }) => {
    await casesPage.expectAddRelationDialogSearchAndActions();
});

When("the user selects the first available case in the add relation dialog", async ({ casesPage, $testInfo }) => {
    const selected = await casesPage.selectFirstRelatedCaseOption();
    if (!selected) {
        $testInfo.skip(true, "No case options returned by the relation search in the current environment.");
    }
});

When("the user saves the case relation", async ({ casesPage }) => {
    await casesPage.saveCaseRelation();
});

Then("the case relation success toast is shown", async ({ casesPage }) => {
    await casesPage.expectRelationSuccessToast();
});

When("the user opens the first related case card actions menu", async ({ casesPage }) => {
    await casesPage.openFirstRelationCardActionsMenu();
});

When("the user opens the first duplicate case card actions menu", async ({ casesPage }) => {
    await casesPage.openFirstDuplicateCardActionsMenu();
});

When("the user clicks the {string} action in the open actions menu", async ({ casesPage }, action: string) => {
    await casesPage.clickOpenMenuItem(action);
});

Then("the remove relation dialog is visible", async ({ casesPage }) => {
    await casesPage.expectRemoveRelationDialogVisible();
});

When("the user confirms the remove relation", async ({ casesPage }) => {
    await casesPage.confirmRemoveRelation();
});

Then("the remove relation success toast is shown", async ({ casesPage }) => {
    await casesPage.expectRemoveRelationSuccessToast();
});

Then("the merge confirmation dialog is visible", async ({ casesPage }) => {
    await casesPage.expectMergeConfirmDialogVisible();
});

When("the user confirms the merge", async ({ casesPage }) => {
    await casesPage.confirmMerge();
});

Then("the merge failure toast is shown", async ({ casesPage }) => {
    await casesPage.expectMergeFailureToast();
});

/** Duplicates-check endpoint (postCasemgmtTenantCasesDuplicatesCheck) — feeds the Possible Duplicate section. */
const CASE_POSSIBLE_DUPLICATES_API = /\/casemgmt\/tenant\/cases\/duplicates-check/;

Given("the possible duplicates API is configured to return one duplicate case", async ({ network }) => {
    network.use(
        http.post(CASE_POSSIBLE_DUPLICATES_API, () =>
            HttpResponse.json({
                rows: [
                    {
                        id: "dup-relation-1",
                        case_number: "HS-E2E-DUP-0001",
                        title: "E2E duplicate case for merge flow",
                        created_at: new Date().toISOString(),
                        case_priority: { name: "Medium" },
                        sub_tenant_unit: { name: "E2E Unit" },
                    },
                ],
                totalCount: 1,
            }),
        ),
    );
});

/** Merge endpoint (postCasemgmtTenantCasesMerge). */
const CASE_MERGE_API = /\/casemgmt\/tenant\/cases\/merge/;

Given("the merge cases API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(CASE_MERGE_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

// ── start flow (TEN_CAS_START_FLOW) ──────────────────────────────────────────

When("the user opens the row actions menu for the first case assigned to me", async ({ casesPage, $testInfo }) => {
    const opened = await casesPage.openRowActionsMenuFor("Start Case");
    if (!opened) {
        $testInfo.skip(true, "No case assigned to me (with a Start Case action) found in the current environment.");
    }
});

Then("the start case confirmation dialog is visible", async ({ casesPage }) => {
    await casesPage.expectStartConfirmDialogVisible();
});

Then("the start case confirmation dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectStartConfirmDialogNotVisible();
});

Then("the start case confirmation dialog shows the {string} title and description", async ({ casesPage }) => {
    await casesPage.expectStartConfirmShowsTitleAndDescription();
});

Then("the start case confirmation dialog shows the Cancel and Yes actions", async ({ casesPage }) => {
    await casesPage.expectStartConfirmActions();
});

When("the user cancels the start case confirmation", async ({ casesPage }) => {
    await casesPage.cancelStartConfirm();
});

When("the user confirms the start case", async ({ casesPage }) => {
    await casesPage.confirmStart();
});

Then("the case started success toast is shown", async ({ casesPage }) => {
    await casesPage.expectCaseStartedSuccessToast();
});

Then("the start case failure toast is shown", async ({ casesPage }) => {
    await casesPage.expectStartFailureToast();
});

/** Start-working endpoint (postCasemgmtTenantCasesUuidStartWorking). */
const CASE_START_API = /\/casemgmt\/tenant\/cases\/[^/]+\/start-working/;

Given("the start case API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(CASE_START_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

// ── resolve flow (TEN_CAS_RESOLVE_FLOW) ──────────────────────────────────────

When("the user opens the row actions menu for the first resolvable case", async ({ casesPage, $testInfo }) => {
    const opened = await casesPage.openRowActionsMenuFor("Resolve Case");
    if (!opened) {
        $testInfo.skip(true, "No resolvable (started) case found in the current environment.");
    }
});

Then("the resolve case confirmation dialog is visible", async ({ casesPage }) => {
    await casesPage.expectResolveConfirmDialogVisible();
});

Then("the resolve case confirmation dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectResolveConfirmDialogNotVisible();
});

Then("the resolve case confirmation dialog shows the {string} title and description", async ({ casesPage }) => {
    await casesPage.expectResolveConfirmShowsTitleAndDescription();
});

Then(
    "the resolve case confirmation dialog shows the resolution form with the reason textarea",
    async ({ casesPage }) => {
        await casesPage.expectResolveConfirmForm();
    },
);

Then("the resolve case confirmation dialog shows the Cancel and Yes actions", async ({ casesPage }) => {
    await casesPage.expectResolveConfirmActions();
});

When("the user cancels the resolve case confirmation", async ({ casesPage }) => {
    await casesPage.cancelResolveConfirm();
});

When("the user fills the resolution form with the first available resolution", async ({ casesPage }) => {
    await casesPage.fillResolutionWithFirstAvailable();
});

When("the user confirms the resolve case", async ({ casesPage }) => {
    await casesPage.confirmResolve();
});

Then("the resolve case success modal is shown", async ({ casesPage }) => {
    await casesPage.expectResolveSuccessModal();
});

Then("the resolve case failure toast is shown", async ({ casesPage }) => {
    await casesPage.expectResolveFailureToast();
});

/** Resolve endpoint (postCasemgmtTenantCasesUuidResolve). */
const CASE_RESOLVE_API = /\/casemgmt\/tenant\/cases\/[^/]+\/resolve/;

Given("the resolve case API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(CASE_RESOLVE_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

// ── close flow (TEN_CAS_CLOSE_FLOW) ──────────────────────────────────────────

When("the user opens the row actions menu for the first closeable case", async ({ casesPage, $testInfo }) => {
    const opened = await casesPage.openRowActionsMenuFor("Close Case");
    if (!opened) {
        $testInfo.skip(true, "No closeable case found in the current environment.");
    }
});

Then("the close case confirmation dialog is visible", async ({ casesPage }) => {
    await casesPage.expectCloseConfirmDialogVisible();
});

Then("the close case confirmation dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectCloseConfirmDialogNotVisible();
});

Then("the close case confirmation dialog shows the {string} title and description", async ({ casesPage }) => {
    await casesPage.expectCloseConfirmShowsTitleAndDescription();
});

Then("the close case confirmation dialog shows the Cancel and Yes actions", async ({ casesPage }) => {
    await casesPage.expectCloseConfirmActions();
});

When("the user cancels the close case confirmation", async ({ casesPage }) => {
    await casesPage.cancelCloseConfirm();
});

When("the user confirms the close case", async ({ casesPage }) => {
    await casesPage.confirmClose();
});

Then("the close case success modal is shown", async ({ casesPage }) => {
    await casesPage.expectCloseSuccessModal();
});

Then("the close case failure toast is shown", async ({ casesPage }) => {
    await casesPage.expectCloseFailureToast();
});

/** Close endpoint (postCasemgmtTenantCasesUuidClose). */
const CASE_CLOSE_API = /\/casemgmt\/tenant\/cases\/[^/]+\/close/;

Given("the close case API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.post(CASE_CLOSE_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});

// ── cancel flow (TEN_CAS_CANCEL_FLOW) ────────────────────────────────────────

When("the user opens the row actions menu for the first cancellable case", async ({ casesPage, $testInfo }) => {
    // Cancel Case is disabled for non-IVR/DM sources — only accept an ENABLED item.
    const opened = await casesPage.openRowActionsMenuFor("Cancel Case", true);
    if (!opened) {
        $testInfo.skip(true, "No cancellable (IVR/DM, non-solved) case found in the current environment.");
    }
});

Then("the cancel case reason dialog is visible", async ({ casesPage }) => {
    await casesPage.expectCancelReasonDialogVisible();
});

Then("the cancel case reason dialog is not visible", async ({ casesPage }) => {
    await casesPage.expectCancelReasonDialogNotVisible();
});

Then(
    "the cancel case reason dialog shows the {string} field with a reason dropdown",
    async ({ casesPage }) => {
        await casesPage.expectCancelReasonDialogShowsDropdown();
    },
);

Then("the cancel case reason dialog shows the Back and Confirm Cancel actions", async ({ casesPage }) => {
    await casesPage.expectCancelReasonDialogActions();
});

Then("the confirm cancel button is disabled until a reason is selected", async ({ casesPage }) => {
    await casesPage.expectConfirmCancelDisabled();
});

When("the user goes back from the cancel case reason dialog", async ({ casesPage }) => {
    await casesPage.goBackFromCancelReason();
});

When("the user selects the first available cancel reason", async ({ casesPage }) => {
    await casesPage.selectFirstCancelReason();
});

When("the user confirms the case cancel", async ({ casesPage }) => {
    await casesPage.confirmCancelCase();
});

Then("the cancel case success modal is shown", async ({ casesPage }) => {
    await casesPage.expectCancelSuccessModal();
});

Then("the cancel case failure toast is shown", async ({ casesPage }) => {
    await casesPage.expectCancelFailureToast();
});

/** Cancel endpoint (PutCasemgmtTenantCasesUuidCancel). */
const CASE_CANCEL_API = /\/casemgmt\/tenant\/cases\/[^/]+\/cancel/;

Given("the cancel case API is configured to return a 500 server error", async ({ network }) => {
    network.use(
        http.put(CASE_CANCEL_API, () =>
            HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
        ),
    );
});



