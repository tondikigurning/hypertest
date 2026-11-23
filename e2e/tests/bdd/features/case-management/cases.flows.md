# Cases flows

## Flows

| Flow | Outcome | Feature | Status |
| --- | --- | --- | --- |
| `TEN_CAS_LIST_FLOW` | Find cases with search, filters, sort, pagination, pipelines and empty states | `case-management/cases/list-and-detail.feature` | pending |
| `TEN_CAS_EXPORT_FLOW` | Export case list and receive results | `case-management/cases/list-and-detail.feature` | pending |
| `TEN_CAS_VIEW_DETAIL_FLOW` | Inspect case, customer, billing, addresses and summary | `case-management/cases/list-and-detail.feature` | pending |
| `TEN_CAS_CREATE_FLOW` | Create a classified case with validation and routing | `case-management/cases/create.feature` | pending |
| `TEN_CAS_DUPLICATE_CREATE_FLOW` | Proceed with or view an existing matching case | `case-management/cases/create.feature` | pending |
| `TEN_CAS_AUTO_INTAKE_FLOW` | Create and enrich a case from inbound interaction | `case-management/cases/intake.feature` | pending |
| `TEN_CAS_UNKNOWN_SENDER_FLOW` | Request missing customer details and route after reply | `case-management/cases/intake.feature` | pending |
| `TEN_CAS_LIVE_CHAT_INTAKE_FLOW` | Create and assign chat case with first message | `case-management/cases/intake.feature` | pending |
| `TEN_CAS_IVR_INTAKE_FLOW` | Receive IVR case and screen pop or flag unanswered call | `case-management/cases/intake.feature` | pending |
| `TEN_CAS_FEEDS_FLOW` | Read external and internal history by channel | `case-management/cases/communication.feature` | pending |
| `TEN_CAS_OUTBOUND_EMAIL_FLOW` | Send a customer email and retain thread and activity | `case-management/cases/communication.feature` | pending |
| `TEN_CAS_LIVE_CHAT_FLOW` | Exchange chat messages and receive handling and idle alerts | `case-management/cases/communication.feature` | pending |
| `TEN_CAS_VOICE_CALL_FLOW` | Use call controls and complete IVR call notes | `case-management/cases/communication.feature` | pending |
| `TEN_CAS_WATCHERS_FLOW` | Add and remove watchers preserving ownership and audit | `case-management/cases/collaboration.feature` | pending |
| `TEN_CAS_AUDIT_FLOW` | Inspect immutable history and actors for case changes | `case-management/cases/workspace.feature` | pending |
| `TEN_CAS_RELATE_CASE_FLOW` | Link related cases without merging | `case-management/cases/relations.feature` | pending |
| `TEN_CAS_MERGE_FLOW` | Merge duplicate cases and retain master and history | `case-management/cases/relations.feature` | pending |
| `TEN_CAS_CREATE_CHILD_FLOW` | Create a child with parent reference and independent SLA | `case-management/cases/relations.feature` | pending |
| `TEN_CAS_KNOWLEDGE_FLOW` | Find and read CTS-matched knowledge articles | `case-management/cases/workspace.feature` | pending |
| `TEN_CAS_VIEW_WORKFLOW_FLOW` | Inspect workflow current and next steps | `case-management/cases/workspace.feature` | pending |
| `TEN_CAS_HANDOVER_FLOW` | Write, edit and read handover notes across teams | `case-management/cases/handover.feature` | pending |
| `TEN_CAS_ASSIGN_FLOW` | Assign an open case and see assignee and status | `case-management/cases/assignment.feature` | pending |
| `TEN_CAS_UNASSIGN_FLOW` | Return an assigned case to the open queue | `case-management/cases/assignment.feature` | pending |
| `TEN_CAS_TRANSFER_AGENT_FLOW` | Transfer to another agent and retain previous watcher | `case-management/cases/assignment.feature` | pending |
| `TEN_CAS_ROUTE_DEPARTMENT_FLOW` | Submit to an allowed department or workflow step | `case-management/cases/assignment.feature` | pending |
| `TEN_CAS_AUTO_ASSIGN_FLOW` | Match eligible agents or leave the case in queue | `case-management/cases/assignment.feature` | pending |
| `TEN_CAS_START_FLOW` | Start assigned ticket and enter in-progress handling | `case-management/cases/lifecycle.feature` | pending |
| `TEN_CAS_PENDING_REPLY_FLOW` | Request customer information, pause timers and resume after reply | `case-management/cases/lifecycle.feature` | pending |
| `TEN_CAS_RESOLVE_FLOW` | Resolve in-progress case and notify customer | `case-management/cases/lifecycle.feature` | pending |
| `TEN_CAS_CLOSE_FLOW` | Close a resolved case and observe read-only state | `case-management/cases/lifecycle.feature` | pending |
| `TEN_CAS_REOPEN_FLOW` | Reopen after customer feedback or resume resolved case | `case-management/cases/lifecycle.feature` | pending |
| `TEN_CAS_CANCEL_FLOW` | Cancel an abandoned chat or IVR case | `case-management/cases/lifecycle.feature` | pending |
| `TEN_CAS_EDIT_CTS_FLOW` | Change classification and inspect routing and audit | `case-management/cases/editing.feature` | pending |
| `TEN_CAS_EDIT_CASE_FLOW` | Edit permitted fields and inspect saved values and audit | `case-management/cases/editing.feature` | pending |
| `TEN_CAS_CHANGE_CUSTOMER_FLOW` | Relink customer and refresh CRM details | `case-management/cases/editing.feature` | pending |
| `TEN_CAS_ENDORSE_WFM_FLOW` | Endorse eligible case and inspect work order | `case-management/cases/integrations.feature` | pending |
| `TEN_CAS_MASS_ISSUE_FLOW` | Associate case with outage or mass issue | `case-management/cases/integrations.feature` | pending |
| `TEN_CAS_PROFANITY_FLOW` | Screen inbound message before routing and SLA | `case-management/cases/integrations.feature` | pending |
| `TEN_CAS_SLA_TRACK_FLOW` | Inspect SLA and OLA timing, health and usage | `case-management/cases/sla.feature` | pending |
| `TEN_CAS_ESCALATE_FLOW` | Observe breach escalation and supervisor notification or watcher | `case-management/cases/sla.feature` | pending |
| `TEN_CAS_ACCESS_FLOW` | Enforce role, team, ownership and personal-data access | `case-management/cases/access.feature` | pending |
| `TEN_CAS_FAILURE_RECOVERY_FLOW` | Recover from CRM, WFM or email failure without corrupting case | `case-management/cases/integrations.feature` | pending |
| `TEN_CAS_CONCURRENT_ACTION_FLOW` | Reject stale competing action and request refresh | `case-management/cases/lifecycle.feature` | pending |
| `TEN_CAS_BULK_RESOLVE_FLOW` | Resolve cases using valid bulk file | `case-management/cases/bulk.feature` | pending |
| `TEN_CAS_BULK_CLOSE_FLOW` | Close cases using valid bulk file | `case-management/cases/bulk.feature` | pending |

## Gaps

- PRD_CAS_206 / CASE-ACT-009 and the general action rule in S1 ?7: E7 observed Close Case in the More Actions menu for a Pending Customer Reply case, although the PRD says Close requires Resolved and unavailable actions should be hidden or disabled. No action was submitted, so outcome and intended visibility remain unresolved. Confirm intended behavior and investigate safely with an eligible E2E-owned case.
- PRD_CAS_022 / CASE-CRT-011 and PRD_CAS_232: E2/E4 showed an asterisk on Severity and none on Description, contrary to the PRD's optional Severity and mandatory Description markers. E8 showed Severity as Complex in a populated form but did not establish what populated it or validate a missing value. Actual validation remains unresolved. Confirm product intent and inspect using safe E2E-owned customer data before any submission.
- PRD_CAS_001-012, 210-211, 231: E1/E5/E10/E12/E13/E15 establish list controls, page-size selection, an unmatched-search empty state, Open status filtering, Open/Closed/Pending Customer Reply pipeline membership, Case Number sorting in both directions and page navigation. Other search/filter/sort fields, pipeline membership/counts, access scope and export remain unverified; role and data scope are unknown. Verify those outcomes against the current tenant and PRD, then resolve or update the PRD mismatch.
- PRD_CAS_014-030, 138-139, 160-162, 186-187, 190, 194, 197-198, 212, 214-216, 232, 236: E2/E4/E8 show the create form and client state; E17 confirms the configured `E2E_CASE_CUSTOMER_ID` reference is selectable, but no case was submitted. CRT004 now authors a successful create-and-reopen journey that produces an E2E-prefixed case; it is not executed evidence. Inbound-channel intake, enrichment, notifications, routing, server validation and duplicate outcomes remain unverified. Continue with the reviewed scenario and reconcile the source-required markers against observed UI; downstream effects are not yet established.
- PRD_CAS_031-040, 065, 074, 151, 163-186, 210, 223-224, 230: E3/E5/E10 show a workspace, Case Information section and drawers, but do not establish the specified field values, customer/billing/address data, state restrictions, audit-on-change, personal-data access or integrity behavior. Cause: only limited states and one account of unknown role were inspected. Verify reachable read-only fields and states, and identify role/data blockers.
- PRD_CAS_041-060, 096, 116, 187, 190-191, 219-220: E3 shows feed tabs and an internal-feed switch, but channel content, privacy, sending messages, chat/IVR behavior and notifications were not observed. Cause: channel integrations, role and safe recipient are unverified. Establish supported access and safe prerequisites; confirm actual behavior or keep the requirement unresolved.
- PRD_CAS_061-073, 078-079, 093-094, 129, 193, 222, 233-235: E5/E6 show drawer/dialog entry points, an empty Knowledge view and workflow dialog, but do not establish saved watcher/relation/note outcomes, merge/child-case behavior, article content or immutable audit. Cause: no changes were submitted and eligible owned records/targets are unverified. Inspect read-only content and establish safe owned prerequisites before mutation.
- PRD_CAS_075, 095, 123, 155, 188-189, 196, 204, 208, 226: E5 shows a Work Orders drawer only; WFM endorsement, CRM refresh, mass-issue association, profanity screening and integration failure/recovery outcomes were not observed. Cause: integration prerequisites and contracts remain unverified. Verify supported integration paths and reconcile actual behavior with the PRD.
- PRD_CAS_080-092, 097-105, 115-130, 131-150, 152-156, 199-207, 213, 215-217: E7 exposed actions on one Pending Customer Reply case, but assignment, routing, lifecycle transitions, edits, state/role restrictions and notifications were not exercised. Cause: available states, role and E2E-owned records are insufficiently established. Verify each applicable transition and permission boundary safely; resolve the Close visibility mismatch above.
- PRD_CAS_076-077, 106-112, 157-159, 192, 218-219, 229: E5 shows an SLA Usage drawer, but timer values, health thresholds, team timeline, pause/resume, breach escalation, notification and timezone behavior were not verified. Cause: policy, elapsed-state and role conditions remain unknown. Inspect suitable read-only cases and reconcile configured behavior.
- PRD_CAS_209, 225, 227-228: concurrency recovery and the proposed performance, compatibility and accessibility behaviors have no matching observation. Cause: not investigated and targets are unspecified for performance. Define observable criteria where needed and verify against the supported tenant/browser.
- Observed E9: the Cases menu exposes Bulk with Resolve and Close choices and a file-upload stage, but the active PRD has no bulk-action requirement. No file was uploaded and no action was submitted. Record the requirement and supported safe behavior through the owning Cases PRD workflow, then reconcile this candidate against the updated active PRD.
- OQ-01-OQ-15 and other proposed requirements remain unresolved in the active PRD; retain the source and live behavior separately. Resolve the relevant open question with the product owner or targeted evidence before treating its proposed behavior as confirmed.
