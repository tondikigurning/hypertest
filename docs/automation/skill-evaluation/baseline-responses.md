# Baseline skill exercise responses

Only the supplied baseline skill snapshot and cases.md were read. These are response/decision exercises. No tenant access, browser interaction, test execution, product-file mutation, publication, or successful validation is claimed. The only file written is this response file.

## Case 1 — Implement the approved read-only Orders list scenario

**Skills and references used:** write-e2e-code; the shared scenario approval/state rules; e2e-conventions; data-safety; playwright-cli and its locator guidance.

**Next allowed actions:** Resolve the exact approved scope against draft/orders, base abc123, approved scenario snapshot D1, and TEN_ORD_LST_E2E_001 / TEN_ORD_LIST_FLOW in the named feature. In the real host, inspect the relevant feature, reusable list POM, steps, fixtures, helpers and callers using the file tools. Reuse the established bindings and current locator evidence, checking current supported browser output if a locator needs fresh confirmation. Prepare only intent-preserving implementation edits, then inspect the complete diff. This read-only outcome can use existing data without a mutation approval. Do not request shell access, try to execute through browser actions, run a checkout scenario as proof of the draft patch, or claim collection/type/live success.

**Achievable artifact/status:** The host can produce a reviewable implementation patch and a per-scenario change report. The exercise has no actual source contents, so no exact code or changed-file list is invented here. Under the baseline Step 9 definition, the registry cannot advance to implemented without successful collection and type validation; it remains approved with implementation changes prepared and validation blocked. It cannot become verified or be described as a finished verified batch. No subsequent batch starts on the strength of this patch.

**User-facing response:** “I’ll implement TEN_ORD_LST_E2E_001 using the existing Orders list bindings and preserve the approved outcome and IDs. This host can prepare and inspect the patch, but it has no collection, typecheck, or draft execution tool. I can finish the implementation proposal; validation and batch verification remain pending, with no test pass claimed.”

The status limit comes from write-e2e-code Step 9 (baseline snapshot: .agents/skills/write-e2e-code/SKILL.md): “Update the affected conversation registry scope to implemented only after steps and bindings exist and collection/type validation succeeds.”

## Case 2 — Chat approval while the scenario Changes panel is unapproved

**Skills and references used:** write-e2e-scenarios Steps 0 and 6; write-e2e-code approval prerequisite.

**Next allowed actions:** Preserve the confirmed flows and the written scenario batch. Inspect/show the current scenario Changes artifact, confirm that it is the one the user means, and direct the user to its native approval action. The case explicitly identifies an unapproved native artifact and allow-all is off, so do not silently treat a chat message as having changed that host state or start dependent implementation. Do not reconfirm the flow list or create a second scenario batch.

**Achievable artifact/status:** Scenarios remain written and awaiting native approval. The user’s chat approval is recorded as their stated intent; it is not a fabricated native approval event. Once the current Changes snapshot is accepted, mark that exact scope approved and implement it. The same lack of collection/type/draft execution tools as Case 1 still limits later validation.

**User-facing response:** “Your approval is clear. The current scenario Changes snapshot is still unapproved in Q-Rex. Approve that snapshot in Changes so this exact batch can enter implementation; the flow confirmation is already complete.”

The baseline shared approval guidance (baseline snapshot: .agents/skills/write-e2e-scenarios/SKILL.md) says to reuse approval only when it covers “the current artifact, scope and session under the applicable gate.” It does not explicitly document how Q-Rex Changes approval relates to a chat response. This response preserves the concrete native state supplied by the case instead of assuming the missing host integration.

## Case 3 — Finish reviewing a fully prepared Orders PRD

**Skills and references used:** write-prd Steps 4–6 and Refresh mode; prd-template; exploration-checklist; shared approval guidance.

**Next allowed actions:** Reuse the completed exploration and full draft. Present the supplied inventory: three uncontested spec items, two observed candidates, one unresolved discrepancy, and recorded evidence. Do not invent defect counts, IDs, discrepancy contents, reviewer identity or evidence paths. Recommend reviewing the unresolved/observed items rather than treating them as already accepted.

Use the native PRD proposal mechanism described in this case as the review interaction. Prepare the complete proposed PRD, with a clearly scoped acceptance effect: the three uncontested spec items proposed as validated, the two observed candidates and conflicting item(s) retained as needs-review, the discrepancy and evidence retained, and reviewed status proposed only for that explicit limited approval. The native tool must show the whole proposal and save only after the user accepts. The proposal is not a claim that the review has already happened. Do not first require a duplicate chat approval and then another native approval for the same proposed content. If the user wants the observed candidates validated or the discrepancy resolved, obtain those particular decisions and adjust the proposal.

**Achievable artifact/status:** A complete reviewable PRD proposal is feasible. Before native acceptance, the saved PRD stays draft and no new item is validated. Acceptance of the accurately described proposal can produce a reviewed PRD with unresolved items still needs-review, as the baseline explicitly permits. Rejection preserves the existing draft. The case supplies no acceptance, so this exercise reports pending review, not a completed review.

**User-facing response:** “The Orders PRD is ready for native review: three spec items can be approved, while two observed candidates and the discrepancy remain unresolved. I’ll present the complete proposed PRD in the PRD approval interface. Accepting that proposal will save the stated review scope; until then, the draft and item validations remain unchanged.”

The relevant write-prd review gate (baseline snapshot: .agents/skills/write-prd/SKILL.md) requires an explicit decision and says a reviewed document may retain unresolved needs-review items. The baseline describes a separate ask/pause/update sequence; the case’s atomic native proposal can carry out the same gate without saving reviewed content prematurely.

## Case 4 — Verify a data-testid and capture a defect trace with restricted tools

**Skills and references used:** playwright-cli; element-attributes; tracing; running-code; shared playwright-cli-exploration; relevant defect/evidence rules.

**Next allowed actions:** Use the current snapshot and e8 only while that reference remains current; resnapshot after a rerender. Inspect supported snapshot/find output and, if useful, ask the exposed generate-locator action for e8. A generated locator is evidence only of what its actual output establishes. If it explicitly supplies a verified test-ID locator, record that returned value; otherwise keep the requested data-testid unknown. A button reference alone does not show that an attribute exists or is absent.

Use exposed requests and console actions for limited factual supporting evidence. No full request-detail action, eval, run-code, screenshot, or tracing action is available, so none may be called, simulated, or bypassed. Do not install another tool or route arbitrary browser code through a supported action. The past defect interaction cannot acquire a retrospective trace.

**Achievable artifact/status:** At most, a sanitized factual defect note and whatever snapshot/generator/request-summary/console output is actually returned. This exercise supplies no such returned output beyond e8. It cannot name the data-testid, prove that it is missing, or produce a trace path. Trace capture is unavailable; DOM attribute verification remains unverified unless supported locator output actually settles it.

**User-facing response:** “I can inspect e8 with the available snapshot and locator generator, and retain supported console/request summaries. These tools do not provide direct attribute inspection or tracing. The data-testid remains unverified unless the locator output confirms it, and no trace has been captured. Capturing a trace would require a tracing-capable host and a permitted reproduction.”

## Case 5 — Create Article Management product context from supplied rules

**Skills and references used:** write-prd; prd-template; exploration-checklist; shared data-safety and browser exploration; e2e-conventions for the downstream code constraint.

**Next allowed actions:** Reuse the supplied business rules instead of asking for reference material again. Resolve the real owning module/submodule from available artifacts/navigation; do not invent a module path. Confirm the stated absence of its PRD and scenario IDs. Propose ART as a three-letter uppercase submodule code, checking existing allocations for collisions before adoption. Three letters satisfy the downstream scenario convention; the broader two-to-five-letter allowance in the PRD template is not a reason to choose an incompatible code.

Prepare the one owning submodule PRD from the exact template. Map supplied rules to spec / needs-review with stable PRD_ART_NNN requirement IDs once the content and allocation are known. Read-only browser exploration is the next real-host action: inspect navigation, lists/details, forms and cancel paths, and record actual observations separately. No submission or other mutation is authorized. Record success/failure/validation paths that require a write as unverified. Ask only about consequential remaining context gaps after checking the supplied rules.

**Achievable artifact/status:** A proposed code and draft PRD structure/source plan can be produced from these facts. An actual behavior-filled, explored PRD cannot be claimed in this offline exercise: the business-rule text and browser results are not included. Keep status draft, reviewer fields empty and new items needs-review. No scenario/flow IDs, feature files, POMs or code are created. A PRD review gate follows real exploration.

**User-facing response:** “I’ll create the single Article Management PRD and propose ART as its code for the later scenario handoff. Your supplied rules will remain attributed as spec. I’ll explore the available UI read-only, leave submission outcomes unverified, and present the draft for review after recording that evidence. No mutation permission is assumed.”

## Case 6 — Two survey-template creates need distinct names in one minute

**Skills and references used:** write-e2e-scenarios; e2e-conventions; data-safety and its helper contract; flow-discovery.

**Next allowed actions:** Reuse the reviewed PRD, confirmed flow list, safe observations and authorization to create E2E-owned records. Inspect the real owning feature hierarchy, reusable component contracts and existing/retired IDs before allocating two permanent scenario IDs. Draft only the requested business journeys and observable create outcomes supported by that material; the exercise does not supply their exact steps, messages or field rules.

Give the two creates different relevant-word labels while retaining the minute timestamp. For example, use “survey template onboarding” and “survey template satisfaction” as illustrative record labels, if compatible with the reviewed scenario and actual field constraints. The helper then yields two distinct names for the same date/minute because the labels differ. Reusing “survey template” twice in the same minute would collide. Keep descriptions and other plain free text as realistic sentences without the E2E marker or stamp. Do not add seconds, epochs, UUIDs, randomness, sleeps or a changed helper contract to solve this pairwise requirement.

**Achievable artifact/status:** A collision-free naming plan for these two creates is available now. In the real host, the two evidence-backed feature scenarios can be written and placed in written state for review. They are not approved, implemented or verified merely because the flows and live-data scope were already approved. No implementation code or live create is executed in this exercise.

**User-facing response:** “The two creates will use different readable labels with the existing minute stamp—for example, E2E survey template onboarding <DDMMYYYYHHmm> and E2E survey template satisfaction <DDMMYYYYHHmm>. That makes the pair distinct without changing the format. I’ll draft the two scenarios using the confirmed flow and observed create outcomes, then present the feature changes for scenario review.”

The stop is required by write-e2e-scenarios Step 6 (baseline snapshot: .agents/skills/write-e2e-scenarios/SKILL.md): “Then stop. Do not write step definitions or POM code.”

## Case 7 — Later explicit request for the next batch in the same persisted draft

**Skills and references used:** write-e2e-scenarios batching, registry, discovery and resume rules; write-e2e-code verification/status rules; flow-discovery.

**Next allowed actions:** Preserve the previous batch as verified with its recorded exact-source/patch evidence. The case supplies that evidence as complete; do not rerun it or reopen its approval gates merely because this is another turn. Read the next scoped inventory, relevant PRD requirements, feature hierarchy and discovery notes. Known inventory is not automatically a confirmed inventory: reuse an existing explicit confirmation only if it covers this next scope; otherwise safely explore the accessible entry points and present the current flow confirmation before authoring.

Treat this later explicit user request as authorization to resume only the next batch. Perform its remaining safe discovery, draft the coherent confirmed scenario scope with stable IDs, and stop at that batch’s scenario review. A material new flow or product-context conflict reopens only the affected gate. Do not advance another batch automatically.

**Achievable artifact/status:** Previous scope remains verified. Next scope stays pending until its own prerequisites are satisfied and scenarios are written; then only that scope becomes written. No next-batch scenario contents, observations or approvals are supplied by the case, so none are fabricated here.

**User-facing response:** “The previous batch remains verified. I’ll resume the next scoped batch from the saved inventory and evidence, reuse any confirmation that already covers it, and complete its remaining discovery before writing scenarios for review. The earlier pass does not mark the next batch approved or verified.”

**Baseline wording limitation:** Both authoring and implementation skills literally say “Do not start the next batch in the same session,” while the authoring skill also describes resuming an interrupted pass and preserving current gates. A literal session-wide reading would prevent this later request. Here the user explicitly asks to continue on a later turn and the earlier batch’s gates are complete, so the user’s current authorized scope takes precedence over that blanket skill wording. This response does not reinterpret the previous turn as permission to chain batches without a new request.

## Case 8 — Refresh the integration child of Cases with partial access

**Skills and references used:** write-prd ownership, scoped Refresh mode and review gate; prd-template; exploration-checklist cross-menu/platform section; data-safety; shared flow-discovery principles.

**Next allowed actions:** Refresh the existing parent PRD identified by docs/prd/case-management/cases.md in Q-Rex’s PRD document storage. Do not create an integration-child PRD. Read the parent, stable IDs and its affected child feature coverage; keep unrelated validated requirements and IDs intact. Use same-origin read-only discovery to investigate integration entry points, visible prerequisites, handoffs and consumer-visible local outcomes. Do not expand into unavailable platform access or mutate upstream/shared data.

Record separate-platform behavior and end-to-end external outcomes as unverified with the exact access dependency. Add new requirement IDs without renumbering or reusing existing ones; preserve provenance, record any conflicts, and mark new/changed items needs-review. Set the refreshed document draft while changes await review, retain prior review metadata in the change log, and update last_explored only for actually checked integration areas. Keep unrelated existing validation intact.

Allow-all does not itself supply a human product-review decision or live-data authorization. It cannot promote new observations to validated intent or silently make the refresh reviewed. After a concrete draft and factual exploration log exist, present a scoped PRD review in its PRD interface. No scenario authoring follows until the relevant product context is reviewed.

**Achievable artifact/status:** The host can produce a scoped refresh draft covering accessible local integration behavior and explicitly blocked external outcomes. The exercise has no browser results, so it cannot report which controls, messages, requests or handoffs were actually observed. Stable parent content is preserved; new scope remains draft / needs-review pending human review. Partial access does not require abandoning all useful same-origin documentation, and it does not justify claiming full integration validation.

**User-facing response:** “I’ll update the integration scope inside the existing Cases PRD and preserve its validated IDs and content. I can inspect the same-origin side read-only; the separate-platform outcome will remain unverified because access is unavailable. New or changed items will await scoped PRD review. Allow-all does not approve product intent.”

The remaining review comes from write-prd Refresh mode (baseline snapshot: .agents/skills/write-prd/SKILL.md): “Run the review gate again, scoped to the changed items.”

