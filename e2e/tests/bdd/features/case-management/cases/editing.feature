# Feature: Case Management — Cases: editing
# Owner PRD: docs/prd/case-management/cases.md
# Production restriction: editing a case created with the configured customer reference
# is forbidden in production until a safe treatment is implemented and reviewed.
# The target is an identified E2E-owned case; never mutate an arbitrary case.

Feature: Edit a case

  @TEN_CAS_EDT_E2E_001 @smoke @production-restricted @flow:TEN_CAS_EDIT_CASE_FLOW @type:positive
  Scenario: Save an updated subject on an E2E case
    Given an identified E2E-owned case offers Edit Case
    When the user changes its E2E subject and saves the case
    Then that case shows the updated subject
    And the updated subject remains visible after reloading the case

  @TEN_CAS_EDT_E2E_002 @regression @flow:TEN_CAS_EDIT_CASE_FLOW @type:ui-interaction
  Scenario: Cancel an unsaved subject edit
    Given an identified E2E-owned case offers Edit Case
    When the user changes its subject and cancels the edit
    Then the case keeps its previously saved subject

  @TEN_CAS_ECT_E2E_001 @regression @flow:TEN_CAS_EDIT_CTS_FLOW @type:ui-interaction
  Scenario: Cancel a case classification edit
    Given an accessible case offers Edit CTS
    When the user opens and cancels the classification editor
    Then the case keeps its previously saved category, type and sub-type

  @TEN_CAS_CCT_E2E_001 @regression @flow:TEN_CAS_CHANGE_CUSTOMER_FLOW @type:ui-interaction
  Scenario: Cancel changing a case's linked customer
    Given an accessible case shows Customer Details
    When the user opens and cancels Change Customer
    Then the case remains linked to its previously selected customer

