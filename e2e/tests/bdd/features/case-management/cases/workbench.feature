# Case Management / Cases — grouped from the original cases.feature.
# IDs, flow tags and scenario contracts are retained.
# Read the owning submodule's files together for coverage and shared discovery notes.

Feature: Case Management — Cases

  # ── TEN_CAS_WORKFLOW_FLOW ───────────────────────────────────────────────
  # View Workflow — opened from the "More Actions" kebab in the CASE DETAIL
  # WORKBENCH (NOT the case list). The workbench's kebab (title="More Actions",
  # canCreateChild=true) is rendered by CaseInformationSection; its "View
  # Workflow" item is disabled when the case has no workflow (hasWorkflow =
  # !!bp_workflow). Opens a READ-ONLY dialog (no mutation):
  #   Header "View Workflow" + workflow diagram — a card per step (Step N +
  #   step title), with the current step highlighted (border-primary). Data from
  #   useGetBusinessProcessById(workflowDetails.id), spinner while loading.
  #
  # FLOW: open a case from the list (→ workbench), then open the "More Actions"
  # kebab in the workbench header and pick "View Workflow".
  #
  # NOTE: read-only view flow — no mutation, no @mock error scenario needed.

  @TEN_CAS_WKF_E2E_001 @priority:P2 @regression @flow:TEN_CAS_WORKFLOW_FLOW @type:ui-interaction
  Scenario: View Workflow action is available in the More Actions menu in the case workbench
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    Then the more actions menu shows the "View Workflow" action

  @TEN_CAS_WKF_E2E_002 @priority:P2 @regression @flow:TEN_CAS_WORKFLOW_FLOW @type:positive
  Scenario: View Workflow dialog opens with the workflow diagram
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    And the user clicks the "View Workflow" row action
    Then the view workflow dialog is visible
    And the view workflow dialog shows the "View Workflow" title
    And the view workflow dialog shows the workflow diagram

  @TEN_CAS_WKF_E2E_003 @priority:P2 @regression @flow:TEN_CAS_WORKFLOW_FLOW @type:ui-interaction
  Scenario: Closing the View Workflow dialog hides it
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    And the user clicks the "View Workflow" row action
    When the user closes the view workflow dialog
    Then the view workflow dialog is not visible

  # ── TEN_CAS_CHILD_CASE_FLOW ────────────────────────────────────────────
  # Create Child Case — opened from the "More Actions" kebab in the CASE DETAIL
  # WORKBENCH (canCreateChild=true is only passed by CaseInformationSection, so
  # this action does NOT exist in the case-list kebab). Condition:
  # !Resolved && !Solved && !PCR && !endorsed-to-WFM; disabled when !hasWorkflow;
  # permission CASE_MANAGEMENT_CASE_CREATE. Opens the "Create Child Case" dialog
  # (case-create.tsx mode="child-case"):
  #   • Customer Details — inherited from the parent (disabled); an EmptyState
  #     ("No Customer Selected") renders instead of the search box.
  #   • Entity + Case Template dropdowns (user selects).
  #   • Case Parent ComboBox — disabled, pre-filled with the parent case number.
  #   • FormGenerator template-driven fields.
  #   Footer: Cancel + "Create Case" (disabled until Entity + Template selected).
  #   Submit → duplicate check → Duplicate dialog OR create API → toast
  #   "Case created successfully" + new case tab opens (?case-number=<n>).
  #
  # FLOW: open a case from the list (→ workbench), then open the "More Actions"
  # kebab and pick "Create Child Case".
  #
  # Real-backend mutation: creates a child case linked to the opened parent.
  # Data safety — skips when the environment has no case with a workflow in the
  # current pipeline.

  @TEN_CAS_CHD_E2E_001 @priority:P1 @regression @flow:TEN_CAS_CHILD_CASE_FLOW @type:ui-interaction
  Scenario: Create Child Case action is available in the More Actions menu in the case workbench
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    Then the more actions menu shows the "Create Child Case" action

  @TEN_CAS_CHD_E2E_002 @priority:P1 @regression @flow:TEN_CAS_CHILD_CASE_FLOW @type:positive
  Scenario: Create Child Case dialog opens with the parent case pre-filled
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    And the user clicks the "Create Child Case" row action
    Then the create child case dialog is visible
    And the create child case dialog shows the "Case Parent" section with the parent pre-filled
    And the create child case dialog shows the field "Main Entity"
    And the create child case dialog shows the field "Case Template"
    And the create child case dialog shows the Cancel and Create Case actions

  @TEN_CAS_CHD_E2E_003 @priority:P1 @regression @flow:TEN_CAS_CHILD_CASE_FLOW @type:ui-interaction
  Scenario: Cancelling the Create Child Case dialog closes it
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    And the user clicks the "Create Child Case" row action
    When the user cancels the create child case dialog
    Then the create child case dialog is not visible

  # Real-backend mutation: creates a child case under the opened parent with the
  # first available entity/template and dynamic field values → success toast +
  # new case tab. Data safety — skips when the create fails or the duplicate
  # branch blocks progression in this environment.
  @TEN_CAS_CHD_E2E_004 @priority:P1 @regression @flow:TEN_CAS_CHILD_CASE_FLOW @type:positive
  Scenario: Creating a child case succeeds
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    And the user clicks the "Create Child Case" row action
    And the user selects the "<entity>" case entity
    And the user selects the "<template>" case template
    And the user fills the required child case fields with the first available values
    When the user creates the case
    Then the child case creation success toast is shown
    And the new case tab opens for the created case

    Examples:
      | entity   | template     |
      | Converge | Trouble Case |

  # ── TEN_CAS_RELATED_CASE_FLOW ──────────────────────────────────────────
  # Related Case — the workbench "Related Case" vertical tab ("RELATION &
  # DUPLICATION CASE"):
  #   • Related Case section — count badge + "Add Case Relation" button
  #     (permission CASE_MANAGEMENT_CASE_CREATE_RELATION) → "Add Case Relation"
  #     dialog: ComboBox "Search Ticket No" (options load on open, excludes the
  #     current case) → pick → card preview + Back/Save → Save → POST
  #     /casemgmt/tenant/cases/relations → toast "Case #X is now related to
  #     Case #Y."
  #   • Related card kebab → "Remove Relation" → dialog "Confirm remove? Are
  #     you sure?" Cancel/Remove → DELETE .../relations/{id} → toast "Related
  #     case removed successfully."
  #   • Possible Duplicate section (only when duplicates exist) → card kebab →
  #     Merge → ConfirmModal "Action Confirmation" ("Are you sure?") Yes/Cancel
  #     → POST /casemgmt/tenant/cases/merge → toast "Duplicated cases merged
  #     successfully."
  #
  # FLOW: open a case from the list (→ workbench), then open the "Related Case"
  # vertical tab.
  #
  # MOCK POLICY: add/remove relations are REAL-backend mutations — the remove
  # scenario first creates its own relation (self-sufficient, no seed data).
  # Merge requires real duplicate cases (same account + CTS) which the
  # environment cannot reliably provide → @mock: duplicates-check returns one
  # row so the section renders, and the merge API 500 exercises the error
  # boundary (safe onError — toast only, no tab side-effects).

  @TEN_CAS_RLC_E2E_001 @priority:P2 @regression @flow:TEN_CAS_RELATED_CASE_FLOW @type:ui-interaction
  Scenario: Related Case tab shows the relation section with the Add Case Relation action
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the related case tab in the case workbench
    Then the related case section is visible

  @TEN_CAS_RLC_E2E_002 @priority:P2 @regression @flow:TEN_CAS_RELATED_CASE_FLOW @type:ui-interaction
  Scenario: Add Case Relation dialog opens with the search field
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the related case tab in the case workbench
    When the user opens the add case relation dialog
    Then the add case relation dialog is visible
    And the add case relation dialog shows the search field and the Cancel and Save actions

  # Real-backend mutation: relates the opened case to the first available case
  # from the search options. Data safety — skips when the search returns no cases.
  @TEN_CAS_RLC_E2E_003 @priority:P2 @regression @flow:TEN_CAS_RELATED_CASE_FLOW @type:positive
  Scenario: Adding a case relation succeeds
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the related case tab in the case workbench
    When the user opens the add case relation dialog
    And the user selects the first available case in the add relation dialog
    When the user saves the case relation
    Then the case relation success toast is shown

  # Real-backend mutation: removes a relation. Self-sufficient — the scenario
  # first creates its own relation, then removes it (no seed data needed).
  @TEN_CAS_RLC_E2E_004 @priority:P2 @regression @flow:TEN_CAS_RELATED_CASE_FLOW @type:positive
  Scenario: Removing a case relation succeeds
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the related case tab in the case workbench
    When the user opens the add case relation dialog
    And the user selects the first available case in the add relation dialog
    When the user saves the case relation
    Then the case relation success toast is shown
    When the user opens the first related case card actions menu
    And the user clicks the "Remove Relation" action in the open actions menu
    Then the remove relation dialog is visible
    When the user confirms the remove relation
    Then the remove relation success toast is shown

  # Mock variation — the duplicates-check API returns one row so the Possible
  # Duplicate section renders, and the merge API returns 500 → error toast.
  @TEN_CAS_RLC_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_RELATED_CASE_FLOW @type:negative
  Scenario: Merging a duplicate case shows an error toast when the merge API returns 500
    Given the user is on the case list page
    And the possible duplicates API is configured to return one duplicate case
    And the merge cases API is configured to return a 500 server error
    When the user opens the first case from the list
    When the user opens the related case tab in the case workbench
    When the user opens the first duplicate case card actions menu
    And the user clicks the "Merge" action in the open actions menu
    Then the merge confirmation dialog is visible
    When the user confirms the merge
    Then the merge failure toast is shown
