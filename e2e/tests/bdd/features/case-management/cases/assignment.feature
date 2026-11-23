# Feature: Case Management — Cases: workflow
# Owner PRD: docs/prd/case-management/cases.md
# Viewing a case and its workflow is read-only.
# Assignment changes use only an identified E2E-owned case linked to the configured customer.
# Production customer-data mutations are forbidden until a safe treatment is reviewed.

Feature: View a case workflow

  @TEN_CAS_VWF_E2E_001 @regression @flow:TEN_CAS_VIEW_WORKFLOW_FLOW @type:positive
  Scenario: View the workflow of an accessible case
    Given an accessible case offers View Workflow
    When the user opens View Workflow
    Then the workflow dialog shows the case's numbered workflow steps

  @TEN_CAS_ASN_E2E_001 @smoke @production-restricted @flow:TEN_CAS_ASSIGN_FLOW @type:positive
  Scenario: Assign an unassigned E2E In Progress case to the current agent
    Given an identified E2E-owned In Progress case is unassigned
    When the current agent chooses Assign to Me and confirms
    Then the case shows the current agent as its assigned agent

  @TEN_CAS_UNA_E2E_001 @smoke @production-restricted @flow:TEN_CAS_UNASSIGN_FLOW @type:positive
  Scenario: Unassign an E2E case and clear its assigned agent
    Given an identified E2E-owned In Progress case is assigned to the current agent
    When the user confirms Unassign Case
    Then the case has no assigned agent
    And the observed case status remains In Progress

  @TEN_CAS_CCH_E2E_001 @regression @flow:TEN_CAS_CREATE_CHILD_FLOW @type:ui-interaction
  Scenario: Cancel the child case form without changing its parent
    Given an accessible parent case offers Create Child Case
    When the user opens and cancels the child case form
    Then the parent case remains open

  @TEN_CAS_CCH_E2E_002 @regression @flow:TEN_CAS_CREATE_CHILD_FLOW @type:ui-interaction
  Scenario: The child case form is prefilled for its parent
    Given an accessible parent case offers Create Child Case
    When the user opens the child case form
    Then the form is prefilled for the parent case
    When the user cancels the child case form
    Then no child case is created

