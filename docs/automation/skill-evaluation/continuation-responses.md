# Continuation exercise responses

These are next-action decisions, not performed workflow actions. I read only this synthetic snapshot. No browser, network, database, credentials, tests, publication or repository changes were used. No source bytes, digest, approval record, locator, file identity or result is fabricated below.

The common routing rule is the `.agents/skills/ask-qa/references/workflow-contract.md`, especially **Continue and resume**, **Read only what the next action needs**, host review gates and completion states. Evidence reuse follows `.agents/skills/ask-qa/references/exploration-context.md`. Each case is independent.

## C1 — Completed PRD, same chat

**Next action:** Apply `.agents/skills/write-e2e-scenarios/SKILL.md` to Orders. The later “Lanjut” authorizes the next phase after the completed PRD-only request. Reconcile the complete flow inventory from the active PRD, E1–E4, the menu exploration inventory and existing feature assertions. Assess list behavior, create success, duplicate rejection and cancellation as supported outcomes; group them by business goal rather than treating each observation as a separate flow or assuming one scenario per flow.

**Reuse and source checks:** Reuse the current business answers, production restrictions, target/role, readiness and verified locator observations. Load the next skill and any genuinely missing references once. Use scoped change/version/content indicators, not a wholesale reread. Inspect the complete owning-menu feature/ID inventory and applicable shared contracts needed for coverage and stable allocation. Before requesting terminal flow confirmation, obtain the exact active PRD UTF-8 comparison and complete feature raw-byte comparisons required by `.agents/skills/write-e2e-scenarios/references/flow-registry.md#flow-confirmation-provenance`; represent an absent new feature as absent. Do not invent identifiers, counts or digests from the exercise.

**Browser, execution and boundary:** The stated applicable observations satisfy the live discovery prerequisite. No login, freshness visit, replay or test run is needed. Save only changed inventory/provenance and continuation facts. Present the complete proposed inventory with exact paths, flow IDs, requirements, evidence, branches, gaps and exclusions, then stop for explicit flow confirmation. Do not author Gherkin or implement before the relevant later decisions. After actual flow confirmation, verify the source comparisons, record the decision and proceed to scenario authoring and its separate review.

**Short user-facing response:** “I’ll continue Orders with flow discovery, using the accepted PRD and E1–E4. I’ll reconcile the supported outcomes with existing coverage and present the complete flow inventory for your confirmation; the recorded browser evidence does not need replaying.”

## C2 — Pending decisions

**Position A, PRD review pending:** Remain in `.agents/skills/write-prd/SKILL.md`. “Continue” does not accept the exact unvalidated proposal. Identify that same proposal and the outstanding explicit decision, preserving any actually active saved version separately. No new discovery, database validation, scenario phase or independent tool work should follow the renewed review request before an answer. A user can explicitly defer validation and choose an existing active version with uncertainty retained; this message does not do so. An unsaved proposal cannot become the active PRD through inference.

**Position B, scenario review pending:** Remain in `.agents/skills/write-e2e-scenarios/SKILL.md`. Flow confirmation does not approve scenarios; pending raw-byte digests establish identity, not acceptance. Refer to the already presented exact feature changes, paths and scenario identities and request the missing explicit scenario decision. Do not activate implementation or record acceptance. Before later recording a real acceptance, recompute the complete-file digests and verify the scope/identities under the `.agents/skills/write-e2e-scenarios/references/flow-registry.md#terminal-scenario-review-record`. Changed content requires the current affected batch to be presented again.

**Reuse, browser and boundary:** Both positions retain the known menu, evidence and answers. No interview, discovery replay or test run is warranted. The skill contract says “Continue alone neither answers a question nor accepts a PRD, flow list or scenario snapshot.” Once the concrete decision is requested, stop the turn and wait; silence is not an answer.

**Short user-facing responses:**

- PRD: “The exact Orders PRD proposal is still awaiting your explicit review decision. Please approve the proposal already shown, or identify the changes you want.”
- Scenarios: “The Orders scenario batch already shown is still awaiting explicit acceptance. Please approve that exact batch or identify changes; its pending digests do not record approval.”

## C3 — Explicit acceptance in an authorized pipeline

**First action this turn:** Before implementation or other independent work, recompute SHA-256 from the raw bytes of every complete feature file in the pending batch, including uncommitted changes. Check exact paths, selected scenario identities and scope, including inherited context. Compare with the pending review snapshot. If unchanged, record the just-received explicit manual acceptance, actual decision date, established reviewer identity or `identity not recorded`, and a recoverable decision reference where available. Do not invent metadata. This follows the `.agents/skills/write-e2e-scenarios/references/flow-registry.md#terminal-scenario-review-record`.

**Then:** The full pipeline is already authorized and this single batch completes the requested scenario scope. Apply `.agents/skills/write-e2e-code/SKILL.md` in the same turn and start implementation, rather than ending with an acknowledgment alone. Reuse the current evidence, requirement mapping and implementation paths; read changed or missing affected contracts, bodies and callers. Keep exact scenario intent, assertions and permanent IDs. Verify bindings, exact collection and scoped E2E types using inspected runner/configuration; only perform live execution under its separate safety and host permissions. The approval grants neither a pass nor seed-data mutation permission. No discovery replay is justified by the skill switch.

**If one file differs:** Do not record acceptance for changed contents or implement them as approved. Determine the current affected scope and present its exact current changes for a new explicit decision, then stop for review. Any edit anywhere in a recorded file changes its complete-file identity, even if one selected scenario's text appears unchanged. Preserve unaffected valid decisions where they exist; a pending digest is not such a decision. Do not silently restore the old file, reset user changes, transfer the approval or claim the new content was accepted.

**Short user-facing response, unchanged case:** “I’ll verify that the feature bytes still match the reviewed batch, record your explicit acceptance, and continue implementing Orders in this turn. I’ll keep implementation checks and live test results separate from scenario approval.”

**Short user-facing response, mismatch:** “One feature file no longer matches the batch you accepted. I’ll present the current affected batch for explicit review before implementing those changes.”

## C4 — Q-Rex across manual gates

**Native PRD acceptance in this turn:** Report the accepted, saved PRD and stop, even though the original request covers the whole pipeline. Preserve the continuation point to Orders scenario discovery. Do not add a second blanket PRD confirmation. This is the manual-host exception in `.agents/skills/write-prd/SKILL.md` and the shared contract.

**Later “Continue” turn after PRD completion:** Use Q-Rex `use_skill` for `.agents/skills/write-e2e-scenarios/SKILL.md`. Reuse the active PRD, answers and applicable observations. Check available scoped source indicators and assemble the complete flow inventory. Use native `confirm_flows` with the owning PRD, exact feature path and described flow IDs for each affected file. Actual confirmation permits scenario authoring; it does not itself approve scenarios. There is no missing browser fact, so do not reopen/replay the browser.

**Complete batch shown; chat says “Yes, continue to code”:** Chat Yes is insufficient in Q-Rex manual mode. Keep the exact cumulative changed-feature snapshot available through `show_diff`, point the user to the Chat scenario approval control and Changes, and stop. Do not activate `write-e2e-code` or perform implementation writes. An unapproved changed-feature snapshot blocks those actions workspace-wide, including baseline implementation. Do not substitute a Markdown review record for the native decision.

**Native scenario control succeeds; new “Lanjut” turn:** Check the actual native decision against the current cumulative feature snapshot and scope. With the full planned scenario scope approved, activate `.agents/skills/write-e2e-code/SKILL.md`, reuse the known evidence and implement eligible code. Inspect only missing/changed relevant sources and callers. No redundant scenario review or browser discovery is required.

**Verification boundary:** With the listed capabilities, report source/binding inspection and an **implementation draft; checks pending**. Do not claim `implemented` or `verified` without matching collection/type and complete execution evidence. Do not run shell, collection or type commands through browser tools. If the dedicated native draft runner is actually available, it is limited to one uniquely identified approved and implemented scenario with E2E-owned data, browser Variables and separate explicit scoped data-safety approval; its results remain temporary and do not verify the whole batch or upload evidence. Its availability is not asserted by this case's tool list.

**Short user-facing responses:**

- PRD acceptance: “The Orders PRD was accepted and saved. I’m stopping here for this manual PRD approval turn; the next action is flow discovery.”
- Later continuation: “I’ll continue Orders with the complete flow inventory, reusing the recorded observations and using native flow confirmation.”
- Chat-only scenario acceptance: “Please approve the current scenario snapshot using the scenario control in Chat or Changes. Q-Rex manual mode requires that native decision before code work.”
- After native acceptance: “I’ll continue with the approved Orders snapshot and write the implementation draft. Collection and type checks remain pending in this host.”

## C5 — Remaining scenario batches

**Immediate action:** Stay in `.agents/skills/write-e2e-scenarios/SKILL.md` and author Batch B, the first unfinished part of the existing two-batch plan. Reuse the 20 confirmed flows, their ordering, current PRD, evidence, restrictions and source/implementation map. Check scoped current source indicators and native decision identity, rather than repeating the interview, flow confirmation or exploration. Examine every Batch B flow's primary outcome and material supported branches against actual existing assertions. Ten flows do not imply ten scenarios; no scenario count can be determined from the supplied facts.

**Review/code boundary:** Batch A approval covers its previous cumulative snapshot. Authoring B changes the feature snapshot and invalidates that approval for the new cumulative state. Save the affected handoff/mappings and continuation point, preserving IDs, original evidence dates and unresolved branches. Present all required review fields for the complete current cumulative A+B snapshot through `show_diff` and stop for native scenario approval. Do not implement A first: there are no existing implementation edits to justify creating the host restriction that would block the later scenario review. Only after the remaining scenario-only work is finished and the current cumulative snapshot has actual native approval may `write-e2e-code` start. Retain unavailable branches with their next actions; do not claim full authored coverage when they remain unresolved.

**Browser/execution:** No evidence gap or source/UI change is given, so no browser replay or execution is needed. No collection/type result or test pass is implied by the batch review.

**Short user-facing response:** “I’ll author Batch B from the remaining ten confirmed flows, including each supported outcome and branch. Then I’ll present the cumulative A+B scenario snapshot for native approval before starting code.”

## C6 — Recovery after compaction

**Recover, then route:** Identify the same checkout/database and recover the continuation entry, active Orders PRD, referenced feature files, source map, relevant batch handoff and review record. Follow these known pointers before broad repository searches. Apply `.agents/skills/write-e2e-code/SKILL.md` for the implementation endpoint. Compaction is not a reason to repeat interviews or every earlier phase.

**Source mappings:** Compare the active PRD with the saved version/content reference and the current scenario contracts with the saved feature snapshots. The shared-rule change makes affected mapping rows and dependent requirements require reassessment; they cannot be called exact matches. Update the affected coverage/intent assessment and retain unaffected rows. If the changed rule materially alters the confirmed flow scope/support, use the affected flow-confirmation procedure; if complying requires changed Gherkin intent, return to scenario authoring/review for that change while retaining the implementation objective. The content of the new rule is not supplied, so neither an automatic full restart nor automatic acceptance of its effects is justified.

**Scenario review:** The case establishes a recovered explicit manual acceptance, matching complete-file raw-byte digests and scenario identities. Reuse that decision for the unchanged current scenario snapshot. A changed PRD mapping does not alone invalidate approval of unchanged feature bytes. The continuation entry itself grants no approval. Do not ask for the same already evidenced decision again; new intent still needs its own current decision.

**Locators and feasible code:** Independently assess each recorded locator's evidence, target, page, role/state and known UI changes. The given locator observations remain applicable; retain their original observation dates. Do not discard them because the PRD changed or the browser is unavailable. Implement approved, intent-preserving scope supported by those facts, recovering relevant steps/POMs/COMs/fixtures and callers as needed. Missing live access blocks only specific facts that actually require fresh evidence. Non-live bindings, exact collection and scoped types may be feasible in a terminal after command/configuration inspection; no check is claimed performed in this exercise. Report live execution as pending/unavailable. Never infer a current live-data permission or re-use an old record identity for mutation from the recovered handoff.

**Persistence/boundary:** Update only changed mapping, blocker and continuation facts. Preserve unrelated work and valid decisions. Resolve any consequential unknown product-intent decision at the existing gate; do not weaken an assertion to avoid it.

**Short user-facing response:** “I’ll recover the Orders handoff and continue implementation using the matching recorded scenario approval and applicable locators. The changed shared PRD rule needs a targeted mapping review; only affected intent or missing evidence will pause that part of the work.”

## C7 — Specific missing evidence and unchanged blockers

**Next action:** Continue `.agents/skills/write-e2e-code/SKILL.md` for the natively approved exact batch, verifying the current native snapshot decision and scoped source indicators. Reuse the current instructions, paths, observed edit success and all applicable verified controls. Apply `.agents/skills/playwright-cli/SKILL.md` with the `.agents/skills/write-e2e-scenarios/references/playwright-cli-exploration.md` only for the Save locator gap.

**Targeted browser work:** State the missing question: which reusable, correctly scoped locator identifies Save in the observed edit state? Navigate through known prerequisites as needed using the configured managed session and selected environment/Variables, respecting native browser approvals and dataOwner scope. Obtain a fresh snapshot or `find`, then use `generate-locator` on a current ref; resnapshot after navigation/rerender. The old temporary `e17` is neither current nor a verified reusable locator. Verify actual scope/semantics/uniqueness through supported evidence; do not invent a role, selector, `.first()` fallback or request schema. If inspecting the form can establish the locator, there is no reason to resubmit or replay known edit success. Any necessary mutation retains exact E2E ownership/scoped permission and cleanup requirements.

**Persistence:** Save the newly verified expression, its scope, actual dated observation, role/state, readiness and limitations in the owning `.exploration.md` Evidence entry; update affected scenario-handoff references and continuation facts in place. Preserve previous evidence IDs and dates. Do not fabricate snapshots, images, traces or artifact paths. If supported tools cannot verify Save, mark only its dependent code incomplete and name that exact next action.

**Unchanged blocker and limits:** Retain the manager-only branch's missing-account blocker and next action. Do not retry it or re-ask for the same missing account without a changed prerequisite or explicit retry request. Continue independently supported eligible implementation. No eval, screenshot, trace, full request details, arbitrary JavaScript or shell workaround is available. As a Q-Rex draft, collection/types and any execution lacking a supported separately authorized runner remain pending; one observed edit success is not a new test pass or whole-batch verification.

**Short user-facing response:** “I’ll inspect only the Save control to obtain a supported reusable locator, then continue the approved implementation. I’ll keep the manager-only branch blocked on its unchanged account prerequisite and preserve the existing successful-edit evidence.”

## C8 — Scope end and check reuse

**Next action:** Finish any genuinely missing exact-scope accounting or useful handoff, then report the selected batch's actual state. If its existing continuation/blocker entries are already accurate, reuse them without another write. Do not move to another menu, expand the batch, publish, restart discovery or rerun unchanged successful checks merely because the user said “Lanjut.”

**Source checks and verification:** Check only scoped indicators needed to confirm the patch and selection remain unchanged before reusing their recorded exact collection and scoped type results. The case supplies that they are unchanged, so those successful checks need no rerun. Preserve the representative live pass for the exact scenario/source/environment actually exercised. Keep the required second scenario **blocked/not run** with its recorded data prerequisite and next action. A general continuation with no changed prerequisite or explicit retry request does not justify repeating that blocked experiment, mutating seed data, inventing a mock or weakening the contract. Do not invent a new refusal, seed-data approval, runtime skip or test result.

**Reportable states:** Code plus matching successful bindings/collection and scoped types supports `implemented` for that exact eligible selection. The representative scenario has its actual pass evidence. The batch is not `verified`, because every required scenario has not passed. Distinguish execution from evidence upload and preserve any other actual failure/skip/mock/quarantine states without inventing them. No new browser exploration or live run is useful under the supplied unchanged blocker.

**PRD-only contrast:** If the original request was only the PRD and the terminal user explicitly accepted its exact proposal without asking to continue, verify that accepted representation and current database contents, then save only agreed validations and truthful manual metadata using the accepted-content SHA-256 and stale-write protection required by `.agents/skills/ask-qa/references/prd-database-access.md`. Acceptance alone does not expand a single-phase request. Report the saved PRD and stop; scenario discovery is a possible later continuation, not work authorized merely by the acceptance.

**Short user-facing responses:**

- Selected implementation batch: “The selected batch is implemented, with collection and scoped types passed for the unchanged patch. The representative live scenario passed; the required second scenario remains not run because its safe-data prerequisite is unchanged, so the batch is not fully verified.”
- PRD-only acceptance: “I’ll record your acceptance of the exact PRD proposal and save the agreed validations. That completes the PRD-only request.”

## Ambiguities and non-invented details

- The cases do not supply real feature paths, scenario IDs, PRD bodies, raw bytes, digests, reviewer identities or decision timestamps. The decisions above describe the necessary checks without manufacturing those values or claiming to have performed them.
- C2 does not establish whether the unvalidated proposal was saved or whether another active PRD exists. Preserve the actual state; a pending review cannot be bypassed by “Continue.”
- C4 lists no dedicated draft-runner capability. The shared host contract describes that runner, but its actual exposure must be established before use; the listed browser/file tools cannot substitute for it.
- C6 does not give the changed shared rule's meaning. Mapping reassessment is necessary; additional flow/scenario review depends on its actual material effect, while matching scenario approval and applicable locators remain separate facts.
- C7 does not give a verified Save locator; none is supplied here. C8 does not establish a runtime skip, seed-data exception decision or new permission; preserve its stated blocked/not-run condition.
