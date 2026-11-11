# Feature: Pipeline Renderer — Component
#
# Master E2E contract for @hyperscal/dataview PipelineRenderer.
# ID prefix: TEN_COM_PIP_E2E_NNN
#
# Reference page (golden path): /user-management/users
# Submodule features (e.g. users.feature) link via @ref:TEN_COM_PIP_E2E_* — do not duplicate these steps.
#
Feature: Pipeline Renderer — Component

  @TEN_COM_PIP_E2E_001 @regression @flow:TEN_COM_PIPELINE_TAB_FLOW @type:ui-interaction
  Scenario Outline: Selecting a pipeline tab activates it
    Given a list page with pipeline tabs is open
    When the user selects the "<tab>" pipeline tab
    Then the "<tab>" pipeline tab is active

    Examples:
      | tab             |
      | Active          |
      | Suspended       |
      | Account Lockout |
      | Invited         |
      | Cancelled       |

  # Pipeline filter error scenarios

  @TEN_COM_PIP_E2E_002 @regression @mock @flow:TEN_COM_PIPELINE_TAB_FLOW @type:negative
  Scenario: Pipeline tab request shows error state when API returns 500 server error
    Given a list page with pipeline tabs is open
    And the pipeline tab API is configured to return a 500 server error
    When the user selects the "Suspended" pipeline tab
    Then the application shows an error state
