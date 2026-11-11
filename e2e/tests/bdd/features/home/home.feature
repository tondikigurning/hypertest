# Feature: Global Shell — Home & App Launcher
#
# Route: /home | ID prefix: TEN_HOM_<FLG>_E2E_NNN (NNN resets per flow section)
# Code: HOM = authenticated _protected+ shell (home landing + global app launcher)
# Flow sections: LOAD(LOD) = authenticated home load; LAUNCHER(LNC) = app launcher menu
# Tags: @smoke @flow:<id> @type:<t>
#
# NOTE: the authenticated session is provided ONCE by the `setup` project storageState
# (login via E2E_USERNAME/E2E_PASSWORD, reused by every authenticated scenario) — these
# scenarios navigate against an existing session, they do not log in per test.

Feature: Global Shell — Home & App Launcher

  # TEN_HOME_LOAD_FLOW

  @TEN_HOM_LOD_E2E_001 @smoke @flow:TEN_HOME_LOAD_FLOW @type:positive
  Scenario: Valid SSO session lands on Home with no auth redirect
    Given the user is on the home page
    Then the current URL is "/home"
    And the header shows the logged-in user
    And the page is not redirected to the login page

  # TEN_HOME_LAUNCHER_FLOW

  @TEN_HOM_LNC_E2E_001 @smoke @flow:TEN_HOME_LAUNCHER_FLOW @type:ui-interaction
  Scenario: App launcher grid opens a menu listing all modules
    Given the user is on the home page
    When the user opens the app launcher menu
    Then the app launcher menu is visible
    And the app launcher menu lists the modules:
      | module                  |
      | Case Mgmt               |
      | Workforce Mgmt          |
      | Org Mgmt                |
      | IAM                     |
      | User Mgmt               |
      | System Settings         |
      | Reports                 |
      | BSS Web                 |
      | Audit Center            |
