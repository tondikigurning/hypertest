# Feature: View Detail — Component
#
# Master E2E contract for dataview list + detail panel layout (TableRenderer + DetailPanelContainer).
# ID prefix: TEN_COM_VDT_E2E_NNN
#
# Reference page: /user-management/users
# Submodule features mirror with TEN_* IDs and @ref:TEN_COM_VDT_E2E_*.
#
# Unit catalogs (split — not 1:1 with a single source file):
#   testing-docs/components/dataview/table.md           — DV_TBL_UT_* (variant/table.tsx)
#   testing-docs/components/dataview/clear-active-rows.md — DV_CLR_UT_*
#   testing-docs/components/dataview/set-active-row.md    — DV_SAR_UT_*
# UI shell: testing-docs/components/ui/detail-panel.md — UI_DPN_UT_*

Feature: View Detail — Component

  @TEN_COM_VDT_E2E_001 @regression @flow:TEN_COM_VIEW_DETAIL_FLOW @type:positive
  Scenario: Clicking a list row opens the detail panel
    Given a list page with detail panel layout is open
    When the user clicks the first list row
    Then the detail panel is visible
    And the detail panel header shows a title

  # Master contract only covers the shared "Details" tab.
  # Submodule features extend this outline with their own tabs (Users, User Groups, …).
  @TEN_COM_VDT_E2E_002 @regression @flow:TEN_COM_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario Outline: Each detail panel tab displays its content section
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user clicks the "<tab>" detail panel tab
    Then the "<tab>" tab content is visible

    Examples:
      | tab     |
      | Details |

  @TEN_COM_VDT_E2E_003 @regression @flow:TEN_COM_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario: Closing the detail panel hides it
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user closes the detail panel
    Then the detail panel is not visible

  # Detail panel error scenarios

  @TEN_COM_VDT_E2E_004 @regression @mock @flow:TEN_COM_VIEW_DETAIL_FLOW @type:negative
  Scenario: Detail panel shows error state when the detail API returns 500 server error
    Given a list page with detail panel layout is open
    And the detail panel API is configured to return a 500 server error
    When the user clicks the first list row
    Then the application shows an error state

  @TEN_COM_VDT_E2E_005 @regression @mock @flow:TEN_COM_VIEW_DETAIL_FLOW @type:edge-case
  Scenario: Detail panel shows loading skeleton while waiting for a slow API response
    Given a list page with detail panel layout is open
    And the detail panel API response is delayed by 3 seconds
    When the user clicks the first list row
    Then the loading skeleton is visible before the detail panel content loads
