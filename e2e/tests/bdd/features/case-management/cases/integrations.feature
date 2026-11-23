# Feature: Case Management — Cases: integration context
# Owner PRD: docs/prd/case-management/cases.md
# This read-only scenario does not endorse a case or establish a WFM integration outcome.

Feature: Inspect case integration context

  @TEN_CAS_WFM_E2E_001 @regression @flow:TEN_CAS_ENDORSE_WFM_FLOW @type:edge-case
  Scenario: Show the empty Work Orders drawer for a case without work orders
    Given an accessible case has no related work orders
    When the user opens Work Orders
    Then the drawer shows "Currently there are no work orders related to this case."

  @TEN_CAS_WFM_E2E_002 @regression @flow:TEN_CAS_ENDORSE_WFM_FLOW @type:positive
  Scenario: View the work order linked to an endorsed case
    Given an accessible case flagged Endorse to WFM has a related work order
    When the user opens Work Orders
    Then the drawer shows the linked work-order reference
    And its details include status, priority, assignment and scheduling information

  @TEN_CAS_WFM_E2E_003 @regression @flow:TEN_CAS_ENDORSE_WFM_FLOW @type:edge-case
  Scenario: Show an unassigned work order without a technician
    Given an accessible case has a related unassigned work order without a technician
    When the user opens Work Orders
    Then that work order shows status Unassigned
    And its assigned technician is shown as "—"
