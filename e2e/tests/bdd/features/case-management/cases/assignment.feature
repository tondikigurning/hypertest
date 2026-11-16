# Case Management / Cases — grouped from the original cases.feature.
# IDs, flow tags and scenario contracts are retained.
# Read the owning submodule's files together for coverage and shared discovery notes.

Feature: Case Management — Cases

  # ── TEN_CAS_ASSIGN_FLOW ──────────────────────────────────────────────
  # Assign / Transfer / Bulk Assign (single-agent). Unassign has its own flow
  # (TEN_CAS_UNASSIGN_FLOW) and Assign-to-Me its own (TEN_CAS_ASSIGN_TO_ME_FLOW) —
  # those are NOT authored here.
  #
  # PIPELINE TARGETING: the "Assign Case" dialog (case without owner) and bulk
  # assign run against the "Open" pipeline (unassigned queue) — every row there
  # offers "Assign Case", so the first assignable row is always found. The
  # "Transfer Case" dialog (reassign) REQUIRES an owned case, so it runs against
  # the "Assigned" pipeline instead.
  #
  # MOCK POLICY: happy-path mutations are REAL backend hits (data safety: pick an
  # assignable first row — skip when none exists). @mock is used ONLY for the
  # assign-API error variation (same endpoint/payload as the real happy path) and
  # for UI-only error boundaries — never to fake a success that the real path
  # already covers.
  #
  # Real assign flow (verified on the running app):
  #   • Kebab (row or "More Actions" in workbench) → "Assign Case" (no owner) /
  #     "Transfer Case" (has owner) → CaseAssignDialog: header
  #     "Assign/Reassign Agent to Case #<n>…" + "Available Agents" table
  #     (single-select checkbox; Full/current-owner rows disabled) + Cancel/Next.
  #   • Next (enabled only after an agent is selected) → "Assign Confirmation"
  #     dialog (InfoPanel summary + Agent) → "Confirm & Assign" → ResponseModal
  #     "Case <n> has been assigned/reassigned to <agent>".
  #   • Bulk: select rows → mass action "Assign Cases" → "Bulk Assign" dialog
  #     ("Assign multiple cases at once" + Selected Case IDs + Target Agent
  #     ComboBox) → "Bulk Assign" (disabled until agent) → validate →
  #     ResponseModal "Cases assigned successfully."
  #
  # Endpoints (for @mock variation):
  #   • assign/reassign/unassign: POST /casemgmt/tenant/cases/{uuid}/assign
  #   • assignees list (dialog): list-assignees filter API
  #   • bulk: POST /casemgmt/tenant/cases/validate + /casemgmt/tenant/cases/assign-bulk

  @TEN_CAS_ASG_E2E_001 @priority:P0 @smoke @flow:TEN_CAS_ASSIGN_FLOW @type:positive
  Scenario: Assign Case dialog opens from the case kebab menu
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the assign case dialog for the first assignable case
    Then the assign case dialog is visible
    And the assign case dialog shows the case header
    And the assign case dialog shows the available agents list
    And the assign case dialog shows the Cancel and Next actions

  @TEN_CAS_ASG_E2E_002 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_FLOW @type:ui-interaction
  Scenario: Assign dialog Next stays disabled until an agent is selected
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the assign case dialog for the first assignable case
    Then the assign next button is disabled
    When the user selects the first available agent
    Then the assign next button is enabled

  @TEN_CAS_ASG_E2E_003 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_FLOW @type:ui-interaction
  Scenario: Cancelling the assign case dialog closes it
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the assign case dialog for the first assignable case
    When the user cancels the assign case dialog
    Then the assign case dialog is not visible

  # Real-backend mutation: assigns the first assignable case to the first
  # selectable agent. Data safety — skips when no assignable case exists.
  @TEN_CAS_ASG_E2E_004 @priority:P0 @smoke @flow:TEN_CAS_ASSIGN_FLOW @type:positive
  Scenario: Assigning a case to the first available agent succeeds
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the assign case dialog for the first assignable case
    And the user selects the first available agent
    When the user proceeds to the assign confirmation
    Then the assign confirmation dialog is visible
    When the user confirms the case assignment
    Then the assign success modal is shown

  # Real-backend mutation: reassigns an assigned case to a different agent.
  @TEN_CAS_ASG_E2E_005 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_FLOW @type:positive
  Scenario: Transferring an assigned case to another agent succeeds
    Given the user is on the case list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the transfer case dialog for the first assigned case
    And the user selects the first available agent
    When the user proceeds to the assign confirmation
    Then the assign confirmation dialog is visible
    When the user confirms the case assignment
    Then the reassign success modal is shown

  # Bulk assign — UI contract (no mutation): dialog opens with disabled submit.
  @TEN_CAS_ASG_E2E_006 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_FLOW @type:ui-interaction
  Scenario: Bulk Assign dialog opens from selected rows
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user selects the first case row
    When the user opens the bulk assign dialog
    Then the bulk assign dialog is visible
    And the bulk assign dialog shows the selected case ids
    And the bulk assign dialog shows the target agent field
    And the bulk assign submit is disabled

  # Real-backend mutation: bulk assigns selected cases to an agent.
  @TEN_CAS_ASG_E2E_007 @priority:P2 @regression @flow:TEN_CAS_ASSIGN_FLOW @type:positive
  Scenario: Bulk assigning selected cases succeeds
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user selects the first case row
    When the user opens the bulk assign dialog
    And the user selects a target agent in the bulk assign dialog
    When the user submits the bulk assign
    Then the bulk assign success modal is shown

  # Mock variation only — same assign endpoint/payload as the real happy path
  # (ASG_004), asserting the error boundary instead of the success.
  @TEN_CAS_ASG_E2E_008 @priority:P2 @regression @mock @flow:TEN_CAS_ASSIGN_FLOW @type:negative
  Scenario: Assigning a case shows an error toast when the assign API returns 500
    Given the user is on the case list page
    And the assign case API is configured to return a 500 server error
    When the user selects the "Open" pipeline tab
    When the user opens the assign case dialog for the first assignable case
    And the user selects the first available agent
    When the user proceeds to the assign confirmation
    When the user confirms the case assignment
    Then the assign failure toast is shown

  # ── TEN_CAS_UNASSIGN_FLOW ─────────────────────────────────────────────
  # Unassign Case — opened from the row kebab menu ("Unassign Case", only for
  # assigned cases) → ConfirmModal "Unassign Case" → confirm calls the assign
  # endpoint with case_owner_id: undefined.
  #
  # PIPELINE TARGETING: these scenarios run against the "Assigned" pipeline —
  # every row there has an owner, so "Unassign Case" is available on the first
  # row and the first assigned case is always found.
  #
  # Verified against source (use-case-action-kebab-menu.tsx):
  #   • Kebab "Unassign Case" (requires case_owner; hidden when solved/pending-
  #     reply/endorsed-to-WFM) → showConfirmModal({ title: "Unassign Case",
  #     cancelLabel: "Cancel", confirmLabel: "Unassign", isNegativeCase: true,
  #     description: "Are you sure you want to unassign Case <n> from <owner>?
  #     This action will move the case to the 'Unassigned' queue." }).
  #   • Confirm → useUpdateCaseAssignee({ uuid }, { case_owner_id: undefined })
  #     → ResponseModal "Unassign Case Success" / "Case <n> has been set to
  #     Unassigned".
  #   • Error → toast "Failed to unassign case."
  #
  # Endpoint (for @mock variation): POST /casemgmt/tenant/cases/{uuid}/assign

  @TEN_CAS_UAS_E2E_001 @priority:P1 @regression @flow:TEN_CAS_UNASSIGN_FLOW @type:ui-interaction
  Scenario: Unassign Case action is available in the row actions menu for an assigned case
    Given the user is on the case list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the row actions menu for the first assigned case
    Then the row actions menu shows the "Unassign Case" action

  @TEN_CAS_UAS_E2E_002 @priority:P1 @regression @flow:TEN_CAS_UNASSIGN_FLOW @type:ui-interaction
  Scenario: Unassign Case confirmation dialog opens with the case and owner details
    Given the user is on the case list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the row actions menu for the first assigned case
    And the user clicks the "Unassign Case" row action
    Then the unassign case confirmation dialog is visible
    And the unassign case confirmation dialog shows the case number and owner
    And the unassign case confirmation dialog shows the "Unassigned queue" note
    And the unassign case confirmation dialog shows the Cancel and Unassign actions

  @TEN_CAS_UAS_E2E_003 @priority:P1 @regression @flow:TEN_CAS_UNASSIGN_FLOW @type:ui-interaction
  Scenario: Cancelling the unassign case confirmation closes it without unassigning
    Given the user is on the case list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the row actions menu for the first assigned case
    And the user clicks the "Unassign Case" row action
    When the user cancels the unassign case confirmation
    Then the unassign case confirmation dialog is not visible

  # Real-backend mutation: unassigns the first assigned case (moves it to the
  # Unassigned queue). Data safety — skips when no assigned case exists.
  @TEN_CAS_UAS_E2E_004 @priority:P1 @regression @flow:TEN_CAS_UNASSIGN_FLOW @type:positive
  Scenario: Unassigning an assigned case succeeds
    Given the user is on the case list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the row actions menu for the first assigned case
    And the user clicks the "Unassign Case" row action
    When the user confirms the unassign case
    Then the unassign success modal is shown

  # Mock variation only — same assign endpoint as the real happy path (UAS_004),
  # asserting the error boundary instead of the success.
  @TEN_CAS_UAS_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_UNASSIGN_FLOW @type:negative
  Scenario: Unassigning a case shows an error toast when the assign API returns 500
    Given the user is on the case list page
    And the assign case API is configured to return a 500 server error
    When the user selects the "Assigned" pipeline tab
    When the user opens the row actions menu for the first assigned case
    And the user clicks the "Unassign Case" row action
    When the user confirms the unassign case
    Then the unassign failure toast is shown

  # ── TEN_CAS_ASSIGN_TO_ME_FLOW ─────────────────────────────────────────
  # Assign to Me — opened from the row kebab menu ("Assign to Me", shown when
  # canAssignToMe: current user does NOT own the case AND status is OPEN /
  # IN_PROGRESS / PENDING_CUSTOMER_REPLY / ACTION_REQUIRED / ASSIGNED /
  # ESCALATED) → ConfirmModal "Assign Case to Yourself" → confirm calls POST
  # /casemgmt/tenant/cases/{uuid}/assign-to-me.
  #
  # PIPELINE TARGETING: "Open" pipeline — every row there is unassigned (no
  # owner), which satisfies !userIsCaseOwner, and OPEN status is one of the
  # allowed statuses. So "Assign to Me" is available on the first Open row.
  #
  # Verified against source (use-case-action-kebab-menu.tsx + case-action-
  # kebab-menu.tsx):
  #   • Kebab "Assign to Me" (PermissionGuard CASE_MANAGEMENT_CASE_ASSIGN_TO_ME;
  #     condition canAssignToMe) → showConfirmModal({
  #     title: "Assign Case to Yourself", confirmLabel: "Confirm",
  #     cancelLabel: "Cancel", hasSeparator: true,
  #     description: "Are you sure you want to assign this case to yourself?" }).
  #   • Confirm → usePostAssignToMe() → POST .../cases/{uuid}/assign-to-me
  #     → ResponseModal success "Successfully Assigned this Case to Yourself"
  #     / "Case <no> has been assigned to you".
  #   • Error → ResponseModal error "Failed to Assign Case to Yourself"
  #     (modal, NOT a toast — differs from the assign flow).
  #
  # Endpoint (for @mock variation): POST /casemgmt/tenant/cases/{uuid}/assign-to-me

  @TEN_CAS_ATM_E2E_001 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_TO_ME_FLOW @type:ui-interaction
  Scenario: Assign to Me action is available in the row actions menu for an unowned case
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the row actions menu for the first unassigned case
    Then the row actions menu shows the "Assign to Me" action

  @TEN_CAS_ATM_E2E_002 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_TO_ME_FLOW @type:ui-interaction
  Scenario: Assign Case to Yourself confirmation dialog opens with the case details
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the row actions menu for the first unassigned case
    And the user clicks the "Assign to Me" row action
    Then the assign to me confirmation dialog is visible
    And the assign to me confirmation dialog shows the "Assign Case to Yourself" title and description
    And the assign to me confirmation dialog shows the Cancel and Confirm actions

  @TEN_CAS_ATM_E2E_003 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_TO_ME_FLOW @type:ui-interaction
  Scenario: Cancelling the assign to me confirmation closes it without assigning
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the row actions menu for the first unassigned case
    And the user clicks the "Assign to Me" row action
    When the user cancels the assign to me confirmation
    Then the assign to me confirmation dialog is not visible

  # Mock variation — same assign-to-me endpoint as the real happy path
  # (ATM_004), asserting the error boundary (ResponseModal error) instead of
  # the success modal. Runs BEFORE ATM_004 because the real-backend scenario
  # consumes the Open case (owner → current user), leaving no unassigned case
  # for this mock scenario.
  @TEN_CAS_ATM_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_ASSIGN_TO_ME_FLOW @type:negative
  Scenario: Assigning a case to yourself shows an error modal when the assign-to-me API returns 500
    Given the user is on the case list page
    And the assign to me API is configured to return a 500 server error
    When the user selects the "Open" pipeline tab
    When the user opens the row actions menu for the first unassigned case
    And the user clicks the "Assign to Me" row action
    When the user confirms the assign to me
    Then the assign to me error modal is shown

  # Real-backend mutation: assigns the first unassigned (Open) case to the
  # current user (owner → current user). Data safety — skips when no unassigned
  # case exists in the current environment.
  @TEN_CAS_ATM_E2E_004 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_TO_ME_FLOW @type:positive
  Scenario: Assigning a case to yourself succeeds
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the row actions menu for the first unassigned case
    And the user clicks the "Assign to Me" row action
    When the user confirms the assign to me
    Then the assign to me success modal is shown
