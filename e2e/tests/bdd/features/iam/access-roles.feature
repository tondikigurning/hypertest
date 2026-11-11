# Feature: IAM — Access Roles
#
# Route: /iam/access-roles | ID prefix: TEN_ACR_<FLG>_E2E_NNN (NNN resets per flow section)
# Tags: @smoke @regression @flow:<id> @type:<t> @ref:TEN_COM_*_E2E_* (component masters in _components/)
#
# Component @ref map: LST-002→FSR | LST-003→FIL | LST-004→SAP | VDT-001–003→VDT
#
# Reusable components NOT applicable: Pipeline — access-roles has no pipeline tab bar.
# Detail panel tabs: Details, Permission Sets (extend VDT outline beyond the master contract).
#
# Reusable component scenarios use GENERIC step text from _shared/ step definitions.
# Module-specific scenarios (create, edit, delete, permission sets) use scoped step text
# defined in steps/iam/access-roles.steps.ts.

Feature: IAM — Access Roles

  # TEN_ACR_LIST_FLOW

  @TEN_ACR_LST_E2E_001 @smoke @flow:TEN_ACR_LIST_FLOW @type:positive
  Scenario: Access roles list page loads with the data table visible
    Given the user is on the access roles list page
    Then the access roles data table is visible

  @TEN_ACR_LST_E2E_002 @ref:TEN_COM_FSR_E2E_001 @smoke @flow:TEN_ACR_LIST_FLOW @type:positive
  Scenario Outline: Search input filters rows by the first visible row "<field>"
    Given a list page with search is open
    When the user searches for the first visible row "<field>"
    Then the search returns matching rows

    Examples:
      | field |
      | name  |

  @TEN_ACR_LST_E2E_003 @ref:TEN_COM_FIL_E2E_001 @regression @flow:TEN_ACR_LIST_FLOW @type:ui-interaction
  Scenario Outline: Each filter option triggers API and returns matching rows
    Given a list page with filters is open
    When the user applies the "<filter_option>" filter option
    Then the filter triggers an API call that returns HTTP 200
    And the filter response includes rows that match the selected value

    Examples:
      | filter_option    |
      | name             |
      | description      |
      | role_type        |
      | created_at       |
      | created_by       |

  @TEN_ACR_LST_E2E_004 @ref:TEN_COM_SAP_E2E_001 @regression @flow:TEN_ACR_LIST_FLOW @type:ui-interaction
  Scenario: All sort options work in both directions
    Given a list page with sort is open
    When the user applies each sort option in ascending and descending direction
    Then each sort triggers an API call that returns HTTP 200
    And each sort response includes rows in the correct order

  @TEN_ACR_LST_E2E_005 @regression @mock @ref:TEN_COM_FSR_E2E_002 @flow:TEN_ACR_LIST_FLOW @type:negative
  Scenario: Search shows error state when the API returns 500 server error
    Given a list page with search is open
    And the search API is configured to return a 500 server error
    When the user searches for "test"
    Then the application shows an error state

  @TEN_ACR_LST_E2E_006 @regression @mock @ref:TEN_COM_FSR_E2E_003 @flow:TEN_ACR_LIST_FLOW @type:edge-case
  Scenario: Search shows loading state while waiting for a slow API response
    Given a list page with search is open
    And the search API response is delayed by 4 seconds
    When the user searches for "test"
    Then a loading indicator or spinner is visible before the results load

  @TEN_ACR_LST_E2E_007 @regression @mock @flow:TEN_ACR_LIST_FLOW @type:negative
  Scenario: Filter request shows error state when API returns 500 server error
    Given the user is on the access roles list page
    And the access roles filter API is configured to return a 500 server error
    When the user applies the access roles name filter
    Then the application shows an error state

  @TEN_ACR_LST_E2E_008 @regression @mock @flow:TEN_ACR_LIST_FLOW @type:edge-case
  Scenario: Filter shows loading state while waiting for a slow API response
    Given the user is on the access roles list page
    And the access roles filter API response is delayed by 4 seconds
    When the user applies the access roles name filter
    Then a loading indicator or spinner is visible before the results load

  @TEN_ACR_LST_E2E_009 @regression @mock @ref:TEN_COM_SAP_E2E_002 @flow:TEN_ACR_LIST_FLOW @type:negative
  Scenario: Sort request shows error state when API returns 500 server error
    Given a list page with sort is open
    And the sort API is configured to return a 500 server error
    When the user applies the first available sort option
    Then the application shows an error state

  @TEN_ACR_LST_E2E_010 @regression @mock @ref:TEN_COM_SAP_E2E_003 @flow:TEN_ACR_LIST_FLOW @type:edge-case
  Scenario: Sort shows loading state while waiting for a slow API response
    Given a list page with sort is open
    And the sort API response is delayed by 4 seconds
    When the user applies the first available sort option
    Then a loading indicator or spinner is visible before the results load

  @TEN_ACR_LST_E2E_011 @regression @mock @flow:TEN_ACR_LIST_FLOW @type:negative
  Scenario: App handles token expiration gracefully when the access roles API returns 401
    Given the access roles API is configured to return a 401 authentication error
    When the user navigates to the access roles list page
    Then the user is redirected to the login page or shown an auth error

  # TEN_ACR_VIEW_DETAIL_FLOW

  @TEN_ACR_VDT_E2E_001 @ref:TEN_COM_VDT_E2E_001 @smoke @flow:TEN_ACR_VIEW_DETAIL_FLOW @type:positive
  Scenario: Clicking a list row opens the detail panel
    Given a list page with detail panel layout is open
    When the user clicks the first list row
    Then the detail panel is visible
    And the detail panel header shows a title

  @TEN_ACR_VDT_E2E_002 @ref:TEN_COM_VDT_E2E_002 @regression @flow:TEN_ACR_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario Outline: Each detail panel tab displays its content section
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user clicks the "<tab>" detail panel tab
    Then the "<tab>" tab content is visible

    Examples:
      | tab              |
      | Details          |
      | Permission Sets  |

  @TEN_ACR_VDT_E2E_003 @ref:TEN_COM_VDT_E2E_003 @regression @flow:TEN_ACR_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario: Closing the detail panel hides it
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user closes the detail panel
    Then the detail panel is not visible

  @TEN_ACR_VDT_E2E_004 @regression @mock @ref:TEN_COM_VDT_E2E_004 @flow:TEN_ACR_VIEW_DETAIL_FLOW @type:negative
  Scenario: Detail panel shows error state when the detail API returns 500 server error
    Given a list page with detail panel layout is open
    And the detail panel API is configured to return a 500 server error
    When the user clicks the first list row
    Then the application shows an error state

  @TEN_ACR_VDT_E2E_005 @regression @mock @ref:TEN_COM_VDT_E2E_005 @flow:TEN_ACR_VIEW_DETAIL_FLOW @type:edge-case
  Scenario: Detail panel shows loading skeleton while waiting for a slow API response
    Given a list page with detail panel layout is open
    And the detail panel API response is delayed by 3 seconds
    When the user clicks the first list row
    Then the loading skeleton is visible before the detail panel content loads

  # TEN_ACR_CREATE_FLOW

  @TEN_ACR_CRT_E2E_001 @smoke @flow:TEN_ACR_CREATE_FLOW @type:positive
  Scenario: Operator can successfully create a new access role with valid data
    Given the user is on the access roles list page
    When the user clicks the Create Access Role button
    And the user fills the create access role form with valid data
    And the user submits the create access role form
    Then the access role creation success dialog is displayed

  @TEN_ACR_CRT_E2E_002 @regression @flow:TEN_ACR_CREATE_FLOW @type:negative
  Scenario: Submitting the create form without required fields shows validation errors
    Given the user is on the access roles list page
    When the user clicks the Create Access Role button
    When the user clicks Create without filling required fields
    Then the create access role form shows required field validation errors

  @TEN_ACR_CRT_E2E_003 @regression @flow:TEN_ACR_CREATE_FLOW @type:ui-interaction
  Scenario: Cancelling the create dialog closes it without creating
    Given the user is on the access roles list page
    When the user clicks the Create Access Role button
    And the user cancels the create access role dialog
    Then the create access role dialog is not visible

  @TEN_ACR_CRT_E2E_004 @regression @mock @flow:TEN_ACR_CREATE_FLOW @type:negative
  Scenario: Access role creation shows error when the API returns a 500 server error
    Given the user is on the access roles list page
    And the create access role API is configured to return a 500 server error
    When the user clicks the Create Access Role button
    And the user fills the create access role form with valid data
    And the user submits the create access role form
    Then the application shows an error state

  # TEN_ACR_EDIT_FLOW

  @TEN_ACR_EDT_E2E_001 @smoke @flow:TEN_ACR_EDIT_FLOW @type:positive
  Scenario: Operator can update an access role name and description via the detail panel kebab
    Given the user is on the access roles list page
    When the user searches for E2E access roles
    And the user opens the access role detail panel from the first E2E result
    When the user opens the access role row actions menu
    And the user clicks Edit Access Role
    And the user updates the access role name and description
    And the user submits the edit access role form
    Then the success toast shows "updated successfully"

  @TEN_ACR_EDT_E2E_002 @regression @flow:TEN_ACR_EDIT_FLOW @type:ui-interaction
  Scenario: Cancelling the edit dialog closes it without changes
    Given the user is on the access roles list page
    And the detail panel is open
    And the Edit Access Role dialog is open
    When the user cancels the edit dialog
    Then the Edit Access Role dialog is not visible

  @TEN_ACR_EDT_E2E_003 @regression @mock @flow:TEN_ACR_EDIT_FLOW @type:negative
  Scenario: Edit access role shows error when the API returns a 500 server error
    Given the user is on the access roles list page
    And the detail panel is open
    And the edit access role API is configured to return a 500 server error
    When the user opens the access role row actions menu
    And the user clicks Edit Access Role
    And the user updates the access role name and description
    And the user submits the edit access role form
    Then the application shows an error state

  # TEN_ACR_DELETE_FLOW

  @TEN_ACR_DLT_E2E_001 @smoke @flow:TEN_ACR_DELETE_FLOW @type:positive
  Scenario: Operator can delete an access role with confirmation
    Given the user is on the access roles list page
    When the user searches for E2E access roles
    When the user opens the row actions menu for the first access role
    And the user clicks Delete Access Role
    And the user confirms the access role deletion
    Then the success toast shows "deleted successfully"

  @TEN_ACR_DLT_E2E_002 @regression @flow:TEN_ACR_DELETE_FLOW @type:ui-interaction
  Scenario: Cancelling the delete action does not remove the access role
    Given the user is on the access roles list page
    When the user opens the row actions menu for the first access role
    And the user clicks Delete Access Role
    And the user cancels the access role confirmation dialog
    Then Delete Access Role confirmation is no longer visible

  @TEN_ACR_DLT_E2E_003 @regression @mock @flow:TEN_ACR_DELETE_FLOW @type:negative
  Scenario: Delete access role shows error when the API returns a 500 server error
    Given the user is on the access roles list page
    And the delete access role API is configured to return a 500 server error
    When the user opens the row actions menu for the first access role
    And the user clicks Delete Access Role
    And the user clicks the confirm delete button
    Then the application shows an error state

  # TEN_ACR_PERMISSION_SETS_FLOW

  @TEN_ACR_PMS_E2E_001 @smoke @flow:TEN_ACR_PERMISSION_SETS_FLOW @type:positive
  Scenario: Operator can open Manage Permission Sets dialog from the detail panel
    Given the user is on the access roles list page
    And the detail panel is open
    When the user clicks "Manage Permission Sets" in the detail panel header
    Then the Manage Permission Sets dialog is visible

  @TEN_ACR_PMS_E2E_002 @regression @flow:TEN_ACR_PERMISSION_SETS_FLOW @type:positive
  Scenario: Operator can assign a permission set via Manage Permission Sets dialog
    Given the user is on the access roles list page
    And the detail panel is open
    When the user clicks "Manage Permission Sets" in the detail panel header
    And the user adds the first available permission set in the manage permission sets dialog
    And the user saves the Manage Permission Sets dialog
    Then the success toast shows "Permission Sets updated successfully"

  @TEN_ACR_PMS_E2E_003 @regression @flow:TEN_ACR_PERMISSION_SETS_FLOW @type:positive
  Scenario: Operator can remove an assigned permission set via Manage Permission Sets dialog
    Given the user is on the access roles list page
    And the detail panel is open
    When the user clicks "Manage Permission Sets" in the detail panel header
    And the user adds the first available permission set in the manage permission sets dialog
    And the user saves the Manage Permission Sets dialog
    Then the success toast shows "Permission Sets updated successfully"
    When the user clicks the first list row
    When the user clicks "Manage Permission Sets" in the detail panel header
    And the user removes the first assigned permission set in the manage permission sets dialog
    And the user saves the Manage Permission Sets dialog
    Then the success toast shows "Permission Sets updated successfully"