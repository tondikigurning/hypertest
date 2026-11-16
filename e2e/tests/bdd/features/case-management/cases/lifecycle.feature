# Case Management / Cases — grouped from the original cases.feature.
# IDs, flow tags and scenario contracts are retained.
# Read the owning submodule's files together for coverage and shared discovery notes.

Feature: Case Management — Cases

  # ── TEN_CAS_START_FLOW ─────────────────────────────────────────────────
  # Start Case — opened from the row kebab menu ("Start Case", only for cases
  # assigned to the CURRENT user that are not yet in progress) → ConfirmModal
  # "Start Case" → confirm calls POST /casemgmt/tenant/cases/{uuid}/start-working.
  #
  # PIPELINE TARGETING: these scenarios run against the "Assigned to Me"
  # pipeline — every row there is owned by the logged-in user (case_owner.id ===
  # preference.user_id), which satisfies userIsCaseOwner. Status "Assigned"
  # satisfies canStart (status ∈ [ASSIGNED, ESCALATED]).
  #
  # Verified against source (use-case-action-kebab-menu.tsx + case-action-
  # kebab-menu.tsx) and live via playwright-cli (case HS-180826-279019):
  #   • Kebab "Start Case" (PermissionGuard CASE_MANAGEMENT_CASE_START_WORKING;
  #     condition isAssigned && !solved && userIsCaseOwner && !isInProgress;
  #     disabled when status not in [ASSIGNED, ESCALATED]) → showConfirmModal({
  #     title: "Start Case", confirmLabel: "Yes", cancelLabel: "Cancel",
  #     description: "Are you sure you want to start this case?" }).
  #   • Confirm → useStartCase() → POST .../cases/{uuid}/start-working
  #     → toast.success "The case has been started successfully."
  #     (position bottom-right, duration 2s).
  #   • Error → toast.error "Failed to start the case."
  #
  # Endpoint (for @mock variation): POST /casemgmt/tenant/cases/{uuid}/start-working
  #
  # NOTE: real-backend mutation mutates the first "Assigned to Me" case — it
  # consumes one of the user's owned cases per run (status → In Progress).

  @TEN_CAS_STR_E2E_001 @priority:P1 @regression @flow:TEN_CAS_START_FLOW @type:ui-interaction
  Scenario: Start Case action is available in the row actions menu for a case assigned to me
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case assigned to me
    Then the row actions menu shows the "Start Case" action

  @TEN_CAS_STR_E2E_002 @priority:P1 @regression @flow:TEN_CAS_START_FLOW @type:ui-interaction
  Scenario: Start Case confirmation dialog opens with the case details
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case assigned to me
    And the user clicks the "Start Case" row action
    Then the start case confirmation dialog is visible
    And the start case confirmation dialog shows the "Start Case" title and description
    And the start case confirmation dialog shows the Cancel and Yes actions

  @TEN_CAS_STR_E2E_003 @priority:P1 @regression @flow:TEN_CAS_START_FLOW @type:ui-interaction
  Scenario: Cancelling the start case confirmation closes it without starting the case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case assigned to me
    And the user clicks the "Start Case" row action
    When the user cancels the start case confirmation
    Then the start case confirmation dialog is not visible

  # Mock variation — same start-working endpoint as the real happy path
  # (STR_004), asserting the error boundary instead of the success. Runs BEFORE
  # STR_004 because the real-backend scenario consumes the "Assigned" case
  # (status → In Progress), leaving no assignable case for this mock scenario.
  @TEN_CAS_STR_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_START_FLOW @type:negative
  Scenario: Starting a case shows an error toast when the start-working API returns 500
    Given the user is on the case list page
    And the start case API is configured to return a 500 server error
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case assigned to me
    And the user clicks the "Start Case" row action
    When the user confirms the start case
    Then the start case failure toast is shown

  # Real-backend mutation: starts the first case assigned to me (status →
  # In Progress). Data safety — skips when the "Assigned to Me" pipeline is empty.
  @TEN_CAS_STR_E2E_004 @priority:P1 @regression @flow:TEN_CAS_START_FLOW @type:positive
  Scenario: Starting a case assigned to me succeeds
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case assigned to me
    And the user clicks the "Start Case" row action
    When the user confirms the start case
    Then the case started success toast is shown

  # ── TEN_CAS_RESOLVE_FLOW ──────────────────────────────────────────────
  # Resolve Case — opened from the row kebab menu ("Resolve Case"), shown only for
  # cases that have started (status IN_PROGRESS/ESCALATED), not solved/closed/pending-
  # customer-reply, and not resolved. The dialog is a ConfirmModal "Resolve Case"
  # (negative style) embedding a FormGenerator with:
  #   • Resolution (dropdown, remote options from casemgmt/tenant/objects/case-resolution, optional)
  #   • Reason (Optional) (textarea)
  # Confirm ("Yes") → POST .../cases/{uuid}/resolve → success ResponseModal
  #   "Case <no> has been successfully resolved." | error toast "Failed to resolve the case."
  #
  # PIPELINE TARGETING: "Assigned to Me" pipeline + status filter "In Progress" —
  # cases there are owned by the current user (so the resolve action is available)
  # and `isCaseHasStarted` (status IN_PROGRESS/ESCALATED) is the only condition that
  # qualifies for Resolve. The kebab scan filters rows whose status is not
  # In Progress / Escalated.
  #
  # NOTE: real-backend mutation consumes one in-progress case per run (status → resolved).

  @TEN_CAS_RES_E2E_001 @priority:P1 @regression @flow:TEN_CAS_RESOLVE_FLOW @type:ui-interaction
  Scenario: Resolve Case action is available in the row actions menu for a started case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first resolvable case
    Then the row actions menu shows the "Resolve Case" action

  @TEN_CAS_RES_E2E_002 @priority:P1 @regression @flow:TEN_CAS_RESOLVE_FLOW @type:ui-interaction
  Scenario: Resolve Case confirmation dialog opens with the resolution form
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first resolvable case
    And the user clicks the "Resolve Case" row action
    Then the resolve case confirmation dialog is visible
    And the resolve case confirmation dialog shows the "Resolve Case" title and description
    And the resolve case confirmation dialog shows the resolution form with the reason textarea
    And the resolve case confirmation dialog shows the Cancel and Yes actions

  @TEN_CAS_RES_E2E_003 @priority:P1 @regression @flow:TEN_CAS_RESOLVE_FLOW @type:ui-interaction
  Scenario: Cancelling the resolve case confirmation closes it without resolving the case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first resolvable case
    And the user clicks the "Resolve Case" row action
    When the user cancels the resolve case confirmation
    Then the resolve case confirmation dialog is not visible

  # Mock variation — same resolve endpoint as the real happy path (RES_004),
  # asserting the error boundary instead of the success.
  @TEN_CAS_RES_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_RESOLVE_FLOW @type:negative
  Scenario: Resolving a case shows an error toast when the resolve API returns 500
    Given the user is on the case list page
    And the resolve case API is configured to return a 500 server error
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first resolvable case
    And the user clicks the "Resolve Case" row action
    When the user confirms the resolve case
    Then the resolve case failure toast is shown

  # Real-backend mutation: resolves the first started case in the "Assigned to Me"
  # pipeline with status In Progress (status → resolved). Data safety — skips
  # when no resolvable case exists in the current environment.
  @TEN_CAS_RES_E2E_004 @priority:P1 @regression @flow:TEN_CAS_RESOLVE_FLOW @type:positive
  Scenario: Resolving a case with the first available resolution succeeds
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first resolvable case
    And the user clicks the "Resolve Case" row action
    When the user fills the resolution form with the first available resolution
    And the user confirms the resolve case
    Then the resolve case success modal is shown

  # ── TEN_CAS_PENDING_REPLY_FLOW ─────────────────────────────────────────
  # Pending to Customer Reply — opened from the row kebab menu ("Pending to
  # customer reply"), shown when isInProgress (status IN_PROGRESS/ESCALATED),
  # !solved, !enterprise, !endorsed-to-WFM, and source not IVR. ConfirmModal
  # "Pending Case" → confirm calls POST /casemgmt/tenant/cases/{uuid}/change-to-pending-reply.
  #
  # PIPELINE TARGETING: "Assigned to Me" pipeline + status filter "In Progress" —
  # cases there are owned by the current user and are in the In Progress state
  # (`isInProgress`) that qualifies for the action. The kebab scan filters rows
  # whose status is not In Progress / Escalated.
  #
  # Verified against source (use-case-action-kebab-menu.tsx + case-action-
  # kebab-menu.tsx):
  #   • Kebab "Pending to customer reply" (PermissionGuard
  #     CASE_MANAGEMENT_CASE_CHANGE_TO_PENDING_REPLY; condition isInProgress &&
  #     !solved && !enterprise && !endorsed-to-WFM; disabled when hasWorkOrder) →
  #     showConfirmModal({ title: "Pending Case", confirmLabel: "Yes",
  #     cancelLabel: "Cancel", hasSeparator: true,
  #     description: "Are you sure you want to set this case to pending?" }).
  #   • Confirm → useChangeToPendingCustomerReply() → POST .../{uuid}/change-to-pending-reply
  #     → toast.success "The case status has been changed to pending customer reply."
  #     (position bottom-right, duration 2s).
  #   • Error → toast.error "Failed to change the case status."
  #
  # Endpoint (for @mock variation): POST /casemgmt/tenant/cases/{uuid}/change-to-pending-reply

  @TEN_CAS_PRY_E2E_001 @priority:P1 @regression @flow:TEN_CAS_PENDING_REPLY_FLOW @type:ui-interaction
  Scenario: Pending to customer reply action is available in the row actions menu for an in-progress case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first in-progress case
    Then the row actions menu shows the "Pending to customer reply" action

  @TEN_CAS_PRY_E2E_002 @priority:P1 @regression @flow:TEN_CAS_PENDING_REPLY_FLOW @type:ui-interaction
  Scenario: Pending Case confirmation dialog opens with the case details
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first in-progress case
    And the user clicks the "Pending to customer reply" row action
    Then the pending case confirmation dialog is visible
    And the pending case confirmation dialog shows the "Pending Case" title and description
    And the pending case confirmation dialog shows the Cancel and Yes actions

  @TEN_CAS_PRY_E2E_003 @priority:P1 @regression @flow:TEN_CAS_PENDING_REPLY_FLOW @type:ui-interaction
  Scenario: Cancelling the pending case confirmation closes it without changing the status
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first in-progress case
    And the user clicks the "Pending to customer reply" row action
    When the user cancels the pending case confirmation
    Then the pending case confirmation dialog is not visible

  # Mock variation — same change-to-pending-reply endpoint as the real happy path
  # (PRY_004), asserting the error boundary instead of the success. Runs BEFORE
  # PRY_004 because the real-backend scenario consumes the In Progress case
  # (status → Pending Customer Reply), leaving no qualifying case for this mock scenario.
  @TEN_CAS_PRY_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_PENDING_REPLY_FLOW @type:negative
  Scenario: Changing a case to pending customer reply shows an error toast when the API returns 500
    Given the user is on the case list page
    And the change to pending reply API is configured to return a 500 server error
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first in-progress case
    And the user clicks the "Pending to customer reply" row action
    When the user confirms the pending case
    Then the pending case failure toast is shown

  # Real-backend mutation: changes the first in-progress case to pending customer
  # reply (status → Pending Customer Reply). Data safety — skips when no in-progress
  # case exists in the current environment.
  @TEN_CAS_PRY_E2E_004 @priority:P1 @regression @flow:TEN_CAS_PENDING_REPLY_FLOW @type:positive
  Scenario: Changing a case to pending customer reply succeeds
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first in-progress case
    And the user clicks the "Pending to customer reply" row action
    When the user confirms the pending case
    Then the pending case success toast is shown

  # ── TEN_CAS_CLOSE_FLOW ─────────────────────────────────────────────────
  # Close Case — opened from the row kebab menu ("Close Case"), shown when the
  # case source is IVR/CHATBOT_FACEBOOK_DM or status PENDING_CUSTOMER_REPLY/SOLVED,
  # and the case is not endorsed to WFM. ConfirmModal "Close Case" (negative style):
  #   title "Close Case", description "Are you sure you want to close this case?
  #   This action cannot be undone.", confirm "Yes", cancel "Cancel".
  # Confirm → POST .../cases/{uuid}/close → success ResponseModal
  #   "Case <no> has been closed" | error toast "Failed to close the case."
  #
  # PIPELINE TARGETING: "Solved" pipeline — cases there satisfy the close
  # eligibility (typically IVR/CHATBOT source, or not endorsed to WFM) and the
  # close API reliably accepts the transition. The kebab scan still filters
  # rows whose menu actually offers "Close Case" — the
  # `openRowActionsMenuFor` helper skip-fails when no row offers the item.

  @TEN_CAS_CLS_E2E_001 @priority:P1 @regression @flow:TEN_CAS_CLOSE_FLOW @type:ui-interaction
  Scenario: Close Case action is available in the row actions menu for a closeable case
    Given the user is on the case list page
    When the user selects the "Solved" pipeline tab
    When the user opens the row actions menu for the first closeable case
    Then the row actions menu shows the "Close Case" action

  @TEN_CAS_CLS_E2E_002 @priority:P1 @regression @flow:TEN_CAS_CLOSE_FLOW @type:ui-interaction
  Scenario: Close Case confirmation dialog opens with the case details
    Given the user is on the case list page
    When the user selects the "Solved" pipeline tab
    When the user opens the row actions menu for the first closeable case
    And the user clicks the "Close Case" row action
    Then the close case confirmation dialog is visible
    And the close case confirmation dialog shows the "Close Case" title and description
    And the close case confirmation dialog shows the Cancel and Yes actions

  @TEN_CAS_CLS_E2E_003 @priority:P1 @regression @flow:TEN_CAS_CLOSE_FLOW @type:ui-interaction
  Scenario: Cancelling the close case confirmation closes it without closing the case
    Given the user is on the case list page
    When the user selects the "Solved" pipeline tab
    When the user opens the row actions menu for the first closeable case
    And the user clicks the "Close Case" row action
    When the user cancels the close case confirmation
    Then the close case confirmation dialog is not visible

  # Mock variation — same close endpoint as the real happy path (CLS_004),
  # asserting the error boundary instead of the success.
  @TEN_CAS_CLS_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_CLOSE_FLOW @type:negative
  Scenario: Closing a case shows an error toast when the close API returns 500
    Given the user is on the case list page
    And the close case API is configured to return a 500 server error
    When the user selects the "Solved" pipeline tab
    When the user opens the row actions menu for the first closeable case
    And the user clicks the "Close Case" row action
    When the user confirms the close case
    Then the close case failure toast is shown

  # Real-backend mutation: closes the first closeable case in the "Solved"
  # pipeline (status → closed). Data safety — skips when no closeable case
  # exists in the current environment.
  @TEN_CAS_CLS_E2E_004 @priority:P1 @regression @flow:TEN_CAS_CLOSE_FLOW @type:positive
  Scenario: Closing a case succeeds
    Given the user is on the case list page
    When the user selects the "Solved" pipeline tab
    When the user opens the row actions menu for the first closeable case
    And the user clicks the "Close Case" row action
    When the user confirms the close case
    Then the close case success modal is shown

  # ── TEN_CAS_CANCEL_FLOW ────────────────────────────────────────────────
  # Cancel Case — opened from the row kebab menu ("Cancel Case", disabled unless
  # the case source is IVR/CHATBOT_FACEBOOK_DM and status not solved/closed/cancelled).
  # Opens the "Cancel Case Reason" DIALOG (not a ConfirmModal):
  #   header "Cancel Case Reason", body "Choose Cancel Reason" + Dropdown
  #   (options from the cancel-reason API), footer "Back" (default) +
  #   "Confirm Cancel" (negative; disabled until a reason is selected).
  # Confirm → PUT .../cases/{uuid}/cancel {cancel_reason_id} → success ResponseModal
  #   "Case <no> has been closed" | error toast "Failed to close."
  #
  # PIPELINE TARGETING: "All" pipeline — first case whose kebab offers "Cancel Case"
  # (and is not disabled — the menu item is disabled for non-IVR sources).

  @TEN_CAS_CNC_E2E_001 @priority:P1 @regression @flow:TEN_CAS_CANCEL_FLOW @type:ui-interaction
  Scenario: Cancel Case action is available in the row actions menu for a cancellable case
    Given the user is on the case list page
    When the user opens the row actions menu for the first cancellable case
    Then the row actions menu shows the "Cancel Case" action

  @TEN_CAS_CNC_E2E_002 @priority:P1 @regression @flow:TEN_CAS_CANCEL_FLOW @type:ui-interaction
  Scenario: Cancel Case Reason dialog opens with the cancel reason dropdown
    Given the user is on the case list page
    When the user opens the row actions menu for the first cancellable case
    And the user clicks the "Cancel Case" row action
    Then the cancel case reason dialog is visible
    And the cancel case reason dialog shows the "Choose Cancel Reason" field with a reason dropdown
    And the cancel case reason dialog shows the Back and Confirm Cancel actions
    And the confirm cancel button is disabled until a reason is selected

  @TEN_CAS_CNC_E2E_003 @priority:P1 @regression @flow:TEN_CAS_CANCEL_FLOW @type:ui-interaction
  Scenario: Going back from the cancel case reason dialog closes it without cancelling the case
    Given the user is on the case list page
    When the user opens the row actions menu for the first cancellable case
    And the user clicks the "Cancel Case" row action
    When the user goes back from the cancel case reason dialog
    Then the cancel case reason dialog is not visible

  # Mock variation — same cancel endpoint as the real happy path (CNC_004),
  # asserting the error boundary instead of the success.
  @TEN_CAS_CNC_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_CANCEL_FLOW @type:negative
  Scenario: Cancelling a case shows an error toast when the cancel API returns 500
    Given the user is on the case list page
    And the cancel case API is configured to return a 500 server error
    When the user opens the row actions menu for the first cancellable case
    And the user clicks the "Cancel Case" row action
    When the user selects the first available cancel reason
    And the user confirms the case cancel
    Then the cancel case failure toast is shown

  # Real-backend mutation: cancels the first cancellable (IVR/DM) case.
  # Data safety — skips when no cancellable case exists in the current environment.
  @TEN_CAS_CNC_E2E_004 @priority:P1 @regression @flow:TEN_CAS_CANCEL_FLOW @type:positive
  Scenario: Cancelling a case with the first available cancel reason succeeds
    Given the user is on the case list page
    When the user opens the row actions menu for the first cancellable case
    And the user clicks the "Cancel Case" row action
    When the user selects the first available cancel reason
    And the user confirms the case cancel
    Then the cancel case success modal is shown
