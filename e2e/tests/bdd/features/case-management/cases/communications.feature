# Feature: Case Management — Cases: feeds
# Owner PRD: docs/prd/case-management/cases.md
# Feed assertions cover recorded UI entries only; they do not establish delivery to customers.
# Email draft scenarios never submit or send a customer message.

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

  @TEN_CAS_EML_E2E_001 @regression @flow:TEN_CAS_SEND_EMAIL_FLOW @type:ui-interaction
  Scenario: Discard an unsent customer email draft
    Given an accessible case offers the Email composer
    When the user enters a unique E2E subject and a draft email body
    And the user discards the draft without sending it
    Then the email subject and body are cleared
    And Preview & Send is disabled
    And the draft subject is not shown in the visible email feed

  @TEN_CAS_EML_E2E_002 @regression @flow:TEN_CAS_SEND_EMAIL_FLOW @type:negative
  Scenario: An email draft with a subject but no body cannot be sent
    Given an accessible case offers a cleared Email composer
    When the user enters an email subject and leaves the body empty
    Then Preview & Send is disabled
    When the user discards the draft without sending it
    Then the email subject and body are cleared

  @TEN_CAS_EML_E2E_003 @regression @flow:TEN_CAS_SEND_EMAIL_FLOW @type:negative
  Scenario: An email draft with a body but no subject cannot be sent
    Given an accessible case offers a cleared Email composer
    When the user enters an email subject and body
    Then Preview & Send is enabled
    When the user clears the subject while retaining the body
    Then Preview & Send is disabled
    When the user discards the draft without sending it
    Then the email subject and body are cleared

  @TEN_CAS_EML_E2E_004 @regression @flow:TEN_CAS_SEND_EMAIL_FLOW @type:negative
  Scenario: Email is unavailable on an unassigned Open case for the current user
    Given an accessible Open case has no assigned agent
    When the user opens the Email composer
    Then the subject, body and Preview & Send controls are disabled
    And the composer shows "*Sending emails is not allowed for the current case status."

  @TEN_CAS_EML_E2E_005 @regression @flow:TEN_CAS_SEND_EMAIL_FLOW @type:negative
  Scenario: Email is unavailable to the current user on an unassigned In Progress case
    Given an accessible In Progress case has no assigned agent
    When the user opens the Email composer
    Then the subject, body and Preview & Send controls are disabled
    And the composer shows "*You do not have permission to send emails. Only the assigned agent can send emails."
