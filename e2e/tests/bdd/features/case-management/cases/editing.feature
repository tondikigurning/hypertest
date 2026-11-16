# Case Management / Cases — grouped from the original cases.feature.
# IDs, flow tags and scenario contracts are retained.
# Read the owning submodule's files together for coverage and shared discovery notes.

Feature: Case Management — Cases

  # ── TEN_CAS_EDIT_CTS_FLOW ───────────────────────────────────────────────
  # Edit CTS — opened from the row kebab menu ("Edit CTS", shown when
  # isCaseHasStarted && !solved, disabled when hasWorkOrder; permission
  # CASE_MANAGEMENT_CASE_UPDATE_CTS_CLASSIFICATION). Opens a 4-STEP WIZARD:
  #   Step 1 "Edit CTS" — CaseDataCard + FormGenerator (Case Category →
  #     enables Case Type → enables Case Sub-type) + CTS Change Detected alert.
  #     Footer: Cancel + Next (disabled until all three dropdowns selected).
  #     Next → POST /casemgmt/tenant/cases/duplicates-check → if a duplicate
  #     exists, "Possible Duplicate Case" panel (Go Back & Edit / Cancel);
  #     else advance to Step 2.
  #   Step 2 "Confirm CTS Changes" — Before (Current) vs After (New)
  #     comparison InfoPanels. Footer: Previous + Next.
  #   Step 3 "Manual Routing" — FormGenerator (Next Workflow Step → enables
  #     Team/Resolver + Routing Notes (optional)). Footer: Previous + Next.
  #   Step 4 "Apply Changes Confirmation" — "Are you sure want to save all the
  #     change to the CTS?" + Previous + Save.
  #   Save → PUT /casemgmt/tenant/cases/{uuid}/cts-workflow → ResponseModal
  #     success "CTS for <no> has been successfully updated." | error modal
  #     "CTS for <no> has failed to update."
  #
  # PIPELINE TARGETING: "Assigned to Me" pipeline + status filter "In Progress" —
  # isCaseHasStarted (IN_PROGRESS/ESCALATED) + !solved is the kebab condition.
  #
  # NOTE: the wizard's Step-1→Step-2 advance runs a real duplicate check that is
  # data-dependent. The happy-path scenario (ECT_004) skips when the duplicate
  # branch blocks progression or no workflow steps exist for manual routing.
  #
  # Endpoints:
  #   • save: PUT /casemgmt/tenant/cases/{uuid}/cts-workflow
  #   • duplicate check: POST /casemgmt/tenant/cases/duplicates-check

  @TEN_CAS_ECT_E2E_001 @priority:P1 @regression @flow:TEN_CAS_EDIT_CTS_FLOW @type:ui-interaction
  Scenario: Edit CTS action is available in the row actions menu for an in-progress case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case with editable CTS
    Then the row actions menu shows the "Edit CTS" action

  @TEN_CAS_ECT_E2E_002 @priority:P1 @regression @flow:TEN_CAS_EDIT_CTS_FLOW @type:positive
  Scenario: Edit CTS dialog opens at the first step with the CTS classification form
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case with editable CTS
    And the user clicks the "Edit CTS" row action
    Then the edit CTS dialog is visible
    And the edit CTS dialog shows the "Edit CTS" step title
    And the edit CTS dialog shows the form field "Case Category"
    And the edit CTS dialog shows the form field "Case Type"
    And the edit CTS dialog shows the form field "Case Sub-type"
    And the edit CTS dialog shows the Cancel and Next actions

  @TEN_CAS_ECT_E2E_003 @priority:P1 @regression @flow:TEN_CAS_EDIT_CTS_FLOW @type:ui-interaction
  Scenario: Cancelling the Edit CTS dialog closes it without changes
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case with editable CTS
    And the user clicks the "Edit CTS" row action
    When the user cancels the edit CTS dialog
    Then the edit CTS dialog is not visible

  # Real-backend mutation: navigates the full 4-step wizard with first-available
  # dynamic values and SAVES the CTS change (PUT .../{uuid}/cts-workflow) against
  # the REAL backend → success ResponseModal "CTS for <no> has been successfully
  # updated." Data safety — skips when:
  #   • the real duplicate check finds an existing case with the same CTS
  #     combination (no non-duplicate classification is guaranteed available), or
  #   • the real cts-workflow response provides no workflow steps for manual
  #     routing (Step 3 cannot be filled).
  # NOTE: this consumes/mutates the first in-progress case's CTS classification
  # per run — the case stays in-progress, only its classification changes.
  @TEN_CAS_ECT_E2E_004 @priority:P1 @regression @flow:TEN_CAS_EDIT_CTS_FLOW @type:positive
  Scenario: Updating the CTS classification of an in-progress case succeeds
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case with editable CTS
    And the user clicks the "Edit CTS" row action
    When the user selects the first case category
    And the user selects the first case type
    And the user selects the first case sub-type
    When the user proceeds to the CTS confirm changes step without duplicates
    When the user proceeds to the CTS manual routing step
    And the user fills the manual routing form with available values
    When the user proceeds to the CTS apply confirmation step
    When the user saves the CTS changes
    Then the edit CTS success modal is shown

  # ── TEN_CAS_EDIT_FLOW ──────────────────────────────────────────────────
  # Edit Case — opened from the row kebab menu ("Edit Case", shown when
  # showEditGroup = !ActionRequired && !PCR && !Resolved-workflow && !Closed &&
  # !endorsed-to-WFM && !IVR/CHATBOT/SOCIAL source; disabled when hasWorkOrder;
  # permission CASE_MANAGEMENT_CASE_UPDATE_FIELDS). Opens the "Edit Case" DIALOG
  # (single step, not a wizard):
  #   • Entity (disabled) + Case Template (disabled) — pre-filled current values
  #   • Customer Details InfoPanel + Case Parent ComboBox ("Search Ticket No")
  #   • FormGenerator — Case Category / Case Type / Case Sub-type (pre-filled)
  #     + template-driven fields
  #   Footer: Cancel + Save.
  #   Save → PUT /casemgmt/tenant/cases/{uuid}/update → ResponseModal success
  #     "Case #<no> has been updated." | error modal "The data has failed to update."
  #
  # PIPELINE TARGETING: "Assigned to Me" pipeline — cases there are owned by the
  # current user and satisfy showEditGroup (non-terminal, non-IVR source). The
  # kebab scan finds the first row offering "Edit Case".
  #
  # NOTE: Save re-submits the pre-filled current values (no field change needed),
  # so the happy path is a real-backend update of the case's own data.
  #
  # Endpoint: PUT /casemgmt/tenant/cases/{uuid}/update

  @TEN_CAS_EDT_E2E_001 @priority:P1 @regression @flow:TEN_CAS_EDIT_FLOW @type:ui-interaction
  Scenario: Edit Case action is available in the row actions menu for an editable case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first editable case
    Then the row actions menu shows the "Edit Case" action

  @TEN_CAS_EDT_E2E_002 @priority:P1 @regression @flow:TEN_CAS_EDIT_FLOW @type:positive
  Scenario: Edit Case dialog opens with the case fields
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first editable case
    And the user clicks the "Edit Case" row action
    Then the edit case dialog is visible
    And the edit case dialog shows the "Edit Case" title
    And the edit case dialog shows the field "Entity"
    And the edit case dialog shows the field "Case Template"
    And the edit case dialog shows the field "Case Category"
    And the edit case dialog shows the field "Case Type"
    And the edit case dialog shows the field "Case Sub-type"
    And the edit case dialog shows the Cancel and Save actions

  @TEN_CAS_EDT_E2E_003 @priority:P1 @regression @flow:TEN_CAS_EDIT_FLOW @type:ui-interaction
  Scenario: Cancelling the Edit Case dialog closes it without changes
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first editable case
    And the user clicks the "Edit Case" row action
    When the user cancels the edit case dialog
    Then the edit case dialog is not visible

  # Real-backend mutation: re-submits the case's current values via Save
  # (PUT .../{uuid}/update) → success ResponseModal "Case #<no> has been
  # updated." Data safety — skips when the backend rejects the update (e.g. a
  # template-required field is empty in this environment).
  @TEN_CAS_EDT_E2E_004 @priority:P1 @regression @flow:TEN_CAS_EDIT_FLOW @type:positive
  Scenario: Saving the edited case succeeds
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first editable case
    And the user clicks the "Edit Case" row action
    When the user saves the edited case
    Then the edit case success modal is shown
