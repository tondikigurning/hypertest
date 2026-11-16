# Case Management / Cases — grouped from the original cases.feature.
# IDs, flow tags and scenario contracts are retained.
# Read the owning submodule's files together for coverage and shared discovery notes.

Feature: Case Management — Cases

  # ── TEN_CAS_CREATE_FLOW ───────────────────────────────────────────────

  @TEN_CAS_CRT_E2E_001 @priority:P0 @smoke @flow:TEN_CAS_CREATE_FLOW @type:positive
  Scenario Outline: Create New Case dialog shows each field
    Given the user is on the case list page
    When the user opens the Create New Case dialog
    Then the create case dialog is visible
    And the create case dialog shows the field "<field>"

    Examples:
      | field          |
      | Customer Details |
      | Main Entity    |
      | Case Template  |
      | Case Category  |
      | Case Type      |
      | Case Sub-type  |
      | Case Priority  |
      | Case Severity  |
      | Case Subject   |
      | Case Description |

  @TEN_CAS_CRT_E2E_002 @priority:P0 @smoke @flow:TEN_CAS_CREATE_FLOW @type:ui-interaction
  Scenario: Cancelling the Create New Case dialog closes it
    Given the user is on the case list page
    When the user opens the Create New Case dialog
    When the user cancels the create case dialog
    Then the create case dialog is not visible

  @TEN_CAS_CRT_E2E_003 @priority:P1 @regression @flow:TEN_CAS_CREATE_FLOW @type:ui-interaction
  Scenario Outline: Create Case button is disabled until Entity and Case Template are selected
    Given the user is on the case list page
    When the user opens the Create New Case dialog
    Then the create case button is disabled
    When the user selects the "<entity>" case entity
    Then the create case button is disabled
    When the user selects the "<template>" case template
    Then the create case button is enabled

    Examples:
      | entity   | template     |
      | Converge | Trouble Case |

  @TEN_CAS_CRT_E2E_004 @priority:P1 @regression @flow:TEN_CAS_CREATE_FLOW @type:positive
  Scenario Outline: Duplicate case detection shows the duplicate dialog with go back and view actions
    Given the user is on the case list page
    When the user opens the Create New Case dialog
    And the user selects the "<entity>" case entity
    And the user selects the "<template>" case template
    And the user fills the required case fields with the first available values
    When the user creates the case
    Then the duplicate case dialog is visible
    And the duplicate case dialog shows the "Duplicate Case Detected" alert
    And the duplicate case dialog shows the actions "Go Back & Edit" and "View Existing Case"

    Examples:
      | entity   | template     |
      | Converge | Trouble Case |

  @TEN_CAS_CRT_E2E_005 @priority:P0 @regression @flow:TEN_CAS_CREATE_FLOW @type:positive
  Scenario Outline: Creating a case with a clean customer account shows a success toast and opens the new case tab
    Given the user is on the case list page
    When the user opens the Create New Case dialog
    And the user selects the "<entity>" case entity
    And the user selects the "<template>" case template
    And the user fills the required case fields with a clean customer account
    When the user creates the case
    Then the case creation success toast is shown
    And the new case tab opens for the created case

    Examples:
      | entity   | template     |
      | Converge | Trouble Case |
