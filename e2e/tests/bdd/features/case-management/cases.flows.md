# Cases flows

## Flows

| Flow | Outcome | Feature | Status |
| --- | --- | --- | --- |
| TEN_CAS_LIST_FLOW | Find cases through list, pipelines, search, filter, sort and paging | case-management/cases/list-and-detail.feature | written |
| TEN_CAS_EXPORT_FLOW | Export permitted case list to registered email | case-management/cases/list-and-detail.feature | pending |
| TEN_CAS_BULK_STATUS_FLOW | Resolve or close cases in bulk from a supplied case-ID file | case-management/cases/bulk.feature | written |
| TEN_CAS_VIEW_DETAIL_FLOW | Inspect case, customer, billing, address, summary and SLA information | case-management/cases/list-and-detail.feature | written |
| TEN_CAS_CREATE_FLOW | Manually create and route a case; validate input and cancel safely | case-management/cases/create.feature | written |
| TEN_CAS_DUPLICATE_FLOW | Decide whether to create or view an existing potential duplicate | case-management/cases/create.feature | written |
| TEN_CAS_INBOUND_CASE_FLOW | Create and enrich a case from an inbound interaction, including unknown sender reply | case-management/cases/integrations.feature | pending |
| TEN_CAS_MASS_ISSUE_FLOW | Link reports to a confirmed mass issue | case-management/cases/integrations.feature | pending |
| TEN_CAS_CHANGE_CUSTOMER_FLOW | Relink a case and refresh customer data | case-management/cases/editing.feature | written |
| TEN_CAS_VIEW_FEEDS_FLOW | Read external and internal interaction history for the case origin | case-management/cases/communications.feature | written |
| TEN_CAS_SEND_EMAIL_FLOW | Send customer email and observe the resulting history and audit | case-management/cases/communications.feature | written |
| TEN_CAS_LIVE_CHAT_FLOW | Receive and handle a live chat and its alerts | case-management/cases/communications.feature | pending |
| TEN_CAS_IVR_CALL_FLOW | Receive an IVR case, handle call and notes, or observe RNA | case-management/cases/communications.feature | pending |
| TEN_CAS_WATCHERS_FLOW | Add or remove watcher without changing ownership or SLA | case-management/cases/collaboration.feature | written |
| TEN_CAS_ACTIVITY_FLOW | Inspect immutable activity history with actor and timestamp | case-management/cases/collaboration.feature | written |
| TEN_CAS_CASE_RELATION_FLOW | Add a case relation and see the related case | case-management/cases/collaboration.feature | written |
| TEN_CAS_MERGE_FLOW | Consolidate duplicate cases and preserve their interaction history | case-management/cases/collaboration.feature | pending |
| TEN_CAS_KNOWLEDGE_FLOW | Find and read CTS-matched knowledge or see an empty state | case-management/cases/collaboration.feature | written |
| TEN_CAS_HANDOVER_FLOW | Record and read team handover history | case-management/cases/collaboration.feature | pending |
| TEN_CAS_START_TICKET_FLOW | Start assigned work and begin the team OLA | case-management/cases/lifecycle.feature | written |
| TEN_CAS_ASSIGN_FLOW | Assign an open case to an agent | case-management/cases/assignment.feature | written |
| TEN_CAS_UNASSIGN_FLOW | Return an assigned case to its team's open queue | case-management/cases/assignment.feature | written |
| TEN_CAS_TRANSFER_AGENT_FLOW | Transfer an assigned case to another agent | case-management/cases/assignment.feature | written |
| TEN_CAS_SUBMIT_DEPARTMENT_FLOW | Transfer or advance/return a case through allowed departments | case-management/cases/assignment.feature | pending |
| TEN_CAS_AUTO_ASSIGN_FLOW | Route and assign by profile, availability and capacity, or retain open queue | case-management/cases/assignment.feature | written |
| TEN_CAS_PENDING_REPLY_FLOW | Request customer information and freeze timers; return to open on reply | case-management/cases/lifecycle.feature | written |
| TEN_CAS_RESOLVE_FLOW | Resolve with remarks and notify the customer | case-management/cases/lifecycle.feature | written |
| TEN_CAS_CLOSE_FLOW | Close a resolved case and preserve a read-only final state | case-management/cases/lifecycle.feature | written |
| TEN_CAS_REOPEN_FLOW | Reopen or re-engage a resolved case | case-management/cases/lifecycle.feature | pending |
| TEN_CAS_CANCEL_FLOW | Cancel an abandoned chat or IVR case | case-management/cases/lifecycle.feature | written |
| TEN_CAS_EDIT_CASE_FLOW | Update permitted case fields and observe saved values and audit | case-management/cases/editing.feature | written |
| TEN_CAS_EDIT_CTS_FLOW | Change classification and apply workflow implications | case-management/cases/editing.feature | written |
| TEN_CAS_CREATE_CHILD_FLOW | Create an independently tracked child linked to its parent | case-management/cases/assignment.feature | written |
| TEN_CAS_VIEW_WORKFLOW_FLOW | Inspect the current and possible workflow steps | case-management/cases/assignment.feature | written |
| TEN_CAS_ENDORSE_WFM_FLOW | Endorse an eligible case and see its linked work order | case-management/cases/integrations.feature | written |
| TEN_CAS_SLA_ESCALATION_FLOW | Track SLA/OLA health and breach escalation | case-management/cases/lifecycle.feature | written |

## Gaps

- PRD_CAS_022/232: observed field markers differ from source requiredness; actual severity and description validation is unresolved. Safely investigate the field rules and seek product clarification.
- PRD_CAS_029: the source requires Proceed Anyway and View Existing Case. In E13 and E16, only Go Back & Edit and View Existing Case were available; View Existing Case opened the existing case, while Go Back & Edit restored the populated create form. No duplicate was created and notification behavior is unverified. Reconcile the actual options and intended duplicate behavior.
- PRD_CAS_005: the source names channel as a filter. In E17, Add Filters exposed Case Source but no separate Channel label; whether Case Source represents the source's channel filter is unverified. Confirm the mapping and filter behavior.
- PRD_CAS_082: the source says unassigning an Assigned case returns it to Open. In E15, Unassign Case was allowed from In Progress; the success message said Unassigned, the agent cleared, and status remained In Progress. Check the source precondition against further observed states and clarify the intended transition.
- PRD_CAS_206 and 088/199: Close Case was visible on a Pending Customer Reply case, although the source requires Resolved; submission was not attempted. Investigate with owned data and clarify intent.
- PRD_CAS_040/207 and 233/234: relation and watcher controls were visible on a closed case; no save was attempted, so read-only behavior is unresolved. Investigate using owned cases.
- PRD_CAS_239–240 record Bulk's observed preparation controls (E20–E21), but the source has no bulk-specific requirements; submission, permissions, file validation, outcomes and effects remain unverified. Obtain safe owned-case prerequisites and clarify product intent.
- PRD_CAS_243 records the observed case-view activity (E19), not explicitly enumerated in the source audit events. Clarify intended event and retention behavior; observation does not establish product intent.
- PRD_CAS_011/130/211: Export is visible (E20), but permission, email delivery, fields and failure behavior have not been observed. Use an authorized account and a safe destination to investigate.
- PRD_CAS_014–020/030/051–060/138–139/186–191/196: inbound creation, mass-issue linking, live chat, IVR and upstream enrichment remain unobserved because channel access and safe test data were unavailable. Establish controlled upstream test access and observe each result.
- PRD_CAS_043–045/096/187/208: outbound customer email, sender identity, delivery and audit remain unobserved; arrange a safe recipient and scoped messaging authorization.
- PRD_CAS_066–070/078–079/222: audit event types and immutability, duplicate merge and handover outcomes are unobserved beyond E19 and prior unsaved dialogs. Use appropriate owned cases and roles, and inspect effects before mutation.
- PRD_CAS_083–085/098–105/140–142/195/202–203: agent and department transfer and auto-assignment outcomes remain unobserved; the inspected account had no available agent for assignment (E15). Obtain suitable agents, work profiles and owned cases.
- PRD_CAS_083 specifies Assigned as the precondition for agent transfer; E23 found Transfer Case available on an In Progress case and opened its dialog, but did not submit a transfer. Investigate allowed states and seek product clarification before concluding whether the action succeeds.
- PRD_CAS_088–089/136/147–149/199/206–207: successful close/reopen and closed-case immutability are unobserved; E7 only showed Close on a different state. Establish a suitable owned case and safe notification effects, then clarify the source mismatch.
- PRD_CAS_075/095/123/155/188/204/208: WFM endorsement and work-order synchronization remain unobserved; arrange an eligible owned case and controlled WFM access.
- PRD_CAS_034/076/106–112/154/157–159/192/218: SLA/OLA thresholds, breach and escalation remain unobserved; obtain suitable owned cases and testable policy thresholds.
- PRD_CAS_024/162/189: the inspected create-form template selector offered only Trouble Case, not Mass Issue (E31); account, configuration and feature availability are unresolved. Check eligible configuration and role before deciding whether the source requirement is absent.
- PRD_CAS_095/188/204: the inspected In Progress Service case had no Endorse to WFM action (E31); permission, case eligibility and configuration are unknown. Check a suitable role and state before deciding whether the source requirement is absent.
- E25's Bulk Resolve template headers and header-only file selection/removal behavior, E28's email draft validation/discard, and E32's transfer-review Back behavior are observed but not explicitly specified in the active PRD. Record these observations through the PRD workflow and clarify intended validation; a header-only file enabling Apply does not establish server acceptance.
- E35's unsupported-file feedback and selected-file retention when switching bulk action, E39–E40's status/permission-specific email restrictions, and E37's activity filtering are observed behaviors not explicitly specified in the active PRD. Propose the observations through the PRD workflow and clarify intended restrictions, especially supervisor access under PRD_CAS_096; the inspected account's role is unknown.
- PRD_CAS_108/157–159 uses Healthy, At Risk and Breach; E44's SLA Status filter listed Healthy, Unhealthy and Breached. Whether Unhealthy corresponds to At Risk and whether filter values map to the source health states are unverified. Clarify the mapping and inspect controlled threshold cases.
