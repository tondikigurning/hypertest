# Feature: Filter Search — Component
#
# Master E2E contract for dataview FilterSearch / filter bar search input.
# ID prefix: TEN_COM_FSR_E2E_NNN
#
# Reference page: /user-management/users
# Submodule features link via @ref:TEN_COM_FSR_E2E_* — do not duplicate these steps.
#
Feature: Filter Search — Component

  @TEN_COM_FSR_E2E_001 @regression @flow:TEN_COM_FILTER_SEARCH_FLOW @type:positive
  Scenario Outline: Search input filters rows by the first visible row "<field>"
    Given a list page with search is open
    When the user searches for the first visible row "<field>"
    Then the search returns matching rows

  # Search error scenarios

  @TEN_COM_FSR_E2E_002 @regression @mock @flow:TEN_COM_FILTER_SEARCH_FLOW @type:negative
  Scenario: Search shows error state when the API returns 500 server error
    Given a list page with search is open
    And the search API is configured to return a 500 server error
    When the user searches for "test"
    Then the application shows an error state

  @TEN_COM_FSR_E2E_003 @regression @mock @flow:TEN_COM_FILTER_SEARCH_FLOW @type:edge-case
  Scenario: Search shows loading state while waiting for a slow API response
    Given a list page with search is open
    And the search API response is delayed by 4 seconds
    When the user searches for "test"
    Then a loading indicator or spinner is visible before the results load
