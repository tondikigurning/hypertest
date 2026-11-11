# Feature: User Management — Users
#
# Route: /user-management/users | ID prefix: TEN_USR_<FLG>_E2E_NNN (NNN resets per flow section)
# Tags: @smoke @regression @flow:<id> @type:<t> @ref:TEN_COM_*_E2E_* (component masters in _components/)
#
# Component @ref map: LIST-002→PIP | LIST-003→FSR | LIST-004→FIL | LIST-005→SAP | VDT-001–003→VDT | CRT-009→FSR | CRT-010→FIL | CRT-011→SAP

Feature: User Management — Users

  # TEN_USR_LIST_FLOW

  @TEN_USR_LST_E2E_001 @smoke @flow:TEN_USR_LIST_FLOW @type:positive
  Scenario: Users list page loads with the data table visible
    Given the user is on the users list page
    Then the users data table is visible

  @TEN_USR_LST_E2E_002 @ref:TEN_COM_PIP_E2E_001 @smoke @flow:TEN_USR_LIST_FLOW @type:ui-interaction
  Scenario Outline: Selecting a pipeline tab activates it
    Given a list page with pipeline tabs is open
    When the user selects the "<tab>" pipeline tab
    Then the "<tab>" pipeline tab is active

    Examples:
      | tab             |
      | Active          |
      | Suspended       |
      | Account Lockout |
      | Invited         |
      | Cancelled       |

  @TEN_USR_LST_E2E_003 @ref:TEN_COM_FSR_E2E_001 @smoke @flow:TEN_USR_LIST_FLOW @type:positive
  Scenario Outline: Search input filters rows by the first visible row "<field>"
    Given a list page with search is open
    When the user searches for the first visible row "<field>"
    Then the search returns matching rows

    Examples:
      | field          |
      | email_address  |

  @TEN_USR_LST_E2E_004 @ref:TEN_COM_FIL_E2E_001 @regression @flow:TEN_USR_LIST_FLOW @type:ui-interaction
  Scenario Outline: Each filter option triggers API and returns matching rows
    Given a list page with filters is open
    When the user applies the "<filter_option>" filter option
    Then the filter triggers an API call that returns HTTP 200
    And the filter response includes rows that match the selected value

    Examples:
      | filter_option          |
      | created_at             |
      | created_by_name        |
      | date_of_birth          |
      | display_name           |
      | email_address          |
      | sub_tenant_unit_uuid   |
      | first_name             |
      | gender_name            |
      | job_title              |
      | last_name              |
      | updated_at             |
      | updated_by_name        |
      | user_status_uuid       |
      | username               |

  @TEN_USR_LST_E2E_005 @ref:TEN_COM_SAP_E2E_001 @regression @flow:TEN_USR_LIST_FLOW @type:ui-interaction
  Scenario: All sort options work in both directions
    Given a list page with sort is open
    When the user applies each sort option in ascending and descending direction
    Then each sort triggers an API call that returns HTTP 200
    And each sort response includes rows in the correct order

  @TEN_USR_LST_E2E_006 @regression @mock @ref:TEN_COM_FSR_E2E_002 @flow:TEN_USR_LIST_FLOW @type:negative
  Scenario: Search shows error state when the API returns 500 server error
    Given a list page with search is open
    And the search API is configured to return a 500 server error
    When the user searches for "test"
    Then the application shows an error state

  @TEN_USR_LST_E2E_007 @regression @mock @ref:TEN_COM_FSR_E2E_003 @flow:TEN_USR_LIST_FLOW @type:edge-case
  Scenario: Search shows loading state while waiting for a slow API response
    Given a list page with search is open
    And the search API response is delayed by 4 seconds
    When the user searches for "test"
    Then a loading indicator or spinner is visible before the results load

  @TEN_USR_LST_E2E_008 @regression @mock @ref:TEN_COM_FIL_E2E_002 @flow:TEN_USR_LIST_FLOW @type:negative
  Scenario: Filter request shows error state when API returns 500 server error
    Given a list page with filters is open
    And the filter API is configured to return a 500 server error
    When the user applies the first available filter option
    Then the application shows an error state

  @TEN_USR_LST_E2E_009 @regression @mock @ref:TEN_COM_SAP_E2E_002 @flow:TEN_USR_LIST_FLOW @type:negative
  Scenario: Sort request shows error state when API returns 500 server error
    Given a list page with sort is open
    And the sort API is configured to return a 500 server error
    When the user applies the first available sort option
    Then the application shows an error state

  @TEN_USR_LST_E2E_010 @regression @mock @ref:TEN_COM_PIP_E2E_002 @flow:TEN_USR_LIST_FLOW @type:negative
  Scenario: Pipeline tab request shows error state when API returns 500 server error
    Given a list page with pipeline tabs is open
    And the pipeline tab API is configured to return a 500 server error
    When the user selects the "Suspended" pipeline tab
    Then the application shows an error state

  @TEN_USR_LST_E2E_011 @regression @mock @ref:TEN_COM_FIL_E2E_003 @flow:TEN_USR_LIST_FLOW @type:edge-case
  Scenario: Filter shows loading state while waiting for a slow API response
    Given a list page with filters is open
    And the filter API response is delayed by 4 seconds
    When the user applies the first available filter option
    Then a loading indicator or spinner is visible before the results load

  @TEN_USR_LST_E2E_012 @regression @mock @ref:TEN_COM_SAP_E2E_003 @flow:TEN_USR_LIST_FLOW @type:edge-case
  Scenario: Sort shows loading state while waiting for a slow API response
    Given a list page with sort is open
    And the sort API response is delayed by 4 seconds
    When the user applies the first available sort option
    Then a loading indicator or spinner is visible before the results load

  @TEN_USR_LST_E2E_013 @regression @mock @flow:TEN_USR_LIST_FLOW @type:negative
  Scenario: App handles token expiration gracefully when the users API returns 401
    Given the users API is configured to return a 401 authentication error
    When the user navigates to the users list page
    Then the user is redirected to the login page or shown an access denied message

  # TEN_USR_VIEW_DETAIL_FLOW

  @TEN_USR_VDT_E2E_001 @ref:TEN_COM_VDT_E2E_001 @smoke @flow:TEN_USR_VIEW_DETAIL_FLOW @type:positive
  Scenario: Clicking a list row opens the detail panel
    Given a list page with detail panel layout is open
    When the user clicks the first list row
    Then the detail panel is visible
    And the detail panel header shows a title

  @TEN_USR_VDT_E2E_002 @ref:TEN_COM_VDT_E2E_002 @regression @flow:TEN_USR_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario Outline: Each detail panel tab displays its content section
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user clicks the "<tab>" detail panel tab
    Then the "<tab>" tab content is visible

    Examples:
      | tab                |
      | Details            |
      | Application Access |
      | Group Memberships  |
      | Profile            |
      | Activities         |

  @TEN_USR_VDT_E2E_003 @ref:TEN_COM_VDT_E2E_003 @regression @flow:TEN_USR_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario: Closing the detail panel hides it
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user closes the detail panel
    Then the detail panel is not visible

  @TEN_USR_VDT_E2E_004 @regression @mock @ref:TEN_COM_VDT_E2E_004 @flow:TEN_USR_VIEW_DETAIL_FLOW @type:negative
  Scenario: Detail panel shows error state when the detail API returns 500 server error
    Given a list page with detail panel layout is open
    And the detail panel API is configured to return a 500 server error
    When the user clicks the first list row
    Then the application shows an error state

  @TEN_USR_VDT_E2E_005 @regression @mock @ref:TEN_COM_VDT_E2E_005 @flow:TEN_USR_VIEW_DETAIL_FLOW @type:edge-case
  Scenario: Detail panel shows loading skeleton while waiting for a slow API response
    Given a list page with detail panel layout is open
    And the detail panel API response is delayed by 3 seconds
    When the user clicks the first list row
    Then the loading skeleton is visible before the detail panel content loads

  # TEN_USR_CREATE_FLOW

  @TEN_USR_CRT_E2E_001 @smoke @flow:TEN_USR_CREATE_FLOW @type:positive
  Scenario: Operator can successfully create a new user via the wizard
    Given the user is on the users list page
    When the user clicks the "Create User" button
    And the user completes the create user wizard
    Then the user creation success screen is displayed

  @TEN_USR_CRT_E2E_002 @regression @flow:TEN_USR_CREATE_FLOW @type:negative
  Scenario: Advancing past step 1 without required fields shows validation errors
    Given the user is on the create user wizard
    When the user clicks "Next" without filling required fields
    Then the wizard shows required field validation errors
    And the wizard remains on the "User Details" step

  @TEN_USR_CRT_E2E_003 @regression @flow:TEN_USR_CREATE_FLOW @type:ui-interaction
  Scenario: Cancelling the wizard returns to the users list
    Given the user is on the create user wizard
    When the user cancels the wizard
    Then the users list page is displayed

  @TEN_USR_CRT_E2E_004 @regression @mock @flow:TEN_USR_CREATE_FLOW @type:ui-interaction
  Scenario: Returning to the users list from the success screen
    Given the user is on the users list page
    When the user clicks the "Create User" button
    And the user completes the create user wizard
    When the user clicks "Ok, back to list" on the success screen
    Then the users list page is displayed

  @TEN_USR_CRT_E2E_005 @regression @mock @flow:TEN_USR_CREATE_FLOW @type:ui-interaction
  Scenario: Create More User resets the wizard after successful creation
    Given the user is on the users list page
    When the user clicks the "Create User" button
    And the user completes the create user wizard
    When the user clicks "Create More User" on the success screen
    Then the wizard is on the "User Details" step

  @TEN_USR_CRT_E2E_006 @regression @flow:TEN_USR_CREATE_FLOW @type:positive
  Scenario Outline: Summary step shows the entered details before confirming
    Given the user is on the users list page
    When the user clicks the "Create User" button
    And the user advances the create user wizard to the summary step
    And the create user summary shows application role "<application_role>"
    And the create user summary shows the selected group membership

    Examples:
      | application_role                |
      | User Management Administrator   |

  @TEN_USR_CRT_E2E_007 @regression @mock @flow:TEN_USR_CREATE_FLOW @type:negative
  Scenario: User creation shows error when the API returns a 500 server error
    Given the user is on the create user wizard
    And the create user API is configured to return a 500 server error
    When the user completes the create user wizard
    Then the application shows an error state

  @TEN_USR_CRT_E2E_008 @regression @mock @flow:TEN_USR_CREATE_FLOW @type:negative
  Scenario: User creation shows validation error when API returns 400 bad request
    Given the user is on the create user wizard
    And the create user API is configured to return a 400 validation error
    When the user completes the create user wizard
    Then the application shows an error state

  @TEN_USR_CRT_E2E_009 @ref:TEN_COM_FSR_E2E_001 @regression @flow:TEN_USR_CREATE_FLOW @type:positive
  Scenario Outline: Entity search filters rows by the first visible row "<field>"
    Given the create user wizard organization entity step with search is open
    When the user searches for the first visible row "<field>"
    Then the search returns matching rows

    Examples:
      | field |
      | name  |

  @TEN_USR_CRT_E2E_010 @ref:TEN_COM_FIL_E2E_001 @regression @flow:TEN_USR_CREATE_FLOW @type:ui-interaction
  Scenario Outline: Each entity filter option triggers API and returns matching rows
    Given the create user wizard organization entity step with filters is open
    When the user applies the "<filter_option>" filter option
    Then the filter triggers an API call that returns HTTP 200
    And the filter response includes rows that match the selected value

    Examples:
      | filter_option  |
      | name           |
      | created_at     |
      | created_by     |
      | parent         |
      | active_status  |
      | unit_type      |
      | updated_at     |
      | updated_by     |

  @TEN_USR_CRT_E2E_011 @ref:TEN_COM_SAP_E2E_001 @regression @flow:TEN_USR_CREATE_FLOW @type:ui-interaction
  Scenario: All entity sort options work in both directions
    Given the create user wizard organization entity step with sort is open
    When the user applies each sort option in ascending and descending direction
    Then each sort triggers an API call that returns HTTP 200
    And each sort response includes rows in the correct order

  @TEN_USR_CRT_E2E_012 @regression @mock @ref:TEN_COM_FSR_E2E_002 @flow:TEN_USR_CREATE_FLOW @type:negative
  Scenario: Entity search shows error state when the API returns 500 server error
    Given the create user wizard organization entity step with search is open
    And the search API is configured to return a 500 server error
    When the user searches for "test"
    Then the application shows an error state

  @TEN_USR_CRT_E2E_013 @regression @mock @ref:TEN_COM_FSR_E2E_003 @flow:TEN_USR_CREATE_FLOW @type:edge-case
  Scenario: Entity search shows loading state while waiting for a slow API response
    Given the create user wizard organization entity step with search is open
    And the search API response is delayed by 4 seconds
    When the user searches for "test"
    Then a loading indicator or spinner is visible before the results load

  @TEN_USR_CRT_E2E_014 @regression @mock @ref:TEN_COM_FIL_E2E_002 @flow:TEN_USR_CREATE_FLOW @type:negative
  Scenario: Entity filter request shows error state when API returns 500 server error
    Given the create user wizard organization entity step with filters is open
    And the filter API is configured to return a 500 server error
    When the user applies the first available filter option
    Then the application shows an error state

  @TEN_USR_CRT_E2E_015 @regression @mock @ref:TEN_COM_FIL_E2E_003 @flow:TEN_USR_CREATE_FLOW @type:edge-case
  Scenario: Entity filter shows loading state while waiting for a slow API response
    Given the create user wizard organization entity step with filters is open
    And the filter API response is delayed by 4 seconds
    When the user applies the first available filter option
    Then a loading indicator or spinner is visible before the results load

  @TEN_USR_CRT_E2E_016 @regression @mock @ref:TEN_COM_SAP_E2E_002 @flow:TEN_USR_CREATE_FLOW @type:negative
  Scenario: Entity sort request shows error state when API returns 500 server error
    Given the create user wizard organization entity step with sort is open
    And the sort API is configured to return a 500 server error
    When the user applies the first available sort option
    Then the application shows an error state

  @TEN_USR_CRT_E2E_017 @regression @mock @ref:TEN_COM_SAP_E2E_003 @flow:TEN_USR_CREATE_FLOW @type:edge-case
  Scenario: Entity sort shows loading state while waiting for a slow API response
    Given the create user wizard organization entity step with sort is open
    And the sort API response is delayed by 4 seconds
    When the user applies the first available sort option
    Then a loading indicator or spinner is visible before the results load

  # TEN_USR_EDIT_FLOW

  @TEN_USR_EDT_E2E_001 @smoke @flow:TEN_USR_EDIT_FLOW @type:positive
  Scenario: Operator can update all editable Edit User fields and save
    Given the user is on the users list page
    When the user searches for E2E users
    And the detail panel is open
    When the user opens the row actions menu
    And the user clicks "Edit User"
    And the user fills all editable edit user fields
    And the user submits the "Edit User" dialog with "Update"
    Then the success response shows "User Updated"
    When the user closes the success response
    Then the detail panel shows the updated display name

  @TEN_USR_EDT_E2E_002 @regression @flow:TEN_USR_EDIT_FLOW @type:ui-interaction
  Scenario: Cancelling the Edit User dialog closes it without changes
    Given the user is on the users list page
    And the detail panel is open
    And the "Edit User" dialog is open
    When the user cancels the dialog
    Then the "Edit User" dialog is not visible

  @TEN_USR_EDT_E2E_003 @regression @flow:TEN_USR_EDIT_FLOW @type:negative
  Scenario: Clearing required Edit User fields shows validation errors
    Given the user is on the users list page
    And the detail panel is open
    And the "Edit User" dialog is open
    When the user clears the edit user job title
    And the user submits the "Edit User" dialog with "Update"
    Then the edit user form shows validation errors
    And the "Edit User" dialog is visible

  @TEN_USR_EDT_E2E_004 @regression @mock @flow:TEN_USR_EDIT_FLOW @type:negative
  Scenario: Edit user shows error when the API returns a 500 server error
    Given the user is on the users list page
    And the detail panel is open
    And the edit user API is configured to return a 500 server error
    When the user opens the row actions menu
    And the user clicks "Edit User"
    And the user fills all editable edit user fields
    And the user submits the "Edit User" dialog with "Update"
    Then the application shows an error state

  # TEN_USR_UPDATE_ACCESS_FLOW

  @TEN_USR_UAC_E2E_001 @smoke @flow:TEN_USR_UPDATE_ACCESS_FLOW @type:positive
  Scenario Outline: Operator can update application access from the detail panel
    Given the user is on the users list page
    And the detail panel is open
    When the user clicks "Application Access" in the panel header
    And the user toggles the "<module>" application access role "<role>"
    And the user submits the "Application Access" dialog with "Update"
    Then the success response shows "Application Access Updated"
    When the user closes the success response

    Examples:
      | module          | role                          |
      | User Management | User Management Administrator |

  @TEN_USR_UAC_E2E_002 @regression @flow:TEN_USR_UPDATE_ACCESS_FLOW @type:ui-interaction
  Scenario: Cancelling the Application Access dialog closes it
    Given the user is on the users list page
    And the detail panel is open
    And the "Application Access" dialog is open via the panel header
    When the user cancels the dialog
    Then the "Application Access" dialog is not visible

  @TEN_USR_UAC_E2E_003 @regression @mock @flow:TEN_USR_UPDATE_ACCESS_FLOW @type:negative
  Scenario: Application Access update shows error when the API returns 403 forbidden
    Given the user is on the users list page
    And the detail panel is open
    And the application access API is configured to return a 403 forbidden error
    When the user clicks "Application Access" in the panel header
    And the user toggles the "User Management" application access role "User Management Administrator"
    And the user submits the "Application Access" dialog with "Update"
    Then the application shows an error state

  # TEN_USR_MANAGE_GROUPS_FLOW

  @TEN_USR_MGP_E2E_001 @smoke @flow:TEN_USR_MANAGE_GROUPS_FLOW @type:positive
  Scenario: Operator can add a group membership from the detail panel
    Given the user is on the users list page
    And the detail panel is open
    When the user clicks "Manage Groups" in the panel header
    And the user adds the first available group membership in the manage groups dialog
    And the user submits the "Group Membership" dialog with "Save Changes"
    Then the success response shows "Groups Updated"
    When the user closes the success response

  @TEN_USR_MGP_E2E_002 @regression @flow:TEN_USR_MANAGE_GROUPS_FLOW @type:ui-interaction
  Scenario: Save Changes is disabled in the Manage Groups dialog when no changes are made
    Given the user is on the users list page
    And the detail panel is open
    And the "Group Membership" dialog is open via the panel header
    Then the "Save Changes" button is disabled

  @TEN_USR_MGP_E2E_003 @smoke @flow:TEN_USR_MANAGE_GROUPS_FLOW @type:positive
  Scenario: Operator can remove a group membership from the detail panel
    Given the user is on the users list page
    When the user searches for E2E users
    And the detail panel is open
    When the user clicks "Manage Groups" in the panel header
    And the user removes the top group membership in the manage groups dialog
    And the user submits the "Group Membership" dialog with "Save Changes"
    Then the success response shows "Groups Updated"
    When the user closes the success response

  @TEN_USR_MGP_E2E_004 @regression @flow:TEN_USR_MANAGE_GROUPS_FLOW @type:ui-interaction
  Scenario: Cancelling the Manage Groups dialog discards unsaved membership changes
    Given the user is on the users list page
    And the detail panel is open
    And the "Group Membership" dialog is open via the panel header
    When the user adds the first available group membership in the manage groups dialog
    When the user cancels the dialog
    Then the "Group Membership" dialog is not visible

  @TEN_USR_MGP_E2E_005 @regression @mock @flow:TEN_USR_MANAGE_GROUPS_FLOW @type:negative
  Scenario: Group membership update shows error when the API returns a 500 server error
    Given the user is on the users list page
    And the detail panel is open
    And the group membership API is configured to return a 500 server error
    When the user clicks "Manage Groups" in the panel header
    And the user adds the first available group membership in the manage groups dialog
    And the user submits the "Group Membership" dialog with "Save Changes"
    Then the application shows an error state

  # TEN_USR_SUSPEND_FLOW

  @TEN_USR_SUS_E2E_001 @smoke @flow:TEN_USR_SUSPEND_FLOW @type:positive
  Scenario: Operator can suspend an active user from the row actions menu
    Given the user is on the users list page
    When the user selects the "Active" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Suspend User"
    And the user confirms the "Suspend User" action
    Then the success response shows "has been suspended"
    When the user closes the success response

  @TEN_USR_SUS_E2E_002 @regression @flow:TEN_USR_SUSPEND_FLOW @type:ui-interaction
  Scenario: Suspend User confirmation dialog can be cancelled without changes
    Given the user is on the users list page
    When the user selects the "Active" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Suspend User"
    Then the "Suspend User" confirmation dialog is visible
    When the user cancels the confirmation dialog
    Then the "Suspend User" confirmation dialog is not visible

  @TEN_USR_SUS_E2E_003 @regression @mock @flow:TEN_USR_SUSPEND_FLOW @type:negative
  Scenario: Suspend user shows error when the API returns a 500 server error
    Given the user is on the users list page
    When the user selects the "Active" pipeline tab
    And the suspend user API is configured to return a 500 server error
    When the user opens the row actions menu for the first user
    And the user clicks "Suspend User"
    And the user confirms the "Suspend User" action
    Then the application shows an error state

  # TEN_USR_ACTIVATE_FLOW

  @TEN_USR_ACT_E2E_001 @smoke @flow:TEN_USR_ACTIVATE_FLOW @type:positive
  Scenario: Operator can activate a suspended user from the row actions menu
    Given the user is on the users list page
    When the user selects the "Suspended" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Activate User"
    And the user confirms the "Activate User" action
    Then the success response shows "has been activated"
    When the user closes the success response

  @TEN_USR_ACT_E2E_002 @regression @flow:TEN_USR_ACTIVATE_FLOW @type:ui-interaction
  Scenario: Activate User confirmation dialog can be cancelled without changes
    Given the user is on the users list page
    When the user selects the "Suspended" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Activate User"
    Then the "Activate User" confirmation dialog is visible
    When the user cancels the confirmation dialog
    Then the "Activate User" confirmation dialog is not visible

  # TEN_USR_REMOVE_FLOW

  @TEN_USR_RMV_E2E_001 @smoke @flow:TEN_USR_REMOVE_FLOW @type:positive
  Scenario: Operator can remove a suspended user from the row actions menu
    Given the user is on the users list page
    When the user selects the "Suspended" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Remove User"
    And the user confirms the "Remove User" action
    Then the success response shows "has been removed"
    When the user closes the success response

  @TEN_USR_RMV_E2E_002 @regression @flow:TEN_USR_REMOVE_FLOW @type:ui-interaction
  Scenario: Remove User confirmation dialog can be cancelled without changes
    Given the user is on the users list page
    When the user selects the "Suspended" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Remove User"
    Then the "Remove User" confirmation dialog is visible
    When the user cancels the confirmation dialog
    Then the "Remove User" confirmation dialog is not visible

  # TEN_USR_RESEND_INVITE_FLOW

  # Resend-invite API returns failure for invited users (app bug — quarantined).
  @TEN_USR_RIN_E2E_001 @regression @quarantine @flow:TEN_USR_RESEND_INVITE_FLOW @type:positive
  Scenario: Operator can resend an invitation from the row actions menu
    Given the user is on the users list page
    When the user selects the "Invited" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Resend Invitation"
    And the user confirms the "Resend Invitation" action
    Then the success response shows "invitation has been resent"
    When the user closes the success response

  @TEN_USR_RIN_E2E_002 @regression @flow:TEN_USR_RESEND_INVITE_FLOW @type:ui-interaction
  Scenario: Resend Invitation confirmation dialog can be cancelled without changes
    Given the user is on the users list page
    When the user selects the "Invited" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Resend Invitation"
    Then the "Resend Invitation" confirmation dialog is visible
    When the user cancels the confirmation dialog
    Then the "Resend Invitation" confirmation dialog is not visible

  # TEN_USR_CANCEL_INVITE_FLOW

  # Cancel-invite success modal does not appear after confirm (app bug — quarantined).
  @TEN_USR_CIN_E2E_001 @regression @quarantine @flow:TEN_USR_CANCEL_INVITE_FLOW @type:positive
  Scenario: Operator can cancel an invitation from the row actions menu
    Given the user is on the users list page
    When the user selects the "Invited" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Cancel Invitation"
    And the user confirms the "Cancel Invitation" action
    Then the success response shows "invitation has been cancelled"
    When the user closes the success response

  @TEN_USR_CIN_E2E_002 @regression @flow:TEN_USR_CANCEL_INVITE_FLOW @type:ui-interaction
  Scenario: Cancel Invitation confirmation dialog can be cancelled without changes
    Given the user is on the users list page
    When the user selects the "Invited" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Cancel Invitation"
    Then the "Cancel Invitation" confirmation dialog is visible
    When the user cancels the confirmation dialog
    Then the "Cancel Invitation" confirmation dialog is not visible

  # TEN_USR_UNLOCK_FLOW

  @TEN_USR_ULK_E2E_001 @smoke @flow:TEN_USR_UNLOCK_FLOW @type:positive
  Scenario: Operator can unlock a locked-out user from the row actions menu
    Given the user is on the users list page
    When the user selects the "Account Lockout" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Unlock User"
    And the user confirms the "Unlock User" action
    Then the success response shows "has been unlocked"
    When the user closes the success response

  @TEN_USR_ULK_E2E_002 @regression @flow:TEN_USR_UNLOCK_FLOW @type:ui-interaction
  Scenario: Unlock User confirmation dialog can be cancelled without changes
    Given the user is on the users list page
    When the user selects the "Account Lockout" pipeline tab
    When the user opens the row actions menu for the first user
    And the user clicks "Unlock User"
    Then the "Unlock User" confirmation dialog is visible
    When the user cancels the confirmation dialog
    Then the "Unlock User" confirmation dialog is not visible
