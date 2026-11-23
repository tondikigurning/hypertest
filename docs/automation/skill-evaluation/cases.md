# Synthetic workflow exercises

For each request below, use the matching skills in the supplied snapshot. Work offline; these are independent cases, with no live credentials, tenant access, repository mutation or publication. Write the next allowed actions, any artifact/status you can truthfully produce, and your user-facing response. Treat host capabilities and facts below as the complete exercise context. You may use filesystem tools only to read the snapshot and write the exercise response. Do not execute tenant tests or access the network.

## Case 1
Host: Q-Rex. User: Implement the approved list scenario for Orders and finish this batch.
Current draft: branch draft/orders, base abc123; Changes snapshot D1 was manually approved. Feature e2e/tests/bdd/features/example/orders.feature contains TEN_ORD_LST_E2E_001, flow TEN_ORD_LIST_FLOW, read-only list outcome. Matching parent PRD is reviewed; locator evidence for the existing list POM is current. All scoped existing data follows project conventions. The existing steps and fixtures are known and reusable. Tool surface: list_files, read_file, write_file, edit_file, show_diff, ask_user, confirm_flows, use_skill, and managed playwright_cli (snapshot/find/requests/console/goto/click/fill/press/check/uncheck/select/generate-locator/close). No shell, collection, typecheck or draft execution tool is available. No external validation evidence has been supplied.

## Case 2
Host: Q-Rex. User: Yes, I approve those scenarios, implement them now.
Scenario batch for example/orders.feature is written. Flow confirmation exists; scenario Changes panel is not approved. Allow-all is off. Use the same tool surface as Case 1.

## Case 3
Host: Q-Rex. User: Finish reviewing the Orders PRD.
The requested scope has been explored safely. The full draft is prepared with three uncontested spec items, two observed candidates, one unresolved discrepancy, and recorded evidence. Prior context is complete. No PRD review decision has been made. Q-Rex write_file/edit_file automatically present the complete proposed PRD for native approval when the proposed content has status reviewed or adds validated items, and save only after acceptance. The active environment is selected; variables are configured. Allow-all is off.

## Case 4
Host: Q-Rex. User: Verify the missing locator data-testid and capture a trace for the defect we just saw.
Use the same restricted browser actions as Case 1. The snapshot contains the affected button as e8. No full request details, eval, run-code, screenshot or tracing tool is exposed.

## Case 5
Host: terminal coding agent. User: Create the product context for Article Management; I have supplied the business rules.
The matching menu has no existing PRD or scenario IDs. Browser exploration can be performed safely in the requested environment; no results have yet been supplied in this exercise. Need a proposed menu code that will pass into scenario authoring. No mutation permission is established.

## Case 6
Host: terminal coding agent. User: Draft two create scenarios for survey templates using our data convention.
Scope and flow list are already confirmed, PRD is reviewed, safe current browser observations are available, and E2E-owned creates are authorized. Both creates need distinct unique names in the same minute. Use the existing helper contract e2eValue(label, date) => E2E <label> <DDMMYYYYHHmm>; equal labels and dates in one minute return the same string. No change to timestamp format was requested.

## Case 7
Host: Q-Rex. User: Continue with the next batch in this draft.
The previous batch is externally verified against its exact current source and patch; every required scenario passed in the intended environment and results have been recorded. Its gates are complete. This is a later user turn in the same persisted draft session. The next scoped flow inventory is known but its scenarios are not written.

## Case 8
Host: Q-Rex. User: Refresh the PRD for the integration child of Cases.
The owner is case-management/cases, which already has one reviewed parent PRD and stable validated IDs. Only the new integration scope lacks coverage. Separate-platform access is unavailable; same-origin read-only discovery is available. Allow-all is enabled for this draft session. No additional human review decision has been made.

## Case 9
Host: Q-Rex. User: Continue writing scenarios for the confirmed Orders create flow.
The active PRD and current safe browser evidence establish successful creation, duplicate-name rejection and cancellation without creating a record. A separate role is documented as denied creation, but this role is unavailable. An existing scenario asserts successful creation only. The menu registry says the flow is pending; no scenario-only changes have been written in this turn. Describe the meaningful coverage and gap, without inventing the unavailable role's observed UI.

## Case 10
Host: Q-Rex. User: Prepare the next scenario batch.
An earlier scenario batch was approved in Changes. Its implementation and execution are pending, and the draft contains no implementation changes. The current PRD, flow confirmation and browser evidence cover the next batch. Explain whether authoring can continue and what snapshot must be reviewed. Then state how the answer changes if implementation edits are already present in this draft.

## Case 11
Host: Q-Rex. User: Implement the approved Orders batch. The same draft session's scenario review recorded the target environment, page and role, observable outcome, and verified locator expressions for every required interaction. The Changes panel approved the current exact feature snapshot. No relevant UI or environment change is known; the browser is now unavailable. Existing steps, fixtures and mock contracts are accessible. Explain which evidence can be reused, whether another browser visit is required, the applicable checks and the batch's attainable state.

## Case 12
Host: Q-Rex. User: Implement the approved Orders batch. Scenario-phase evidence covers the current list page, but the new edit dialog has only an old `e17` snapshot ref and an unknown save control; a separate role's branch was inaccessible. The current feature snapshot is approved and the managed browser is available. Explain what to reuse and what needs targeted investigation, including fresh refs and live-data boundaries. Then explain the outcome if the browser is unavailable or the required locator cannot be verified.

## Case 13
Host: Q-Rex. User: Implement the approved Orders batch in a new session. Previous chat is unavailable, but this workspace contains the current approved feature snapshot, owning PRD and menu flow registry. Its sanitized handoff has the exact selected scenario contract, a matching PRD content reference, the requirement mapping including a shared rule, and verified applicable locators. The environment and UI have not changed; live browser access is unavailable. Explain how to compare and reuse the mapping and evidence, any approval or verification distinctions and how to proceed. Then explain what changes if the registry is absent in this workspace, its evidence is stale, or the host has no applicable scenario approval decision.

## Case 14
Host: Q-Rex. User: Implement the approved Orders batch after a new chat. The registry includes the original scenario contract and mapping, but the current feature changes the approved observable outcome; the PRD shared rule also changed. The host has approved the current feature snapshot, and the UI version is unknown. The registry was edited after approval. Explain how to identify the affected mappings and evidence, which facts the approval does and does not establish, and how to continue without inventing a match or repeating unrelated discovery. Contrast this with a handoff whose scenario excerpt was sanitized and cannot be compared exactly.

## Case 15
Host: terminal agent. User: Implement the Orders batch in a new session. Conversation history is unavailable. The same workspace contains the handoff, a manual review record of an explicit approval with exact batch identities and matching raw-byte SHA-256 for each current feature file, and verified locator evidence for the same environment, page and role. The active PRD is unavailable, so its version and the mapping cannot be checked. The browser is also unavailable. Explain whether the decision and locator can be reused independently, what remains uncertain, and which work and validation can proceed.

## Case 16
Host: terminal agent. User: Continue with the Orders scenarios. A review record exists but one feature file changed after the recorded manual acceptance; a second unchanged batch has its own valid record. Explain how to handle each batch, including exact scope and independent work. Then explain what changes if the feature hashes match but the only record says `pending`, or the approval happened in a lost chat and was never recorded.

## Case 17
Host: terminal agent. User: Finish the reviewed Orders scenario batch and implement it. The scenarios and handoff have been prepared but the user has not yet reviewed them; the feature includes uncommitted edits. Explain what to record and present before stopping. On the next turn the user explicitly accepts the exact presented batch: explain what to check and record before implementing. Contrast a changed feature file or an ambiguous answer, and a session ending before the decision is saved.

## Case 18

Host: terminal agent, same conversation. User: Continue from the Orders PRD into scenarios. The active database PRD for example/orders references E1–E4. Earlier in this conversation, PRD exploration established navigation, list, successful E2E-owned create with a saved row, duplicate rejection and cancellation without creating data. Each observation has its date, target, role/state and verified locator expressions. No relevant UI or target change is known. The same task-owned CLI browser is open, its supported commands were already checked, and no flow registry exists yet. The shared exploration file has not been saved. Flow confirmation and scenario review have not occurred. Explain the next actions and any browser work needed.

## Case 19

Host: Q-Rex, new conversation in the same persisted workspace. User: Write the Orders create scenarios. The active PRD and menu's `.exploration.md` are accessible; the record contains the observations and branches from Case 18 with source references matching the current artifacts. The former chat is unavailable; no `.flows.md` or host flow/scenario decision exists. Browser Variables are not set and the browser cannot start. The target and role are unchanged, no relevant UI change is known, and all required observed outcomes and locators are recorded. Use the managed tool surface from Case 1. Explain what can proceed, what needs a decision and what evidence should be saved.

## Case 20

Host: terminal agent. User: Review this imported Orders PRD proposal. The same session previously explored its complete requested scope and saved the menu record with actual dated observations, outcomes and gaps. The imported source adds citations but no new behavior, role or state. The proposed PRD is saved with new items unvalidated; explicit review is still pending. The browser is now unavailable. Explain whether additional exploration is required, the review procedure and handoff. Then explain how the answer changes if the user instead asks to re-verify only the delete behavior after a UI deployment.

## Case 21

Host: Q-Rex. User: Continue the confirmed Orders edit batch using the PRD discoveries. The shared record establishes navigation, list and the edit outcome for the selected target/role/state, with applicable locators for every required control except Save. Save has only an old `e17` ref. Flow confirmation covers the current files and PRD. A separate role branch remains blocked because no account is available; nothing about that prerequisite changed. Browser access is now available with the restricted actions from Case 1. Explain the exploration scope, persisted evidence and review boundaries. Then explain what changes if the only saved locator expression contains a redacted dynamic record identity that cannot be reconstructed safely.

## Case 22

Host: terminal agent, new session. User: Implement the approved Orders batch. Its current feature bytes and exact batch match a recorded explicit manual scenario acceptance. The shared exploration file and old flow handoff are accessible. The PRD has changed one shared business rule since the handoff; its effect on the mapping is not yet checked. Independent locator evidence still identifies the same environment, page, role and UI state; no relevant UI change is known, but the UI build version was never recorded. The browser is unavailable. Explain how to assess the changed source and locator separately, and where any new implementation-phase browser findings should be saved later.

## Case 23

Host: Q-Rex, new draft based on committed HEAD. User: Continue my earlier Orders discovery. The database PRD is accessible. The earlier draft's exploration and flow records were never committed and are absent from this workspace; its chat is unavailable here. The accessible PRD has three dated factual observations with environment/role/outcome and one unverified deletion requirement, but no locator expressions. The current selected environment differs from the observed one. No evidence establishes that the same tenant/configuration/UI applies. Browser access to the new target is available. Explain what can be recovered, what needs investigation and what workspace actions are appropriate. Do not claim access to files outside this exercise.
