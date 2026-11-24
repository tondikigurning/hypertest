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

  @TEN_CAS_TRA_E2E_001 @regression @flow:TEN_CAS_TRANSFER_AGENT_FLOW @type:negative
  Scenario: An agent transfer cannot continue without a selection
    Given an accessible In Progress case assigned to the current agent offers Transfer Case
    When the user opens Transfer Case without selecting an agent
    Then Next is disabled in the Reassign Agent dialog
    When the user cancels the transfer
    Then that case still shows In Progress

  @TEN_CAS_TRA_E2E_002 @regression @flow:TEN_CAS_TRANSFER_AGENT_FLOW @type:ui-interaction
  Scenario: Review an agent reassignment and return without confirming it
    Given an accessible In Progress case offers Transfer Case and an available agent
    When the user selects an available agent and continues
    Then Reassign Confirmation identifies the case and the selected agent
    When the user goes back to agent selection
    Then Next is disabled until an agent is selected again
    When the user cancels the transfer without confirming it
    Then that case still shows In Progress

  @TEN_CAS_TRA_E2E_003 @regression @flow:TEN_CAS_TRANSFER_AGENT_FLOW @type:negative
  Scenario: Transfer Case is not offered on an unassigned Open case
    Given an accessible Open case has no assigned agent
    When the user opens More Actions
    Then Assign Case is offered
    And Transfer Case is not offered

  @TEN_CAS_AAS_E2E_001 @smoke @production-restricted @flow:TEN_CAS_AUTO_ASSIGN_FLOW @type:positive
  Scenario: A newly created case appears in the current agent's pipeline
    Given the Cases list is open in an authorized non-production environment
    And the configured case customer is available
    And a supported classification has no active duplicate for that customer
    When the user creates a case for that customer with a unique E2E subject and valid required details
    Then the newly created case workspace identifies the new case
    And the new case shows status Assigned
    When the user opens Assigned to Me
    Then the identified new case appears in that pipeline

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

