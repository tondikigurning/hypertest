# Feature: Sort Controls — Component
#
# Master E2E contract for dataview Filters toolbar sort controls.
# ID prefix: TEN_COM_SAP_E2E_NNN
#
# Reference page: /user-management/users
# Submodule features mirror these scenarios with TEN_* IDs and @ref:TEN_COM_SAP_E2E_*.
#
Feature: Sort Controls — Component

  @TEN_COM_SAP_E2E_001 @regression @flow:TEN_COM_SORT_FLOW @type:ui-interaction
  Scenario: All sort options work in both directions
    Given a list page with sort is open
    When the user applies each sort option in ascending and descending direction
    Then each sort triggers an API call that returns HTTP 200
    And each sort response includes rows in the correct order

  # Sort error scenarios

  @TEN_COM_SAP_E2E_002 @regression @mock @flow:TEN_COM_SORT_FLOW @type:negative
  Scenario: Sort request shows error state when API returns 500 server error
    Given a list page with sort is open
    And the sort API is configured to return a 500 server error
    When the user applies the first available sort option
    Then the application shows an error state

  @TEN_COM_SAP_E2E_003 @regression @mock @flow:TEN_COM_SORT_FLOW @type:edge-case
  Scenario: Sort shows loading state while waiting for a slow API response
    Given a list page with sort is open
    And the sort API response is delayed by 4 seconds
    When the user applies the first available sort option
    Then a loading indicator or spinner is visible before the results load
