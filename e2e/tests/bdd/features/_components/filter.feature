# Feature: Filter — Component
#
# Master E2E contract for dataview Filters toolbar (basic + advance filters).
# ID prefix: TEN_COM_FIL_E2E_NNN
#
# Reference page: /user-management/users
# Submodule features mirror these scenarios with TEN_* IDs and @ref:TEN_COM_FIL_E2E_*.
#
Feature: Filter — Component

  @TEN_COM_FIL_E2E_001 @regression @flow:TEN_COM_FILTER_FLOW @type:ui-interaction
  Scenario Outline: Each filter option triggers API and returns matching rows
    Given a list page with filters is open
    When the user applies the "<filter_option>" filter option
    Then the filter triggers an API call that returns HTTP 200
    And the filter response includes rows that match the selected value

    Examples:
      | filter_option          |
      | created_at             |
      | display_name           |
      | created_by_name        |
      | sub_tenant_unit_uuid   |

  # Filter error scenarios

  @TEN_COM_FIL_E2E_002 @regression @mock @flow:TEN_COM_FILTER_FLOW @type:negative
  Scenario: Filter request shows error state when API returns 500 server error
    Given a list page with filters is open
    And the filter API is configured to return a 500 server error
    When the user applies the first available filter option
    Then the application shows an error state

  @TEN_COM_FIL_E2E_003 @regression @mock @flow:TEN_COM_FILTER_FLOW @type:edge-case
  Scenario: Filter shows loading state while waiting for a slow API response
    Given a list page with filters is open
    And the filter API response is delayed by 4 seconds
    When the user applies the first available filter option
    Then a loading indicator or spinner is visible before the results load
