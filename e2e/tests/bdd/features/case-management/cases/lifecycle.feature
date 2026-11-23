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

  @TEN_CAS_CAN_E2E_001 @regression @flow:TEN_CAS_CANCEL_FLOW @type:negative
  Scenario: Cancel Case is unavailable for a Correspondent Agent case
    Given an accessible Correspondent Agent case is open
    When the user opens More Actions
    Then Cancel Case is disabled

