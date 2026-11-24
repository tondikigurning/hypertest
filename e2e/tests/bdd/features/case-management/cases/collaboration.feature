# Feature: Case Management — Cases: collaboration and contextual drawers
# Owner PRD: docs/prd/case-management/cases.md
# Dialog checks use read-only records and cancel without saving a relation or watcher.

Feature: Case collaboration and contextual drawers

  @TEN_CAS_ACT_E2E_001 @regression @flow:TEN_CAS_ACTIVITY_FLOW @type:positive
  Scenario: View the activity recorded when opening a case
    Given an accessible case is opened by the signed-in user
    When the user opens Activities
    Then Activities shows an entry for viewing that case
    And the entry shows the user who viewed it and the action time

  @TEN_CAS_ACT_E2E_002 @regression @flow:TEN_CAS_ACTIVITY_FLOW @type:edge-case
  Scenario: Reset an activity search that has no matches
    Given an accessible case has activity entries
    When the user searches Activities for a value that matches no entries
    Then Activities shows "No records match your criteria."
    When the user resets the activity search
    Then the search is cleared and activity entries are shown again

  @TEN_CAS_ACT_E2E_003 @regression @flow:TEN_CAS_ACTIVITY_FLOW @type:positive
  Scenario: View a recorded case status change in Activities
    Given an accessible case has a recorded status change in Activities
    When the user opens Activities
    Then the status-change entry identifies the previous and new status
    And the entry shows the actor and action time

  @TEN_CAS_ACT_E2E_004 @regression @flow:TEN_CAS_ACTIVITY_FLOW @type:ui-interaction
  Scenario: Navigate between pages of case activity
    Given an accessible case has more activity entries than fit on one page
    When the user moves to the next Activities page
    Then a different page of that case's activities is displayed
    When the user returns to the previous Activities page
    Then the original page of that case's activities is displayed

  @TEN_CAS_ACT_E2E_005 @regression @flow:TEN_CAS_ACTIVITY_FLOW @type:positive
  Scenario: Filter case activities to agent views and reset
    Given an accessible case has recorded agent-view activities
    When the user filters Activities by event type ViewedByAgent
    Then the displayed activities describe agents viewing the case
    When the user resets the activity filters
    Then the unfiltered case activities are displayed

  @TEN_CAS_REL_E2E_001 @regression @flow:TEN_CAS_CASE_RELATION_FLOW @type:ui-interaction
  Scenario: Open and cancel Add Case Relation on an accessible closed case
    Given an accessible closed case offers Add Case Relation
    When the user opens Add Case Relation
    Then the dialog provides ticket number search, Save and Cancel
    When the user cancels the dialog
    Then no case relation is added

  @TEN_CAS_REL_E2E_002 @regression @flow:TEN_CAS_CASE_RELATION_FLOW @type:negative
  Scenario: Search for a case relation that does not exist
    Given an accessible case has no related cases and offers Add Case Relation
    When the user searches for a ticket number that does not match a case
    Then the case search shows "No items match your search."
    When the user closes the search and cancels Add Case Relation
    Then the related case list remains empty

  @TEN_CAS_REL_E2E_003 @regression @flow:TEN_CAS_CASE_RELATION_FLOW @type:ui-interaction
  Scenario: Review a related-case candidate and cancel without linking it
    Given an accessible case has no related cases and offers Add Case Relation
    And another accessible E2E case is available as a reference
    When the user searches for and selects that case by ticket number
    Then the dialog shows the selected case number and summary
    When the user returns to ticket search and cancels Add Case Relation
    Then the related case list remains empty

  @TEN_CAS_WAT_E2E_001 @regression @flow:TEN_CAS_WATCHERS_FLOW @type:ui-interaction
  Scenario: Open and cancel the Add Watcher dialog
    Given an accessible case offers Add Watcher
    When the user opens Add Watcher
    Then the Available Agents dialog provides search and Add Agents
    When the user cancels the dialog without selecting an agent
    Then no watcher is added

  @TEN_CAS_WAT_E2E_002 @regression @flow:TEN_CAS_WATCHERS_FLOW @type:negative
  Scenario: Add Agents is disabled before a watcher is selected
    Given an accessible case offers Add Watcher
    When the user opens Add Watcher without selecting an agent
    Then Add Agents is disabled
    When the user cancels the dialog
    Then no watcher is added

  @TEN_CAS_KNW_E2E_001 @regression @flow:TEN_CAS_KNOWLEDGE_FLOW @type:edge-case
  Scenario: Show an empty state when no knowledge articles are available
    Given an accessible case has no matching knowledge articles
    When the user opens Knowledge
    Then the knowledge drawer shows "No articles found."
