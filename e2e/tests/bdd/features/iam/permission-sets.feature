# Feature: IAM — Permission Sets
#
# Route: /iam/permission-sets | ID prefix: TEN_PMS_<FLG>_E2E_NNN (NNN resets per flow section)
# Tags: @smoke @regression @flow:<id> @type:<t> @ref:TEN_COM_*_E2E_* (component masters in _components/)
#
# Component @ref map: LST-002→FSR | LST-003→FIL | LST-004→SAP | VDT-001–003→VDT
#
# Reusable components NOT applicable: Pipeline — permission-sets has no pipeline tab bar.
# Detail panel tabs: Access Roles, Revisions (extend VDT outline beyond the master contract).
#
# Create flow is a 4-step Wizard (Details → Revision → Summary → Completed), not a dialog.
# Kebab menu items: Edit, Create New Revision, Delete.
#
# Reusable component scenarios use GENERIC step text from _shared/ step definitions.
# Module-specific scenarios (create, edit, delete, revision) use scoped step text
# defined in steps/iam/permission-sets.steps.ts.

Feature: IAM — Permission Sets

  # TEN_PMS_LIST_FLOW

  @TEN_PMS_LST_E2E_001 @smoke @flow:TEN_PMS_LIST_FLOW @type:positive
  Scenario: Permission sets list page loads with the data table visible
    Given the user is on the permission sets list page
    Then the permission sets data table is visible

  @TEN_PMS_LST_E2E_002 @ref:TEN_COM_FSR_E2E_001 @smoke @flow:TEN_PMS_LIST_FLOW @type:positive
  Scenario Outline: Search input filters rows by the first visible row "<field>"
    Given a list page with search is open
    When the user searches for the first visible row "<field>"
    Then the search returns matching rows

    Examples:
      | field |
      | name  |

  @TEN_PMS_LST_E2E_003 @ref:TEN_COM_FIL_E2E_001 @regression @flow:TEN_PMS_LIST_FLOW @type:ui-interaction
  Scenario Outline: Each filter option triggers API and returns matching rows
    Given a list page with filters is open
    When the user applies the "<filter_option>" filter option
    Then the filter triggers an API call that returns HTTP 200
    And the filter response includes rows that match the selected value

    Examples:
      | filter_option    |
      | name             |
      | created_at       |
      | created_by       |
      | updated_at       |
      | updated_by       |

  @TEN_PMS_LST_E2E_004 @regression @ref:TEN_COM_SAP_E2E_001 @flow:TEN_PMS_LIST_FLOW @type:ui-interaction
  Scenario: All sort options work in both directions
    Given a list page with sort is open
    When the user applies each sort option in ascending and descending direction
    Then each sort triggers an API call that returns HTTP 200
    And each sort response includes rows in the correct order

  @TEN_PMS_LST_E2E_005 @regression @mock @ref:TEN_COM_FSR_E2E_002 @flow:TEN_PMS_LIST_FLOW @type:negative
  Scenario: Search shows error state when the API returns 500 server error
    Given a list page with search is open
    And the search API is configured to return a 500 server error
    When the user searches for "test"
    Then the application shows an error state

  @TEN_PMS_LST_E2E_006 @regression @mock @ref:TEN_COM_FSR_E2E_003 @flow:TEN_PMS_LIST_FLOW @type:edge-case
  Scenario: Search shows loading state while waiting for a slow API response
    Given a list page with search is open
    And the search API response is delayed by 4 seconds
    When the user searches for "test"
    Then a loading indicator or spinner is visible before the results load

  @TEN_PMS_LST_E2E_007 @regression @mock @flow:TEN_PMS_LIST_FLOW @type:negative
  Scenario: Filter request shows error state when API returns 500 server error
    Given the user is on the permission sets list page
    And the permission sets filter API is configured to return a 500 server error
    When the user applies the permission sets name filter
    Then the application shows an error state

  @TEN_PMS_LST_E2E_008 @regression @mock @flow:TEN_PMS_LIST_FLOW @type:edge-case
  Scenario: Filter shows loading state while waiting for a slow API response
    Given the user is on the permission sets list page
    And the permission sets filter API response is delayed by 4 seconds
    When the user applies the permission sets name filter
    Then a loading indicator or spinner is visible before the results load

  @TEN_PMS_LST_E2E_009 @regression @mock @ref:TEN_COM_SAP_E2E_002 @flow:TEN_PMS_LIST_FLOW @type:negative
  Scenario: Sort request shows error state when API returns 500 server error
    Given a list page with sort is open
    And the sort API is configured to return a 500 server error
    When the user applies the first available sort option
    Then the application shows an error state

  @TEN_PMS_LST_E2E_010 @regression @mock @ref:TEN_COM_SAP_E2E_003 @flow:TEN_PMS_LIST_FLOW @type:edge-case
  Scenario: Sort shows loading state while waiting for a slow API response
    Given a list page with sort is open
    And the sort API response is delayed by 4 seconds
    When the user applies the first available sort option
    Then a loading indicator or spinner is visible before the results load

  @TEN_PMS_LST_E2E_011 @regression @mock @flow:TEN_PMS_LIST_FLOW @type:negative
  Scenario: App handles token expiration gracefully when the permission sets API returns 401
    Given the permission sets API is configured to return a 401 authentication error
    When the user navigates to the permission sets list page
    Then the permission sets page shows auth error or login redirect

  # TEN_PMS_VIEW_DETAIL_FLOW

  @TEN_PMS_VDT_E2E_001 @ref:TEN_COM_VDT_E2E_001 @smoke @flow:TEN_PMS_VIEW_DETAIL_FLOW @type:positive
  Scenario: Clicking a list row opens the detail panel
    Given a list page with detail panel layout is open
    When the user clicks the first list row
    Then the detail panel is visible
    And the detail panel header shows a title

  @TEN_PMS_VDT_E2E_002 @ref:TEN_COM_VDT_E2E_002 @regression @flow:TEN_PMS_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario Outline: Each detail panel tab displays its content section
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user clicks the "<tab>" detail panel tab
    Then the "<tab>" tab content is visible

    Examples:
      | tab             |
      | Access Roles    |
      | Revisions       |

  @TEN_PMS_VDT_E2E_003 @ref:TEN_COM_VDT_E2E_003 @regression @flow:TEN_PMS_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario: Closing the detail panel hides it
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user closes the detail panel
    Then the detail panel is not visible

  @TEN_PMS_VDT_E2E_004 @regression @mock @ref:TEN_COM_VDT_E2E_004 @flow:TEN_PMS_VIEW_DETAIL_FLOW @type:negative
  Scenario: Detail panel shows error state when the detail API returns 500 server error
    Given a list page with detail panel layout is open
    And the detail panel API is configured to return a 500 server error
    When the user clicks the first list row
    Then the application shows an error state

  @TEN_PMS_VDT_E2E_005 @regression @mock @ref:TEN_COM_VDT_E2E_005 @flow:TEN_PMS_VIEW_DETAIL_FLOW @type:edge-case
  Scenario: Detail panel shows loading skeleton while waiting for a slow API response
    Given a list page with detail panel layout is open
    And the detail panel API response is delayed by 3 seconds
    When the user clicks the first list row
    Then the loading skeleton is visible before the detail panel content loads

  # TEN_PMS_CREATE_FLOW

  @TEN_PMS_CRT_E2E_001 @smoke @flow:TEN_PMS_CREATE_FLOW @type:positive
  Scenario: Operator can successfully create a new permission set via the wizard
    Given the user is on the permission sets list page
    When the user clicks Create Permission Set button
    And the user completes the create permission set wizard
    Then the permission set creation success screen is displayed

  @TEN_PMS_CRT_E2E_002 @regression @flow:TEN_PMS_CREATE_FLOW @type:negative
  Scenario: Advancing past step 1 without required fields shows validation errors
    Given the user is on the permission sets list page
    When the user clicks Create Permission Set button
    When the user clicks Next without filling required fields
    Then the permission set wizard shows required field validation errors

  @TEN_PMS_CRT_E2E_003 @regression @flow:TEN_PMS_CREATE_FLOW @type:ui-interaction
  Scenario: Cancelling the create wizard returns to the permission sets list
    Given the user is on the permission sets list page
    When the user clicks Create Permission Set button
    And the user cancels the create wizard
    Then the permission sets list page is displayed

  @TEN_PMS_CRT_E2E_004 @regression @mock @flow:TEN_PMS_CREATE_FLOW @type:negative
  Scenario: Permission set creation shows error when the API returns a 500 server error
    Given the user is on the permission sets list page
    And the create permission set API is configured to return a 500 server error
    When the user clicks Create Permission Set button
    And the user advances the create permission set wizard to confirm
    Then the application shows an error state

  # TEN_PMS_EDIT_FLOW

  @TEN_PMS_EDT_E2E_001 @smoke @flow:TEN_PMS_EDIT_FLOW @type:positive
  Scenario: Operator can update a permission set name via the detail panel kebab
    Given the user is on the permission sets list page
    When the user searches for E2E permission sets
    And the user opens the permission set detail panel from the first E2E result
    When the user opens the permission set row actions menu
    And the user clicks Edit in permission set actions
    And the user updates the permission set name
    And the user saves the edit permission set dialog
    Then the permission set success toast shows "updated successfully"

  @TEN_PMS_EDT_E2E_002 @regression @flow:TEN_PMS_EDIT_FLOW @type:ui-interaction
  Scenario: Cancelling the edit dialog closes it without changes
    Given the user is on the permission sets list page
    When the user searches for E2E permission sets
    And the user opens the permission set detail panel from the first E2E result
    And the Edit Permission Set dialog is open
    When the user cancels the permission set edit dialog
    Then the Edit Permission Set dialog is not visible

  @TEN_PMS_EDT_E2E_003 @regression @mock @flow:TEN_PMS_EDIT_FLOW @type:negative
  Scenario: Edit permission set shows error when the API returns a 500 server error
    Given the user is on the permission sets list page
    And the detail panel is open
    And the edit permission set API is configured to return a 500 server error
    When the user opens the permission set row actions menu
    And the user clicks Edit in permission set actions
    And the user updates the permission set name
    And the user saves the edit permission set dialog
    Then the application shows an error state

  # TEN_PMS_DELETE_FLOW

  @TEN_PMS_DLT_E2E_001 @regression @quarantine @flow:TEN_PMS_DELETE_FLOW @type:positive
  Scenario: Operator can delete a permission set with confirmation
    Given the user is on the permission sets list page
    When the user searches for E2E permission sets
    When the user opens the row actions menu for the first E2E result
    And the user clicks Delete in permission set actions
    And the user confirms the permission set deletion
    Then the permission set success toast shows "deleted successfully"

  @TEN_PMS_DLT_E2E_002 @regression @flow:TEN_PMS_DELETE_FLOW @type:ui-interaction
  Scenario: Cancelling the delete action does not remove the permission set
    Given the user is on the permission sets list page
    When the user opens the row actions menu for the first permission set
    And the user clicks Delete in permission set actions
    And the user cancels the permission set delete confirmation
    Then the delete confirmation is no longer visible

  @TEN_PMS_DLT_E2E_003 @regression @mock @flow:TEN_PMS_DELETE_FLOW @type:negative
  Scenario: Delete permission set shows error when the API returns a 500 server error
    Given the user is on the permission sets list page
    And the delete permission set API is configured to return a 500 server error
    When the user opens the row actions menu for the first permission set
    And the user clicks Delete in permission set actions
    And the user confirms the permission set deletion
    Then the application shows an error state

  # TEN_PMS_REVISION_FLOW
  #
  # Cover the core revision lifecycle: Create → Publish → Activate → Delete.
  # Each mutation asserts the success toast (data outcome, not just dialog visibility).

  @TEN_PMS_REV_E2E_001 @smoke @flow:TEN_PMS_REVISION_FLOW @type:positive
  Scenario: Operator can create a new revision from the detail panel header
    Given the user is on the permission sets list page
    When the user searches for E2E permission sets
    And the user opens the permission set detail panel from the first E2E result
    And the user clicks Create New Revision in the detail panel header
    And the user saves the new revision with at least one permission selected
    Then the revision creation success toast is shown

  @TEN_PMS_REV_E2E_002 @regression @flow:TEN_PMS_REVISION_FLOW @type:ui-interaction
  Scenario: Revisions tab displays a table with revision rows and status indicators
    Given the user is on the permission sets list page
    When the user searches for E2E permission sets
    And the user opens the permission set detail panel from the first E2E result
    When the user clicks the Revisions detail panel tab
    Then the revisions table is visible
    And the revisions table shows revision status indicators

  @TEN_PMS_REV_E2E_003 @regression @flow:TEN_PMS_REVISION_FLOW @type:positive
  Scenario: Operator can publish a draft revision with confirmation
    Given the user is on the permission sets list page
    When the user searches for E2E permission sets
    And the user opens the permission set detail panel from the first E2E result
    And the Revisions tab is active
    When the user opens the revision kebab menu for a draft revision
    And the user clicks Publish in the revision actions
    And the user confirms the publish action
    Then the revision publish success toast is shown

  @TEN_PMS_REV_E2E_004 @regression @flow:TEN_PMS_REVISION_FLOW @type:positive
  Scenario: Operator can activate a published revision with confirmation
    Given the user is on the permission sets list page
    When the user searches for E2E permission sets
    And the user opens the permission set detail panel from the first E2E result
    And the Revisions tab is active
    When the user opens the revision kebab menu for a published revision
    And the user clicks Activate in the revision actions
    And the user confirms the activate action
    Then the revision activate success toast is shown

  @TEN_PMS_REV_E2E_005 @regression @flow:TEN_PMS_REVISION_FLOW @type:positive
  Scenario: Operator can delete a draft revision with confirmation
    Given the user is on the permission sets list page
    When the user searches for E2E permission sets
    And the user opens the permission set detail panel from the first E2E result
    And the user clicks Create New Revision in the detail panel header
    And the user saves the new revision with at least one permission selected
    Then the revision creation success toast is shown
    When the user clicks the Revisions detail panel tab
    And the user opens the revision kebab menu for a draft revision
    And the user clicks Delete in the revision actions
    And the user confirms the revision deletion
    Then the revision delete success toast is shown
