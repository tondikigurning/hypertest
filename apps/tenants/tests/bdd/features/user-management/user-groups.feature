# Feature: User Management - User Groups
#
# Scope routes (derived from app/routes/_protected+/user-management+/user-groups+/):
# - /user-management/user-groups
# - /user-management/user-groups/:id (currently redirects to /iam/user-groups/:id/details and returns 404 in STT)
# - /user-management/user-groups/:id/details
# - /user-management/user-groups/:id/members
#
# ID prefix: TEN_UGP_<FLG>_E2E_NNN (NNN resets per flow section; <FLG> is exactly 3 characters — abbreviated flow-section flag)
#
# Flow tag convention:
# @flow:TEN_UGP_<ACTION>_FLOW — full action name (LIST, CREATE, …); stable; never rename or reuse
#
# Component @ref map:
# - TEN_UGP_LIST_FLOW: TEN_COM_FSR_E2E_001, TEN_COM_FIL_E2E_001, TEN_COM_SAP_E2E_001
# - TEN_UGP_VIEW_DETAIL_PANEL_FLOW: TEN_COM_VDT_E2E_001, TEN_COM_VDT_E2E_002, TEN_COM_VDT_E2E_003

Feature: User Management - User Groups

  # TEN_UGP_LIST_FLOW

  @TEN_UGP_LST_E2E_001 @priority:P0 @smoke @flow:TEN_UGP_LIST_FLOW @type:positive
  Scenario: User Groups list page loads with table and list controls
    Given the user is on the user groups list page
    Then the user groups data table is visible
    And the search input is visible
    And the create new user group action is visible

  @TEN_UGP_LST_E2E_002 @priority:P1 @regression @flow:TEN_UGP_LIST_FLOW @type:ui-interaction
  Scenario: User can open row actions menu from the list
    Given the user is on the user groups list page
    When the user opens the first user group row actions menu
    Then the row actions menu is visible
    # Edit/Delete are gated by IAM permissions and row.actions; Manage Members may be the only item.
    And the open row actions menu shows at least one available group action

  @TEN_UGP_LST_E2E_003 @priority:P1 @smoke @ref:TEN_COM_FSR_E2E_001 @flow:TEN_UGP_LIST_FLOW @type:positive
  Scenario Outline: Search input filters rows by the first visible row "<field>"
    Given a list page with search is open
    When the user searches for the first visible row "<field>"
    Then the search returns matching rows

    Examples:
      | field |
      | name  |

  @TEN_UGP_LST_E2E_004 @priority:P1 @regression @ref:TEN_COM_FIL_E2E_001 @flow:TEN_UGP_LIST_FLOW @type:ui-interaction
  Scenario Outline: Each filter option triggers API and returns matching rows
    Given a list page with filters is open
    When the user applies the "<filter_option>" filter option
    Then the filter triggers an API call that returns HTTP 200
    And the filter response includes rows that match the selected value

    Examples:
      | filter_option  |
      | created_at     |
      | resource_uuid  |
      | name           |
      | updated_at     |

  @TEN_UGP_LST_E2E_005 @priority:P1 @regression @ref:TEN_COM_SAP_E2E_001 @flow:TEN_UGP_LIST_FLOW @type:ui-interaction
  Scenario: All sort options work in both directions
    Given a list page with sort is open
    When the user applies each sort option in ascending and descending direction
    Then each sort triggers an API call that returns HTTP 200
    And each sort response includes rows in the correct order

  @TEN_UGP_LST_E2E_006 @priority:P1 @regression @mock @ref:TEN_COM_FSR_E2E_002 @flow:TEN_UGP_LIST_FLOW @type:negative
  Scenario: Search shows error state when the API returns 500 server error
    Given a list page with search is open
    And the search API is configured to return a 500 server error
    When the user searches for "test"
    Then the application shows an error state

  @TEN_UGP_LST_E2E_007 @priority:P1 @regression @mock @ref:TEN_COM_FSR_E2E_003 @flow:TEN_UGP_LIST_FLOW @type:edge-case
  Scenario: Search shows loading state while waiting for a slow API response
    Given a list page with search is open
    And the search API response is delayed by 4 seconds
    When the user searches for "test"
    Then a loading indicator or spinner is visible before the results load

  @TEN_UGP_LST_E2E_008 @regression @mock @ref:TEN_COM_SAP_E2E_002 @flow:TEN_UGP_LIST_FLOW @type:negative
  Scenario: Sort request shows error state when API returns 500 server error
    Given a list page with sort is open
    And the sort API is configured to return a 500 server error
    When the user applies the first available sort option
    Then the application shows an error state

  @TEN_UGP_LST_E2E_009 @regression @mock @ref:TEN_COM_SAP_E2E_003 @flow:TEN_UGP_LIST_FLOW @type:edge-case
  Scenario: Sort shows loading state while waiting for a slow API response
    Given a list page with sort is open
    And the sort API response is delayed by 4 seconds
    When the user applies the first available sort option
    Then a loading indicator or spinner is visible before the results load

  # ── TEN_UGP_CREATE_FLOW ─────────────────────────────────────────────

  @TEN_UGP_CRT_E2E_001 @priority:P1 @regression @flow:TEN_UGP_CREATE_FLOW @type:ui-interaction
  Scenario: User can open and cancel the create user group dialog
    Given the user is on the user groups list page
    When the user opens the create user group dialog
    And the user cancels the create user group dialog
    Then the create user group dialog is not visible

  @TEN_UGP_CRT_E2E_002 @priority:P1 @regression @flow:TEN_UGP_CREATE_FLOW @type:negative
  Scenario: Create user group shows validation when saving empty required fields
    Given the user is on the user groups list page
    When the user opens the create user group dialog
    And the user clicks save without filling required fields
    Then validation feedback is shown on required fields

  @TEN_UGP_CRT_E2E_003 @priority:P0 @smoke @flow:TEN_UGP_CREATE_FLOW @type:positive
  Scenario: Operator creates a user group end-to-end across supported domain types
    Given the user is on the user groups list page
    When the user fills and submits the create user group form with the first available domain type
    Then the create user group success toast is shown

  @TEN_UGP_CRT_E2E_004 @priority:P1 @regression @mock @flow:TEN_UGP_CREATE_FLOW @type:negative
  Scenario: User group creation shows error when the API returns a 500 server error
    Given the user is on the user groups list page
    And the create user group API is configured to return a 500 server error
    When the user opens the create user group dialog
    And the user fills and submits the create user group form with the first available domain type
    Then the application shows an error state

  # TEN_UGP_VIEW_DETAIL_PANEL_FLOW

  @TEN_UGP_VDT_E2E_001 @priority:P0 @smoke @ref:TEN_COM_VDT_E2E_001 @flow:TEN_UGP_VIEW_DETAIL_PANEL_FLOW @type:positive
  Scenario: Clicking a list row opens the detail panel
    Given a list page with detail panel layout is open
    When the user clicks the first list row
    Then the detail panel is visible
    And the detail panel header shows a title

  @TEN_UGP_VDT_E2E_002 @priority:P1 @regression @ref:TEN_COM_VDT_E2E_002 @flow:TEN_UGP_VIEW_DETAIL_PANEL_FLOW @type:ui-interaction
  Scenario Outline: Each detail panel tab displays its content section
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user clicks the "<tab>" detail panel tab
    Then the "<tab>" tab content is visible

    Examples:
      | tab     |
      | Details |
      | Members |

  @TEN_UGP_VDT_E2E_003 @priority:P1 @regression @ref:TEN_COM_VDT_E2E_003 @flow:TEN_UGP_VIEW_DETAIL_PANEL_FLOW @type:ui-interaction
  Scenario: Closing the detail panel hides it
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user closes the detail panel
    Then the detail panel is not visible

  @TEN_UGP_VDT_E2E_004 @regression @mock @ref:TEN_COM_VDT_E2E_004 @flow:TEN_UGP_VIEW_DETAIL_PANEL_FLOW @type:negative
  Scenario: Detail panel shows error state when the detail API returns 500 server error
    Given a list page with detail panel layout is open
    And the detail panel API is configured to return a 500 server error
    When the user clicks the first list row
    Then the application shows an error state

  @TEN_UGP_VDT_E2E_005 @regression @mock @ref:TEN_COM_VDT_E2E_005 @flow:TEN_UGP_VIEW_DETAIL_PANEL_FLOW @type:edge-case
  Scenario: Detail panel shows loading skeleton while waiting for a slow API response
    Given a list page with detail panel layout is open
    And the detail panel API response is delayed by 3 seconds
    When the user clicks the first list row
    Then the loading skeleton is visible before the detail panel content loads

  # TEN_UGP_MANAGE_MEMBERS_FLOW

  @TEN_UGP_MMB_E2E_001 @priority:P1 @regression @flow:TEN_UGP_MANAGE_MEMBERS_FLOW @type:ui-interaction
  Scenario: Manage Members can be opened and cancelled from the detail panel header
    Given the user is on the user groups list page
    And the user group detail panel is open
    When the user opens the group membership dialog from the detail panel
    Then the group membership dialog is visible
    And the "Save Changes" button is disabled when no changes are made
    When the user cancels the group membership dialog
    Then the group membership dialog is not visible

  @TEN_UGP_MMB_E2E_002 @priority:P0 @smoke @flow:TEN_UGP_MANAGE_MEMBERS_FLOW @type:positive
  Scenario: Operator adds a member to a newly created E2E user group
    Given the user is on the user groups list page
    When the user searches for E2E user groups
    And the user opens the user group detail panel from the first E2E result
    When the user opens the group membership dialog from the detail panel
    And the user adds the first available user from the membership dialog
    Then the group updated response modal is shown
    When the user closes the group updated response modal
    Then the group membership dialog is not visible

  @TEN_UGP_MMB_E2E_003 @priority:P1 @regression @flow:TEN_UGP_MANAGE_MEMBERS_FLOW @type:positive
  Scenario: Operator removes a member from the Members tab in the detail panel
    Given the user is on the user groups list page
    And the user group detail panel is open
    And the detail panel Members tab has at least one member
    When the user removes the first member from the detail panel Members tab
    Then the member removal success toast is shown

  @TEN_UGP_MMB_E2E_004 @priority:P1 @regression @mock @flow:TEN_UGP_MANAGE_MEMBERS_FLOW @type:negative
  Scenario: Group membership update shows error when the API returns a 500 server error
    Given the user is on the user groups list page
    And the user group detail panel is open
    And the user group members API is configured to return a 500 server error
    When the user opens the group membership dialog from the detail panel
    And the user adds the first available user from the membership dialog
    Then the application shows an error state

  # TEN_UGP_EDIT_FLOW

  @TEN_UGP_EDT_E2E_001 @priority:P1 @regression @flow:TEN_UGP_EDIT_FLOW @type:ui-interaction
  Scenario: Edit user group dialog can be opened and cancelled from row actions
    Given the user is on the user groups list page
    When the user opens edit user group from the first row actions menu
    Then the edit user group dialog is visible
    When the user cancels the edit user group dialog
    Then the edit user group dialog is not visible

  @TEN_UGP_EDT_E2E_002 @priority:P0 @smoke @flow:TEN_UGP_EDIT_FLOW @type:positive
  Scenario: Operator renames an E2E user group via the edit dialog
    Given the user is on the user groups list page
    When the user searches for E2E user groups
    When the user opens edit user group from the first E2E result row actions menu
    And the user updates the user group name and saves
    Then the edit user group success toast is shown

  @TEN_UGP_EDT_E2E_003 @priority:P1 @regression @mock @flow:TEN_UGP_EDIT_FLOW @type:negative
  Scenario: Edit user group shows error when the API returns a 500 server error
    Given the user is on the user groups list page
    And the user group detail panel is open
    And the edit user group API is configured to return a 500 server error
    When the user opens edit user group from the first row actions menu
    And the user updates the user group name and saves
    Then the application shows an error state

  # TEN_UGP_DELETE_FLOW

  @TEN_UGP_DEL_E2E_001 @priority:P1 @regression @flow:TEN_UGP_DELETE_FLOW @type:ui-interaction
  Scenario: Delete user group confirmation can be opened and cancelled from row actions
    Given the user is on the user groups list page
    When the user opens delete user group from the first row actions menu
    Then the delete user group confirmation dialog is visible
    When the user cancels the delete user group confirmation dialog
    Then the delete user group confirmation dialog is not visible

  @TEN_UGP_DEL_E2E_002 @priority:P0 @smoke @flow:TEN_UGP_DELETE_FLOW @type:positive
  Scenario: Operator deletes an E2E user group from row actions end-to-end
    Given the user is on the user groups list page
    When the user searches for E2E user groups
    When the user opens delete user group from the first E2E result row actions menu
    And the user confirms the user group deletion
    Then the delete user group success toast is shown

  @TEN_UGP_DEL_E2E_003 @priority:P1 @regression @mock @flow:TEN_UGP_DELETE_FLOW @type:negative
  Scenario: Delete user group shows error when the API returns a 500 server error
    Given the user is on the user groups list page
    And the delete user group API is configured to return a 500 server error
    When the user opens delete user group from the first row actions menu
    And the user confirms the user group deletion
    Then the application shows an error state

  # TEN_UGP_DETAILS_ROUTE_FLOW

  @TEN_UGP_DRT_E2E_001 @priority:P1 @smoke @flow:TEN_UGP_DETAILS_ROUTE_FLOW @type:positive
  Scenario: Dedicated details route renders details form and delete card
    Given the user navigates to a valid user group details route
    Then the details form is visible
    And the save action is visible
    And the delete user group action is visible

  @TEN_UGP_DRT_E2E_002 @priority:P0 @regression @flow:TEN_UGP_DETAILS_ROUTE_FLOW @type:negative
  Scenario: Saving unchanged details currently returns backend validation error (needs investigation)
    Given the user navigates to a valid user group details route
    When the user clicks save without changing details
    Then an update error is shown

  # TEN_UGP_MEMBERS_ROUTE_FLOW

  @TEN_UGP_MRT_E2E_001 @priority:P1 @smoke @flow:TEN_UGP_MEMBERS_ROUTE_FLOW @type:positive
  Scenario: Dedicated members route renders members section and members table area
    Given the user navigates to a valid user group members route
    Then the users section header is visible
    And the members table area is visible

  # TEN_UGP_REDIRECT_BY_ID_FLOW

  @TEN_UGP_RID_E2E_001 @priority:P0 @regression @flow:TEN_UGP_REDIRECT_BY_ID_FLOW @type:negative
  Scenario: Base user group id route redirect is currently broken in STT
    Given the user navigates to /user-management/user-groups/:id
    Then the app redirects to /iam/user-groups/:id/details
    And the redirected page shows not found
