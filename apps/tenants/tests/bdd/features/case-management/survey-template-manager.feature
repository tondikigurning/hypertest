# Feature: Case Management — Survey Template Manager
#
# Route: /case-management/survey-template-manager
# ID prefix: TEN_STM_<FLG>_E2E_NNN (NNN resets per flow section)
#
# Data safety:
#   CRUD scenarios create uniquely named E2E-owned survey templates and register them for
#   scenario teardown cleanup. The delete journey removes its template explicitly.
#   Reports and exports use an existing response-bearing template as read-only seed data;
#   downloaded export files are temporary test artifacts and must be removed after assertions.
#
# Shared contracts:
#   TEN_STM_LIST_FLOW reuses TEN_COM_VDT_E2E_001 for opening a list item preview,
#   TEN_COM_FSR_E2E_001 for searching, TEN_COM_FIL_E2E_001 for filtering, and
#   TEN_COM_SAP_E2E_001 for sorting. Preview uses this page's custom list layout, so the
#   shared detail-panel implementation needs a page-specific adapter in Phase 1.
#
# Discovery gaps for Phase 1:
#   - The available account can open this page, but no valid denied-role account was available
#     to verify the proposed Surveyor/template-only access boundary. No access-denial scenario
#     is included until that account can be exercised.
#   - The row actions menu trigger and applied-sort direction toggle are unnamed controls with
#     no test IDs in the inspected UI; verify stable locators before implementing edit/delete/sort.
#   - Duplicate is excluded: its UI entry point is unwired and its handler is a TODO.
#   - Field-by-field question validation is left to lower-level coverage; the page has no pipeline tabs.
#
Feature: Case Management — Survey Template Manager

  # ── TEN_STM_LIST_FLOW ───────────────────────────────────────────────────────

  @TEN_STM_LST_E2E_001 @priority:P1 @regression @ref:TEN_COM_VDT_E2E_001 @flow:TEN_STM_LIST_FLOW @type:positive
  Scenario: Selecting a survey template opens its preview
    Given a list page with detail panel layout is open
    When the user clicks the first list row
    Then the detail panel is visible
    And the detail panel header shows a title

  @TEN_STM_LST_E2E_002 @priority:P1 @regression @ref:TEN_COM_FSR_E2E_001 @flow:TEN_STM_LIST_FLOW @type:positive
  Scenario: Searching by survey template name returns matching templates
    Given a list page with search is open
    When the user searches for the first visible row "template_name"
    Then the search returns matching rows

  @TEN_STM_LST_E2E_003 @priority:P1 @regression @ref:TEN_COM_FIL_E2E_001 @flow:TEN_STM_LIST_FLOW @type:ui-interaction
  Scenario: Filtering by survey template name returns matching templates
    Given a list page with filters is open
    When the user applies the "template_name" filter option
    Then the filter triggers an API call that returns HTTP 200
    And the filter response includes rows that match the selected value

  @TEN_STM_LST_E2E_004 @priority:P1 @regression @ref:TEN_COM_SAP_E2E_001 @flow:TEN_STM_LIST_FLOW @type:ui-interaction
  Scenario: Survey templates can be sorted in both directions
    Given a list page with sort is open
    When the user applies each sort option in ascending and descending direction
    Then each sort triggers an API call that returns HTTP 200
    And each sort response includes rows in the correct order

  @TEN_STM_LST_E2E_005 @priority:P2 @regression @flow:TEN_STM_LIST_FLOW @type:ui-interaction
  Scenario: Moving to the next template page shows a different set of templates
    Given more than one page of survey templates is available
    When the user moves to the next survey template page
    Then the next page shows a different set of survey templates

  # ── TEN_STM_CREATE_FLOW ─────────────────────────────────────────────────────

  @TEN_STM_CRT_E2E_001 @priority:P1 @regression @flow:TEN_STM_CREATE_FLOW @type:positive
  Scenario: Creating a survey template adds it to the template list
    Given the user is on the survey template manager page
    When the user creates a survey template with one required text question and a unique E2E name
    Then the survey template creation confirmation is shown
    And the created survey template appears in the list

  # ── TEN_STM_EDIT_FLOW ───────────────────────────────────────────────────────

  @TEN_STM_EDT_E2E_001 @priority:P1 @regression @flow:TEN_STM_EDIT_FLOW @type:positive
  Scenario: Editing an E2E-owned survey template saves the updated name
    Given the user is on the survey template manager page
    And an E2E-owned survey template with one required text question has been created
    When the user changes the created survey template name
    Then the survey template update confirmation is shown
    And the updated survey template name appears in the list

  # ── TEN_STM_DELETE_FLOW ─────────────────────────────────────────────────────

  @TEN_STM_DEL_E2E_001 @priority:P1 @regression @flow:TEN_STM_DELETE_FLOW @type:positive
  Scenario: Deleting an E2E-owned survey template removes it from the list
    Given the user is on the survey template manager page
    And an E2E-owned survey template with one required text question has been created
    When the user deletes the created survey template
    Then the survey template deletion confirmation is shown
    And the deleted survey template no longer appears in the list

  # ── TEN_STM_VIEW_REPORT_FLOW ────────────────────────────────────────────────

  @TEN_STM_RPT_E2E_001 @priority:P0 @smoke @flow:TEN_STM_VIEW_REPORT_FLOW @type:positive
  Scenario: Reviewing reports and exporting responses and logs succeeds
    Given the user is on the survey template manager page
    And a read-only survey template with responses is available
    When the user opens that survey template's reports
    Then the response analysis is visible
    When the user exports the responses and logs
    Then both survey export files are downloaded successfully
