# Feature: Case Management — Cases: feeds
# Owner PRD: docs/prd/case-management/cases.md
# Feed assertions cover recorded UI entries only; they do not establish delivery to customers.

Feature: Case communication feeds

  @TEN_CAS_FED_E2E_001 @regression @flow:TEN_CAS_VIEW_FEEDS_FLOW @type:positive
  Scenario: The external All feed shows recorded email entries for a case
    Given an accessible case has system email entries in its external feed
    When the user opens the case's All feed
    Then the external feed shows the recorded email entries

  @TEN_CAS_FED_E2E_002 @regression @flow:TEN_CAS_VIEW_FEEDS_FLOW @type:edge-case
  Scenario: An empty internal feed shows its empty state
    Given an E2E-owned case has no internal messages
    When the user switches to the Internal feed
    Then the internal feed shows "No messages in the Internal Feed yet."
