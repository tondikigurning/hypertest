# ID prefix: TEN_RTM_<FLG>_E2E_NNN; sequence is per flow.
# Data safety: use E2E-owned records for mutations; existing templates are read-only.
# The user identified no operations forbidden in production; this is not mutation authorization.
Feature: Report Templates

  @TEN_RTM_LST_E2E_001 @smoke @flow:TEN_RTM_LIST_FLOW @type:positive
  Scenario: Browse the report template list
    Given the user is logged in
    When the user opens Report Templates from Reports
    Then the report template list is visible with Report Name, Description, Created By and Created At columns
    And the list shows its current page and pagination controls

  @TEN_RTM_LST_E2E_002 @regression @flow:TEN_RTM_LIST_FLOW @type:edge-case
  Scenario: Search without matches and reset the template list
    Given the Report Templates list contains templates
    And a search term is known not to match any template
    When the user searches for that term
    Then the template list displays "No Data Available" and "There are no items to display at this time."
    When the user resets the list search
    Then the populated template list is visible again

  @TEN_RTM_LST_E2E_003 @regression @flow:TEN_RTM_LIST_FLOW @type:ui-interaction
  Scenario: Navigate between pages of report templates
    Given the Report Templates list has more than one page of results
    And the first page is displayed
    When the user navigates to the next page
    Then the displayed row range advances to the next page
    When the user navigates to the previous page
    Then the displayed row range returns to the first page

  @TEN_RTM_LST_E2E_004 @regression @flow:TEN_RTM_LIST_FLOW @type:edge-case
  Scenario: Filter by a report name with no matches and reset
    Given the Report Templates list contains templates
    And a report name value is known not to match any template
    When the user filters Report Name using Contains All and that value
    Then the template list displays "No Data Available"
    When the user resets the list filters
    Then the populated template list is visible again

  @TEN_RTM_SAV_E2E_001 @regression @flow:TEN_RTM_SAVED_VIEWS_FLOW @type:edge-case
  Scenario: See the empty saved views state
    Given the Report Templates list is open for an account with no available saved views
    When the user opens Load Views
    Then the saved views dialog displays "No available saved views found."

  @TEN_RTM_CRT_E2E_001 @regression @flow:TEN_RTM_CREATE_FLOW @type:positive
  Scenario: Choose a Case Management report type for a new template
    Given the Report Templates list is open
    When the user selects Create New
    Then Next is disabled until a report type is selected
    When the user selects a Case Management report type
    Then the selected report type's fields are previewed and Next is enabled
    When the user selects Next
    Then the create template editor shows the selected report type, available fields, Values, grouping areas and preview
    And the Date Filter is "Last 7 days"

  @TEN_RTM_CRT_E2E_002 @regression @flow:TEN_RTM_CREATE_FLOW @type:negative
  Scenario: Require a template name and at least one value
    Given the create template editor is open for a Case Management report type
    And the template name and Values are empty
    When the user selects Save & Continue
    Then the editor remains open and displays "Name is required"
    And the editor displays "Add at least one field to Values to continue"

  @TEN_RTM_CRT_E2E_003 @regression @flow:TEN_RTM_CREATE_FLOW @type:ui-interaction
  Scenario: Cancel an unchanged template creation
    Given the unchanged create template editor is open for a Case Management report type
    When the user cancels creation
    Then the Report Templates list is visible

  @TEN_RTM_VDT_E2E_001 @smoke @flow:TEN_RTM_VIEW_DETAIL_FLOW @type:positive
  Scenario: View a template report and its configuration
    Given the Report Templates list contains an accessible Case Management template
    When the user opens that template
    Then the template detail shows its name, report type and report table
    When the user opens Show Configuration
    Then the configuration displays the date filter and Values
