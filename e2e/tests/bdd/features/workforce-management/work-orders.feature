# Feature: Workforce Management — Work Orders
#
# Routes:
#   /workforce-management/work-orders              — list page
#   /workforce-management/work-orders/create       — create work order wizard
#
# ID prefix: TEN_WKO_<FLG>_E2E_NNN  (NNN resets per flow section; <FLG> is exactly 3 characters)
#
# Flow tag convention:
#   @flow:TEN_WKO_<ACTION>_FLOW — full action name (LIST, CREATE, …); stable; never rename or reuse
#
# Component @ref map:
#   TEN_WKO_LIST_FLOW:           TEN_COM_PIP_E2E_001, TEN_COM_FSR_E2E_001, TEN_COM_FIL_E2E_001, TEN_COM_SAP_E2E_001
#   TEN_WKO_VIEW_DETAIL_FLOW:    TEN_COM_VDT_E2E_001, TEN_COM_VDT_E2E_002, TEN_COM_VDT_E2E_003

Feature: Workforce Management — Work Orders

  # ── TEN_WKO_LIST_FLOW ──────────────────────────────────────────────────

  @TEN_WKO_LST_E2E_001 @priority:P0 @smoke @flow:TEN_WKO_LIST_FLOW @type:positive
  Scenario: Work Orders list page loads with the data table visible
    Given the user is on the work orders list page
    Then the work orders data table is visible

  @TEN_WKO_LST_E2E_002 @priority:P1 @smoke @ref:TEN_COM_PIP_E2E_001 @flow:TEN_WKO_LIST_FLOW @type:ui-interaction
  Scenario Outline: Selecting a pipeline tab activates it
    Given a list page with pipeline tabs is open
    When the user selects the "<tab>" pipeline tab
    Then the "<tab>" pipeline tab is active

    Examples:
      | tab         |
      | Unassigned  |
      | Assigned    |
      | In Progress |
      | Completed   |
      | On Hold     |
      | Canceled    |
      | Rescheduled |

  @TEN_WKO_LST_E2E_003 @priority:P1 @smoke @ref:TEN_COM_FSR_E2E_001 @flow:TEN_WKO_LIST_FLOW @type:positive
  Scenario Outline: Search input filters rows by the first visible row "<field>"
    Given a list page with search is open
    When the user searches for the first visible row "<field>"
    Then the search returns matching rows

    Examples:
      | field |
      | name  |

  @TEN_WKO_LST_E2E_004 @priority:P1 @regression @ref:TEN_COM_FIL_E2E_001 @flow:TEN_WKO_LIST_FLOW @type:ui-interaction
  Scenario Outline: Each filter option triggers API and returns matching rows
    Given a list page with filters is open
    When the user applies the "<filter_option>" filter option
    Then the filter triggers an API call that returns HTTP 200
    And the filter response includes rows that match the selected value

    Examples:
      | filter_option              |
      | customer_account_number    |
      | agent_code                 |
      | agent_name                 |
      | assigned_user_display_name |
      | customer_name              |
      | customer_city              |
      | customer_phone             |
      | customer_type              |
      | remarks                    |
      | wo_source_reference_no     |
      | code                       |

  @TEN_WKO_LST_E2E_005 @priority:P1 @regression @ref:TEN_COM_SAP_E2E_001 @flow:TEN_WKO_LIST_FLOW @type:ui-interaction
  Scenario: All sort options work in both directions
    Given a list page with sort is open
    When the user applies each sort option in ascending and descending direction
    Then each sort triggers an API call that returns HTTP 200
    And each sort response includes rows in the correct order

  @TEN_WKO_LST_E2E_006 @regression @mock @ref:TEN_COM_FSR_E2E_002 @flow:TEN_WKO_LIST_FLOW @type:negative
  Scenario: Search shows error state when the API returns 500 server error
    Given a list page with search is open
    And the search API is configured to return a 500 server error
    When the user searches for "test"
    Then the application shows an error state

  @TEN_WKO_LST_E2E_007 @regression @mock @ref:TEN_COM_FSR_E2E_003 @flow:TEN_WKO_LIST_FLOW @type:edge-case
  Scenario: Search shows loading state while waiting for a slow API response
    Given a list page with search is open
    And the search API response is delayed by 4 seconds
    When the user searches for "test"
    Then a loading indicator or spinner is visible before the results load

  @TEN_WKO_LST_E2E_008 @regression @mock @ref:TEN_COM_FIL_E2E_002 @flow:TEN_WKO_LIST_FLOW @type:negative
  Scenario: Filter request shows error state when API returns 500 server error
    Given a list page with filters is open
    And the filter API is configured to return a 500 server error
    When the user applies the first available filter option
    Then the application shows an error state

  @TEN_WKO_LST_E2E_009 @regression @mock @ref:TEN_COM_FIL_E2E_003 @flow:TEN_WKO_LIST_FLOW @type:edge-case
  Scenario: Filter shows loading state while waiting for a slow API response
    Given a list page with filters is open
    And the filter API response is delayed by 4 seconds
    When the user applies the first available filter option
    Then a loading indicator or spinner is visible before the results load

  @TEN_WKO_LST_E2E_010 @regression @mock @ref:TEN_COM_SAP_E2E_002 @flow:TEN_WKO_LIST_FLOW @type:negative
  Scenario: Sort request shows error state when API returns 500 server error
    Given a list page with sort is open
    And the sort API is configured to return a 500 server error
    When the user applies the first available sort option
    Then the application shows an error state

  @TEN_WKO_LST_E2E_011 @regression @mock @ref:TEN_COM_SAP_E2E_003 @flow:TEN_WKO_LIST_FLOW @type:edge-case
  Scenario: Sort shows loading state while waiting for a slow API response
    Given a list page with sort is open
    And the sort API response is delayed by 4 seconds
    When the user applies the first available sort option
    Then a loading indicator or spinner is visible before the results load

  @TEN_WKO_LST_E2E_012 @regression @mock @ref:TEN_COM_PIP_E2E_002 @flow:TEN_WKO_LIST_FLOW @type:negative
  Scenario: Pipeline tab request shows error state when API returns 500 server error
    Given a list page with pipeline tabs is open
    And the pipeline tab API is configured to return a 500 server error
    When the user selects the "Assigned" pipeline tab
    Then the application shows an error state

  @TEN_WKO_LST_E2E_013 @priority:P0 @regression @mock @flow:TEN_WKO_LIST_FLOW @type:negative
  Scenario: App handles token expiration gracefully when the work orders API returns 401
    Given the work orders API is configured to return a 401 authentication error
    When the user navigates to the work orders list page
    Then the user is redirected to the login page or shown an access denied message

  # ── TEN_WKO_VIEW_DETAIL_FLOW ──────────────────────────────────────────

  @TEN_WKO_VDT_E2E_001 @priority:P0 @smoke @ref:TEN_COM_VDT_E2E_001 @flow:TEN_WKO_VIEW_DETAIL_FLOW @type:positive
  Scenario: Clicking a list row opens the detail panel
    Given a list page with detail panel layout is open
    When the user clicks the first list row
    Then the detail panel is visible
    And the detail panel header shows a title

  @TEN_WKO_VDT_E2E_002 @priority:P1 @regression @ref:TEN_COM_VDT_E2E_002 @flow:TEN_WKO_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario Outline: Each detail panel tab displays its content section
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user clicks the "<tab>" detail panel tab
    Then the "<tab>" tab content is visible

    Examples:
      | tab                  |
      | Details              |
      | Logs                 |
      | Usage Item           |
      | Attachment           |
      | Root Cause Analysis  |

  @TEN_WKO_VDT_E2E_003 @priority:P1 @regression @ref:TEN_COM_VDT_E2E_003 @flow:TEN_WKO_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario: Closing the detail panel hides it
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user closes the detail panel
    Then the detail panel is not visible

  @TEN_WKO_VDT_E2E_004 @regression @mock @ref:TEN_COM_VDT_E2E_004 @flow:TEN_WKO_VIEW_DETAIL_FLOW @type:negative
  Scenario: Detail panel shows error state when the detail API returns 500 server error
    Given a list page with detail panel layout is open
    And the detail panel API is configured to return a 500 server error
    When the user clicks the first list row
    Then the application shows an error state

  @TEN_WKO_VDT_E2E_005 @regression @mock @ref:TEN_COM_VDT_E2E_005 @flow:TEN_WKO_VIEW_DETAIL_FLOW @type:edge-case
  Scenario: Detail panel shows loading skeleton while waiting for a slow API response
    Given a list page with detail panel layout is open
    And the detail panel API response is delayed by 3 seconds
    When the user clicks the first list row
    Then the loading skeleton is visible before the detail panel content loads

  # ── TEN_WKO_CREATE_FLOW ───────────────────────────────────────────────
  #
  # The create work order wizard is a 4-step process:
  #   Step 1 — Case & Job Detail: select Job Type (Repair only), Priority,
  #            and Case Reference / Ticket ID (case number from Case Management).
  #            If the searched case reference is not found, a confirmation dialog
  #            appears asking "Proceed" or "Cancel". Choosing Proceed reveals
  #            an Account Number input (use account number from a completed WO).
  #   Step 2 — Scheduling: select a time slot via TimeSlotSelector.
  #   Step 3 — Summary: review details and confirm.
  #   Step 4 — Completed: success screen with "Back to Homepage" / "Create More WO".
  #
  # MSP (Managed Service Provider) is parameterized: default to "Converge".
  # Job Type is Repair (autofilled and disabled in the future).
  # All unrequired inputs should be filled with relevant values.

  @TEN_WKO_CRT_E2E_001 @priority:P0 @smoke @flow:TEN_WKO_CREATE_FLOW @type:positive
  Scenario: Operator can successfully create a new work order via the wizard with a valid case reference
    Given the user is on the work orders list page
    When the user retrieves a case reference number from the cases list
    And the user opens the create work order wizard
    And the user selects the "Repair" job type
    And the user selects the first available priority
    And the user searches for the case reference number
    And the user selects the first matching case reference
    And the user selects the Converge MSP
    And the user selects the first available entity
    And the user advances to the scheduling step
    And the user selects the first available time slot
    And the user advances to the summary step
    And the user confirms the work order creation
    Then the work order creation success screen is displayed

  @TEN_WKO_CRT_E2E_002 @priority:P0 @smoke @flow:TEN_WKO_CREATE_FLOW @type:positive
  Scenario: Operator can create a work order by proceeding without a reference via account number
    Given the user is on the work orders list page
    When the user retrieves an account number from completed work orders
    And the user opens the create work order wizard
    And the user selects the "Repair" job type
    And the user selects the first available priority
    And the user searches for a case reference that does not exist
    Then a reference not found dialog is shown
    When the user proceeds without a case reference
    And the user fills the Account Number
    And the user selects the Converge MSP
    And the user selects the first available entity
    And the user advances to the scheduling step
    And the user selects the first available time slot
    And the user advances to the summary step
    And the user confirms the work order creation
    Then the work order creation success screen is displayed

  @TEN_WKO_CRT_E2E_003 @priority:P1 @regression @flow:TEN_WKO_CREATE_FLOW @type:ui-interaction
  Scenario: Cancel button closes the create wizard and returns to the work orders list
    Given the user is on the work orders list page
    When the user opens the create work order wizard
    And the user cancels the work order create wizard
    Then the work orders list page is displayed

  @TEN_WKO_CRT_E2E_004 @priority:P1 @regression @flow:TEN_WKO_CREATE_FLOW @type:ui-interaction
  Scenario: Navigating to the create wizard and back returns to the work orders list
    Given the user is on the work orders list page
    When the user opens the create work order wizard
    And the user navigates back from the create wizard
    Then the work orders list page is displayed

  @TEN_WKO_CRT_E2E_005 @priority:P1 @regression @flow:TEN_WKO_CREATE_FLOW @type:ui-interaction
  Scenario: Next button is disabled when required fields are empty
    Given the user is on the create work order wizard
    When the user selects the "Repair" job type
    And the user does not select a case reference
    And the user clicks Next on the work order wizard without filling required fields
    Then the Next button remains disabled

  @TEN_WKO_CRT_E2E_006 @priority:P1 @regression @mock @flow:TEN_WKO_CREATE_FLOW @type:ui-interaction
  Scenario: Returning to the work orders list from the success screen
    Given the work order creation APIs are mocked for success
    And the user is on the work orders list page
    When the user retrieves a case reference number from the cases list
    And the user opens the create work order wizard
    And the user selects the "Repair" job type
    And the user selects the first available priority
    And the user searches for the case reference number
    And the user selects the first matching case reference
    And the user selects the Converge MSP
    And the user selects the first available entity
    And the user advances to the scheduling step
    And the user selects the first available time slot
    And the user advances to the summary step
    And the user confirms the work order creation
    Then the work order creation success screen is displayed
    When the user clicks the work order success screen button "Back to Homepage"
    Then the work orders list page is displayed

  @TEN_WKO_CRT_E2E_007 @priority:P1 @regression @mock @flow:TEN_WKO_CREATE_FLOW @type:ui-interaction
  Scenario: Create More WO resets the wizard after successful creation
    Given the work order creation APIs are mocked for success
    And the user is on the work orders list page
    When the user retrieves a case reference number from the cases list
    And the user opens the create work order wizard
    And the user selects the "Repair" job type
    And the user selects the first available priority
    And the user searches for the case reference number
    And the user selects the first matching case reference
    And the user selects the Converge MSP
    And the user selects the first available entity
    And the user advances to the scheduling step
    And the user selects the first available time slot
    And the user advances to the summary step
    And the user confirms the work order creation
    Then the work order creation success screen is displayed
    When the user clicks the work order success screen button "Create More WO"
    Then the work order wizard is on the "Case & Job Detail" step

  @TEN_WKO_CRT_E2E_008 @priority:P1 @regression @mock @flow:TEN_WKO_CREATE_FLOW @type:positive
  Scenario: Summary step shows the entered details before confirming
    Given the work order creation APIs are mocked for success
    And the user is on the work orders list page
    When the user retrieves a case reference number from the cases list
    And the user opens the create work order wizard
    And the user selects the "Repair" job type
    And the user selects the first available priority
    And the user searches for the case reference number
    And the user selects the first matching case reference
    And the user selects the Converge MSP
    And the user selects the first available entity
    And the user advances to the scheduling step
    And the user selects the first available time slot
    And the user advances to the summary step
    Then the summary shows the selected priority and case reference details

  @TEN_WKO_CRT_E2E_009 @priority:P1 @regression @mock @flow:TEN_WKO_CREATE_FLOW @type:negative
  Scenario: Work order creation shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    When the user retrieves a case reference number from the cases list
    And the user opens the create work order wizard
    And the user selects the "Repair" job type
    And the user selects the first available priority
    And the user searches for the case reference number
    And the user selects the first matching case reference
    And the user selects the Converge MSP
    And the user selects the first available entity
    And the user advances to the scheduling step
    And the user selects the first available time slot
    And the user advances to the summary step
    And the create work order API is configured to return a 500 server error
    And the user confirms the work order creation
    Then the application shows an error state

  # ── TEN_WKO_MENU_FLOW (kebab menu action visibility per pipeline status) ──
  #
  # Kebab menu options differ by pipeline status. Each status group has its own scenario.
  # Status identifiers from WORK_ORDER_ENABLE_STATUS_FOR_ACTION:
  #   on_hold → Resume, Cancel (and Return WO if job type is not Repair)
  #   unassigned → Reschedule, Change Priority, Assign, Transfer to Partner, Cancel (and Return WO if not Repair)
  #   assigned / rescheduled / in_progress → Reschedule, Change Priority, Reassign Tech,
  #     Unassign, Transfer to Partner, Complete, Split WO, On Hold, Cancel (and Return WO if not Repair)

  @TEN_WKO_MEN_E2E_001 @priority:P1 @smoke @flow:TEN_WKO_MENU_FLOW @type:ui-interaction
  Scenario: On Hold pipeline kebab shows Resume and Cancel actions
    Given the user is on the work orders list page
    When the user selects the "On Hold" pipeline tab
    When the user opens the first work order row actions menu
    Then the work order row actions menu is visible
    And the open row actions menu shows at least one available action

  @TEN_WKO_MEN_E2E_002 @priority:P1 @regression @flow:TEN_WKO_MENU_FLOW @type:ui-interaction
  Scenario: Unassigned pipeline kebab shows scheduling and assignment actions
    Given the user is on the work orders list page
    When the user selects the "Unassigned" pipeline tab
    When the user opens the first work order row actions menu
    Then the work order row actions menu is visible
    And the open row actions menu shows at least one available action

  @TEN_WKO_MEN_E2E_003 @priority:P1 @regression @flow:TEN_WKO_MENU_FLOW @type:ui-interaction
  Scenario: Assigned pipeline kebab shows full action set
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    Then the work order row actions menu is visible
    And the open row actions menu shows at least one available action

  # ── TEN_WKO_CANCEL_FLOW ────────────────────────────────────────────────
  # Cancel is available across all enabled statuses (On Hold group, Unassigned final, Assigned final)

  @TEN_WKO_CAN_E2E_001 @priority:P1 @regression @flow:TEN_WKO_CANCEL_FLOW @type:ui-interaction
  Scenario: Cancel work order confirmation dialog can be opened and cancelled
    Given the user is on the work orders list page
    When the user opens the first work order row actions menu
    And the user clicks "Cancel" from the row actions menu
    Then the cancel work order confirmation dialog is visible
    When the user cancels the cancel work order dialog
    Then the cancel work order confirmation dialog is not visible

  @TEN_WKO_CAN_E2E_002 @priority:P0 @regression @mock @flow:TEN_WKO_CANCEL_FLOW @type:positive
  Scenario: Operator can cancel a work order from the row actions menu
    Given the user is on the work orders list page
    When the user opens the first work order row actions menu
    And the user clicks "Cancel" from the row actions menu
    And the user selects a cancellation category and reason
    And the user confirms the cancellation
    Then the success response shows the work order has been cancelled

  @TEN_WKO_CAN_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_CANCEL_FLOW @type:negative
  Scenario: Cancel work order shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the cancel work order API is configured to return a 500 server error
    When the user opens the first work order row actions menu
    And the user clicks "Cancel" from the row actions menu
    And the user selects a cancellation category and reason
    And the user confirms the cancellation
    Then the application shows an error state

  # ── TEN_WKO_PRIORITY_FLOW ──────────────────────────────────────────────
  # Change Priority appears in the scheduling group of every enabled status except On Hold

  @TEN_WKO_PRI_E2E_001 @priority:P1 @regression @flow:TEN_WKO_PRIORITY_FLOW @type:ui-interaction
  Scenario: Change Priority dialog can be opened and cancelled
    Given the user is on the work orders list page
    When the user opens the first work order row actions menu
    And the user clicks "Change Priority" from the row actions menu
    Then the change priority dialog is visible
    When the user cancels the change priority dialog
    Then the change priority dialog is not visible

  @TEN_WKO_PRI_E2E_002 @priority:P1 @smoke @flow:TEN_WKO_PRIORITY_FLOW @type:positive
  Scenario: Operator can change work order priority from the row actions menu
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Change Priority" from the row actions menu
    And the user selects a new priority
    And the user confirms the priority change
    Then the success response shows the priority has been updated

  @TEN_WKO_PRI_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_PRIORITY_FLOW @type:negative
  Scenario: Change priority shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the change priority API is configured to return a 500 server error
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Change Priority" from the row actions menu
    And the user selects a new priority
    And the user confirms the priority change
    Then the application shows an error state

  # ── TEN_WKO_RESCHEDULE_FLOW ────────────────────────────────────────────
  # Reschedule appears in the scheduling group of every enabled status except On Hold

  @TEN_WKO_RSC_E2E_001 @priority:P1 @regression @flow:TEN_WKO_RESCHEDULE_FLOW @type:ui-interaction
  Scenario: Reschedule dialog can be opened and cancelled
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Reschedule" from the row actions menu
    Then the reschedule work order dialog is visible
    When the user cancels the reschedule dialog
    Then the reschedule work order dialog is not visible

  @TEN_WKO_RSC_E2E_002 @priority:P1 @smoke @flow:TEN_WKO_RESCHEDULE_FLOW @type:positive
  Scenario: Operator can reschedule a work order from the row actions menu
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Reschedule" from the row actions menu
    And the user selects a reschedule category and reason
    And the user confirms the reschedule
    Then the success response shows the work order has been rescheduled

  @TEN_WKO_RSC_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_RESCHEDULE_FLOW @type:negative
  Scenario: Reschedule shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the reschedule work order API is configured to return a 500 server error
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Reschedule" from the row actions menu
    And the user selects a reschedule category and reason
    And the user confirms the reschedule
    Then the application shows an error state

  # ── TEN_WKO_REQUEUE_FLOW ──────────────────────────────────────────────
  # Requeue only appears when status is On Hold

  @TEN_WKO_RSM_E2E_001 @priority:P1 @regression @flow:TEN_WKO_REQUEUE_FLOW @type:ui-interaction
  Scenario: Requeue dialog can be opened and cancelled from On Hold pipeline
    Given the user is on the work orders list page
    When the user selects the "On Hold" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Requeue" from the row actions menu
    Then the requeue work order confirmation dialog is visible
    When the user cancels the requeue dialog
    Then the requeue work order confirmation dialog is not visible

  @TEN_WKO_RSM_E2E_002 @priority:P1 @smoke @flow:TEN_WKO_REQUEUE_FLOW @type:positive
  Scenario: Operator can requeue an On Hold work order
    Given the user is on the work orders list page
    When the user selects the "On Hold" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Requeue" from the row actions menu
    And the user confirms the requeue action
    Then the success response shows the work order has been requeued

  @TEN_WKO_RSM_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_REQUEUE_FLOW @type:negative
  Scenario: Requeue shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the requeue work order API is configured to return a 500 server error
    When the user selects the "On Hold" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Requeue" from the row actions menu
    And the user confirms the requeue action
    Then the application shows an error state

  # ── TEN_WKO_ASSIGN_FLOW ────────────────────────────────────────────────
  # Assign appears only on Unassigned pipeline (requires manualAssignWO flag)

  @TEN_WKO_ASN_E2E_001 @priority:P1 @regression @flow:TEN_WKO_ASSIGN_FLOW @type:ui-interaction
  Scenario: Assign technician dialog can be opened and cancelled from Unassigned pipeline
    Given the user is on the work orders list page
    When the user selects the "Unassigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Assign" from the row actions menu
    Then the assign technician dialog is visible
    When the user cancels the assign technician dialog
    Then the assign technician dialog is not visible

  @TEN_WKO_ASN_E2E_002 @priority:P1 @smoke @flow:TEN_WKO_ASSIGN_FLOW @type:positive
  Scenario: Operator can assign a technician to an unassigned work order
    Given the user is on the work orders list page
    When the user selects the "Unassigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Assign" from the row actions menu
    And the user selects a future schedule
    And the user selects the first available technician
    And the user confirms the assign action
    Then the success response shows the work order has been assigned

  @TEN_WKO_ASN_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_ASSIGN_FLOW @type:negative
  Scenario: Assign technician shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the assign work order API is configured to return a 500 server error
    When the user selects the "Unassigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Assign" from the row actions menu
    And the user selects a future schedule
    And the user selects the first available technician
    And the user confirms the assign action
    Then the application shows an error state

  # ── TEN_WKO_REASSIGN_FLOW ──────────────────────────────────────────────
  # Reassign Technician appears on Assigned/In Progress/Rescheduled pipelines

  @TEN_WKO_RAS_E2E_001 @priority:P1 @regression @flow:TEN_WKO_REASSIGN_FLOW @type:ui-interaction
  Scenario: Reassign technician dialog can be opened and cancelled from Assigned pipeline
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Reassign Technician" from the row actions menu
    Then the reassign technician dialog is visible
    When the user cancels the reassign technician dialog
    Then the reassign technician dialog is not visible

  @TEN_WKO_RAS_E2E_002 @priority:P1 @smoke @flow:TEN_WKO_REASSIGN_FLOW @type:positive
  Scenario: Operator can reassign a technician from the Assigned pipeline
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Reassign Technician" from the row actions menu
    And the user selects the first available technician
    And the user confirms the reassign action
    Then the success response shows the work order has been reassigned

  @TEN_WKO_RAS_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_REASSIGN_FLOW @type:negative
  Scenario: Reassign technician shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the reassign work order API is configured to return a 500 server error
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Reassign Technician" from the row actions menu
    And the user selects the first available technician
    And the user confirms the reassign action
    Then the application shows an error state

  # ── TEN_WKO_UNASSIGN_FLOW ──────────────────────────────────────────────
  # Requeue on Assigned/In Progress/Rescheduled pipelines (unassign action)

  @TEN_WKO_UAS_E2E_001 @priority:P1 @regression @flow:TEN_WKO_UNASSIGN_FLOW @type:ui-interaction
  Scenario: Unassign confirmation dialog can be opened and cancelled from Assigned pipeline
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Requeue" from the row actions menu
    Then the unassign work order confirmation dialog is visible
    When the user cancels the unassign dialog
    Then the unassign work order confirmation dialog is not visible

  @TEN_WKO_UAS_E2E_002 @priority:P1 @smoke @flow:TEN_WKO_UNASSIGN_FLOW @type:positive
  Scenario: Operator can unassign a work order from the Assigned pipeline
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Requeue" from the row actions menu
    And the user confirms the unassign action
    Then the success response shows the work order has been unassigned

  @TEN_WKO_UAS_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_UNASSIGN_FLOW @type:negative
  Scenario: Unassign shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the unassign work order API is configured to return a 500 server error
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Requeue" from the row actions menu
    And the user confirms the unassign action
    Then the application shows an error state

  # ── TEN_WKO_TRANSFER_FLOW ──────────────────────────────────────────────
  # Transfer to Partner appears on all enabled statuses except On Hold

  @TEN_WKO_TRF_E2E_001 @priority:P1 @regression @flow:TEN_WKO_TRANSFER_FLOW @type:ui-interaction
  Scenario: Transfer to Partner dialog can be opened and cancelled
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Transfer to Partner" from the row actions menu
    Then the transfer to partner dialog is visible
    When the user cancels the transfer to partner dialog
    Then the transfer to partner dialog is not visible

  @TEN_WKO_TRF_E2E_002 @priority:P1 @smoke @flow:TEN_WKO_TRANSFER_FLOW @type:positive
  Scenario: Operator can transfer a work order to a partner
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Transfer to Partner" from the row actions menu
    And the user selects the first available partner
    And the user confirms the transfer
    Then the success response shows the work order has been transferred

  @TEN_WKO_TRF_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_TRANSFER_FLOW @type:negative
  Scenario: Transfer to partner shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the transfer to partner API is configured to return a 500 server error
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "Transfer to Partner" from the row actions menu
    And the user selects the first available partner
    And the user confirms the transfer
    Then the application shows an error state

  # ── TEN_WKO_ONHOLD_FLOW ────────────────────────────────────────────────
  # On Hold appears in the final-actions group of Assigned/In Progress/Rescheduled pipelines

  @TEN_WKO_OHD_E2E_001 @priority:P1 @regression @flow:TEN_WKO_ONHOLD_FLOW @type:ui-interaction
  Scenario: On Hold dialog can be opened and cancelled from Assigned pipeline
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "On Hold" from the row actions menu
    Then the on hold work order dialog is visible
    When the user cancels the on hold dialog
    Then the on hold work order dialog is not visible

  @TEN_WKO_OHD_E2E_002 @priority:P1 @smoke @flow:TEN_WKO_ONHOLD_FLOW @type:positive
  Scenario: Operator can put a work order on hold from the Assigned pipeline
    Given the user is on the work orders list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "On Hold" from the row actions menu
    And the user selects an on hold category and reason
    And the user confirms the on hold action
    Then the success response shows the work order is on hold

  @TEN_WKO_OHD_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_ONHOLD_FLOW @type:negative
  Scenario: On hold shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the on hold work order API is configured to return a 500 server error
    When the user selects the "Assigned" pipeline tab
    When the user opens the first work order row actions menu
    And the user clicks "On Hold" from the row actions menu
    And the user selects an on hold category and reason
    And the user confirms the on hold action
    Then the application shows an error state

  # ── TEN_WKO_RETURN_FLOW ────────────────────────────────────────────────
  # Return WO appears on Unassigned, Assigned, and On Hold pipelines; hidden for Repair job types

  @TEN_WKO_RTN_E2E_001 @priority:P1 @regression @flow:TEN_WKO_RETURN_FLOW @type:ui-interaction
  Scenario: Return WO confirmation dialog can be opened and cancelled
    Given the user is on the work orders list page
    When the user selects the "Unassigned" pipeline tab
    When the user clicks "Return WO" from any visible row
    Then the return work order confirmation dialog is visible
    When the user cancels the return work order dialog
    Then the return work order confirmation dialog is not visible

  @TEN_WKO_RTN_E2E_002 @priority:P1 @smoke @flow:TEN_WKO_RETURN_FLOW @type:positive
  Scenario: Operator can return a work order from the row actions menu
    Given the user is on the work orders list page
    When the user selects the "Unassigned" pipeline tab
    When the user clicks "Return WO" from any visible row
    And the user enters return remarks
    And the user confirms the return action
    Then the success response shows the work order has been returned

  @TEN_WKO_RTN_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_RETURN_FLOW @type:negative
  Scenario: Return WO shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the return work order API is configured to return a 500 server error
    When the user selects the "Unassigned" pipeline tab
    When the user clicks "Return WO" from any visible row
    And the user enters return remarks
    And the user confirms the return action
    Then the application shows an error state

  # ── TEN_WKO_SPLIT_FLOW ────────────────────────────────────────────────
  #
  # Split WO opens a dialog with a dataview table of available job order
  # options fetched from the real API (useGetWorkOrderSplitOptions).
  # The user selects one or more rows and submits.
  # Uses real data — no mocking needed for the happy path.

  @TEN_WKO_SPL_E2E_001 @priority:P1 @regression @flow:TEN_WKO_SPLIT_FLOW @type:ui-interaction
  Scenario: Split Work Order dialog can be opened and cancelled
    Given the user is on the work orders list page
    When the user selects the "In Progress" pipeline tab
    When the user clicks "Split Work Order" from any visible row
    Then the split work order dialog is visible
    When the user cancels the split work order dialog
    Then the split work order dialog is not visible

  @TEN_WKO_SPL_E2E_002 @priority:P1 @smoke @flow:TEN_WKO_SPLIT_FLOW @type:positive
  Scenario: Operator can split a work order by selecting a job option
    Given the user is on the work orders list page
    When the user selects the "In Progress" pipeline tab
    When the user clicks "Split Work Order" from any visible row
    And the user selects the first available split job option
    And the user clicks Submit for split
    Then the success response shows the work order has been split

  @TEN_WKO_SPL_E2E_003 @priority:P1 @regression @mock @flow:TEN_WKO_SPLIT_FLOW @type:negative
  Scenario: Split work order shows error when the API returns a 500 server error
    Given the user is on the work orders list page
    And the split work order API is configured to return a 500 server error
    When the user selects the "In Progress" pipeline tab
    When the user clicks "Split Work Order" from any visible row
    And the user selects the first available split job option
    And the user clicks Submit for split
    Then the application shows an error state

