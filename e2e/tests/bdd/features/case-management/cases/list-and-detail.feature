# Feature: Case Management — Cases
#
# Route: /case-management/cases | ID prefix: TEN_CAS_<FLG>_E2E_NNN (NNN resets per flow section)
# Tags: @smoke @regression @flow:<id> @type:<t> @ref:TEN_COM_*_E2E_* (component masters in _components/)
#
# Component @ref map (cases reuses the _components masters only where the contract fits):
#   TEN_CAS_LIST_FLOW:
#     • TEN_COM_PIP_E2E_001 → TEN_CAS_LST_E2E_002 — pipeline tab *selection/activation*, mirrored as a
#       Scenario Outline with the case pipeline tabs (Assigned to Me / All / Open / Assigned).
#     • Filter builder is CASE-SPECIFIC — the cases advanced "Where" builder has no COM master
#       (TEN_COM_FIL_E2E_001 covers the standard filter-option toolbar, which cases does not use),
#       so TEN_CAS_LST_E2E_003 carries no @ref.
#     • Search (TEN_COM_FSR_E2E_001) and sort (TEN_COM_SAP_E2E_001) reuse the shared steps —
#       verified against the running app that the cases list uses the standard dataview Filters
#       DOM (filter-search-input / btn-add-sort / sort-option-* test ids) on the CASES_FILTER_API.
#   TEN_CAS_VIEW_DETAIL_FLOW:
#     • TEN_COM_VDT_E2E_001 → TEN_CAS_VDT_E2E_001 — row opens the docked panel, mirrored (incl. header title).
#     • The docked panel has NO detail-panel Tabs (single InfoPanel stack — Case Details / CTS / Agent /
#       Customer Detail), so TEN_COM_VDT_E2E_002 (tab content) does not apply.
#     • TEN_COM_VDT_E2E_003 → TEN_CAS_VDT_E2E_002 — closing the docked panel.
#     • Full case detail WORKBENCH (case-specific, no COM master): opening a case (case-number link or
#       "View Case Detail" in the panel header) switches to ?case-number=<n> and renders the header case
#       tab + Case Information / Team / Customer Details info panels + conversation feeds + vertical tab
#       rail (Case Information, Agents, Customer Address, Customer Plan, Activities, Related Case,
#       Knowledge, Work Orders, Case Notes, SLA Usage History) — TEN_CAS_VDT_E2E_003..005.
#     • TEN_COM_VDT_E2E_004/005 → TEN_CAS_VDT_E2E_006/007 — detail API 500 / delayed response via @mock
#       (cases detail API = /casemgmt/tenant/cases/{id}).
#   TEN_CAS_CREATE_FLOW:
#     • Case-specific dialog (no COM master). Verified against the running app:
#       Create New Case dialog fields = Customer Details (InfoPanel search), Entity (ComboBox,
#       auto-selects first available), Case Template (Dropdown), then template-driven
#       FormGenerator fields: Case Category / Case Type / Case Sub-type (enabled only after
#       dependencies) / Case Priority / Case Severity / Case Subject / Case Description.
#       Footer: Cancel + "Create Case" (disabled until Entity + Case Template selected).
#     • Submit → possible-duplicates check → Duplicate Case Detected dialog (Go Back & Edit /
#       View Existing Case) OR create API → success toast "Case created successfully" +
#       new case tab opens (case-created event).
#     • Success happy path is a real-backend mutation → data-safety: select first available
#       entity/template and dynamic field values.
#   TEN_CAS_ASSIGN_FLOW (Assign / Transfer / Bulk Assign — UNASSIGN and ASSIGN-TO-ME are separate flows):
#     • Assign/Transfer via kebab ("Assign Case" when no owner / "Transfer Case" when owned) →
#       CaseAssignDialog ("Assign/Reassign Agent to Case #…" + Available Agents single-select table,
#       Next disabled until agent picked) → "Assign Confirmation" → "Confirm & Assign" →
#       ResponseModal success. Verified on the running app.
#     • Bulk: row checkboxes → "Assign Cases" mass action → "Bulk Assign" dialog (Selected Case IDs +
#       Target Agent ComboBox, submit disabled until agent) → validate → ResponseModal.
#     • Happy-path mutations hit the REAL backend (data-safety: first assignable case, skip when none).
#       @mock only for the assign-API 500 variation (same endpoint/payload as the real happy path).
#
# ── FLOW REGISTRY (from source analysis — flows-only pass) ────────────────────
# Source: e2e/app/features/case-management (case-action-kebab-menu.tsx,
#         use-case-action-kebab-menu.tsx, case-dialog-manager.tsx, dialogs/*,
#         case-details/main-content/vertical-tab/*, case-details/main-content/right-bar/*)
#
# | Flow ID                       | Description                        | Source evidence                  | Priority |
# | ----------------------------- | ---------------------------------- | -------------------------------- | -------- |
# | TEN_CAS_LIST_FLOW             | List + pipeline/filter/search/sort | cases.page.tsx + dataview        | P0       |
# | TEN_CAS_VIEW_DETAIL_FLOW      | Docked panel + full workbench      | case-list.tsx + case-details     | P0       |
# | TEN_CAS_CREATE_FLOW           | Create case dialog                 | dialogs/case-create.tsx          | P0       |
# | TEN_CAS_ASSIGN_FLOW           | Assign / Transfer case             | dialogs/case-assign + kebab      | P0       |
# | TEN_CAS_UNASSIGN_FLOW         | Unassign case                      | kebab (handleUnassignCase)       | P1       |
# | TEN_CAS_RESOLVE_FLOW          | Resolve case                       | kebab (handleResolveCase)        | P1       |
# | TEN_CAS_CLOSE_FLOW            | Close case                         | kebab (handleCloseCase)          | P1       |
# | TEN_CAS_CANCEL_FLOW           | Cancel case (reason dialog)        | dialogs/case-cancel-reason       | P1       |
# | TEN_CAS_START_FLOW            | Start case                         | kebab (handleStartCase)          | P1       |
# | TEN_CAS_PENDING_REPLY_FLOW    | Pending to customer reply          | kebab (handlePendingToCustomer)  | P1       |
# | TEN_CAS_ASSIGN_TO_ME_FLOW     | Assign to Me                       | kebab (handleAssignToMe)         | P1       |
# | TEN_CAS_CHILD_CASE_FLOW       | Create child case                  | case-create mode="child-case"    | P1       |
# | TEN_CAS_EDIT_CTS_FLOW         | Edit CTS classification            | dialogs/edit-cts                 | P1       |
# | TEN_CAS_EDIT_FLOW             | Edit case fields                   | dialogs/edit-ticket              | P1       |
# | TEN_CAS_WORKFLOW_FLOW         | View workflow                      | dialogs/view-workflow            | P2       |
# | TEN_CAS_RELATED_CASE_FLOW     | Add/remove/merge related case      | dialogs/related-case + merge     | P2       |
# | TEN_CAS_BULK_FLOW             | Bulk upload + action wizard        | pages/cases-bulk (bulk route)    | P2       |
#
# ── WORKBENCH VERTICAL TAB VIEW FLOWS ─────────────────────────────────────────
# The full case detail workbench is NOT a route — opening a case (case-number link) switches
# to ?case-number=<n>, renders a header case TAB (multiple cases can be open as tabs), and
# shows a vertical tab rail. Each vertical tab is its own view flow:
#   Source: case-details/main-content/vertical-tab/case-details-vertical-tab-menu.tsx
#
# | Flow ID                       | Description                        | Source evidence                  | Priority |
# | ----------------------------- | ---------------------------------- | -------------------------------- | -------- |
# | TEN_CAS_TAB_INFO_FLOW         | Case Information tab view          | case-information-tab-content     | P1       |
# | TEN_CAS_TAB_AGENTS_FLOW       | Agents tab (related users)         | agents-tab-content               | P1       |
# | TEN_CAS_TAB_ADDRESS_FLOW      | Customer Address tab               | address-content/customer-address | P1       |
# | TEN_CAS_TAB_PLAN_FLOW         | Customer Plan (IBAS service)       | plan-tab-content                 | P1       |
# | TEN_CAS_TAB_ACTIVITY_FLOW     | Activities (activity logs)         | activity-tab-content             | P1       |
# | TEN_CAS_TAB_KNOWLEDGE_FLOW    | Knowledge tab (list + article)     | knowledge-tab-content            | P1       |
# | TEN_CAS_TAB_WORK_ORDER_FLOW   | Work Orders tab                    | work-orders-tab-content          | P1       |
# | TEN_CAS_TAB_NOTES_FLOW        | Case Notes (handover info)         | case-notes-tab-content           | P1       |
# | TEN_CAS_TAB_SLA_FLOW          | SLA Usage History tab              | sla-usage-history-tab-content    | P2       |
# | TEN_CAS_TAB_CALL_NOTES_FLOW   | Call Notes tab (IVR cases)         | call-notes-tab-content           | P2       |
#
# ── WORKBENCH INTERACTION FLOWS ───────────────────────────────────────────────
# Source: case-details/main-content/right-bar/* (feeds) + vertical-tab/* actions
#
# | Flow ID                       | Description                        | Source evidence                  | Priority |
# | ----------------------------- | ---------------------------------- | -------------------------------- | -------- |
# | TEN_CAS_FEED_SWITCH_FLOW      | Switch External/Internal feed      | feeds-header (Switch to Internal)| P1       |
# | TEN_CAS_FEED_POPOUT_FLOW      | Pop out chat (docked chat tray)    | feeds-header (Pop out chat)      | P2       |
# | TEN_CAS_FEED_SEND_FLOW        | Send message in conversation       | feeds-messages (EmailMessenger)  | P1       |
# | TEN_CAS_ATTACHMENT_FLOW       | Add/view case attachments          | case-information-tab add-attachment| P1      |
# | TEN_CAS_KNOWLEDGE_VIEW_FLOW   | Open knowledge article             | knowledge-article-content        | P2       |
# | TEN_CAS_WORK_ORDER_VIEW_FLOW  | View work order detail/activity    | work-orders-tab + work-order-activity | P2 |
# | TEN_CAS_TAB_OPEN_CLOSE_FLOW   | Open/close case header tabs (multi)| cases.page.tsx (handleCloseTab)  | P1       |
#
# NOTE: Mutation flows (assign/unassign/resolve/close/cancel/start/pending/action-required/
#       assign-to-me/child/edit-cts/edit) are opened from the row kebab menu and are highly
#       data/status-dependent. They are authored as @mock scenarios where the environment
#       cannot reliably provide the required case status (like the create-flow 422 team issue).
# NOTE: Workbench flows open via ?case-number=<n> (tab-based, NOT a route). Multiple cases can
#       be open as header tabs simultaneously; each vertical tab is a distinct view.
#
# Scope: SMOKE-ONLY pass (P0, release-gating journeys). Per task, no @regression / @mock /
# negative / edge-case scenarios are authored in this pass.
#
# Reuse alignment: TEN_CAS_LST_E2E_002 and TEN_CAS_VDT_E2E_001 are faithful instances of their
# masters (same Given/When/Then as the _components contracts, mirroring user-management/users.feature
# and workforce-management/work-orders.feature). Unlike the previous pass, "cases" is now a first-class
# ActivePage: pageContext infers it from @TEN_CAS_ tags/paths, resolvePage/resolvePipelinePage/
# resolveFilterablePage/resolveDetailPanelPage return casesPage, and LIST_CONFIG routes
# navigateToList() to /case-management/cases. So the shared pipeline / view-detail steps now resolve
# to CasesPage (verified against work-orders, the reference submodule). Remaining risk is panel-locator
# verification on the running app (VERIFY-ON-RUN markers below).
#
# Discovered-but-deferred (separate pass, not authored here):
#   • TEN_CAS_ACTION_REQUIRED_FLOW — kebab action only exists on ENTERPRISE-template
#     in-progress cases, which the current environment does not reliably provide;
#     removed from the authored flows (was P1).
#
# Locator gaps flagged for Phase 1 verification (POM carries VERIFY-ON-RUN markers):
#   • Docked panel locator: cases uses a DetailPanelContainer WITHOUT Tabs (no [data-slot="tabs"] in the
#     panel li), so DetailPanelComponent.root (requires tabs) does NOT match. Phase 1 needs a cases-specific
#     detail-panel locator (li > [role="slider"] + header "Case# …") for the shared view-detail steps
#     (openDetailPanel / closeDetailPanel / expectDetailPanelVisible / …).
#   • Docked panel close button: icon-only X (i.i-x) — DetailPanelComponent.closeButton pattern applies.
#   • "View Case Detail" button IS present in the docked panel header (permission-gated, verified on the
#     running app) — full-detail navigation trigger confirmed: case-number link OR panel header button.
#   • Vertical tab rail: icon-only buttons with tooltip labels (Case Information, Agents, …) — Phase 1
#     should assert via tooltip/aria names, and note "Messages" tab only exists in compact layout.

Feature: Case Management — Cases

  # ── TEN_CAS_LIST_FLOW ──────────────────────────────────────────────────

  @TEN_CAS_LST_E2E_001 @priority:P0 @smoke @flow:TEN_CAS_LIST_FLOW @type:positive
  Scenario: Cases list page loads with the data table visible
    Given the user is on the case list page
    Then the cases data table is visible

  @TEN_CAS_LST_E2E_002 @priority:P0 @smoke @ref:TEN_COM_PIP_E2E_001 @flow:TEN_CAS_LIST_FLOW @type:ui-interaction
  Scenario Outline: Selecting a case pipeline tab activates it
    Given a list page with pipeline tabs is open
    When the user selects the "<tab>" pipeline tab
    Then the "<tab>" pipeline tab is active

    Examples:
      | tab                     |
      | Assigned to Me          |
      | All                     |
      | Open                    |
      | Assigned                |
      | In Progress             |
      | Escalated               |
      | Pending Customer Reply  |
      | Solved                  |
      | Closed                  |
      | Cancelled               |
      | Action Required         |
      | Watched by Me           |
      | Live Agent              |
      | Hotline                 |

  @TEN_CAS_LST_E2E_003 @priority:P0 @smoke @flow:TEN_CAS_LIST_FLOW @type:ui-interaction
  Scenario Outline: Case filter builder shows each action
    Given the user is on the case list page
    When the user opens the case filter builder
    Then the case filter builder is visible
    And the case filter builder shows a Where clause with field, operator and value controls
    And the case filter builder shows the action "<action>"

    Examples:
      | action       |
      | Add Filter   |
      | Add Group    |
      | Clear Filter |

  @TEN_CAS_LST_E2E_004 @priority:P0 @smoke @flow:TEN_CAS_LIST_FLOW @type:positive
  Scenario Outline: Cases list renders each expected column
    Given the user is on the case list page
    Then the cases table shows the column "<column>"

    Examples:
      | column          |
      | Case Number     |
      | Case Source     |
      | Customer Name   |
      | Customer No     |
      | Subject         |
      | Customer Product|
      | Assigned To     |
      | Team            |
      | Status          |
      | Priority        |
      | CTS             |
      | SLA             |
      | OLA             |
      | Reporter        |
      | Last Updated At |

  @TEN_CAS_LST_E2E_005 @priority:P1 @smoke @ref:TEN_COM_FSR_E2E_001 @flow:TEN_CAS_LIST_FLOW @type:positive
  Scenario Outline: Search input filters rows by the first visible row "<field>"
    Given a list page with search is open
    When the user searches for the first visible row "<field>"
    Then the search returns matching rows

    Examples:
      | field       |
      | case_number |

  @TEN_CAS_LST_E2E_006 @priority:P1 @smoke @ref:TEN_COM_SAP_E2E_001 @flow:TEN_CAS_LIST_FLOW @type:ui-interaction
  Scenario: All sort options work in both directions
    Given a list page with sort is open
    When the user applies each sort option in ascending and descending direction
    Then each sort triggers an API call that returns HTTP 200
    And each sort response includes rows in the correct order

  # ── TEN_CAS_VIEW_DETAIL_FLOW ──────────────────────────────────────────
  # Detail panel (docked) + full case detail workbench. Cases is a first-class
  # ActivePage in page-context (casesPage), so the shared view-detail steps
  # resolve to CasesPage. The docked panel is a DetailPanelContainer without
  # Tabs (single InfoPanel stack — Case Details / CTS / Agent / Customer Detail),
  # so TEN_COM_VDT_E2E_002 (tab content) does NOT apply; the full workbench's
  # vertical tabs are case-specific and covered by TEN_CAS_VDT_E2E_005 below.

  @TEN_CAS_VDT_E2E_001 @priority:P0 @smoke @ref:TEN_COM_VDT_E2E_001 @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:positive
  Scenario: Clicking a case row opens the case detail panel
    Given a list page with detail panel layout is open
    When the user clicks the first case row
    Then the detail panel is visible
    And the detail panel header shows a title

  @TEN_CAS_VDT_E2E_002 @priority:P1 @regression @ref:TEN_COM_VDT_E2E_003 @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario: Closing the case detail panel hides it
    Given a list page with detail panel layout is open
    And the detail panel is open
    When the user closes the detail panel
    Then the detail panel is not visible

  # Full case detail workbench — opened from the case-number link (onLinkClick),
  # URL gains ?case-number=<n>, a case tab opens in the header tab bar, and the
  # workbench shows the Case Information panel (key fields) plus the vertical
  # tab rail. The vertical tabs are case-specific (no COM master for tabs).
  @TEN_CAS_VDT_E2E_003 @priority:P0 @smoke @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:positive
  Scenario: Opening a case from the list opens the full case detail workbench
    Given the user is on the case list page
    When the user opens the first case from the list
    Then the full case detail workbench is visible
    And the case detail workbench shows the case tab with the case number
    And the case detail workbench shows the case information panel
    And the case detail workbench shows the conversation feeds panel

  @TEN_CAS_VDT_E2E_004 @priority:P1 @regression @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:positive
  Scenario Outline: Case detail workbench shows each key information field
    Given the user is on the case list page
    When the user opens the first case from the list
    Then the case detail workbench shows the information field "<field>"

    Examples:
      | field          |
      | Case Number    |
      | Category       |
      | Type           |
      | Sub-Type       |
      | Subject        |
      | Team           |
      | Agent          |
      | Customer Name  |
      | Email          |

  @TEN_CAS_VDT_E2E_005 @priority:P1 @regression @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:ui-interaction
  Scenario Outline: Each case detail vertical tab displays its content section
    Given the user is on the case list page
    When the user opens the first case from the list
    Then the case detail workbench shows the vertical tab "<tab>"

    Examples:
      | tab              |
      | Case Information |
      | Agents           |
      | Customer Address |
      | Customer Plan    |
      | Activities       |
      | Related Case     |
      | Knowledge        |
      | Work Orders      |
      | Case Notes       |
      | SLA Usage History |
