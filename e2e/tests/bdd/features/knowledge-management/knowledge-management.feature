# Feature: Knowledge Management — Articles
#
# Route: /knowledge-management | ID prefix: TEN_KNM_<FLG>_E2E_NNN (NNN resets per flow section)
# Code: KNM = knowledge-management module
# Flow sections:
#   LIST (LST)        — list page, pipeline tabs, search, filter, sort, 401/500/loading
#   VIEW_DETAIL (VDT) — detail panel open + tabs (Details, Article, Revision) + 500/loading
#   CREATE (CRT)      — create article wizard (Details → Content → Summary → Completed)
#   EDIT (EDT)        — edit article (kebab "Edit")
#   DELETE (DLT)      — delete article (kebab "Delete")
#   SUBMIT_APPROVAL (SBA) — submit for approval (kebab "Submit Approval")
#   APPROVAL (APR)    — approval dialog (Approve / Request Revision) — Pending Approval rows
#   PUBLISH (PUB)     — publish (kebab "Publish") — Published rows
#
# Tags: @smoke @regression @flow:<id> @type:<t> @ref:TEN_COM_* (component masters in _components/)
#
# Component @ref map:
#   TEN_KNM_LIST_FLOW:        TEN_COM_PIP_E2E_001, TEN_COM_FSR_E2E_001, TEN_COM_FIL_E2E_001,
#                             TEN_COM_SAP_E2E_001
#   TEN_KNM_VIEW_DETAIL_FLOW: TEN_COM_VDT_E2E_001, TEN_COM_VDT_E2E_002, TEN_COM_VDT_E2E_003
#
# Reusable components reuse GENERIC step text from _shared/ step definitions; module-specific
# steps (create, edit, delete, approval, publish) are defined in
# steps/knowledge-management/knowledge-management.steps.ts.
#
# The Knowledge Management module renders NO data-testid attributes — all locators are
# role/text-based (pipeline tablist, DataView table, DetailPanel tabs, kebab menu).

Feature: Knowledge Management — Articles

  # ── TEN_KNM_LIST_FLOW ──────────────────────────────────────────────────

  @TEN_KNM_LST_E2E_001 @priority:P0 @smoke @flow:TEN_KNM_LIST_FLOW @type:positive
  Scenario: Knowledge Management list page loads with the data table visible
    Given the user is on the knowledge management list page
    Then the knowledge management data table is visible

  @TEN_KNM_LST_E2E_002 @priority:P1 @smoke @ref:TEN_COM_PIP_E2E_001 @flow:TEN_KNM_LIST_FLOW @type:ui-interaction
  Scenario Outline: Selecting a pipeline tab activates it
    Given a list page with pipeline tabs is open
    When the user selects the "<tab>" pipeline tab
    Then the "<tab>" pipeline tab is active

    Examples:
      | tab              |
      | All              |
      | Draft            |
      | Pending Approval |
      | Need Revision    |
      | Archived         |
      | Published        |
      | Active           |

  @TEN_KNM_LST_E2E_003 @priority:P1 @smoke @ref:TEN_COM_FSR_E2E_001 @flow:TEN_KNM_LIST_FLOW @type:positive
  Scenario Outline: Search input filters rows by the first visible row "<field>"
    Given a list page with search is open
    When the user searches for the first visible row "<field>"
    Then the search returns matching rows

    Examples:
      | field    |
      | title    |

  @TEN_KNM_LST_E2E_004 @priority:P1 @regression @ref:TEN_COM_FIL_E2E_001 @flow:TEN_KNM_LIST_FLOW @type:ui-interaction
  Scenario Outline: Each filter option triggers API and returns matching rows
    Given a list page with filters is open
    When the user applies the "<filter_option>" filter option
    Then the filter triggers an API call that returns HTTP 200
    And the filter response includes rows that match the selected value

    Examples:
      | filter_option  |
      | Title          |
      | Category       |
      | Status         |
      | Created By     |
      | Version Number |

  @TEN_KNM_LST_E2E_005 @priority:P1 @regression @ref:TEN_COM_SAP_E2E_001 @flow:TEN_KNM_LIST_FLOW @type:ui-interaction
  Scenario: All sort options work in both directions
    Given a list page with sort is open
    When the user applies each sort option in ascending and descending direction
    Then each sort triggers an API call that returns HTTP 200
    And each sort response includes rows in the correct order

  @TEN_KNM_LST_E2E_006 @priority:P1 @regression @mock @ref:TEN_COM_FSR_E2E_002 @flow:TEN_KNM_LIST_FLOW @type:negative
  Scenario: Search shows error state when the API returns 500 server error
    Given a list page with search is open
    And the search API is configured to return a 500 server error
    When the user searches for "test"
    Then the application shows an error state

  @TEN_KNM_LST_E2E_007 @priority:P1 @regression @mock @ref:TEN_COM_FSR_E2E_003 @flow:TEN_KNM_LIST_FLOW @type:edge-case
  Scenario: Search shows loading state while waiting for a slow API response
    Given a list page with search is open
    And the search API response is delayed by 4 seconds
    When the user searches for "test"
    Then a loading indicator or spinner is visible before the results load

  @TEN_KNM_LST_E2E_008 @priority:P1 @regression @mock @ref:TEN_COM_FIL_E2E_002 @flow:TEN_KNM_LIST_FLOW @type:negative
  Scenario: Filter request shows error state when API returns 500 server error
    Given a list page with filters is open
    And the filter API is configured to return a 500 server error
    When the user applies the first available filter option
    Then the application shows an error state

  @TEN_KNM_LST_E2E_009 @priority:P1 @regression @mock @ref:TEN_COM_FIL_E2E_003 @flow:TEN_KNM_LIST_FLOW @type:edge-case
  Scenario: Filter shows loading state while waiting for a slow API response
    Given a list page with filters is open
    And the filter API response is delayed by 4 seconds
    When the user applies the first available filter option
    Then a loading indicator or spinner is visible before the results load

  @TEN_KNM_LST_E2E_010 @priority:P1 @regression @mock @ref:TEN_COM_SAP_E2E_002 @flow:TEN_KNM_LIST_FLOW @type:negative
  Scenario: Sort request shows error state when API returns 500 server error
    Given a list page with sort is open
    And the sort API is configured to return a 500 server error
    When the user applies the first available sort option
    Then the application shows an error state

  @TEN_KNM_LST_E2E_011 @priority:P1 @regression @mock @ref:TEN_COM_SAP_E2E_003 @flow:TEN_KNM_LIST_FLOW @type:edge-case
  Scenario: Sort shows loading state while waiting for a slow API response
    Given a list page with sort is open
    And the sort API response is delayed by 4 seconds
    When the user applies the first available sort option
    Then a loading indicator or spinner is visible before the results load

  @TEN_KNM_LST_E2E_012 @priority:P1 @regression @mock @ref:TEN_COM_PIP_E2E_002 @flow:TEN_KNM_LIST_FLOW @type:negative
  Scenario: Pipeline tab request shows error state when API returns 500 server error
    Given a list page with pipeline tabs is open
    And the pipeline tab API is configured to return a 500 server error
    When the user selects the "Draft" pipeline tab
    Then the application shows an error state

  @TEN_KNM_LST_E2E_013 @priority:P0 @regression @mock @flow:TEN_KNM_LIST_FLOW @type:negative
  Scenario: App handles token expiration gracefully when the articles API returns 401
    Given the knowledge management list API is configured to return a 401 authentication error
    When the user navigates to the knowledge management list page
    Then the user is redirected to the login page or shown an auth error

  # ── TEN_KNM_VIEW_DETAIL_FLOW ──────────────────────────────────────────

  @TEN_KNM_VDT_E2E_001 @priority:P0 @smoke @ref:TEN_COM_VDT_E2E_001 @flow:TEN_KNM_VIEW_DETAIL_FLOW @type:positive
  Scenario: Clicking a list row opens the detail panel
    Given a list page with detail panel layout is open
    When the user clicks the first list row
    Then the detail panel is visible
    And the detail panel header shows a title

  @TEN_KNM_VDT_E2E_002 @priority:P1 @regression @ref:TEN_COM_VDT_E2E_002 @flow:TEN_KNM_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario Outline: Each detail panel tab displays its content section
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user clicks the "<tab>" detail panel tab
    Then the "<tab>" tab content is visible

    Examples:
      | tab      |
      | Details  |
      | Article  |
      | Revision |

  @TEN_KNM_VDT_E2E_003 @priority:P1 @regression @ref:TEN_COM_VDT_E2E_003 @flow:TEN_KNM_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario: Closing the detail panel hides it
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user closes the detail panel
    Then the detail panel is not visible

  @TEN_KNM_VDT_E2E_004 @priority:P1 @regression @mock @ref:TEN_COM_VDT_E2E_004 @flow:TEN_KNM_VIEW_DETAIL_FLOW @type:negative
  Scenario: Detail panel shows error state when the detail API returns 500 server error
    Given a list page with detail panel layout is open
    And the detail panel API is configured to return a 500 server error
    When the user clicks the first list row
    Then the application shows an error state

  @TEN_KNM_VDT_E2E_005 @priority:P1 @regression @mock @ref:TEN_COM_VDT_E2E_005 @flow:TEN_KNM_VIEW_DETAIL_FLOW @type:edge-case
  Scenario: Detail panel shows loading skeleton while waiting for a slow API response
    Given a list page with detail panel layout is open
    And the detail panel API response is delayed by 3 seconds
    When the user clicks the first list row
    Then the loading skeleton is visible before the detail panel content loads

  # ── TEN_KNM_CREATE_FLOW ───────────────────────────────────────────────

  @TEN_KNM_CRT_E2E_001 @priority:P0 @smoke @flow:TEN_KNM_CREATE_FLOW @type:positive
  Scenario: Operator can successfully create a new knowledge article via the wizard
    Given the user is on the knowledge management list page
    When the user clicks the create knowledge article button
    And the user fills the knowledge article details
    And the user advances to the content step
    And the user fills the knowledge article content
    And the user advances to the knowledge article summary step
    And the user submits the knowledge article creation
    Then the knowledge article creation success screen is displayed

  @TEN_KNM_CRT_E2E_002 @priority:P1 @regression @flow:TEN_KNM_CREATE_FLOW @type:ui-interaction
  Scenario: Cancelling the create wizard returns to the knowledge management list
    Given the user is on the knowledge management list page
    When the user clicks the create knowledge article button
    And the user cancels the knowledge article create wizard
    Then the knowledge management list page is displayed

  @TEN_KNM_CRT_E2E_003 @priority:P1 @regression @flow:TEN_KNM_CREATE_FLOW @type:ui-interaction
  Scenario: Navigating back from the create wizard returns to the knowledge management list
    Given the user is on the knowledge management list page
    When the user clicks the create knowledge article button
    And the user navigates back from the create knowledge article wizard
    Then the knowledge management list page is displayed

  @TEN_KNM_CRT_E2E_004 @priority:P1 @regression @mock @flow:TEN_KNM_CREATE_FLOW @type:negative
  Scenario: Knowledge article creation shows error when the API returns a 500 server error
    Given the user is on the knowledge management list page
    And the knowledge article create API is configured to return a 500 server error
    When the user clicks the create knowledge article button
    And the user fills the knowledge article details
    And the user advances to the content step
    And the user fills the knowledge article content
    And the user advances to the knowledge article summary step
    And the user submits the knowledge article creation
    Then the application shows an error state

  # ── TEN_KNM_APPROVAL_FLOW ──────────────────────────────────────────────
  # NOTE: knowledge-management.page.tsx:349-362 swaps the dialog wiring, so:
  #   • kebab "Approval"   (DRAFT)        → opens "Submit For Approval" dialog (Yes → PENDING_APPROVAL)
  #   • kebab "Submit Approval" (PENDING_APPROVAL) → opens "Approval Article" dialog (Save → publish/revision)
  # The full approve-and-publish flow is therefore two steps: submit for approval, then approve/publish.

  @TEN_KNM_APR_E2E_001 @priority:P1 @smoke @flow:TEN_KNM_APPROVAL_FLOW @type:positive
  Scenario: Approver can approve and publish a knowledge article from the approval dialog
    Given the user has created a knowledge article
    When the user opens the first knowledge article row actions menu
    And the user clicks "Approval" from the knowledge article row actions menu
    And the user confirms the knowledge article submission for approval
    When the user selects the "Pending Approval" pipeline tab
    And the user opens the first knowledge article row actions menu
    And the user clicks "Submit Approval" from the knowledge article row actions menu
    And the user approves the knowledge article from the approval dialog
    Then the knowledge management success toast shows "Article Approve successfully"

  @TEN_KNM_APR_E2E_002 @priority:P1 @regression @flow:TEN_KNM_APPROVAL_FLOW @type:positive
  Scenario: Approver can request revision from the approval dialog
    Given the user has created a knowledge article
    When the user opens the first knowledge article row actions menu
    And the user clicks "Approval" from the knowledge article row actions menu
    And the user confirms the knowledge article submission for approval
    When the user selects the "Pending Approval" pipeline tab
    And the user opens the first knowledge article row actions menu
    And the user clicks "Submit Approval" from the knowledge article row actions menu
    And the user requests revision from the approval dialog
    Then the knowledge management success toast shows "Article Revision Requested successfully"

  @TEN_KNM_APR_E2E_003 @priority:P1 @regression @flow:TEN_KNM_APPROVAL_FLOW @type:ui-interaction
  Scenario: Cancelling the approval dialog closes it without acting
    Given the user has created a knowledge article
    When the user opens the first knowledge article row actions menu
    And the user clicks "Approval" from the knowledge article row actions menu
    When the user cancels the approval dialog
    Then the approval dialog is not visible

  @TEN_KNM_APR_E2E_004 @priority:P1 @regression @mock @flow:TEN_KNM_APPROVAL_FLOW @type:negative
  Scenario: Approval (publish) shows error when the API returns a 500 server error
    Given the user has created a knowledge article
    And the publish knowledge article API is configured to return a 500 server error
    When the user opens the first knowledge article row actions menu
    And the user clicks "Approval" from the knowledge article row actions menu
    And the user confirms the knowledge article submission for approval
    When the user selects the "Pending Approval" pipeline tab
    And the user opens the first knowledge article row actions menu
    And the user clicks "Submit Approval" from the knowledge article row actions menu
    And the user approves the knowledge article from the approval dialog
    Then the application shows an error state

  @TEN_KNM_APR_E2E_005 @priority:P1 @regression @mock @flow:TEN_KNM_APPROVAL_FLOW @type:negative
  Scenario: Request revision shows error when the API returns a 500 server error
    Given the user has created a knowledge article
    And the request revision knowledge article API is configured to return a 500 server error
    When the user opens the first knowledge article row actions menu
    And the user clicks "Approval" from the knowledge article row actions menu
    And the user confirms the knowledge article submission for approval
    When the user selects the "Pending Approval" pipeline tab
    And the user opens the first knowledge article row actions menu
    And the user clicks "Submit Approval" from the knowledge article row actions menu
    And the user requests revision from the approval dialog
    Then the application shows an error state

  @TEN_KNM_APR_E2E_006 @priority:P1 @regression @flow:TEN_KNM_APPROVAL_FLOW @type:positive
  Scenario: Requesting revision moves the article to the Need Revision pipeline
    Given the user has created a knowledge article
    When the user opens the first knowledge article row actions menu
    And the user clicks "Approval" from the knowledge article row actions menu
    And the user confirms the knowledge article submission for approval
    When the user selects the "Pending Approval" pipeline tab
    And the user opens the first knowledge article row actions menu
    And the user clicks "Submit Approval" from the knowledge article row actions menu
    And the user requests revision from the approval dialog
    Then the knowledge management success toast shows "Article Revision Requested successfully"
    When the user selects the "Need Revision" pipeline tab
    Then the created knowledge article is visible in the list

  # ── TEN_KNM_EDIT_FLOW ─────────────────────────────────────────────────
  # Edit operates on a freshly created DRAFT article.

  @TEN_KNM_EDT_E2E_001 @priority:P1 @smoke @flow:TEN_KNM_EDIT_FLOW @type:positive
  Scenario: Operator can update a knowledge article via the row kebab
    Given the user has created a knowledge article
    When the user opens the first knowledge article row actions menu
    And the user clicks "Edit" from the knowledge article row actions menu
    And the user updates the knowledge article name and description
    And the user submits the edit knowledge article form
    Then the knowledge management success toast shows "Article updated successfully"

  @TEN_KNM_EDT_E2E_002 @priority:P1 @regression @flow:TEN_KNM_EDIT_FLOW @type:ui-interaction
  Scenario: Cancelling the edit dialog closes it without changes
    Given the user has created a knowledge article
    When the user opens the first knowledge article row actions menu
    And the user clicks "Edit" from the knowledge article row actions menu
    When the user cancels the edit knowledge article dialog
    Then the edit knowledge article dialog is not visible

  @TEN_KNM_EDT_E2E_003 @priority:P1 @regression @mock @flow:TEN_KNM_EDIT_FLOW @type:negative
  Scenario: Edit knowledge article shows error when the API returns a 500 server error
    Given the user has created a knowledge article
    And the update knowledge article API is configured to return a 500 server error
    When the user opens the first knowledge article row actions menu
    And the user clicks "Edit" from the knowledge article row actions menu
    And the user updates the knowledge article name and description
    And the user submits the edit knowledge article form
    Then the application shows an error state

  # ── TEN_KNM_DELETE_FLOW ────────────────────────────────────────────────
  # Delete operates on a freshly created DRAFT article.

  @TEN_KNM_DLT_E2E_001 @priority:P1 @smoke @flow:TEN_KNM_DELETE_FLOW @type:positive
  Scenario: Operator can delete a knowledge article with confirmation
    Given the user has created a knowledge article
    When the user opens the first knowledge article row actions menu
    And the user clicks "Delete" from the knowledge article row actions menu
    And the user confirms the knowledge article deletion
    Then the knowledge management success toast shows "deleted"

  @TEN_KNM_DLT_E2E_002 @priority:P1 @regression @flow:TEN_KNM_DELETE_FLOW @type:ui-interaction
  Scenario: Cancelling the delete action does not remove the knowledge article
    Given the user has created a knowledge article
    When the user opens the first knowledge article row actions menu
    And the user clicks "Delete" from the knowledge article row actions menu
    And the user cancels the knowledge article deletion
    Then the knowledge article delete confirmation dialog is not visible

  @TEN_KNM_DLT_E2E_003 @priority:P1 @regression @mock @flow:TEN_KNM_DELETE_FLOW @type:negative
  Scenario: Delete knowledge article shows error when the API returns a 500 server error
    Given the user has created a knowledge article
    And the delete knowledge article API is configured to return a 500 server error
    When the user opens the first knowledge article row actions menu
    And the user clicks "Delete" from the knowledge article row actions menu
    And the user confirms the knowledge article deletion
    Then the application shows an error state

  # ── TEN_KNM_PUBLISH_FLOW ───────────────────────────────────────────────
  # Publish only appears on PUBLISHED rows — scope to that pipeline tab.

  @TEN_KNM_PUB_E2E_001 @priority:P1 @smoke @flow:TEN_KNM_PUBLISH_FLOW @type:positive
  Scenario: Operator can publish a knowledge article version from the row kebab
    Given the user is on the knowledge management list page
    When the user selects the "Published" pipeline tab
    And the user clicks Publish from an available knowledge article row actions menu
    And the user confirms the knowledge article publish
    Then the knowledge management success toast shows "published successfully"

  @TEN_KNM_PUB_E2E_002 @priority:P1 @regression @mock @flow:TEN_KNM_PUBLISH_FLOW @type:negative
  Scenario: Publish knowledge article shows error when the API returns a 500 server error
    Given the user is on the knowledge management list page
    When the user selects the "Published" pipeline tab
    And the publish knowledge article API is configured to return a 500 server error
    And the user clicks Publish from an available knowledge article row actions menu
    And the user confirms the knowledge article publish
    Then the application shows an error state

  # ── TEN_KNM_SUBMIT_APPROVAL_FLOW ───────────────────────────────────────
  # Per knowledge-management.page.tsx:349-362 (swapped wiring): the kebab labelled "Approval"
  # on a DRAFT row opens the *Submit For Approval* dialog (Yes → PENDING_APPROVAL). That IS the
  # actual "submit for approval" action. The kebab labelled "Submit Approval" opens the
  # *Approval Article* dialog instead, so it is NOT used here.

  @TEN_KNM_SBA_E2E_001 @priority:P1 @smoke @flow:TEN_KNM_SUBMIT_APPROVAL_FLOW @type:positive
  Scenario: Operator can submit a knowledge article for approval
    Given the user has created a knowledge article
    When the user opens the first knowledge article row actions menu
    And the user clicks "Approval" from the knowledge article row actions menu
    And the user confirms the knowledge article submission for approval
    Then the knowledge management success toast shows "submitted for approval successfully"

  @TEN_KNM_SBA_E2E_002 @priority:P1 @regression @flow:TEN_KNM_SUBMIT_APPROVAL_FLOW @type:ui-interaction
  Scenario: Cancelling the submit for approval dialog closes it without submitting
    Given the user has created a knowledge article
    When the user opens the first knowledge article row actions menu
    And the user clicks "Approval" from the knowledge article row actions menu
    When the user cancels the submit for approval dialog
    Then the submit for approval confirmation dialog is not visible

  @TEN_KNM_SBA_E2E_003 @priority:P1 @regression @mock @flow:TEN_KNM_SUBMIT_APPROVAL_FLOW @type:negative
  Scenario: Submit for approval shows error when the API returns a 500 server error
    Given the user has created a knowledge article
    And the submit approval knowledge article API is configured to return a 500 server error
    When the user opens the first knowledge article row actions menu
    And the user clicks "Approval" from the knowledge article row actions menu
    And the user confirms the knowledge article submission for approval
    Then the application shows an error state

  # ── TEN_KNM_LIFECYCLE_FLOW ────────────────────────────────────────────
  # One article driven through every status using a single data set, with
  # delete as the final (closure) step:
  #   list → view detail → CREATE (Draft) → EDIT (Draft) → submit for approval
  #   (Pending Approval) → approve & publish (Published) → edit Published back
  #   to a Draft version → DELETE.
  # A Published article cannot be deleted directly; it must be edited first
  # (which forks a new DRAFT version), then deleted — matching the requirement.

  @TEN_KNM_LFC_E2E_001 @priority:P1 @smoke @flow:TEN_KNM_LIFECYCLE_FLOW @type:positive
  Scenario: Knowledge article full lifecycle from create to delete
    Given the user is on the knowledge management list page
    # View detail (list pipeline + detail panel)
    When the user clicks the first list row
    Then the detail panel is visible
    And the detail panel header shows a title
    When the user closes the detail panel
    # Create (status → Draft)
    When the user clicks the create knowledge article button
    And the user fills the knowledge article details
    And the user advances to the content step
    And the user fills the knowledge article content
    And the user advances to the knowledge article summary step
    And the user submits the knowledge article creation
    Then the knowledge article creation success screen is displayed
    When the user returns to the knowledge management list from the create success screen
    # Edit (status stays Draft)
    When the user opens the first knowledge article row actions menu
    And the user clicks "Edit" from the knowledge article row actions menu
    And the user updates the knowledge article name and description
    And the user submits the edit knowledge article form
    Then the knowledge management success toast shows "Article updated successfully"
    # Submit for approval (status → Pending Approval)
    When the user opens the first knowledge article row actions menu
    And the user clicks "Approval" from the knowledge article row actions menu
    And the user confirms the knowledge article submission for approval
    Then the knowledge management success toast shows "submitted for approval successfully"
    # Approve & publish (status → Published)
    When the user selects the "Pending Approval" pipeline tab
    And the user opens the first knowledge article row actions menu
    And the user clicks "Submit Approval" from the knowledge article row actions menu
    And the user approves the knowledge article from the approval dialog
    Then the knowledge management success toast shows "Article Approve successfully"
    # A Published article cannot be deleted directly: edit it first (forks a new Draft version)
    When the user selects the "Published" pipeline tab
    And the user opens the first knowledge article row actions menu
    And the user clicks "Edit" from the knowledge article row actions menu
    And the user updates the knowledge article name and description
    And the user submits the edit knowledge article form
    Then the knowledge management success toast shows "New article version created successfully"
    # Delete the Draft article (closure)
    When the user selects the "Draft" pipeline tab
    And the user opens the first knowledge article row actions menu
    And the user clicks "Delete" from the knowledge article row actions menu
    And the user confirms the knowledge article deletion
    Then the knowledge management success toast shows "deleted"
