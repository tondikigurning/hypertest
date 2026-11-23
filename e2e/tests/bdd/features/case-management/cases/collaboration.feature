# Feature: Case Management — Cases: collaboration and contextual drawers
# Owner PRD: docs/prd/case-management/cases.md
# Dialog checks use read-only records and cancel without saving a relation or watcher.

Feature: Case collaboration and contextual drawers

  @TEN_CAS_REL_E2E_001 @regression @flow:TEN_CAS_CASE_RELATION_FLOW @type:ui-interaction
  Scenario: Open and cancel Add Case Relation on an accessible closed case
    Given an accessible closed case offers Add Case Relation
    When the user opens Add Case Relation
    Then the dialog provides ticket number search, Save and Cancel
    When the user cancels the dialog
    Then no case relation is added

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
