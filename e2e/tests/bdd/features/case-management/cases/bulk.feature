# Case Management / Cases — grouped from the original cases.feature.
# IDs, flow tags and scenario contracts are retained.
# Read the owning submodule's files together for coverage and shared discovery notes.

Feature: Case Management — Cases

  # ── TEN_CAS_BULK_FLOW ──────────────────────────────────────────────────
  # Bulk Dispatch Cases — route /case-management/cases/bulk (wizard, NOT the
  # case-list kebab). Entry via the "Bulk" button in the cases page header
  # (PermissionGuard CASE_MANAGEMENT_BULK_ACTION, navigates to /bulk). Wizard
  # "Bulk Action" has 3 steps:
  #   1. "Action" — title "Choose Action to Apply", description "Select the
  #      target status transition...", cards "Resolve" (circle-dashed-check) +
  #      "Close" (circle-x). Next disabled until an action is selected.
  #   2. "Upload File List" — title "Upload File List", description "Provide
  #      valid case IDs bulk files.", section "Structured Import Template" +
  #      "Download Template" (downloads Case Resolve/Close Bulk CSV template),
  #      FileUpload (accept .csv, max 1 file), Alert on error. Footer
  #      "Apply Bulk Operation" disabled until a file is selected; on Next
  #      calls POST /casemgmt/tenant/import/cases/resolve|close with the file.
  #   3. "Completed" — title "Bulk Update Queued for Processing", summary
  #      email notice + buttons "More Bulk Action" / "Return to Cases".
  # Side summary panel (CaseBulkActionSummary) shows "Summary", "Actions" →
  # selected bulk action label, "Upload File List" → file name or placeholder
  # "No targets specified yet" / "No file uploaded yet".
  # Header Cancel navigates back to /case-management/cases.
  #
  # Verified against source (cases-bulk.page.tsx, all-cases-table.tsx,
  # cases-bulk-wizard.tsx, cases-bulk-step-action.tsx,
  # cases-bulk-step-upload-file.tsx, cases-bulk-complete-step.tsx,
  # case-bulk.ts, cases-bulk-csv-template.ts).
  #
  # Endpoints (for @mock variation):
  #   • POST /casemgmt/tenant/import/cases/resolve
  #   • POST /casemgmt/tenant/import/cases/close

  @TEN_CAS_BLK_E2E_001 @priority:P2 @regression @flow:TEN_CAS_BULK_FLOW @type:positive
  Scenario: Bulk cases page loads with the bulk action wizard visible
    Given the user is on the bulk cases page
    Then the bulk cases page is visible
    And the bulk action wizard is visible
    And the bulk wizard shows the steps "Action" and "Upload File List" and "Completed"
    And the bulk summary shows "No targets specified yet" and "No file uploaded yet"

  @TEN_CAS_BLK_E2E_002 @priority:P2 @regression @flow:TEN_CAS_BULK_FLOW @type:ui-interaction
  Scenario: Bulk action step shows the available bulk actions
    Given the user is on the bulk cases page
    Then the bulk action step shows the title "Choose Action to Apply"
    And the bulk action step shows the action "Resolve"
    And the bulk action step shows the action "Close"

  @TEN_CAS_BLK_E2E_003 @priority:P2 @regression @flow:TEN_CAS_BULK_FLOW @type:ui-interaction
  Scenario: Selecting a bulk action enables navigation to the upload step
    Given the user is on the bulk cases page
    Then the bulk wizard next button is disabled
    When the user selects the "Resolve" bulk action
    Then the bulk wizard next button is enabled
    When the user proceeds to the next bulk wizard step
    Then the bulk upload step is visible
    And the bulk summary shows the selected action "Resolved"
    When the user goes back to the previous bulk wizard step
    Then the bulk action step is visible

  @TEN_CAS_BLK_E2E_004 @priority:P2 @regression @flow:TEN_CAS_BULK_FLOW @type:ui-interaction
  Scenario: Bulk upload step shows the template download and file upload controls
    Given the user is on the bulk cases page
    When the user selects the "Resolve" bulk action
    When the user proceeds to the next bulk wizard step
    Then the bulk upload step is visible
    And the bulk upload step shows the "Download Template" action
    And the bulk upload step shows the file upload control
    And the bulk apply button is disabled
    When the user goes back to the previous bulk wizard step
    Then the bulk action step is visible
    When the user proceeds to the next bulk wizard step
    Then the bulk upload step is visible

  @TEN_CAS_BLK_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_BULK_FLOW @type:negative
  Scenario: Bulk operation shows an error alert when the bulk API returns 500
    Given the user is on the bulk cases page
    And the bulk resolve API is configured to return a 500 server error
    When the user selects the "Resolve" bulk action
    When the user proceeds to the next bulk wizard step
    When the user uploads a valid bulk CSV file
    When the user applies the bulk operation
    Then the bulk error alert is visible

  @TEN_CAS_BLK_E2E_006 @priority:P2 @regression @mock @flow:TEN_CAS_BULK_FLOW @type:positive
  Scenario: Bulk operation succeeds and shows the completed step
    Given the user is on the bulk cases page
    And the bulk resolve API is configured to return a success response
    When the user selects the "Resolve" bulk action
    When the user proceeds to the next bulk wizard step
    When the user uploads a valid bulk CSV file
    When the user applies the bulk operation
    Then the bulk completed step is visible
    And the bulk completed step shows the title "Bulk Update Queued for Processing"
