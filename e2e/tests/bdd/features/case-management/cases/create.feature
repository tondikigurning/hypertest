# Feature: Case Management — Cases: creation
# Owner PRD: docs/prd/case-management/cases.md
# Production restriction: creating a case with the configured customer reference is
# forbidden in production until a production-safe treatment is implemented and reviewed.
# In non-production use E2E_CASE_CUSTOMER_ID as the customer reference and create an
# E2E-owned case with a checked, unique E2E subject. Selecting the customer does not
# authorize editing that customer. Notification delivery and cleanup are not verified.
# Observed create-form markers remain provisional: Severity showed a required marker,
# while Description did not; actual validation and product intent are unresolved.

Feature: Create a case

  @TEN_CAS_CRT_E2E_001 @smoke @production-restricted @flow:TEN_CAS_CREATE_FLOW @type:positive
  Scenario: Create a case for the configured customer
    Given the Cases list is open in an authorized non-production environment
    And the configured case customer is available
    When the user creates a case for that customer with a unique E2E subject and valid required details
    Then the newly created case workspace identifies the new case
    And the new case shows the E2E subject

  @TEN_CAS_CRT_E2E_002 @regression @flow:TEN_CAS_CREATE_FLOW @type:negative
  Scenario: An empty case form cannot be submitted
    Given the Cases list is open
    When the user opens the Create New Case form
    Then Create Case is disabled while the required details are missing
    When the user cancels the Create New Case form
    Then the Cases list is shown

  @TEN_CAS_CRT_E2E_003 @regression @flow:TEN_CAS_CREATE_FLOW @type:ui-interaction
  Scenario: Cancel a populated case form without creating a case
    Given the Cases list is open
    When the user enters a unique E2E subject and cancels the Create New Case form
    Then the case form closes
    And searching for that subject returns no case

  @TEN_CAS_DUP_E2E_001 @regression @production-restricted @flow:TEN_CAS_DUPLICATE_FLOW @type:positive
  Scenario: View the existing case from the duplicate warning
    Given an active case already exists for the configured customer and selected CTS
    When the user submits a new case with the same customer and CTS
    Then the duplicate warning identifies the existing case
    When the user chooses View Existing Case
    Then the existing case opens
    And the new case subject is not created

  @TEN_CAS_DUP_E2E_002 @regression @production-restricted @flow:TEN_CAS_DUPLICATE_FLOW @type:ui-interaction
  Scenario: Return to the populated form from the duplicate warning
    Given an active case already exists for the configured customer and selected CTS
    When the user submits a new case with the same customer and CTS
    And the duplicate warning appears
    And the user chooses Go Back & Edit
    Then the populated form retains the new case subject
    And the new case subject is not created

  @TEN_CAS_CRT_E2E_004 @regression @flow:TEN_CAS_CREATE_FLOW @type:positive
  Scenario: The create form starts with the observed entity and case template
    Given the Cases list is open
    When the user opens the Create New Case form
    Then Entity is preselected as Converge
    And Case Template is preselected as Trouble Case
    When the user cancels the Create New Case form
    Then the Cases list is shown

  @TEN_CAS_CRT_E2E_005 @regression @flow:TEN_CAS_CREATE_FLOW @type:ui-interaction
  Scenario: The observed create form marks Severity as required
    Given the Cases list is open
    When the user opens the Create New Case form
    Then Case Severity has a visible required marker
    And Description has no visible required marker
    When the user cancels the Create New Case form
    Then the Cases list is shown

  @TEN_CAS_CRT_E2E_006 @regression @flow:TEN_CAS_CREATE_FLOW @type:positive
  Scenario: Selecting a case classification populates its observed form values
    Given the Cases list is open
    When the user opens the Create New Case form
    And the user selects Request, Billing & Payments, Billing Documents and Statement of Account
    Then Priority is populated as Medium
    And Severity is populated as Complex
    When the user cancels the Create New Case form
    Then the Cases list is shown

