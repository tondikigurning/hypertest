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
# Source: apps/tenants/app/features/case-management (case-action-kebab-menu.tsx,
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

  # ── TEN_CAS_ASSIGN_FLOW ──────────────────────────────────────────────
  # Assign / Transfer / Bulk Assign (single-agent). Unassign has its own flow
  # (TEN_CAS_UNASSIGN_FLOW) and Assign-to-Me its own (TEN_CAS_ASSIGN_TO_ME_FLOW) —
  # those are NOT authored here.
  #
  # PIPELINE TARGETING: the "Assign Case" dialog (case without owner) and bulk
  # assign run against the "Open" pipeline (unassigned queue) — every row there
  # offers "Assign Case", so the first assignable row is always found. The
  # "Transfer Case" dialog (reassign) REQUIRES an owned case, so it runs against
  # the "Assigned" pipeline instead.
  #
  # MOCK POLICY: happy-path mutations are REAL backend hits (data safety: pick an
  # assignable first row — skip when none exists). @mock is used ONLY for the
  # assign-API error variation (same endpoint/payload as the real happy path) and
  # for UI-only error boundaries — never to fake a success that the real path
  # already covers.
  #
  # Real assign flow (verified on the running app):
  #   • Kebab (row or "More Actions" in workbench) → "Assign Case" (no owner) /
  #     "Transfer Case" (has owner) → CaseAssignDialog: header
  #     "Assign/Reassign Agent to Case #<n>…" + "Available Agents" table
  #     (single-select checkbox; Full/current-owner rows disabled) + Cancel/Next.
  #   • Next (enabled only after an agent is selected) → "Assign Confirmation"
  #     dialog (InfoPanel summary + Agent) → "Confirm & Assign" → ResponseModal
  #     "Case <n> has been assigned/reassigned to <agent>".
  #   • Bulk: select rows → mass action "Assign Cases" → "Bulk Assign" dialog
  #     ("Assign multiple cases at once" + Selected Case IDs + Target Agent
  #     ComboBox) → "Bulk Assign" (disabled until agent) → validate →
  #     ResponseModal "Cases assigned successfully."
  #
  # Endpoints (for @mock variation):
  #   • assign/reassign/unassign: POST /casemgmt/tenant/cases/{uuid}/assign
  #   • assignees list (dialog): list-assignees filter API
  #   • bulk: POST /casemgmt/tenant/cases/validate + /casemgmt/tenant/cases/assign-bulk

  @TEN_CAS_ASG_E2E_001 @priority:P0 @smoke @flow:TEN_CAS_ASSIGN_FLOW @type:positive
  Scenario: Assign Case dialog opens from the case kebab menu
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the assign case dialog for the first assignable case
    Then the assign case dialog is visible
    And the assign case dialog shows the case header
    And the assign case dialog shows the available agents list
    And the assign case dialog shows the Cancel and Next actions

  @TEN_CAS_ASG_E2E_002 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_FLOW @type:ui-interaction
  Scenario: Assign dialog Next stays disabled until an agent is selected
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the assign case dialog for the first assignable case
    Then the assign next button is disabled
    When the user selects the first available agent
    Then the assign next button is enabled

  @TEN_CAS_ASG_E2E_003 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_FLOW @type:ui-interaction
  Scenario: Cancelling the assign case dialog closes it
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the assign case dialog for the first assignable case
    When the user cancels the assign case dialog
    Then the assign case dialog is not visible

  # Real-backend mutation: assigns the first assignable case to the first
  # selectable agent. Data safety — skips when no assignable case exists.
  @TEN_CAS_ASG_E2E_004 @priority:P0 @smoke @flow:TEN_CAS_ASSIGN_FLOW @type:positive
  Scenario: Assigning a case to the first available agent succeeds
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the assign case dialog for the first assignable case
    And the user selects the first available agent
    When the user proceeds to the assign confirmation
    Then the assign confirmation dialog is visible
    When the user confirms the case assignment
    Then the assign success modal is shown

  # Real-backend mutation: reassigns an assigned case to a different agent.
  @TEN_CAS_ASG_E2E_005 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_FLOW @type:positive
  Scenario: Transferring an assigned case to another agent succeeds
    Given the user is on the case list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the transfer case dialog for the first assigned case
    And the user selects the first available agent
    When the user proceeds to the assign confirmation
    Then the assign confirmation dialog is visible
    When the user confirms the case assignment
    Then the reassign success modal is shown

  # Bulk assign — UI contract (no mutation): dialog opens with disabled submit.
  @TEN_CAS_ASG_E2E_006 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_FLOW @type:ui-interaction
  Scenario: Bulk Assign dialog opens from selected rows
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user selects the first case row
    When the user opens the bulk assign dialog
    Then the bulk assign dialog is visible
    And the bulk assign dialog shows the selected case ids
    And the bulk assign dialog shows the target agent field
    And the bulk assign submit is disabled

  # Real-backend mutation: bulk assigns selected cases to an agent.
  @TEN_CAS_ASG_E2E_007 @priority:P2 @regression @flow:TEN_CAS_ASSIGN_FLOW @type:positive
  Scenario: Bulk assigning selected cases succeeds
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user selects the first case row
    When the user opens the bulk assign dialog
    And the user selects a target agent in the bulk assign dialog
    When the user submits the bulk assign
    Then the bulk assign success modal is shown

  # Mock variation only — same assign endpoint/payload as the real happy path
  # (ASG_004), asserting the error boundary instead of the success.
  @TEN_CAS_ASG_E2E_008 @priority:P2 @regression @mock @flow:TEN_CAS_ASSIGN_FLOW @type:negative
  Scenario: Assigning a case shows an error toast when the assign API returns 500
    Given the user is on the case list page
    And the assign case API is configured to return a 500 server error
    When the user selects the "Open" pipeline tab
    When the user opens the assign case dialog for the first assignable case
    And the user selects the first available agent
    When the user proceeds to the assign confirmation
    When the user confirms the case assignment
    Then the assign failure toast is shown

  # ── TEN_CAS_UNASSIGN_FLOW ─────────────────────────────────────────────
  # Unassign Case — opened from the row kebab menu ("Unassign Case", only for
  # assigned cases) → ConfirmModal "Unassign Case" → confirm calls the assign
  # endpoint with case_owner_id: undefined.
  #
  # PIPELINE TARGETING: these scenarios run against the "Assigned" pipeline —
  # every row there has an owner, so "Unassign Case" is available on the first
  # row and the first assigned case is always found.
  #
  # Verified against source (use-case-action-kebab-menu.tsx):
  #   • Kebab "Unassign Case" (requires case_owner; hidden when solved/pending-
  #     reply/endorsed-to-WFM) → showConfirmModal({ title: "Unassign Case",
  #     cancelLabel: "Cancel", confirmLabel: "Unassign", isNegativeCase: true,
  #     description: "Are you sure you want to unassign Case <n> from <owner>?
  #     This action will move the case to the 'Unassigned' queue." }).
  #   • Confirm → useUpdateCaseAssignee({ uuid }, { case_owner_id: undefined })
  #     → ResponseModal "Unassign Case Success" / "Case <n> has been set to
  #     Unassigned".
  #   • Error → toast "Failed to unassign case."
  #
  # Endpoint (for @mock variation): POST /casemgmt/tenant/cases/{uuid}/assign

  @TEN_CAS_UAS_E2E_001 @priority:P1 @regression @flow:TEN_CAS_UNASSIGN_FLOW @type:ui-interaction
  Scenario: Unassign Case action is available in the row actions menu for an assigned case
    Given the user is on the case list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the row actions menu for the first assigned case
    Then the row actions menu shows the "Unassign Case" action

  @TEN_CAS_UAS_E2E_002 @priority:P1 @regression @flow:TEN_CAS_UNASSIGN_FLOW @type:ui-interaction
  Scenario: Unassign Case confirmation dialog opens with the case and owner details
    Given the user is on the case list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the row actions menu for the first assigned case
    And the user clicks the "Unassign Case" row action
    Then the unassign case confirmation dialog is visible
    And the unassign case confirmation dialog shows the case number and owner
    And the unassign case confirmation dialog shows the "Unassigned queue" note
    And the unassign case confirmation dialog shows the Cancel and Unassign actions

  @TEN_CAS_UAS_E2E_003 @priority:P1 @regression @flow:TEN_CAS_UNASSIGN_FLOW @type:ui-interaction
  Scenario: Cancelling the unassign case confirmation closes it without unassigning
    Given the user is on the case list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the row actions menu for the first assigned case
    And the user clicks the "Unassign Case" row action
    When the user cancels the unassign case confirmation
    Then the unassign case confirmation dialog is not visible

  # Real-backend mutation: unassigns the first assigned case (moves it to the
  # Unassigned queue). Data safety — skips when no assigned case exists.
  @TEN_CAS_UAS_E2E_004 @priority:P1 @regression @flow:TEN_CAS_UNASSIGN_FLOW @type:positive
  Scenario: Unassigning an assigned case succeeds
    Given the user is on the case list page
    When the user selects the "Assigned" pipeline tab
    When the user opens the row actions menu for the first assigned case
    And the user clicks the "Unassign Case" row action
    When the user confirms the unassign case
    Then the unassign success modal is shown

  # Mock variation only — same assign endpoint as the real happy path (UAS_004),
  # asserting the error boundary instead of the success.
  @TEN_CAS_UAS_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_UNASSIGN_FLOW @type:negative
  Scenario: Unassigning a case shows an error toast when the assign API returns 500
    Given the user is on the case list page
    And the assign case API is configured to return a 500 server error
    When the user selects the "Assigned" pipeline tab
    When the user opens the row actions menu for the first assigned case
    And the user clicks the "Unassign Case" row action
    When the user confirms the unassign case
    Then the unassign failure toast is shown

  # ── TEN_CAS_ASSIGN_TO_ME_FLOW ─────────────────────────────────────────
  # Assign to Me — opened from the row kebab menu ("Assign to Me", shown when
  # canAssignToMe: current user does NOT own the case AND status is OPEN /
  # IN_PROGRESS / PENDING_CUSTOMER_REPLY / ACTION_REQUIRED / ASSIGNED /
  # ESCALATED) → ConfirmModal "Assign Case to Yourself" → confirm calls POST
  # /casemgmt/tenant/cases/{uuid}/assign-to-me.
  #
  # PIPELINE TARGETING: "Open" pipeline — every row there is unassigned (no
  # owner), which satisfies !userIsCaseOwner, and OPEN status is one of the
  # allowed statuses. So "Assign to Me" is available on the first Open row.
  #
  # Verified against source (use-case-action-kebab-menu.tsx + case-action-
  # kebab-menu.tsx):
  #   • Kebab "Assign to Me" (PermissionGuard CASE_MANAGEMENT_CASE_ASSIGN_TO_ME;
  #     condition canAssignToMe) → showConfirmModal({
  #     title: "Assign Case to Yourself", confirmLabel: "Confirm",
  #     cancelLabel: "Cancel", hasSeparator: true,
  #     description: "Are you sure you want to assign this case to yourself?" }).
  #   • Confirm → usePostAssignToMe() → POST .../cases/{uuid}/assign-to-me
  #     → ResponseModal success "Successfully Assigned this Case to Yourself"
  #     / "Case <no> has been assigned to you".
  #   • Error → ResponseModal error "Failed to Assign Case to Yourself"
  #     (modal, NOT a toast — differs from the assign flow).
  #
  # Endpoint (for @mock variation): POST /casemgmt/tenant/cases/{uuid}/assign-to-me

  @TEN_CAS_ATM_E2E_001 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_TO_ME_FLOW @type:ui-interaction
  Scenario: Assign to Me action is available in the row actions menu for an unowned case
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the row actions menu for the first unassigned case
    Then the row actions menu shows the "Assign to Me" action

  @TEN_CAS_ATM_E2E_002 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_TO_ME_FLOW @type:ui-interaction
  Scenario: Assign Case to Yourself confirmation dialog opens with the case details
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the row actions menu for the first unassigned case
    And the user clicks the "Assign to Me" row action
    Then the assign to me confirmation dialog is visible
    And the assign to me confirmation dialog shows the "Assign Case to Yourself" title and description
    And the assign to me confirmation dialog shows the Cancel and Confirm actions

  @TEN_CAS_ATM_E2E_003 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_TO_ME_FLOW @type:ui-interaction
  Scenario: Cancelling the assign to me confirmation closes it without assigning
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the row actions menu for the first unassigned case
    And the user clicks the "Assign to Me" row action
    When the user cancels the assign to me confirmation
    Then the assign to me confirmation dialog is not visible

  # Mock variation — same assign-to-me endpoint as the real happy path
  # (ATM_004), asserting the error boundary (ResponseModal error) instead of
  # the success modal. Runs BEFORE ATM_004 because the real-backend scenario
  # consumes the Open case (owner → current user), leaving no unassigned case
  # for this mock scenario.
  @TEN_CAS_ATM_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_ASSIGN_TO_ME_FLOW @type:negative
  Scenario: Assigning a case to yourself shows an error modal when the assign-to-me API returns 500
    Given the user is on the case list page
    And the assign to me API is configured to return a 500 server error
    When the user selects the "Open" pipeline tab
    When the user opens the row actions menu for the first unassigned case
    And the user clicks the "Assign to Me" row action
    When the user confirms the assign to me
    Then the assign to me error modal is shown

  # Real-backend mutation: assigns the first unassigned (Open) case to the
  # current user (owner → current user). Data safety — skips when no unassigned
  # case exists in the current environment.
  @TEN_CAS_ATM_E2E_004 @priority:P1 @regression @flow:TEN_CAS_ASSIGN_TO_ME_FLOW @type:positive
  Scenario: Assigning a case to yourself succeeds
    Given the user is on the case list page
    When the user selects the "Open" pipeline tab
    When the user opens the row actions menu for the first unassigned case
    And the user clicks the "Assign to Me" row action
    When the user confirms the assign to me
    Then the assign to me success modal is shown

  # ── TEN_CAS_START_FLOW ─────────────────────────────────────────────────
  # Start Case — opened from the row kebab menu ("Start Case", only for cases
  # assigned to the CURRENT user that are not yet in progress) → ConfirmModal
  # "Start Case" → confirm calls POST /casemgmt/tenant/cases/{uuid}/start-working.
  #
  # PIPELINE TARGETING: these scenarios run against the "Assigned to Me"
  # pipeline — every row there is owned by the logged-in user (case_owner.id ===
  # preference.user_id), which satisfies userIsCaseOwner. Status "Assigned"
  # satisfies canStart (status ∈ [ASSIGNED, ESCALATED]).
  #
  # Verified against source (use-case-action-kebab-menu.tsx + case-action-
  # kebab-menu.tsx) and live via playwright-cli (case HS-180826-279019):
  #   • Kebab "Start Case" (PermissionGuard CASE_MANAGEMENT_CASE_START_WORKING;
  #     condition isAssigned && !solved && userIsCaseOwner && !isInProgress;
  #     disabled when status not in [ASSIGNED, ESCALATED]) → showConfirmModal({
  #     title: "Start Case", confirmLabel: "Yes", cancelLabel: "Cancel",
  #     description: "Are you sure you want to start this case?" }).
  #   • Confirm → useStartCase() → POST .../cases/{uuid}/start-working
  #     → toast.success "The case has been started successfully."
  #     (position bottom-right, duration 2s).
  #   • Error → toast.error "Failed to start the case."
  #
  # Endpoint (for @mock variation): POST /casemgmt/tenant/cases/{uuid}/start-working
  #
  # NOTE: real-backend mutation mutates the first "Assigned to Me" case — it
  # consumes one of the user's owned cases per run (status → In Progress).

  @TEN_CAS_STR_E2E_001 @priority:P1 @regression @flow:TEN_CAS_START_FLOW @type:ui-interaction
  Scenario: Start Case action is available in the row actions menu for a case assigned to me
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case assigned to me
    Then the row actions menu shows the "Start Case" action

  @TEN_CAS_STR_E2E_002 @priority:P1 @regression @flow:TEN_CAS_START_FLOW @type:ui-interaction
  Scenario: Start Case confirmation dialog opens with the case details
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case assigned to me
    And the user clicks the "Start Case" row action
    Then the start case confirmation dialog is visible
    And the start case confirmation dialog shows the "Start Case" title and description
    And the start case confirmation dialog shows the Cancel and Yes actions

  @TEN_CAS_STR_E2E_003 @priority:P1 @regression @flow:TEN_CAS_START_FLOW @type:ui-interaction
  Scenario: Cancelling the start case confirmation closes it without starting the case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case assigned to me
    And the user clicks the "Start Case" row action
    When the user cancels the start case confirmation
    Then the start case confirmation dialog is not visible

  # Mock variation — same start-working endpoint as the real happy path
  # (STR_004), asserting the error boundary instead of the success. Runs BEFORE
  # STR_004 because the real-backend scenario consumes the "Assigned" case
  # (status → In Progress), leaving no assignable case for this mock scenario.
  @TEN_CAS_STR_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_START_FLOW @type:negative
  Scenario: Starting a case shows an error toast when the start-working API returns 500
    Given the user is on the case list page
    And the start case API is configured to return a 500 server error
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case assigned to me
    And the user clicks the "Start Case" row action
    When the user confirms the start case
    Then the start case failure toast is shown

  # Real-backend mutation: starts the first case assigned to me (status →
  # In Progress). Data safety — skips when the "Assigned to Me" pipeline is empty.
  @TEN_CAS_STR_E2E_004 @priority:P1 @regression @flow:TEN_CAS_START_FLOW @type:positive
  Scenario: Starting a case assigned to me succeeds
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case assigned to me
    And the user clicks the "Start Case" row action
    When the user confirms the start case
    Then the case started success toast is shown

  # ── TEN_CAS_RESOLVE_FLOW ──────────────────────────────────────────────
  # Resolve Case — opened from the row kebab menu ("Resolve Case"), shown only for
  # cases that have started (status IN_PROGRESS/ESCALATED), not solved/closed/pending-
  # customer-reply, and not resolved. The dialog is a ConfirmModal "Resolve Case"
  # (negative style) embedding a FormGenerator with:
  #   • Resolution (dropdown, remote options from casemgmt/tenant/objects/case-resolution, optional)
  #   • Reason (Optional) (textarea)
  # Confirm ("Yes") → POST .../cases/{uuid}/resolve → success ResponseModal
  #   "Case <no> has been successfully resolved." | error toast "Failed to resolve the case."
  #
  # PIPELINE TARGETING: "Assigned to Me" pipeline + status filter "In Progress" —
  # cases there are owned by the current user (so the resolve action is available)
  # and `isCaseHasStarted` (status IN_PROGRESS/ESCALATED) is the only condition that
  # qualifies for Resolve. The kebab scan filters rows whose status is not
  # In Progress / Escalated.
  #
  # NOTE: real-backend mutation consumes one in-progress case per run (status → resolved).

  @TEN_CAS_RES_E2E_001 @priority:P1 @regression @flow:TEN_CAS_RESOLVE_FLOW @type:ui-interaction
  Scenario: Resolve Case action is available in the row actions menu for a started case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first resolvable case
    Then the row actions menu shows the "Resolve Case" action

  @TEN_CAS_RES_E2E_002 @priority:P1 @regression @flow:TEN_CAS_RESOLVE_FLOW @type:ui-interaction
  Scenario: Resolve Case confirmation dialog opens with the resolution form
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first resolvable case
    And the user clicks the "Resolve Case" row action
    Then the resolve case confirmation dialog is visible
    And the resolve case confirmation dialog shows the "Resolve Case" title and description
    And the resolve case confirmation dialog shows the resolution form with the reason textarea
    And the resolve case confirmation dialog shows the Cancel and Yes actions

  @TEN_CAS_RES_E2E_003 @priority:P1 @regression @flow:TEN_CAS_RESOLVE_FLOW @type:ui-interaction
  Scenario: Cancelling the resolve case confirmation closes it without resolving the case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first resolvable case
    And the user clicks the "Resolve Case" row action
    When the user cancels the resolve case confirmation
    Then the resolve case confirmation dialog is not visible

  # Mock variation — same resolve endpoint as the real happy path (RES_004),
  # asserting the error boundary instead of the success.
  @TEN_CAS_RES_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_RESOLVE_FLOW @type:negative
  Scenario: Resolving a case shows an error toast when the resolve API returns 500
    Given the user is on the case list page
    And the resolve case API is configured to return a 500 server error
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first resolvable case
    And the user clicks the "Resolve Case" row action
    When the user confirms the resolve case
    Then the resolve case failure toast is shown

  # Real-backend mutation: resolves the first started case in the "Assigned to Me"
  # pipeline with status In Progress (status → resolved). Data safety — skips
  # when no resolvable case exists in the current environment.
  @TEN_CAS_RES_E2E_004 @priority:P1 @regression @flow:TEN_CAS_RESOLVE_FLOW @type:positive
  Scenario: Resolving a case with the first available resolution succeeds
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first resolvable case
    And the user clicks the "Resolve Case" row action
    When the user fills the resolution form with the first available resolution
    And the user confirms the resolve case
    Then the resolve case success modal is shown

  # ── TEN_CAS_PENDING_REPLY_FLOW ─────────────────────────────────────────
  # Pending to Customer Reply — opened from the row kebab menu ("Pending to
  # customer reply"), shown when isInProgress (status IN_PROGRESS/ESCALATED),
  # !solved, !enterprise, !endorsed-to-WFM, and source not IVR. ConfirmModal
  # "Pending Case" → confirm calls POST /casemgmt/tenant/cases/{uuid}/change-to-pending-reply.
  #
  # PIPELINE TARGETING: "Assigned to Me" pipeline + status filter "In Progress" —
  # cases there are owned by the current user and are in the In Progress state
  # (`isInProgress`) that qualifies for the action. The kebab scan filters rows
  # whose status is not In Progress / Escalated.
  #
  # Verified against source (use-case-action-kebab-menu.tsx + case-action-
  # kebab-menu.tsx):
  #   • Kebab "Pending to customer reply" (PermissionGuard
  #     CASE_MANAGEMENT_CASE_CHANGE_TO_PENDING_REPLY; condition isInProgress &&
  #     !solved && !enterprise && !endorsed-to-WFM; disabled when hasWorkOrder) →
  #     showConfirmModal({ title: "Pending Case", confirmLabel: "Yes",
  #     cancelLabel: "Cancel", hasSeparator: true,
  #     description: "Are you sure you want to set this case to pending?" }).
  #   • Confirm → useChangeToPendingCustomerReply() → POST .../{uuid}/change-to-pending-reply
  #     → toast.success "The case status has been changed to pending customer reply."
  #     (position bottom-right, duration 2s).
  #   • Error → toast.error "Failed to change the case status."
  #
  # Endpoint (for @mock variation): POST /casemgmt/tenant/cases/{uuid}/change-to-pending-reply

  @TEN_CAS_PRY_E2E_001 @priority:P1 @regression @flow:TEN_CAS_PENDING_REPLY_FLOW @type:ui-interaction
  Scenario: Pending to customer reply action is available in the row actions menu for an in-progress case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first in-progress case
    Then the row actions menu shows the "Pending to customer reply" action

  @TEN_CAS_PRY_E2E_002 @priority:P1 @regression @flow:TEN_CAS_PENDING_REPLY_FLOW @type:ui-interaction
  Scenario: Pending Case confirmation dialog opens with the case details
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first in-progress case
    And the user clicks the "Pending to customer reply" row action
    Then the pending case confirmation dialog is visible
    And the pending case confirmation dialog shows the "Pending Case" title and description
    And the pending case confirmation dialog shows the Cancel and Yes actions

  @TEN_CAS_PRY_E2E_003 @priority:P1 @regression @flow:TEN_CAS_PENDING_REPLY_FLOW @type:ui-interaction
  Scenario: Cancelling the pending case confirmation closes it without changing the status
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first in-progress case
    And the user clicks the "Pending to customer reply" row action
    When the user cancels the pending case confirmation
    Then the pending case confirmation dialog is not visible

  # Mock variation — same change-to-pending-reply endpoint as the real happy path
  # (PRY_004), asserting the error boundary instead of the success. Runs BEFORE
  # PRY_004 because the real-backend scenario consumes the In Progress case
  # (status → Pending Customer Reply), leaving no qualifying case for this mock scenario.
  @TEN_CAS_PRY_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_PENDING_REPLY_FLOW @type:negative
  Scenario: Changing a case to pending customer reply shows an error toast when the API returns 500
    Given the user is on the case list page
    And the change to pending reply API is configured to return a 500 server error
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first in-progress case
    And the user clicks the "Pending to customer reply" row action
    When the user confirms the pending case
    Then the pending case failure toast is shown

  # Real-backend mutation: changes the first in-progress case to pending customer
  # reply (status → Pending Customer Reply). Data safety — skips when no in-progress
  # case exists in the current environment.
  @TEN_CAS_PRY_E2E_004 @priority:P1 @regression @flow:TEN_CAS_PENDING_REPLY_FLOW @type:positive
  Scenario: Changing a case to pending customer reply succeeds
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first in-progress case
    And the user clicks the "Pending to customer reply" row action
    When the user confirms the pending case
    Then the pending case success toast is shown

  # ── TEN_CAS_EDIT_CTS_FLOW ───────────────────────────────────────────────
  # Edit CTS — opened from the row kebab menu ("Edit CTS", shown when
  # isCaseHasStarted && !solved, disabled when hasWorkOrder; permission
  # CASE_MANAGEMENT_CASE_UPDATE_CTS_CLASSIFICATION). Opens a 4-STEP WIZARD:
  #   Step 1 "Edit CTS" — CaseDataCard + FormGenerator (Case Category →
  #     enables Case Type → enables Case Sub-type) + CTS Change Detected alert.
  #     Footer: Cancel + Next (disabled until all three dropdowns selected).
  #     Next → POST /casemgmt/tenant/cases/duplicates-check → if a duplicate
  #     exists, "Possible Duplicate Case" panel (Go Back & Edit / Cancel);
  #     else advance to Step 2.
  #   Step 2 "Confirm CTS Changes" — Before (Current) vs After (New)
  #     comparison InfoPanels. Footer: Previous + Next.
  #   Step 3 "Manual Routing" — FormGenerator (Next Workflow Step → enables
  #     Team/Resolver + Routing Notes (optional)). Footer: Previous + Next.
  #   Step 4 "Apply Changes Confirmation" — "Are you sure want to save all the
  #     change to the CTS?" + Previous + Save.
  #   Save → PUT /casemgmt/tenant/cases/{uuid}/cts-workflow → ResponseModal
  #     success "CTS for <no> has been successfully updated." | error modal
  #     "CTS for <no> has failed to update."
  #
  # PIPELINE TARGETING: "Assigned to Me" pipeline + status filter "In Progress" —
  # isCaseHasStarted (IN_PROGRESS/ESCALATED) + !solved is the kebab condition.
  #
  # NOTE: the wizard's Step-1→Step-2 advance runs a real duplicate check that is
  # data-dependent. The happy-path scenario (ECT_004) skips when the duplicate
  # branch blocks progression or no workflow steps exist for manual routing.
  #
  # Endpoints:
  #   • save: PUT /casemgmt/tenant/cases/{uuid}/cts-workflow
  #   • duplicate check: POST /casemgmt/tenant/cases/duplicates-check

  @TEN_CAS_ECT_E2E_001 @priority:P1 @regression @flow:TEN_CAS_EDIT_CTS_FLOW @type:ui-interaction
  Scenario: Edit CTS action is available in the row actions menu for an in-progress case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case with editable CTS
    Then the row actions menu shows the "Edit CTS" action

  @TEN_CAS_ECT_E2E_002 @priority:P1 @regression @flow:TEN_CAS_EDIT_CTS_FLOW @type:positive
  Scenario: Edit CTS dialog opens at the first step with the CTS classification form
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case with editable CTS
    And the user clicks the "Edit CTS" row action
    Then the edit CTS dialog is visible
    And the edit CTS dialog shows the "Edit CTS" step title
    And the edit CTS dialog shows the form field "Case Category"
    And the edit CTS dialog shows the form field "Case Type"
    And the edit CTS dialog shows the form field "Case Sub-type"
    And the edit CTS dialog shows the Cancel and Next actions

  @TEN_CAS_ECT_E2E_003 @priority:P1 @regression @flow:TEN_CAS_EDIT_CTS_FLOW @type:ui-interaction
  Scenario: Cancelling the Edit CTS dialog closes it without changes
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case with editable CTS
    And the user clicks the "Edit CTS" row action
    When the user cancels the edit CTS dialog
    Then the edit CTS dialog is not visible

  # Real-backend mutation: navigates the full 4-step wizard with first-available
  # dynamic values and SAVES the CTS change (PUT .../{uuid}/cts-workflow) against
  # the REAL backend → success ResponseModal "CTS for <no> has been successfully
  # updated." Data safety — skips when:
  #   • the real duplicate check finds an existing case with the same CTS
  #     combination (no non-duplicate classification is guaranteed available), or
  #   • the real cts-workflow response provides no workflow steps for manual
  #     routing (Step 3 cannot be filled).
  # NOTE: this consumes/mutates the first in-progress case's CTS classification
  # per run — the case stays in-progress, only its classification changes.
  @TEN_CAS_ECT_E2E_004 @priority:P1 @regression @flow:TEN_CAS_EDIT_CTS_FLOW @type:positive
  Scenario: Updating the CTS classification of an in-progress case succeeds
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first case with editable CTS
    And the user clicks the "Edit CTS" row action
    When the user selects the first case category
    And the user selects the first case type
    And the user selects the first case sub-type
    When the user proceeds to the CTS confirm changes step without duplicates
    When the user proceeds to the CTS manual routing step
    And the user fills the manual routing form with available values
    When the user proceeds to the CTS apply confirmation step
    When the user saves the CTS changes
    Then the edit CTS success modal is shown

  # ── TEN_CAS_EDIT_FLOW ──────────────────────────────────────────────────
  # Edit Case — opened from the row kebab menu ("Edit Case", shown when
  # showEditGroup = !ActionRequired && !PCR && !Resolved-workflow && !Closed &&
  # !endorsed-to-WFM && !IVR/CHATBOT/SOCIAL source; disabled when hasWorkOrder;
  # permission CASE_MANAGEMENT_CASE_UPDATE_FIELDS). Opens the "Edit Case" DIALOG
  # (single step, not a wizard):
  #   • Entity (disabled) + Case Template (disabled) — pre-filled current values
  #   • Customer Details InfoPanel + Case Parent ComboBox ("Search Ticket No")
  #   • FormGenerator — Case Category / Case Type / Case Sub-type (pre-filled)
  #     + template-driven fields
  #   Footer: Cancel + Save.
  #   Save → PUT /casemgmt/tenant/cases/{uuid}/update → ResponseModal success
  #     "Case #<no> has been updated." | error modal "The data has failed to update."
  #
  # PIPELINE TARGETING: "Assigned to Me" pipeline — cases there are owned by the
  # current user and satisfy showEditGroup (non-terminal, non-IVR source). The
  # kebab scan finds the first row offering "Edit Case".
  #
  # NOTE: Save re-submits the pre-filled current values (no field change needed),
  # so the happy path is a real-backend update of the case's own data.
  #
  # Endpoint: PUT /casemgmt/tenant/cases/{uuid}/update

  @TEN_CAS_EDT_E2E_001 @priority:P1 @regression @flow:TEN_CAS_EDIT_FLOW @type:ui-interaction
  Scenario: Edit Case action is available in the row actions menu for an editable case
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first editable case
    Then the row actions menu shows the "Edit Case" action

  @TEN_CAS_EDT_E2E_002 @priority:P1 @regression @flow:TEN_CAS_EDIT_FLOW @type:positive
  Scenario: Edit Case dialog opens with the case fields
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first editable case
    And the user clicks the "Edit Case" row action
    Then the edit case dialog is visible
    And the edit case dialog shows the "Edit Case" title
    And the edit case dialog shows the field "Entity"
    And the edit case dialog shows the field "Case Template"
    And the edit case dialog shows the field "Case Category"
    And the edit case dialog shows the field "Case Type"
    And the edit case dialog shows the field "Case Sub-type"
    And the edit case dialog shows the Cancel and Save actions

  @TEN_CAS_EDT_E2E_003 @priority:P1 @regression @flow:TEN_CAS_EDIT_FLOW @type:ui-interaction
  Scenario: Cancelling the Edit Case dialog closes it without changes
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first editable case
    And the user clicks the "Edit Case" row action
    When the user cancels the edit case dialog
    Then the edit case dialog is not visible

  # Real-backend mutation: re-submits the case's current values via Save
  # (PUT .../{uuid}/update) → success ResponseModal "Case #<no> has been
  # updated." Data safety — skips when the backend rejects the update (e.g. a
  # template-required field is empty in this environment).
  @TEN_CAS_EDT_E2E_004 @priority:P1 @regression @flow:TEN_CAS_EDIT_FLOW @type:positive
  Scenario: Saving the edited case succeeds
    Given the user is on the case list page
    When the user selects the "Assigned to Me" pipeline tab
    When the user opens the row actions menu for the first editable case
    And the user clicks the "Edit Case" row action
    When the user saves the edited case
    Then the edit case success modal is shown

  # ── TEN_CAS_WORKFLOW_FLOW ───────────────────────────────────────────────
  # View Workflow — opened from the "More Actions" kebab in the CASE DETAIL
  # WORKBENCH (NOT the case list). The workbench's kebab (title="More Actions",
  # canCreateChild=true) is rendered by CaseInformationSection; its "View
  # Workflow" item is disabled when the case has no workflow (hasWorkflow =
  # !!bp_workflow). Opens a READ-ONLY dialog (no mutation):
  #   Header "View Workflow" + workflow diagram — a card per step (Step N +
  #   step title), with the current step highlighted (border-primary). Data from
  #   useGetBusinessProcessById(workflowDetails.id), spinner while loading.
  #
  # FLOW: open a case from the list (→ workbench), then open the "More Actions"
  # kebab in the workbench header and pick "View Workflow".
  #
  # NOTE: read-only view flow — no mutation, no @mock error scenario needed.

  @TEN_CAS_WKF_E2E_001 @priority:P2 @regression @flow:TEN_CAS_WORKFLOW_FLOW @type:ui-interaction
  Scenario: View Workflow action is available in the More Actions menu in the case workbench
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    Then the more actions menu shows the "View Workflow" action

  @TEN_CAS_WKF_E2E_002 @priority:P2 @regression @flow:TEN_CAS_WORKFLOW_FLOW @type:positive
  Scenario: View Workflow dialog opens with the workflow diagram
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    And the user clicks the "View Workflow" row action
    Then the view workflow dialog is visible
    And the view workflow dialog shows the "View Workflow" title
    And the view workflow dialog shows the workflow diagram

  @TEN_CAS_WKF_E2E_003 @priority:P2 @regression @flow:TEN_CAS_WORKFLOW_FLOW @type:ui-interaction
  Scenario: Closing the View Workflow dialog hides it
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    And the user clicks the "View Workflow" row action
    When the user closes the view workflow dialog
    Then the view workflow dialog is not visible

  # ── TEN_CAS_CHILD_CASE_FLOW ────────────────────────────────────────────
  # Create Child Case — opened from the "More Actions" kebab in the CASE DETAIL
  # WORKBENCH (canCreateChild=true is only passed by CaseInformationSection, so
  # this action does NOT exist in the case-list kebab). Condition:
  # !Resolved && !Solved && !PCR && !endorsed-to-WFM; disabled when !hasWorkflow;
  # permission CASE_MANAGEMENT_CASE_CREATE. Opens the "Create Child Case" dialog
  # (case-create.tsx mode="child-case"):
  #   • Customer Details — inherited from the parent (disabled); an EmptyState
  #     ("No Customer Selected") renders instead of the search box.
  #   • Entity + Case Template dropdowns (user selects).
  #   • Case Parent ComboBox — disabled, pre-filled with the parent case number.
  #   • FormGenerator template-driven fields.
  #   Footer: Cancel + "Create Case" (disabled until Entity + Template selected).
  #   Submit → duplicate check → Duplicate dialog OR create API → toast
  #   "Case created successfully" + new case tab opens (?case-number=<n>).
  #
  # FLOW: open a case from the list (→ workbench), then open the "More Actions"
  # kebab and pick "Create Child Case".
  #
  # Real-backend mutation: creates a child case linked to the opened parent.
  # Data safety — skips when the environment has no case with a workflow in the
  # current pipeline.

  @TEN_CAS_CHD_E2E_001 @priority:P1 @regression @flow:TEN_CAS_CHILD_CASE_FLOW @type:ui-interaction
  Scenario: Create Child Case action is available in the More Actions menu in the case workbench
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    Then the more actions menu shows the "Create Child Case" action

  @TEN_CAS_CHD_E2E_002 @priority:P1 @regression @flow:TEN_CAS_CHILD_CASE_FLOW @type:positive
  Scenario: Create Child Case dialog opens with the parent case pre-filled
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    And the user clicks the "Create Child Case" row action
    Then the create child case dialog is visible
    And the create child case dialog shows the "Case Parent" section with the parent pre-filled
    And the create child case dialog shows the field "Main Entity"
    And the create child case dialog shows the field "Case Template"
    And the create child case dialog shows the Cancel and Create Case actions

  @TEN_CAS_CHD_E2E_003 @priority:P1 @regression @flow:TEN_CAS_CHILD_CASE_FLOW @type:ui-interaction
  Scenario: Cancelling the Create Child Case dialog closes it
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    And the user clicks the "Create Child Case" row action
    When the user cancels the create child case dialog
    Then the create child case dialog is not visible

  # Real-backend mutation: creates a child case under the opened parent with the
  # first available entity/template and dynamic field values → success toast +
  # new case tab. Data safety — skips when the create fails or the duplicate
  # branch blocks progression in this environment.
  @TEN_CAS_CHD_E2E_004 @priority:P1 @regression @flow:TEN_CAS_CHILD_CASE_FLOW @type:positive
  Scenario: Creating a child case succeeds
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the more actions menu in the case workbench
    And the user clicks the "Create Child Case" row action
    And the user selects the "<entity>" case entity
    And the user selects the "<template>" case template
    And the user fills the required child case fields with the first available values
    When the user creates the case
    Then the child case creation success toast is shown
    And the new case tab opens for the created case

    Examples:
      | entity   | template     |
      | Converge | Trouble Case |

  # ── TEN_CAS_RELATED_CASE_FLOW ──────────────────────────────────────────
  # Related Case — the workbench "Related Case" vertical tab ("RELATION &
  # DUPLICATION CASE"):
  #   • Related Case section — count badge + "Add Case Relation" button
  #     (permission CASE_MANAGEMENT_CASE_CREATE_RELATION) → "Add Case Relation"
  #     dialog: ComboBox "Search Ticket No" (options load on open, excludes the
  #     current case) → pick → card preview + Back/Save → Save → POST
  #     /casemgmt/tenant/cases/relations → toast "Case #X is now related to
  #     Case #Y."
  #   • Related card kebab → "Remove Relation" → dialog "Confirm remove? Are
  #     you sure?" Cancel/Remove → DELETE .../relations/{id} → toast "Related
  #     case removed successfully."
  #   • Possible Duplicate section (only when duplicates exist) → card kebab →
  #     Merge → ConfirmModal "Action Confirmation" ("Are you sure?") Yes/Cancel
  #     → POST /casemgmt/tenant/cases/merge → toast "Duplicated cases merged
  #     successfully."
  #
  # FLOW: open a case from the list (→ workbench), then open the "Related Case"
  # vertical tab.
  #
  # MOCK POLICY: add/remove relations are REAL-backend mutations — the remove
  # scenario first creates its own relation (self-sufficient, no seed data).
  # Merge requires real duplicate cases (same account + CTS) which the
  # environment cannot reliably provide → @mock: duplicates-check returns one
  # row so the section renders, and the merge API 500 exercises the error
  # boundary (safe onError — toast only, no tab side-effects).

  @TEN_CAS_RLC_E2E_001 @priority:P2 @regression @flow:TEN_CAS_RELATED_CASE_FLOW @type:ui-interaction
  Scenario: Related Case tab shows the relation section with the Add Case Relation action
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the related case tab in the case workbench
    Then the related case section is visible

  @TEN_CAS_RLC_E2E_002 @priority:P2 @regression @flow:TEN_CAS_RELATED_CASE_FLOW @type:ui-interaction
  Scenario: Add Case Relation dialog opens with the search field
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the related case tab in the case workbench
    When the user opens the add case relation dialog
    Then the add case relation dialog is visible
    And the add case relation dialog shows the search field and the Cancel and Save actions

  # Real-backend mutation: relates the opened case to the first available case
  # from the search options. Data safety — skips when the search returns no cases.
  @TEN_CAS_RLC_E2E_003 @priority:P2 @regression @flow:TEN_CAS_RELATED_CASE_FLOW @type:positive
  Scenario: Adding a case relation succeeds
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the related case tab in the case workbench
    When the user opens the add case relation dialog
    And the user selects the first available case in the add relation dialog
    When the user saves the case relation
    Then the case relation success toast is shown

  # Real-backend mutation: removes a relation. Self-sufficient — the scenario
  # first creates its own relation, then removes it (no seed data needed).
  @TEN_CAS_RLC_E2E_004 @priority:P2 @regression @flow:TEN_CAS_RELATED_CASE_FLOW @type:positive
  Scenario: Removing a case relation succeeds
    Given the user is on the case list page
    When the user opens the first case from the list
    When the user opens the related case tab in the case workbench
    When the user opens the add case relation dialog
    And the user selects the first available case in the add relation dialog
    When the user saves the case relation
    Then the case relation success toast is shown
    When the user opens the first related case card actions menu
    And the user clicks the "Remove Relation" action in the open actions menu
    Then the remove relation dialog is visible
    When the user confirms the remove relation
    Then the remove relation success toast is shown

  # Mock variation — the duplicates-check API returns one row so the Possible
  # Duplicate section renders, and the merge API returns 500 → error toast.
  @TEN_CAS_RLC_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_RELATED_CASE_FLOW @type:negative
  Scenario: Merging a duplicate case shows an error toast when the merge API returns 500
    Given the user is on the case list page
    And the possible duplicates API is configured to return one duplicate case
    And the merge cases API is configured to return a 500 server error
    When the user opens the first case from the list
    When the user opens the related case tab in the case workbench
    When the user opens the first duplicate case card actions menu
    And the user clicks the "Merge" action in the open actions menu
    Then the merge confirmation dialog is visible
    When the user confirms the merge
    Then the merge failure toast is shown

  # ── TEN_CAS_CLOSE_FLOW ─────────────────────────────────────────────────
  # Close Case — opened from the row kebab menu ("Close Case"), shown when the
  # case source is IVR/CHATBOT_FACEBOOK_DM or status PENDING_CUSTOMER_REPLY/SOLVED,
  # and the case is not endorsed to WFM. ConfirmModal "Close Case" (negative style):
  #   title "Close Case", description "Are you sure you want to close this case?
  #   This action cannot be undone.", confirm "Yes", cancel "Cancel".
  # Confirm → POST .../cases/{uuid}/close → success ResponseModal
  #   "Case <no> has been closed" | error toast "Failed to close the case."
  #
  # PIPELINE TARGETING: "Solved" pipeline — cases there satisfy the close
  # eligibility (typically IVR/CHATBOT source, or not endorsed to WFM) and the
  # close API reliably accepts the transition. The kebab scan still filters
  # rows whose menu actually offers "Close Case" — the
  # `openRowActionsMenuFor` helper skip-fails when no row offers the item.

  @TEN_CAS_CLS_E2E_001 @priority:P1 @regression @flow:TEN_CAS_CLOSE_FLOW @type:ui-interaction
  Scenario: Close Case action is available in the row actions menu for a closeable case
    Given the user is on the case list page
    When the user selects the "Solved" pipeline tab
    When the user opens the row actions menu for the first closeable case
    Then the row actions menu shows the "Close Case" action

  @TEN_CAS_CLS_E2E_002 @priority:P1 @regression @flow:TEN_CAS_CLOSE_FLOW @type:ui-interaction
  Scenario: Close Case confirmation dialog opens with the case details
    Given the user is on the case list page
    When the user selects the "Solved" pipeline tab
    When the user opens the row actions menu for the first closeable case
    And the user clicks the "Close Case" row action
    Then the close case confirmation dialog is visible
    And the close case confirmation dialog shows the "Close Case" title and description
    And the close case confirmation dialog shows the Cancel and Yes actions

  @TEN_CAS_CLS_E2E_003 @priority:P1 @regression @flow:TEN_CAS_CLOSE_FLOW @type:ui-interaction
  Scenario: Cancelling the close case confirmation closes it without closing the case
    Given the user is on the case list page
    When the user selects the "Solved" pipeline tab
    When the user opens the row actions menu for the first closeable case
    And the user clicks the "Close Case" row action
    When the user cancels the close case confirmation
    Then the close case confirmation dialog is not visible

  # Mock variation — same close endpoint as the real happy path (CLS_004),
  # asserting the error boundary instead of the success.
  @TEN_CAS_CLS_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_CLOSE_FLOW @type:negative
  Scenario: Closing a case shows an error toast when the close API returns 500
    Given the user is on the case list page
    And the close case API is configured to return a 500 server error
    When the user selects the "Solved" pipeline tab
    When the user opens the row actions menu for the first closeable case
    And the user clicks the "Close Case" row action
    When the user confirms the close case
    Then the close case failure toast is shown

  # Real-backend mutation: closes the first closeable case in the "Solved"
  # pipeline (status → closed). Data safety — skips when no closeable case
  # exists in the current environment.
  @TEN_CAS_CLS_E2E_004 @priority:P1 @regression @flow:TEN_CAS_CLOSE_FLOW @type:positive
  Scenario: Closing a case succeeds
    Given the user is on the case list page
    When the user selects the "Solved" pipeline tab
    When the user opens the row actions menu for the first closeable case
    And the user clicks the "Close Case" row action
    When the user confirms the close case
    Then the close case success modal is shown

  # ── TEN_CAS_CANCEL_FLOW ────────────────────────────────────────────────
  # Cancel Case — opened from the row kebab menu ("Cancel Case", disabled unless
  # the case source is IVR/CHATBOT_FACEBOOK_DM and status not solved/closed/cancelled).
  # Opens the "Cancel Case Reason" DIALOG (not a ConfirmModal):
  #   header "Cancel Case Reason", body "Choose Cancel Reason" + Dropdown
  #   (options from the cancel-reason API), footer "Back" (default) +
  #   "Confirm Cancel" (negative; disabled until a reason is selected).
  # Confirm → PUT .../cases/{uuid}/cancel {cancel_reason_id} → success ResponseModal
  #   "Case <no> has been closed" | error toast "Failed to close."
  #
  # PIPELINE TARGETING: "All" pipeline — first case whose kebab offers "Cancel Case"
  # (and is not disabled — the menu item is disabled for non-IVR sources).

  @TEN_CAS_CNC_E2E_001 @priority:P1 @regression @flow:TEN_CAS_CANCEL_FLOW @type:ui-interaction
  Scenario: Cancel Case action is available in the row actions menu for a cancellable case
    Given the user is on the case list page
    When the user opens the row actions menu for the first cancellable case
    Then the row actions menu shows the "Cancel Case" action

  @TEN_CAS_CNC_E2E_002 @priority:P1 @regression @flow:TEN_CAS_CANCEL_FLOW @type:ui-interaction
  Scenario: Cancel Case Reason dialog opens with the cancel reason dropdown
    Given the user is on the case list page
    When the user opens the row actions menu for the first cancellable case
    And the user clicks the "Cancel Case" row action
    Then the cancel case reason dialog is visible
    And the cancel case reason dialog shows the "Choose Cancel Reason" field with a reason dropdown
    And the cancel case reason dialog shows the Back and Confirm Cancel actions
    And the confirm cancel button is disabled until a reason is selected

  @TEN_CAS_CNC_E2E_003 @priority:P1 @regression @flow:TEN_CAS_CANCEL_FLOW @type:ui-interaction
  Scenario: Going back from the cancel case reason dialog closes it without cancelling the case
    Given the user is on the case list page
    When the user opens the row actions menu for the first cancellable case
    And the user clicks the "Cancel Case" row action
    When the user goes back from the cancel case reason dialog
    Then the cancel case reason dialog is not visible

  # Mock variation — same cancel endpoint as the real happy path (CNC_004),
  # asserting the error boundary instead of the success.
  @TEN_CAS_CNC_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_CANCEL_FLOW @type:negative
  Scenario: Cancelling a case shows an error toast when the cancel API returns 500
    Given the user is on the case list page
    And the cancel case API is configured to return a 500 server error
    When the user opens the row actions menu for the first cancellable case
    And the user clicks the "Cancel Case" row action
    When the user selects the first available cancel reason
    And the user confirms the case cancel
    Then the cancel case failure toast is shown

  # Real-backend mutation: cancels the first cancellable (IVR/DM) case.
  # Data safety — skips when no cancellable case exists in the current environment.
  @TEN_CAS_CNC_E2E_004 @priority:P1 @regression @flow:TEN_CAS_CANCEL_FLOW @type:positive
  Scenario: Cancelling a case with the first available cancel reason succeeds
    Given the user is on the case list page
    When the user opens the row actions menu for the first cancellable case
    And the user clicks the "Cancel Case" row action
    When the user selects the first available cancel reason
    And the user confirms the case cancel
    Then the cancel case success modal is shown

  # ── TEN_CAS_CREATE_FLOW ───────────────────────────────────────────────

  @TEN_CAS_CRT_E2E_001 @priority:P0 @smoke @flow:TEN_CAS_CREATE_FLOW @type:positive
  Scenario Outline: Create New Case dialog shows each field
    Given the user is on the case list page
    When the user opens the Create New Case dialog
    Then the create case dialog is visible
    And the create case dialog shows the field "<field>"

    Examples:
      | field          |
      | Customer Details |
      | Main Entity    |
      | Case Template  |
      | Case Category  |
      | Case Type      |
      | Case Sub-type  |
      | Case Priority  |
      | Case Severity  |
      | Case Subject   |
      | Case Description |

  @TEN_CAS_CRT_E2E_002 @priority:P0 @smoke @flow:TEN_CAS_CREATE_FLOW @type:ui-interaction
  Scenario: Cancelling the Create New Case dialog closes it
    Given the user is on the case list page
    When the user opens the Create New Case dialog
    When the user cancels the create case dialog
    Then the create case dialog is not visible

  @TEN_CAS_CRT_E2E_003 @priority:P1 @regression @flow:TEN_CAS_CREATE_FLOW @type:ui-interaction
  Scenario Outline: Create Case button is disabled until Entity and Case Template are selected
    Given the user is on the case list page
    When the user opens the Create New Case dialog
    Then the create case button is disabled
    When the user selects the "<entity>" case entity
    Then the create case button is disabled
    When the user selects the "<template>" case template
    Then the create case button is enabled

    Examples:
      | entity   | template     |
      | Converge | Trouble Case |

  @TEN_CAS_CRT_E2E_004 @priority:P1 @regression @flow:TEN_CAS_CREATE_FLOW @type:positive
  Scenario Outline: Duplicate case detection shows the duplicate dialog with go back and view actions
    Given the user is on the case list page
    When the user opens the Create New Case dialog
    And the user selects the "<entity>" case entity
    And the user selects the "<template>" case template
    And the user fills the required case fields with the first available values
    When the user creates the case
    Then the duplicate case dialog is visible
    And the duplicate case dialog shows the "Duplicate Case Detected" alert
    And the duplicate case dialog shows the actions "Go Back & Edit" and "View Existing Case"

    Examples:
      | entity   | template     |
      | Converge | Trouble Case |

  @TEN_CAS_CRT_E2E_005 @priority:P0 @regression @flow:TEN_CAS_CREATE_FLOW @type:positive
  Scenario Outline: Creating a case with a clean customer account shows a success toast and opens the new case tab
    Given the user is on the case list page
    When the user opens the Create New Case dialog
    And the user selects the "<entity>" case entity
    And the user selects the "<template>" case template
    And the user fills the required case fields with a clean customer account
    When the user creates the case
    Then the case creation success toast is shown
    And the new case tab opens for the created case

    Examples:
      | entity   | template     |
      | Converge | Trouble Case |

  # ── TEN_CAS_BULK_FLOW ──────────────────────────────────────────────────
  # Bulk Dispatch Cases — route /case-management/cases/bulk (wizard, NOT the
  # case-list kebab). Entry via the "Bulk" button in the cases page header
  # (PermissionGuard CASE_MANAGEMENT_BULK_ACTION, navigates to /bulk). Wizard
  # "Bulk Action" has 3 steps:
  #   1. "Action" — title "Choose Action to Apply", description "Select the
  #      target status transition...", cards "Resolve" (circle-dashed-check) +
  #      "Close" (circle-x). Next disabled until an action is selected.
  #   2. "Upload File List" — title "Upload File List", description "Provide
  #      valid case IDs bulk files.", section "Structured Import Template" +
  #      "Download Template" (downloads Case Resolve/Close Bulk CSV template),
  #      FileUpload (accept .csv, max 1 file), Alert on error. Footer
  #      "Apply Bulk Operation" disabled until a file is selected; on Next
  #      calls POST /casemgmt/tenant/import/cases/resolve|close with the file.
  #   3. "Completed" — title "Bulk Update Queued for Processing", summary
  #      email notice + buttons "More Bulk Action" / "Return to Cases".
  # Side summary panel (CaseBulkActionSummary) shows "Summary", "Actions" →
  # selected bulk action label, "Upload File List" → file name or placeholder
  # "No targets specified yet" / "No file uploaded yet".
  # Header Cancel navigates back to /case-management/cases.
  #
  # Verified against source (cases-bulk.page.tsx, all-cases-table.tsx,
  # cases-bulk-wizard.tsx, cases-bulk-step-action.tsx,
  # cases-bulk-step-upload-file.tsx, cases-bulk-complete-step.tsx,
  # case-bulk.ts, cases-bulk-csv-template.ts).
  #
  # Endpoints (for @mock variation):
  #   • POST /casemgmt/tenant/import/cases/resolve
  #   • POST /casemgmt/tenant/import/cases/close

  @TEN_CAS_BLK_E2E_001 @priority:P2 @regression @flow:TEN_CAS_BULK_FLOW @type:positive
  Scenario: Bulk cases page loads with the bulk action wizard visible
    Given the user is on the bulk cases page
    Then the bulk cases page is visible
    And the bulk action wizard is visible
    And the bulk wizard shows the steps "Action" and "Upload File List" and "Completed"
    And the bulk summary shows "No targets specified yet" and "No file uploaded yet"

  @TEN_CAS_BLK_E2E_002 @priority:P2 @regression @flow:TEN_CAS_BULK_FLOW @type:ui-interaction
  Scenario: Bulk action step shows the available bulk actions
    Given the user is on the bulk cases page
    Then the bulk action step shows the title "Choose Action to Apply"
    And the bulk action step shows the action "Resolve"
    And the bulk action step shows the action "Close"

  @TEN_CAS_BLK_E2E_003 @priority:P2 @regression @flow:TEN_CAS_BULK_FLOW @type:ui-interaction
  Scenario: Selecting a bulk action enables navigation to the upload step
    Given the user is on the bulk cases page
    Then the bulk wizard next button is disabled
    When the user selects the "Resolve" bulk action
    Then the bulk wizard next button is enabled
    When the user proceeds to the next bulk wizard step
    Then the bulk upload step is visible
    And the bulk summary shows the selected action "Resolved"
    When the user goes back to the previous bulk wizard step
    Then the bulk action step is visible

  @TEN_CAS_BLK_E2E_004 @priority:P2 @regression @flow:TEN_CAS_BULK_FLOW @type:ui-interaction
  Scenario: Bulk upload step shows the template download and file upload controls
    Given the user is on the bulk cases page
    When the user selects the "Resolve" bulk action
    When the user proceeds to the next bulk wizard step
    Then the bulk upload step is visible
    And the bulk upload step shows the "Download Template" action
    And the bulk upload step shows the file upload control
    And the bulk apply button is disabled
    When the user goes back to the previous bulk wizard step
    Then the bulk action step is visible
    When the user proceeds to the next bulk wizard step
    Then the bulk upload step is visible

  @TEN_CAS_BLK_E2E_005 @priority:P2 @regression @mock @flow:TEN_CAS_BULK_FLOW @type:negative
  Scenario: Bulk operation shows an error alert when the bulk API returns 500
    Given the user is on the bulk cases page
    And the bulk resolve API is configured to return a 500 server error
    When the user selects the "Resolve" bulk action
    When the user proceeds to the next bulk wizard step
    When the user uploads a valid bulk CSV file
    When the user applies the bulk operation
    Then the bulk error alert is visible

  @TEN_CAS_BLK_E2E_006 @priority:P2 @regression @mock @flow:TEN_CAS_BULK_FLOW @type:positive
  Scenario: Bulk operation succeeds and shows the completed step
    Given the user is on the bulk cases page
    And the bulk resolve API is configured to return a success response
    When the user selects the "Resolve" bulk action
    When the user proceeds to the next bulk wizard step
    When the user uploads a valid bulk CSV file
    When the user applies the bulk operation
    Then the bulk completed step is visible
    And the bulk completed step shows the title "Bulk Update Queued for Processing"

