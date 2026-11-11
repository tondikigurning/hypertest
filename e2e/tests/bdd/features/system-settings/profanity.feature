# Feature: System Settings — Profanity Settings
#
# Scope route (derived from app/routes/_protected+/system-settings+/profanity+/):
# - /system-settings/profanity
#
# Source of truth:
# - app/features/entities/pages/profanity/profanity.{page,loader,handler}.tsx
# - app/features/entities/components/profanity/*
#
# ID prefix: TEN_PRF_<FLG>_E2E_NNN
#   <FLG> is exactly 3 characters; NNN resets at 001 for each flow section.
#   Sub-module code PRF (system-settings / profanity) is proposed for the
#   conventions table and takes effect once approved with this file.
#
# Flow tag convention:
#   @flow:TEN_PRF_<ACTION>_FLOW — stable; never rename or reuse.
#
# Component masters: none are linked here.
#   The word list is a @hyperscal/dataview mounted inside a DetailPanel overlay,
#   not a full-page list. The shared FSR / FIL / SAP master steps assume a
#   full-page list surface (they resolve a page via LIST_CONFIG, press Escape and
#   clean URL filter state) — Escape closes this panel, so those contracts cannot
#   bind. Search, filter and sort are therefore expressed as profanity-local steps
#   in the LIST flow. Phase 1 should reuse the COM classes (DataTableComponent,
#   FilterComponent, ConfirmModalComponent) inside ProfanityPage instead.
#
# Confirmed API (STT):
#   GET  /api/v1.0/organization/tenant/profanity-settings
#   PUT  /api/v1.0/organization/tenant/profanity-settings
#   POST /api/v1.0/organization/tenant/profanity-words/filter   (list, search, filter and sort)
#   POST /api/v1.0/organization/tenant/profanity-words          (create)
#   PUT  /api/v1.0/organization/tenant/profanity-words/{uuid}   (update)
#   DELETE /api/v1.0/organization/tenant/profanity-words/{uuid} (delete)
#   Search, filter and sort share the /filter endpoint, so one mocked 500 and one
#   delay contract cover all three; there are no duplicate mocks per control.
#
# Data safety:
# seed-data-mutation-approved: 2026-10-27 user — shared STT tenant environment — TEN_PRF_FTG_E2E_001 — profanity filter setting — toggle and restore original value — verify operator can change setting — cleanup restores initial value; no irreversible effects
#   - Each mutation scenario creates its own uniquely named E2E word and teardown removes
#     only words created by that scenario.
#   - Default words are read-only: the API exposes no edit or delete action.
#   - The shared profanity setting is restored to its recorded initial value in the scenario
#     and again in teardown if the scenario fails before restoration.

Feature: System Settings — Profanity Settings

  # ── TEN_PRF_LIST_FLOW ─────────────────────────────────────────────────

  @TEN_PRF_LST_E2E_001 @priority:P0 @smoke @flow:TEN_PRF_LIST_FLOW @type:positive
  Scenario: Profanity Settings page loads with the filter card and word management actions
    Given the user is on the profanity settings page
    Then the profanity filter card is visible
    And the profanity filter status is shown
    And the manage word/phrase action is visible

  @TEN_PRF_LST_E2E_002 @priority:P1 @smoke @flow:TEN_PRF_LIST_FLOW @type:positive
  Scenario: Profanity Settings opens from the System Settings sidebar
    Given the user is on the system settings policies page
    When the user opens "Profanity Settings" from the system settings sidebar
    Then the profanity settings page is visible

  @TEN_PRF_LST_E2E_003 @priority:P0 @smoke @flow:TEN_PRF_LIST_FLOW @type:positive
  Scenario: Manage panel opens the word list with the expected columns
    Given the user is on the profanity settings page
    When the user opens the manage word/phrase panel
    Then the profanity word list table is visible
    And the profanity word list shows the "Word/Phrase" column
    And the profanity word list shows the "Type" column

  @TEN_PRF_LST_E2E_004 @priority:P1 @regression @flow:TEN_PRF_LIST_FLOW @type:positive
  Scenario: Custom words expose edit and delete actions while default words are read-only
    Given the user is on the profanity settings page
    When the user opens the manage word/phrase panel
    Then custom word rows show the edit and delete actions
    And default word rows show no row actions

  @TEN_PRF_LST_E2E_005 @priority:P1 @smoke @flow:TEN_PRF_LIST_FLOW @type:positive
  Scenario: Search filters the word list by the first visible word
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    When the user searches the profanity word list for the first visible word
    Then the profanity word list shows only matching words

  @TEN_PRF_LST_E2E_006 @priority:P1 @regression @flow:TEN_PRF_LIST_FLOW @type:negative
  Scenario: Search with no matches shows the empty state
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    When the user searches the profanity word list for a value that matches no word
    Then the profanity word list shows the empty state

  @TEN_PRF_LST_E2E_007 @priority:P1 @regression @flow:TEN_PRF_LIST_FLOW @type:ui-interaction
  Scenario: Filtering by word returns rows that contain the selected word
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    When the user applies the "Word/Phrase" filter with the first visible word
    Then the filtered profanity words contain the selected word

  @TEN_PRF_LST_E2E_008 @priority:P1 @regression @flow:TEN_PRF_LIST_FLOW @type:ui-interaction
  Scenario: Sorting the word list by Word/Phrase works in both directions
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    When the user applies the "Word/Phrase" sort in ascending and descending order
    Then each profanity word sort request returns HTTP 200
    And the word list is returned in the requested order

  @TEN_PRF_LST_E2E_009 @priority:P1 @regression @flow:TEN_PRF_LIST_FLOW @type:ui-interaction
  Scenario: Word list paginates beyond the first page
    Given the user is on the profanity settings page
    When the user opens the manage word/phrase panel
    And the profanity word list has more than one page
    When the user goes to the next profanity word list page
    Then the previous profanity word list page action is enabled
    When the user goes to the previous profanity word list page
    Then the previous profanity word list page action is disabled

  @TEN_PRF_LST_E2E_010 @priority:P1 @regression @mock @flow:TEN_PRF_LIST_FLOW @type:negative
  Scenario: Word list shows an error state when the API returns 500 server error
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    And the profanity word list API is configured to return a 500 server error
    When the user searches the profanity word list for "test"
    Then the profanity word list shows an error state

  @TEN_PRF_LST_E2E_011 @priority:P1 @regression @mock @flow:TEN_PRF_LIST_FLOW @type:edge-case
  Scenario: Word list shows a loading state while waiting for a slow API response
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    And the profanity word list API response is delayed by 4 seconds
    When the user searches the profanity word list for "test"
    Then a loading indicator is visible in the word list before the results load

  # ── TEN_PRF_FILTER_TOGGLE_FLOW ────────────────────────────────────────

  @TEN_PRF_FTG_E2E_001 @priority:P0 @smoke @flow:TEN_PRF_FILTER_TOGGLE_FLOW @type:positive
  Scenario: Operator disables the profanity filter and restores it
    Given the user is on the profanity settings page
    And the profanity filter status is recorded
    When the user toggles the profanity filter switch
    Then the profanity filter confirmation dialog is visible
    When the user confirms the profanity filter change
    Then the profanity filter success toast is shown
    And the profanity filter status is the opposite of the recorded status
    When the user toggles the profanity filter switch
    And the user confirms the profanity filter change
    Then the profanity filter success toast is shown
    And the profanity filter status matches the recorded status

  @TEN_PRF_FTG_E2E_002 @priority:P1 @regression @flow:TEN_PRF_FILTER_TOGGLE_FLOW @type:negative
  Scenario: Cancelling the confirmation keeps the current filter state
    Given the user is on the profanity settings page
    And the profanity filter status is recorded
    When the user toggles the profanity filter switch
    And the user cancels the profanity filter confirmation
    Then the profanity filter confirmation dialog is not visible
    And the profanity filter status matches the recorded status

  @TEN_PRF_FTG_E2E_003 @priority:P1 @regression @mock @flow:TEN_PRF_FILTER_TOGGLE_FLOW @type:negative
  Scenario: Filter update shows an error toast when the API returns 500 server error
    Given the user is on the profanity settings page
    And the profanity filter status is recorded
    And the profanity filter update API is configured to return a 500 server error
    When the user toggles the profanity filter switch
    And the user confirms the profanity filter change
    Then the profanity filter error toast is shown
    And the profanity filter status matches the recorded status

  # ── TEN_PRF_CREATE_FLOW ───────────────────────────────────────────────

  @TEN_PRF_CRT_E2E_001 @priority:P0 @smoke @flow:TEN_PRF_CREATE_FLOW @type:positive
  Scenario: Operator adds a new E2E profanity word
    Given the user is on the profanity settings page
    When the user opens the manage word/phrase panel
    And the user creates a profanity word with a unique E2E value
    Then the profanity word created toast is shown
    And the created profanity word appears in the word list
    And the profanity add word input is empty

  @TEN_PRF_CRT_E2E_002 @priority:P1 @regression @flow:TEN_PRF_CREATE_FLOW @type:negative
  Scenario: Add rejects a word containing invalid characters
    Given the user is on the profanity settings page
    When the user opens the manage word/phrase panel
    And the user enters a profanity word containing invalid characters
    Then the profanity add word input is marked invalid
    And the add word action is disabled

  @TEN_PRF_CRT_E2E_003 @priority:P1 @regression @flow:TEN_PRF_CREATE_FLOW @type:ui-interaction
  Scenario: Add action is disabled while the input is empty
    Given the user is on the profanity settings page
    When the user opens the manage word/phrase panel
    Then the add word action is disabled

  # ── TEN_PRF_EDIT_FLOW ─────────────────────────────────────────────────

  @TEN_PRF_EDT_E2E_001 @priority:P1 @regression @flow:TEN_PRF_EDIT_FLOW @type:ui-interaction
  Scenario: Edit dialog can be opened and cancelled without changing the word
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    And an E2E profanity word is available
    When the user opens the edit dialog for the first E2E word
    And the user cancels the edit word dialog
    Then the edit word dialog is not visible
    And the word is unchanged in the word list

  @TEN_PRF_EDT_E2E_002 @priority:P0 @smoke @flow:TEN_PRF_EDIT_FLOW @type:positive
  Scenario: Operator updates an E2E profanity word
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    And an E2E profanity word is available
    When the user opens the edit dialog for the first E2E word
    And the user updates the word to a new unique E2E value
    Then the profanity word updated toast is shown
    And the updated profanity word appears in the word list

  @TEN_PRF_EDT_E2E_003 @priority:P1 @regression @flow:TEN_PRF_EDIT_FLOW @type:negative
  Scenario: Edit rejects a word containing invalid characters
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    And an E2E profanity word is available
    When the user opens the edit dialog for the first E2E word
    And the user enters an invalid profanity word in the edit dialog
    Then the edit word form shows the invalid word message
    And the update word action is disabled

  # ── TEN_PRF_DELETE_FLOW ───────────────────────────────────────────────

  @TEN_PRF_DEL_E2E_001 @priority:P1 @regression @flow:TEN_PRF_DELETE_FLOW @type:ui-interaction
  Scenario: Delete confirmation can be cancelled and keeps the word
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    And an E2E profanity word is available
    When the user opens the delete confirmation for the first E2E word
    Then the delete profanity word confirmation is visible
    When the user cancels the delete profanity word confirmation
    Then the delete profanity word confirmation is not visible
    And the word remains in the word list

  @TEN_PRF_DEL_E2E_002 @priority:P0 @smoke @flow:TEN_PRF_DELETE_FLOW @type:positive
  Scenario: Operator deletes an E2E profanity word
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    And an E2E profanity word is available
    When the user opens the delete confirmation for the first E2E word
    And the user confirms the delete profanity word
    Then the profanity word deleted toast is shown
    And the deleted profanity word is no longer in the word list

  @TEN_PRF_DEL_E2E_003 @priority:P1 @regression @mock @flow:TEN_PRF_DELETE_FLOW @type:negative
  Scenario: Delete shows an error toast when the API returns 500 server error
    Given the user is on the profanity settings page
    And the manage word/phrase panel is open
    And an E2E profanity word is available
    And the profanity word delete API is configured to return a 500 server error
    When the user opens the delete confirmation for the first E2E word
    And the user confirms the delete profanity word
    Then the profanity word delete error toast is shown
    And the word remains in the word list
