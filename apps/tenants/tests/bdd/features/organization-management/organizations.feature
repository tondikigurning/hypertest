# Feature: Organization Management — Organizations & Entities
#
# Routes:
#   /organization-management                                    — organization list
#   /organization-management/{orgId}/entities                   — entities list under an org
#   /organization-management/{orgId}/general                    — organization detail/edit
#   /organization-management/{orgId}/permission                 — organization permission
#   /organization-management/{orgId}/policies                   — organization policies
#   /organization-management/{orgId}/entities/{entityId}        — entity detail sidebar
#   /organization-management/{orgId}/entities/{entityId}/details      — entity details
#   /organization-management/{orgId}/entities/{entityId}/contacts     — entity contacts
#   /organization-management/{orgId}/entities/{entityId}/address      — entity address
#   /organization-management/{orgId}/entities/{entityId}/sites        — entity sites
#   /organization-management/{orgId}/entities/{entityId}/teams        — entity teams
#   /organization-management/{orgId}/entities/{entityId}/policies     — entity policies
#   /organization-management/{orgId}/entities/{entityId}/permission   — entity permission
#   /organization-management/{orgId}/entities/{entityId}/members       — entity members
#
# ID prefix: TEN_ORG_<FLG>_E2E_NNN  (NNN resets per flow section; <FLG> is exactly 3 characters)
#
# Flow tag convention:
#   @flow:TEN_ORG_<ACTION>_FLOW — full action name (LIST, CREATE, ENTITIES, ENTITY_DETAIL, …); stable; never rename or reuse
#
# Component @ref map:
#   TEN_COM_PIP_E2E_001, TEN_COM_FSR_E2E_001, TEN_COM_FIL_E2E_001, TEN_COM_SAP_E2E_001
#   TEN_COM_VDT_E2E_001, TEN_COM_VDT_E2E_002, TEN_COM_VDT_E2E_003

Feature: Organization Management — Organizations & Entities

  # ── TEN_ORG_LIST_FLOW ──────────────────────────────────────────────────

  @TEN_ORG_LST_E2E_001 @priority:P0 @smoke @flow:TEN_ORG_LIST_FLOW @type:positive
  Scenario: Organization list loads with the data table visible
    Given the user is on the organization management page
    Then the organizations table is visible

  @TEN_ORG_LST_E2E_002 @priority:P1 @smoke @flow:TEN_ORG_LIST_FLOW @type:positive
  Scenario: Organization list shows Company Name column and row actions
    Given the user is on the organization management page
    Then the organizations table shows the "Company Name" column
    And each organization row shows the "Entities" and "Settings" actions

  @TEN_ORG_LST_E2E_003 @priority:P1 @smoke @flow:TEN_ORG_LIST_FLOW @type:positive
  Scenario: Clicking a row opens the detail panel
    Given the user is on the organization management page
    When the user opens the first organization row
    Then the detail panel is visible
    And the detail panel header shows a title

  @TEN_ORG_LST_E2E_004 @priority:P1 @regression @flow:TEN_ORG_LIST_FLOW @type:ui-interaction
  Scenario Outline: Each detail panel tab displays its content section
    Given the user is on the organization management page
    And the detail panel is open
    When the user clicks the "<tab>" detail panel tab
    Then the "<tab>" tab content is visible

    Examples:
      | tab                    |
      | General                |
      | Entities               |
      | Organization Permission|
      | Organization Policies  |

  @TEN_ORG_LST_E2E_005 @priority:P1 @regression @flow:TEN_ORG_LIST_FLOW @type:ui-interaction
  Scenario: Closing the detail panel hides it
    Given the user is on the organization management page
    And the detail panel is open
    When the user closes the detail panel
    Then the detail panel is not visible

  @TEN_ORG_LST_E2E_006 @priority:P1 @smoke @flow:TEN_ORG_LIST_FLOW @type:positive
  Scenario: Create organization dialog can be opened
    Given the user is on the organization management page
    When the user clicks the create organization button
    Then the create organization dialog is visible

  @TEN_ORG_LST_E2E_007 @priority:P1 @regression @flow:TEN_ORG_LIST_FLOW @type:ui-interaction
  Scenario: Cancel button closes the create organization dialog
    Given the user is on the organization management page
    When the user clicks the create organization button
    And the user cancels the create organization dialog
    Then the create organization dialog is not visible
    And the organization list page is displayed

  @TEN_ORG_LST_E2E_008 @priority:P1 @smoke @flow:TEN_ORG_LIST_FLOW @type:positive
  Scenario: Operator can create a new organization
    Given the user is on the organization management page
    When the user clicks the create organization button
    And the user fills the organization name
    And the user submits the create organization dialog
    Then the success response shows the organization has been created

  @TEN_ORG_LST_E2E_009 @priority:P1 @regression @flow:TEN_ORG_LIST_FLOW @type:negative
  Scenario: Organization list shows error when the API returns 500 server error
    Given the organizations API is configured to return a 500 server error
    When the user navigates to the organizations list page
    Then the application shows an error state

  @TEN_ORG_LST_E2E_010 @priority:P1 @regression @mock @flow:TEN_ORG_LIST_FLOW @type:negative
  Scenario: App handles token expiration gracefully when the organizations API returns 401
    Given the organizations API is configured to return a 401 authentication error
    When the user navigates to the organizations list page
    Then the user is redirected to the login page or shown an access denied message

  @TEN_ORG_LST_E2E_011 @priority:P1 @regression @flow:TEN_ORG_LIST_FLOW @type:ui-interaction
  Scenario: Search input filters organizations by name
    Given the user is on the organization management page
    When the user searches organizations for the first visible row
    Then the search returns matching organizations

  @TEN_ORG_LST_E2E_012 @priority:P1 @regression @flow:TEN_ORG_LIST_FLOW @type:ui-interaction
  Scenario: Filter returns matching organizations
    Given the user is on the organization management page
    When the user applies the "company_name" filter on organizations
    Then the filter returns matching organizations

  @TEN_ORG_LST_E2E_013 @priority:P1 @regression @flow:TEN_ORG_LIST_FLOW @type:ui-interaction
  Scenario: All sort options work in both directions on organizations
    Given the user is on the organization management page
    When the user applies all sort options on organizations
    Then each sort returns matching organizations

  # ── TEN_ORG_ENTITIES_FLOW ──────────────────────────────────────────────

  @TEN_ORG_ENT_E2E_001 @priority:P0 @smoke @flow:TEN_ORG_ENTITIES_FLOW @type:positive
  Scenario: Entities list loads for an organization
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    Then the entities table is visible

  @TEN_ORG_ENT_E2E_002 @priority:P1 @regression @flow:TEN_ORG_ENTITIES_FLOW @type:positive
  Scenario: Entities list shows expected columns
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    Then the entities table shows the "Company Name" column
    And the entities table shows the "Type" column

  @TEN_ORG_ENT_E2E_003 @priority:P1 @regression @flow:TEN_ORG_ENTITIES_FLOW @type:ui-interaction
  Scenario: Clicking an entity row opens the entity detail panel
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    And the user opens the first entity row
    Then the entity detail panel is visible
    And the entity detail panel header shows a title

  @TEN_ORG_ENT_E2E_004 @priority:P1 @regression @flow:TEN_ORG_ENTITIES_FLOW @type:ui-interaction
  Scenario Outline: Each entity detail tab displays its content section
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    And the user opens the first entity row
    When the user clicks the "<tab>" entity detail tab
    Then the "<tab>" tab content is visible

    Examples:
      | tab               |
      | Details           |
      | Contacts          |
      | Address           |
      | Site              |
      | Entity Permission |
      | Teams             |
      | Policies          |
      | Messaging Template|
      | User Groups       |
      | External References|
      | Connected Services|

  @TEN_ORG_ENT_E2E_005 @priority:P1 @regression @flow:TEN_ORG_ENTITIES_FLOW @type:ui-interaction
  Scenario: Closing the entity detail panel hides it
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    And the user opens the first entity row
    When the user closes the entity detail panel
    Then the entity detail panel is not visible

  @TEN_ORG_ENT_E2E_006 @priority:P1 @smoke @flow:TEN_ORG_ENTITIES_FLOW @type:positive
  Scenario: Create entity dialog can be opened
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    When the user clicks the create entity button
    Then the create entity dialog is visible

  @TEN_ORG_ENT_E2E_007 @priority:P1 @regression @flow:TEN_ORG_ENTITIES_FLOW @type:ui-interaction
  Scenario: Cancel button closes the create entity dialog
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    When the user clicks the create entity button
    And the user cancels the create entity dialog
    Then the create entity dialog is not visible
    And the entities list page is displayed

  @TEN_ORG_ENT_E2E_008 @priority:P1 @smoke @flow:TEN_ORG_ENTITIES_FLOW @type:positive
  Scenario: Operator can create a new entity
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    When the user clicks the create entity button
    And the user fills the entity name
    And the user submits the create entity dialog
    Then the success response shows the entity has been created

  @TEN_ORG_ENT_E2E_009 @priority:P1 @regression @flow:TEN_ORG_ENTITIES_FLOW @type:negative
  Scenario: Entities list shows error when the API returns 500 server error
    Given the entities API is configured to return a 500 server error
    When the user opens "Entities" for the first organization
    Then the application shows an error state

  @TEN_ORG_ENT_E2E_010 @priority:P1 @regression @flow:TEN_ORG_ENTITIES_FLOW @type:ui-interaction
  Scenario: Search input filters entities by name
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    When the user searches entities for the first visible row
    Then the search returns matching entities

  @TEN_ORG_ENT_E2E_011 @priority:P1 @regression @flow:TEN_ORG_ENTITIES_FLOW @type:ui-interaction
  Scenario: Filter returns matching entities
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    When the user applies the "company_name" filter on entities
    Then the filter returns matching entities

  @TEN_ORG_ENT_E2E_012 @priority:P1 @regression @flow:TEN_ORG_ENTITIES_FLOW @type:ui-interaction
  Scenario: All sort options work in both directions on entities
    Given the user is on the organization management page
    When the user opens "Entities" for the first organization
    When the user applies all sort options on entities
    Then each sort returns matching entities

  # ── TEN_ORG_ENTITY_DETAIL_FLOW ─────────────────────────────────────────

  @TEN_ORG_EDT_E2E_001 @priority:P1 @regression @flow:TEN_ORG_ENTITY_DETAIL_FLOW @type:positive
  Scenario: Entity detail page loads with sidebar tabs
    Given the user is on the entity detail page
    Then the entity detail panel is visible
    And the entity detail panel header shows a title

  @TEN_ORG_EDT_E2E_002 @priority:P1 @regression @flow:TEN_ORG_ENTITY_DETAIL_FLOW @type:ui-interaction
  Scenario: Entity detail tabs are navigable
    Given the user is on the entity detail page
    When the user clicks the "Details" entity detail tab
    Then the "Details" tab content is visible
    When the user clicks the "Contacts" entity detail tab
    Then the "Contacts" tab content is visible
    When the user clicks the "Sites" entity detail tab
    Then the "Sites" tab content is visible

  @TEN_ORG_EDT_E2E_003 @priority:P1 @regression @flow:TEN_ORG_ENTITY_DETAIL_FLOW @type:ui-interaction
  Scenario: Entity Permission tab shows role members table
    Given the user is on the entity detail page
    When the user clicks "Entity Permission" in the panel header
    Then the "Entity Permission" tab content is visible

  @TEN_ORG_EDT_E2E_004 @priority:P1 @regression @flow:TEN_ORG_ENTITY_DETAIL_FLOW @type:positive
  Scenario: Operator can add an entity permission
    Given the user is on the entity detail page
    When the user opens the entity permission panel
    And the user adds the first available entity permission
    Then the success response shows the permission has been updated

  @TEN_ORG_EDT_E2E_005 @priority:P1 @regression @flow:TEN_ORG_ENTITY_DETAIL_FLOW @type:ui-interaction
  Scenario: Entity Teams tab shows teams list
    Given the user is on the entity detail page
    When the user clicks the "Teams" entity detail tab
    Then the "Teams" tab content is visible

  @TEN_ORG_EDT_E2E_006 @priority:P1 @regression @flow:TEN_ORG_ENTITY_DETAIL_FLOW @type:positive
  Scenario: Operator can create a new team
    Given the user is on the entity detail page
    When the user clicks the "Teams" entity detail tab
    And the user creates a new team
    Then the success response shows the team has been created

  @TEN_ORG_EDT_E2E_007 @priority:P1 @regression @flow:TEN_ORG_ENTITY_DETAIL_FLOW @type:ui-interaction
  Scenario: Entity Sites tab shows sites list
    Given the user is on the entity detail page
    When the user clicks the "Site" entity detail tab
    Then the "Site" tab content is visible

  @TEN_ORG_EDT_E2E_008 @priority:P1 @regression @flow:TEN_ORG_ENTITY_DETAIL_FLOW @type:positive
  Scenario: Operator can create a new site
    Given the user is on the entity detail page
    When the user clicks the "Site" entity detail tab
    And the user creates a new site
    Then the success response shows the site has been created

  @TEN_ORG_EDT_E2E_009 @priority:P1 @regression @flow:TEN_ORG_ENTITY_DETAIL_FLOW @type:ui-interaction
  Scenario: Entity Policies tab shows policies list
    Given the user is on the entity detail page
    When the user clicks the "Policies" entity detail tab
    Then the "Policies" tab content is visible

  @TEN_ORG_EDT_E2E_010 @priority:P1 @regression @flow:TEN_ORG_ENTITY_DETAIL_FLOW @type:positive
  Scenario: Operator can create a new entity policy
    Given the user is on the entity detail page
    When the user clicks the "Policies" entity detail tab
    And the user creates a new organization policy
    And the user advances the policy wizard to the summary step
    And the user confirms the policy creation
    Then the success response shows the policy creation success screen is displayed

  # ── TEN_ORG_PERMISSION_FLOW ────────────────────────────────────────────

  @TEN_ORG_PER_E2E_001 @priority:P1 @regression @flow:TEN_ORG_PERMISSION_FLOW @type:positive
  Scenario: Organization Permission tab shows role members
    Given the user is on the organization management page
    When the user opens the first organization row
    And the user opens the organization permission panel
    Then the "Organization Permission" tab content is visible

  @TEN_ORG_PER_E2E_002 @priority:P1 @smoke @flow:TEN_ORG_PERMISSION_FLOW @type:positive
  Scenario: Operator can add an organization permission
    Given the user is on the organization management page
    When the user opens the first organization row
    And the user opens the organization permission panel
    And the user adds the first available role member
    Then the success response shows the permission has been updated
