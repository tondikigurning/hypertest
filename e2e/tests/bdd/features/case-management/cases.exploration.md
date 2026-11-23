# Cases exploration

## Scenario discovery continuation — 2026-11-23

- Active owner: `docs/prd/case-management/cases.md`; the database PRD is available and includes unvalidated source requirements and observed items. Its existence does not establish that the source proposals are validated. No Cases feature or flow registry existed before this continuation; no Cases scenario identities were found in the checkout.
- Historical note (2026-11-23): the prior continuation incorrectly recorded `ENV` as absent and asked whether STT1 could be reused. For future terminal work, read the current `ENV` from `e2e/.env.local`; it is the source of truth for the current target. At the time of this correction, the file contains `ENV=stt1`. No browser session was active and no new browser observations were made in that continuation. E1–E8 remain usable within their recorded account, state and evidence limits.
- Production restrictions were asked for and remain unresolved. Until resolved, mutation scenarios are not eligible for production runs. No seed-data mutation was authorized or performed.
- The menu is broad enough to need coherent child files and separate reviewable batches because lifecycles, external channels, WFM, customer data and roles require materially different prerequisites. Propose initial read-only list and detail work after flow confirmation; creation, integration and mutation outcomes remain blocked by missing evidence and appropriate data.
- Shared component contracts reviewed: filter-search, filter, pipeline and sort may apply to case-list interactions when their actual control and contract are verified; the generic detail-panel contract cannot yet be assumed to match the observed Cases workspace. Mock contracts and case-specific request details remain unverified. No `@ref` is asserted yet.

## Flow confirmation provenance

- Pending expanded inventory, 2026-11-23: 40 individually named candidates and their exact goals, feature paths, PRD references and evidence limitations are in `cases.flows.md`. Active PRD exact UTF-8 SHA-256: `c58752daae4489876121100e9868cf5d6194ac10bea025540dd595b3f448a8e0`. No inventory decision has been recorded. Feature comparisons: `e2e/tests/bdd/features/case-management/cases/list-and-detail.feature: absent`; `e2e/tests/bdd/features/case-management/cases/create.feature: absent`; `e2e/tests/bdd/features/case-management/cases/workspace.feature: absent`; `e2e/tests/bdd/features/case-management/cases/intake.feature: absent`; `e2e/tests/bdd/features/case-management/cases/communication.feature: absent`; `e2e/tests/bdd/features/case-management/cases/collaboration.feature: absent`; `e2e/tests/bdd/features/case-management/cases/relations.feature: absent`; `e2e/tests/bdd/features/case-management/cases/handover.feature: absent`; `e2e/tests/bdd/features/case-management/cases/assignment.feature: absent`; `e2e/tests/bdd/features/case-management/cases/lifecycle.feature: absent`; `e2e/tests/bdd/features/case-management/cases/editing.feature: absent`; `e2e/tests/bdd/features/case-management/cases/integrations.feature: absent`; `e2e/tests/bdd/features/case-management/cases/sla.feature: absent`. Re-read all sources after the decision; changed sources or scope require renewed confirmation.

- Superseded pending proposal, 2026-11-23: the five-flow list below omitted individually identifiable PRD journeys. It was not confirmed. The expanded candidates in `cases.flows.md` require a fresh inventory decision and source comparison. Owning PRD exact UTF-8 SHA-256 at that proposal: `c58752daae4489876121100e9868cf5d6194ac10bea025540dd595b3f448a8e0`.
- Proposed scope: `TEN_CAS_LIST_FLOW` and `TEN_CAS_VIEW_DETAIL_FLOW` in `e2e/tests/bdd/features/case-management/cases/list-and-detail.feature`; `TEN_CAS_CREATE_FLOW` in `e2e/tests/bdd/features/case-management/cases/create.feature`; `TEN_CAS_VIEW_WORKFLOW_FLOW` and `TEN_CAS_KNOWLEDGE_FLOW` in `e2e/tests/bdd/features/case-management/cases/workspace.feature`. All three feature files are absent. Scope is the observed entry points and outcomes described in `cases.flows.md`, with unverified branches retained as gaps.
- No user flow decision has yet been recorded. Re-read the PRD, compare its exact bytes and check the complete feature paths after a decision; any changed source or inventory requires reconfirmation. A hash and this pending record are not approval.

## Scope and sources

- Owner: Case Management / Cases, including its child journeys and integrations. The supplied source excludes administration in other menus, login, dashboards, knowledge authoring, and execution of field work.
- S1: supplied `prd-cases.md`, version 1.0, dated 2026-11-18, based on the CMS User Manual v1.0 and stakeholder clarifications. Some source requirements are marked proposed and remain unconfirmed.
- Database identifier: `docs/prd/case-management/cases.md`. The shared database had no active Cases PRD when checked on 2026-11-23; an unvalidated, incomplete import was subsequently saved there for continuity. Its source is S1, and it is not yet the complete review proposal. No Cases feature was found in this checkout. The existing convention reserves CAS for Cases.
- Target: configured Converge STT1 tenant; account role and build unknown. Production restrictions: unknown; the user supplied no specific restriction. E1–E3 are reused from the earlier pass; E4–E8 are new observations from this continuation.
- The user requests a menu-wide import. Product intent for source proposals and discrepancies remains unconfirmed.

## Exploration inventory

Opening a screen does not establish a save, lifecycle transition, permission, integration, or message outcome. Source sections 3–4 and 6–11 also contain role, lifecycle, integration, error, notification, nonfunctional, and open-question details requiring individual reconciliation.

| Area or discovered branch | Evidence and remaining gap / next action |
| --- | --- |
| List, search, filters, pipelines and export | E1: list and pipeline controls seen; selection, filtering, counts, export and role-based behavior remain unverified. |
| Channel and manual creation | E2: creation form opened and canceled; validation, saved results, channel creation, duplicates and downstream effects remain unverified. |
| Detail, fields, feeds and workspace actions | E3: one closed case opened read-only; individual fields, source provenance, actions and alternate states require further inspection. |
| Drawers, collaboration, relations, knowledge and WFM | Unattempted; inspect available drawers and their branches and dependencies. |
| Lifecycle, CTS, routing, assignment, SLA/OLA and escalation | Unattempted; inspect safe operations and relevant states with E2E-owned prerequisites and applicable authorization. |
| Source permission matrix, state transitions and flags, §§3–4 | Not fully attempted; compare each rule against available states and record inaccessible roles. |
| Source integrations, errors and notifications, §§6–8 | Unattempted; inspect supported handoffs and outcomes; external access and safe prerequisites remain to be established. |
| Source nonfunctional items, assumptions and OQ-01–OQ-15, §§9–11 | Unverified; retain proposed requirements and open questions with source provenance. |
| Additional pipelines Action Required, Live Agent and Hotline | E1: visible under Others; selection outcomes, membership rules and permissions are unverified. |
| Create form required markers | E2: severity is marked required although S1 calls it optional; description has no required marker although S1 calls it mandatory. Markers alone do not prove validation. Product confirmation and safe branch checks needed. |
| Existing PRD and prior evidence | The shared database now contains the incomplete, unvalidated import. E1–E3 reused; no Cases feature found. |

## Evidence

### E1 — Cases entry and pipelines

- Observed: 2026-11-23, terminal-owned playwright-cli session, configured STT1 tenant and account; role not established. Navigated through Case Management and its Cases menu.
- Attempt and result: Cases list opened with All selected and controls for Assigned to Me, All, Open, Assigned, In Progress and Others. Others exposed Escalated, Pending Customer Reply, Solved, Closed, Cancelled, Action Required, Watched by Me, Live Agent and Hotline. Search, filters, reset, saved views, create and table controls were visible. An existing search was present, so the default state and counts cannot be inferred.
- Verified locators: none generated; temporary snapshot refs used. Requests and safe artifacts: not captured.
- Limits / next action: investigate filtering, selection, counts, access rules, empty states, export and actions. No role comparison was performed.

### E2 — Manual create form

- Observed: 2026-11-23, same target and account. Opened Create New from the list and canceled without submitting.
- Attempt and result: Create New Case showed customer search, Main Entity default Converge, Case Template default Trouble Case, Case Category, disabled Case Outcome, Case Priority, Case Severity, Case Subject, Case Description and Case Source. Severity and Source carried asterisks; Description had none. Create Case was disabled while the form was blank.
- Verified locators: none generated; requests and safe artifacts: not captured.
- Limits / next action: an asterisk does not prove validation. Test relevant branches only with safe E2E-owned prerequisites and permitted effects. S1 says Severity is optional and Description mandatory; product confirmation is pending.

### E3 — Closed case detail

- Observed: 2026-11-23, same target and account. Opened one existing closed case read-only; no identifying case or customer data retained.
- Attempt and result: a row revealed View Case Detail, opening a case workspace with information panels, external feed tabs All, Email and Merged Cases, and an internal-feed switch. More Actions exposed Pop out chat and View Workflow. A disabled unlabeled button was visible; its function is unknown.
- Verified locators: `getByRole('button', { name: 'More Actions' })` for the workspace action menu, generated on the closed-case page. Requests and safe artifacts: not captured.
- Limits / next action: do not infer global closed-case behavior from one screen; inspect drawers, other case states and available roles. No action, message send or mutation was executed.

### E4 — Severity and customer prerequisite

- Observed: 2026-11-23, STT1, same configured account; new terminal-owned browser session. Opened the create dialog, opened and dismissed the severity options without selecting a value, searched customer lookup for `E2E`, then canceled the form.
- Attempt and result: dismissing severity produced no visible validation message; Create Case remained disabled with other required inputs empty. The customer lookup returned “No items match your search.” for `E2E`.
- Limits / next action: neither the empty form nor the failed lookup isolates severity validation. A safe customer and remaining form values are needed to compare the submit-enabled state with severity selected versus unselected. User asked how to find or provision an E2E-owned customer. No submission was made.

### E5 — Filters and detail drawers

- Observed: 2026-11-23, STT1, same configured account and an existing closed case; read-only exploration.
- Attempt and result: Add Filters offered fields including Case Status, Category, Team, Case Source, Priority and SLA/OLA Status. Selecting Case Status opened an `In` condition with status choices; Closed was selectable. Detail tabs opened Customer Address, Related Case, Knowledge, Work Orders, Case Notes and SLA Usage History; Knowledge displayed “No articles found.” for this case. A Case Information drawer was also available. The state of an individual case does not establish whether a drawer is generally conditional.
- Limits / next action: no case mutation, export, message, or external handoff performed. Filter result membership, each drawer's content and all role/state-dependent alternatives remain to be checked. No request bodies or sensitive case details retained.

### E6 — Collaboration, relation and notes dialogs

- Observed: 2026-11-23, STT1, same configured account and existing closed case, without submitting changes.
- Attempt and result: collaboration showed Assigned Agents and Watchers, and Add Watcher opened an Available Agents dialog with search and an initially disabled Add Agents button; it was canceled. Related Case showed zero relations and Add Case Relation opened a dialog with Search Ticket No, Cancel and Save; it was canceled. Case Notes showed “Currently there is no case notes for this case.” and disabled Submit in the initial empty view. More Actions > View Workflow opened a View Workflow dialog; the path and highlighted step were not checked.
- Limits / next action: opening a mutation dialog does not establish whether a closed case can be changed. Addition, removal, save, notes submission, history and other role/state branches remain unverified; use an eligible E2E-owned case and safe dependencies before mutation.

### E7 — Pending case actions

- Observed: 2026-11-23, STT1, configured account of unknown role. Opened an existing case marked as E2E in its subject; its displayed status was Pending Customer Reply.
- Attempt and result: More Actions listed Assign to Me, Assign Case, Close Case, Pop out chat and View Workflow. Close Case appeared in the menu without a disabled marker. No lifecycle action was selected or submitted.
- Limits / next action: S1 CASE-ACT-009 says Close requires Resolved and section 7 says actions not allowed for the status are hidden or disabled. This is a visibility discrepancy for this particular state and account; it does not establish that closing would succeed. Confirm intended visibility and safely investigate any action outcome before treating it as a defect.

### E8 — Severity with a populated form, no submission

- Observed: 2026-11-23, STT1, configured account. To inspect client-side form state only, selected a customer referenced by an existing case, a CTS choice, case outcome, priority and source, and entered a test subject and description. The referenced customer was not changed and no case was created.
- Attempt and result: with those inputs present, severity displayed “Complex” and Create Case was enabled. Severity had initially shown “Select...” on the blank form. The severity menu offered Simple, Complex and Critical; selecting the already-selected Complex did not clear it. The form was canceled without submitting.
- Limits / next action: the particular input that populated severity was not isolated. An enabled button with a severity value does not prove whether a missing value passes client or server validation. No supported clear operation was identified. Ask how to create or select safe E2E-owned customer data before any submission that could notify a customer or affect downstream systems.

## Source requirement inventory

Each source ID below refers to S1. Its sub-branches need individual reconciliation; unattempted items are not live observations.

| Source ID | Current attempt / next step |
| --- | --- |
| CASE-LST-001 | E1: relevant controls seen; behavior, scope and branches remain unverified. |
| CASE-LST-002 | E1: relevant controls seen; behavior, scope and branches remain unverified. |
| CASE-LST-003 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-LST-004 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-LST-005 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-LST-006 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-LST-007 | E1: relevant controls seen; behavior, scope and branches remain unverified. |
| CASE-LST-008 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-LST-009 | E1: relevant controls seen; behavior, scope and branches remain unverified. |
| CASE-LST-010 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-LST-011 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-LST-012 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-LST-013 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-001 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-002 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-003 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-004 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-005 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-006 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-007 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-010 | E2: form opened and canceled; validation, save and branches remain unverified. |
| CASE-CRT-011 | E2: form opened and canceled; validation, save and branches remain unverified. |
| CASE-CRT-012 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-013 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-014 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-015 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-016 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-017 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-018 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-CRT-019 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DTL-001 | E3: workspace opened; individual fields and alternate states remain unverified. |
| CASE-DTL-002 | E3: workspace opened; individual fields and alternate states remain unverified. |
| CASE-DTL-003 | E3: workspace opened; individual fields and alternate states remain unverified. |
| CASE-DTL-004 | E3: workspace opened; individual fields and alternate states remain unverified. |
| CASE-DTL-005 | E3: workspace opened; individual fields and alternate states remain unverified. |
| CASE-DTL-006 | E3: workspace opened; individual fields and alternate states remain unverified. |
| CASE-DTL-007 | E3: workspace opened; individual fields and alternate states remain unverified. |
| CASE-DTL-008 | E3: workspace opened; individual fields and alternate states remain unverified. |
| CASE-DTL-009 | E3: workspace opened; individual fields and alternate states remain unverified. |
| CASE-DTL-010 | E3: workspace opened; individual fields and alternate states remain unverified. |
| CASE-FED-001 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-002 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-003 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-004 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-005 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-006 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-007 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-008 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-010 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-011 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-020 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-021 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-022 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-023 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-024 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-025 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-030 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-031 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-032 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-FED-033 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-001 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-002 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-003 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-004 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-010 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-020 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-021 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-030 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-031 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-032 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-040 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-041 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-042 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-050 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-060 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-070 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-071 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-080 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-DRW-081 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-RTE-001 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-RTE-002 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-RTE-003 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-RTE-004 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-RTE-005 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-RTE-006 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-RTE-007 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-RTE-008 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-SLA-001 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-SLA-002 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-SLA-003 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-SLA-004 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-SLA-005 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-SLA-006 | Unattempted; investigate safe reachable behavior and record exact blockers. |
| CASE-SLA-007 | Unattempted; investigate safe reachable behavior and record exact blockers. |

| CASE-ACT-001 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-002 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-003 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-004 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-005 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-006 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-007 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-008 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-009 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-010 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-011 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-012 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-013 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-014 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-015 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-016 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-017 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-ACT-018 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-NFR-001 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-NFR-002 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-NFR-003 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-NFR-004 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-NFR-005 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-NFR-006 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-NFR-007 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-NFR-008 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
| CASE-NFR-009 | Unattempted; inspect the applicable state and permitted action or record its exact prerequisite and blocker. |
