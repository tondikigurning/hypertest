# Feature: Case Management — Cases: lifecycle
# Owner PRD: docs/prd/case-management/cases.md
# Production restriction: this state change uses a case created with the configured
# customer reference and is forbidden in production until a safe treatment is reviewed.
# The target is an identified E2E-owned case; never mutate an arbitrary case.

Feature: Start an assigned case

  @TEN_CAS_STT_E2E_001 @smoke @production-restricted @flow:TEN_CAS_START_TICKET_FLOW @type:positive
  Scenario: Start an assigned E2E case
    Given an identified E2E-owned case is Assigned and offers Start Case
    When the user confirms Start Case for that case
    Then that case shows status In Progress

  @TEN_CAS_PND_E2E_001 @regression @flow:TEN_CAS_PENDING_REPLY_FLOW @type:ui-interaction
  Scenario: Cancel the confirmation to request a customer reply
    Given an identified E2E-owned In Progress case is open
    When the user opens Pending to Customer Reply and cancels the confirmation
    Then the case remains In Progress

  @TEN_CAS_RSL_E2E_001 @regression @flow:TEN_CAS_RESOLVE_FLOW @type:ui-interaction
  Scenario: Cancel resolving a case before submitting it
    Given an identified E2E-owned In Progress case is open
    When the user opens Resolve Case and cancels the resolution form
    Then the case remains In Progress

  @TEN_CAS_CLS_E2E_001 @regression @flow:TEN_CAS_CLOSE_FLOW @type:ui-interaction
  Scenario: Cancel closing a solved case
    Given an accessible case is Solved and offers Close Case
    When the user opens Close Case
    Then the confirmation warns that closing the case cannot be undone
    When the user cancels the close confirmation
    Then that case still shows Solved

  @TEN_CAS_SLA_E2E_001 @regression @flow:TEN_CAS_SLA_ESCALATION_FLOW @type:positive
  Scenario: View SLA usage for an active case
    Given an accessible active case has recorded SLA usage and team details
    When the user opens SLA Usage History
    Then the drawer shows the total SLA, percentage used, used time and remaining time
    And the drawer shows the team usage details

  @TEN_CAS_SLA_E2E_002 @regression @flow:TEN_CAS_SLA_ESCALATION_FLOW @type:positive
  Scenario: View recorded SLA usage on a closed case
    Given an accessible closed case has recorded SLA usage
    When the user opens SLA Usage History
    Then the drawer shows the total SLA, percentage used, used time and remaining time
    And the drawer shows the team usage details

  @TEN_CAS_SLA_E2E_003 @regression @flow:TEN_CAS_SLA_ESCALATION_FLOW @type:positive
  Scenario: Find an escalated case in the Escalated pipeline
    Given an accessible case displays the Escalated case flag
    When the user opens the Escalated pipeline and searches for that case number
    Then the identified case appears in the pipeline

  @TEN_CAS_SLA_E2E_004 @regression @flow:TEN_CAS_SLA_ESCALATION_FLOW @type:positive
  Scenario: View SLA usage across teams for an escalated case
    Given an accessible escalated case has SLA usage recorded for multiple teams
    When the user opens SLA Usage History
    Then the drawer shows the total SLA, used time and remaining time
    And the drawer shows a separate usage entry for each recorded team

  @TEN_CAS_SLA_E2E_005 @regression @flow:TEN_CAS_SLA_ESCALATION_FLOW @type:edge-case
  Scenario: View overdue usage for an escalated case with a breached SLA
    Given an accessible Escalated case is returned by the Breached SLA Status filter
    When the user opens SLA Usage History
    Then the drawer shows more than 100 percent of the SLA used
    And the drawer shows an overdue duration

  @TEN_CAS_CAN_E2E_001 @regression @flow:TEN_CAS_CANCEL_FLOW @type:negative
  Scenario: Cancel Case is unavailable for a Correspondent Agent case
    Given an accessible Correspondent Agent case is open
    When the user opens More Actions
    Then Cancel Case is disabled

