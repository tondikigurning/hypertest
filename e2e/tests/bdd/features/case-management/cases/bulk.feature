# Feature: Case Management — Cases: bulk status actions
# Owner PRD: docs/prd/case-management/cases.md
# These scenarios stop before file submission and do not establish bulk status changes.

Feature: Prepare bulk case status actions

  @TEN_CAS_BUL_E2E_001 @regression @flow:TEN_CAS_BULK_STATUS_FLOW @type:negative
  Scenario: A bulk action must be selected before continuing
    Given the user opens Bulk from the Cases list
    When no bulk action is selected
    Then Next is disabled
    When the user cancels the bulk workflow
    Then the Cases list is displayed

  @TEN_CAS_BUL_E2E_002 @regression @flow:TEN_CAS_BULK_STATUS_FLOW @type:negative
  Scenario: A bulk resolution cannot be applied without a case file
    Given the user opens Bulk from the Cases list
    When the user selects Resolve and continues to Upload File List
    Then Apply Bulk Operation is disabled while no file is selected
    When the user cancels the bulk workflow
    Then the Cases list is displayed

  @TEN_CAS_BUL_E2E_003 @regression @flow:TEN_CAS_BULK_STATUS_FLOW @type:ui-interaction
  Scenario: Return to the selected bulk close action without applying it
    Given the user opens Bulk from the Cases list
    When the user selects Close and continues to Upload File List
    Then Apply Bulk Operation is disabled while no file is selected
    When the user returns to the bulk action selection
    Then the summary still shows Closed as the selected action
    When the user cancels the bulk workflow
    Then the Cases list is displayed

  @TEN_CAS_BUL_E2E_004 @regression @flow:TEN_CAS_BULK_STATUS_FLOW @type:positive
  Scenario: Download the bulk resolution import template
    Given the user opens Bulk from the Cases list
    And the user selects Resolve and continues to Upload File List
    When the user downloads the template
    Then the downloaded CSV has the columns "Case Number" and "Remarks"
    When the user cancels the bulk workflow
    Then the Cases list is displayed

  @TEN_CAS_BUL_E2E_005 @regression @flow:TEN_CAS_BULK_STATUS_FLOW @type:edge-case
  Scenario: Remove a selected header-only bulk file before applying
    Given the user opens Bulk from the Cases list
    And the user selects Resolve and continues to Upload File List
    When the user selects a synthetic CSV containing only the template headers
    Then the selected file appears in the summary
    And Apply Bulk Operation is enabled
    When the user removes the selected file
    Then the summary shows that no file is uploaded
    And Apply Bulk Operation is disabled
    When the user cancels the bulk workflow
    Then the Cases list is displayed

  @TEN_CAS_BUL_E2E_006 @regression @flow:TEN_CAS_BULK_STATUS_FLOW @type:positive
  Scenario: Download the bulk close import template
    Given the user opens Bulk from the Cases list
    And the user selects Close and continues to Upload File List
    When the user downloads the template
    Then the downloaded CSV has the columns "Case Number" and "Remarks"
    When the user cancels the bulk workflow
    Then the Cases list is displayed

  @TEN_CAS_BUL_E2E_007 @regression @flow:TEN_CAS_BULK_STATUS_FLOW @type:negative
  Scenario: Reject an unsupported bulk file type before applying
    Given the user opens Bulk from the Cases list
    And the user selects Close and continues to Upload File List
    When the user selects a synthetic text file with no case numbers
    Then the upload shows "File has an unsupported file type"
    And Apply Bulk Operation is disabled
    When the user cancels the bulk workflow
    Then the Cases list is displayed

  @TEN_CAS_BUL_E2E_008 @regression @flow:TEN_CAS_BULK_STATUS_FLOW @type:edge-case
  Scenario: Replace an unsupported bulk file with a CSV
    Given the user has selected an unsupported synthetic text file in Bulk Close
    When the user replaces it with a synthetic CSV containing only the template headers
    Then the unsupported file type message is removed
    And the CSV appears in the summary
    And Apply Bulk Operation is enabled
    When the user cancels the bulk workflow without applying it
    Then the Cases list is displayed

  @TEN_CAS_BUL_E2E_009 @regression @flow:TEN_CAS_BULK_STATUS_FLOW @type:ui-interaction
  Scenario: Change the bulk action after selecting a file
    Given the user has selected a synthetic header-only CSV for Bulk Close
    When the user goes back and changes the bulk action to Resolve
    Then the summary shows Resolved as the selected action
    And the same selected file remains in the summary
    When the user cancels the bulk workflow without applying it
    Then the Cases list is displayed
