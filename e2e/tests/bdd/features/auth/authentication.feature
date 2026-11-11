# Feature: User Authentication
#
# Covers the P0 login journey for the tenants app.
# ID prefix: TEN_AUT_<FLG>_E2E_NNN (NNN resets per flow section; <FLG> is exactly 3 characters — abbreviated flow-section flag)
#
# Flow tags: only TEN_LOGIN_FLOW and TEN_LOGOUT_FLOW (all login-page scenarios share TEN_LOGIN_FLOW).
#
# Tag convention:
#   @TEN_AUT_<FLG>_E2E_NNN  — scenario contract ID (stable, never renumber)
#   @smoke             — included in fast smoke runs
#   @regression        — regression guard
#   @flow:<id>         — journey identifier used by flow coverage/reporting
#   @type:<t>          — scenario type override (positive|negative|edge-case|ui-interaction)

@TEN_LOGIN_FLOW
Feature: User Authentication

  # TEN_LOGIN_FLOW

  @TEN_AUT_LOG_E2E_001 @smoke @flow:TEN_LOGIN_FLOW @type:positive
  Scenario: Successful login with valid credentials
    Given the user is on the login page
    When they enter valid credentials
    And they submit the login form
    Then they are redirected to the dashboard

  @TEN_AUT_LOG_E2E_002 @regression @mock @flow:TEN_LOGIN_FLOW @type:negative
  Scenario: Login fails with invalid credentials
    Given the user is on the login page
    When they enter invalid credentials
    And they submit the login form
    Then they see an authentication error message

  @TEN_AUT_LOG_E2E_003 @regression @flow:TEN_LOGIN_FLOW @type:ui-interaction
  Scenario: Password visibility can be toggled
    Given the user is on the login page
    Then the password field is hidden
    When they toggle password visibility
    Then the password field is visible

  @TEN_AUT_LOG_E2E_004 @regression @flow:TEN_LOGIN_FLOW @type:negative
  Scenario: Empty login form shows per-field validation errors
    Given the user is on the login page
    When they submit an empty login form
    Then identifier validation is shown
    And password validation is shown

  @TEN_AUT_LOG_E2E_005 @regression @mock @flow:TEN_LOGIN_FLOW @type:negative
  Scenario: Login shows error when the authentication API returns 500 server error
    Given the user is on the login page
    And the authentication API is configured to return a 500 server error
    When they enter valid credentials
    And they submit the login form
    Then they see an authentication error message

  @TEN_AUT_LOG_E2E_006 @regression @mock @flow:TEN_LOGIN_FLOW @type:edge-case
  Scenario: Login shows loading state while waiting for a slow authentication API
    Given the user is on the login page
    And the authentication API response is delayed by 3 seconds
    When they enter valid credentials
    And they submit the login form
    Then a loading indicator or spinner is visible
    And eventually they are logged in

  # TEN_LOGOUT_FLOW

  @TEN_AUT_LGO_E2E_001 @smoke @flow:TEN_LOGOUT_FLOW @type:positive
  Scenario: Authenticated user can log out
    Given the user is logged in
    When they log out
    Then they are redirected to the login page

  @TEN_AUT_LGO_E2E_002 @regression @mock @flow:TEN_LOGOUT_FLOW @type:negative
  Scenario: Logout continues to redirects to login page even if logout API returns 500
    Given the user is logged in
    And the logout API is configured to return a 500 server error
    When they log out
    Then they are redirected to the login page
