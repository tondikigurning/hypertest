# Revised-skill exercise responses

These are offline decision exercises. I read only `cases.md` and the revised skill snapshot. I did not inspect the live repository, mutate tenant data, execute tests, call Q-Rex tools, or create the proposed product/test artifacts. The only written artifact is this response file. The host actions below describe what the acting agent should do next; conditional statuses are not claims that those actions occurred.

## Case 1 — Approved Orders implementation with no execution capability

**Skills/references applied:** `write-e2e-code`, the shared workflow contract, E2E conventions, data safety, browser capabilities and testing operations.

**Next allowed actions:** Continue the authorized implementation work. Reuse the reviewed `e2e/tests/bdd/features/example/orders.feature` scenario `TEN_ORD_LST_E2E_001`, flow `TEN_ORD_LIST_FLOW`, reviewed parent PRD, known steps/fixtures and current list POM evidence. Inspect the approved feature, its owning menu's other features, implementation and callers through file tools; write only the feasible bindings/POM/fixture changes needed for the read-only list contract. Reuse existing data values because they already meet the convention. Inspect current bindings and final Changes diff; preserve scenario intent and D1 approval. No new business-flow or scenario review is needed for that implementation alone.

Do not stop all implementation work merely because checks are unavailable. Do not attempt shell commands through the browser or use explorer-checkout results as draft evidence. Prepare a handoff identifying `draft/orders`, base `abc123`, approved scenario snapshot `D1`, the actual final complete Changes snapshot/patch after implementation, the feature/scenario identity, actual changed implementation files and locator/binding gaps. The final implementation patch identity and file list cannot be invented from the exercise facts.

The handoff must request affected binding/collection and type validation, then exact-scenario execution in the intended environment after selected setup/steps and data-safety review. Read `e2e/package.json`, its runner and config before recording exact supported commands, flags and working directories. Their contents and the selected environment name are absent here, so exact invocation strings remain a handoff detail to resolve, rather than fabricated commands. The documented unfiltered `pnpm test:bdd` must not be presented as a safe exact selection. BDD generation must not overlap the local runner.

**Achievable artifact/status:** In a real Q-Rex session, a complete feasible **implementation draft; checks pending** and exact-source handoff. Registry remains `approved` until matching collection and type evidence exists; `implemented` and `verified` are unsupported now. No external evidence is supplied. Do not start the next batch or report the requested batch verified. This exercise can truthfully produce the action/handoff specification only, not source edits or their successful checks.

**User-facing response:** “D1 approves `TEN_ORD_LST_E2E_001`. I’ll complete its feasible implementation using the existing list POM and reusable bindings, then provide the exact draft diff and validation handoff. Q-Rex cannot collect, typecheck or execute this draft. The batch stays approved with checks pending; it cannot advance to verified or the next batch until matching evidence covers this exact source and scenario.”

**Boundary source:** shared contract (revised snapshot: .agents/skills/ask-qa/references/workflow-contract.md): “Keep registry state `approved` until collection/type evidence exists.”

## Case 2 — Chat approval does not approve the Q-Rex Changes snapshot

**Skills/references applied:** `write-e2e-code`, `write-e2e-scenarios`, shared workflow contract.

**Next allowed actions:** Reuse existing flow confirmation. Call `show_diff` for the written Orders scenario batch, direct the user to **Changes > Approve scenarios**, and end the turn. Do not call `ask_user` for another chat Yes, repeat flow confirmation, interpret the user's message as a panel decision, or enable Allow-all. Resume implementation on a later user turn only after the current scenario snapshot has the actual panel approval. Changed scenario content would require its own current approval.

**Achievable artifact/status:** Reviewable scenario diff; state `written`, not `approved`, `implemented` or `verified`. No implementation is authorized through the required host gate yet. The exercise itself cannot call `show_diff` or claim that approval occurred.

**User-facing response:** “The Orders scenarios are ready for review. Open the Changes diff and select **Approve scenarios**. Q-Rex requires that panel decision before implementation; your chat approval has not approved this snapshot.”

**Boundary source:** shared contract (revised snapshot: .agents/skills/ask-qa/references/workflow-contract.md): “Chat Yes does not replace the panel decision.”

## Case 3 — Submit the complete PRD proposal to native review

**Skills/references applied:** `write-prd`, shared workflow contract, PRD template and exploration checklist.

**Next allowed actions:** Reuse completed safe exploration and recorded context. Check provenance, evidence, stable IDs, sanitization and unresolved items in the prepared full draft. Summarize the three uncontested spec items, two observed candidates and unresolved discrepancy. Use `write_file`/`edit_file` with the complete proposed reviewed PRD, not a partial patch offered for a separate blanket approval. Include intended validated items, `status: reviewed`, actual review date, `review_method: manual` and `reviewed_by: Local preview user` in that proposal. The native operation displays the full proposal and saves only if accepted.

The three uncontested spec items and the two observed candidates may be offered as identified proposed validations for the native reviewer to accept. They are not validated before acceptance, and observed provenance must remain `observed` afterward. Keep the unresolved discrepancy and its conflicting items `needs-review`; accepting a document need not resolve that conflict. Use `ask_user` only if an actual consequential item choice is necessary, not for an extra blanket “approve PRD” question. If rejected, preserve the draft and revise. If accepted, record only the accepted validations, report the reviewed PRD and end this manual-mode turn. Do not proceed to scenarios now.

**Achievable artifact/status:** A full native review proposal, with acceptance pending. Current saved status remains `draft` until acceptance. Conditional on acceptance, a reviewed PRD may contain five accepted items and an explicit unresolved discrepancy. The exercise supplies item counts, not the full content, so it cannot reproduce a real proposal or claim a review decision.

**User-facing response:** “I’ll submit the complete Orders PRD in the native PRD approval request. It will identify the three spec items and two observed candidates for acceptance and keep the discrepancy marked needs-review. Review that full proposal in the PRD view; the reviewed version is saved only after acceptance.”

**Boundary source:** write-prd (revised snapshot: .agents/skills/write-prd/SKILL.md): “Do not first collect a competing blanket approval with `ask_user`”.

## Case 4 — Locator fallback and truthful evidence limits

**Skills/references applied:** `playwright-cli`, shared workflow contract, browser capabilities, element-attribute and tracing references.

**Next allowed actions:** Use managed `generate-locator` for current ref `e8`; refresh the snapshot first if it is no longer current. Inspect returned evidence. A generated test-ID locator can verify that value if actually returned. A verified role/label locator is a usable alternative but does not prove that `data-testid` exists or is absent. If no supported result exposes the attribute, record it as unverified rather than guessing its value or calling it missing.

Use available snapshot, request listings and console evidence for a dated, sanitized defect observation. Record the actual environment, screen/role, expected and visible actual outcome only where known; this case does not supply their details. Request listings do not establish bodies, response schemas or hidden attributes. Do not attempt `eval`, arbitrary JavaScript, run-code, screenshot, tracing commands or a browser-argument workaround. Trace capture requires a separately supported terminal/browser workflow, started before a safe reproduction; no trace of the past event can be claimed here. Lack of trace support does not prevent documenting the observed defect with available evidence.

**Achievable artifact/status:** Locator-generation request and, after real results, a verified supported locator or explicit attribute gap; a factual observation with evidence limits. No trace, screenshot, full-request artifact or invented saved path. The exercise has no locator-generation output or defect details, so it cannot supply a verified locator or completed defect record.

**User-facing response:** “I can request a verified locator for `e8` and document the defect using the available snapshot and request/console context. The snapshot alone does not establish its data-testid. This browser exposes no tracing tool, so no trace can be captured here; any unresolved attribute check will be recorded explicitly.”

## Case 5 — New Article Management context and three-letter code

**Skills/references applied:** `write-prd`, shared workflow contract, PRD template, exploration checklist, E2E conventions, browser capabilities and data safety.

**Next allowed actions:** Reuse the supplied business rules as `spec`; do not ask for them again. Resolve the real module/menu and derive its virtual database PRD identifier from available artifacts/navigation rather than inventing a parent route. The matching menu has no PRD or scenario IDs, but allocations elsewhere still need inspection. Propose **ART** as a three-letter uppercase candidate, check database PRDs, features and known retired allocations for collisions, then record the confirmed unused code in the PRD for scenario authoring to reuse. Do not claim ART is reserved or unused before that inspection, and do not assign flow or scenario IDs in the PRD phase.

Establish the requested environment from configuration, inspect installed CLI capabilities and use an owned session. Perform safe read-only exploration; open forms and dialogs without submitting. No mutation permission exists, so do not create, edit or delete even E2E-owned records merely to document behavior. Record unperformed submit/persistence branches as unverified; ask once for scoped authorization only if necessary and continue independent read-only work.

Normalize the supplied rules into the complete template, preserve `spec`/`observed`/`assumed` provenance, evidence and discrepancies, and keep new items `needs-review`. Present the complete explored draft for explicit terminal PRD review; use the database access procedure and save accepted review metadata and validations only after acceptance. No reviewer identity may be invented. No browser results or rule text are present in the exercise, so a spec-only outline and proposed-code decision can be described, but a fully explored review-ready PRD cannot be claimed now.

**Achievable artifact/status:** Proposed code `ART`, conditional on allocation inspection, and a draft product-context structure. `status: draft`; no validated observations or completed exploration. Live exploration remains a prerequisite before the real draft is ready for review. No `.feature`, flow registry or implementation changes.

**User-facing response:** “I’ll use your business rules as the PRD’s stated requirements and explore Article Management read-only. I propose `ART` as its code, subject to the allocation check. Submit outcomes will remain unverified without mutation permission. I’ll save the draft in the shared PRD database and present its complete content for explicit review.”

**Boundary source:** write-prd (revised snapshot: .agents/skills/write-prd/SKILL.md): “Live exploration with `playwright-cli` is required for every PRD create, import, review or refresh.” The terminal review gate also requires explicit review; the supplied business rules are requirement input, not review acceptance.

## Case 6 — Distinct create names within one minute

**Skills/references applied:** `write-e2e-scenarios`, shared workflow contract, flow discovery, E2E conventions, data safety and browser capabilities.

**Next allowed actions:** Reuse the confirmed scope/flows, reviewed parent PRD, safe current browser evidence and authorized E2E-owned create scope. Inventory existing/retired scenario IDs and applicable master step contracts, then author two plain business scenarios in the established scope. Use observed, reviewed create outcomes and existing step language; do not fabricate exact UI messages, routes, scenario IDs or bindings from the exercise's high-level facts. Each create should assert the resulting identified record through the observed list/detail outcome; a toast alone does not establish persistence.

For the same `date`, use distinct readable labels:

```text
e2eValue("survey template customer feedback", date)
  => E2E survey template customer feedback <DDMMYYYYHHmm>
e2eValue("survey template service follow-up", date)
  => E2E survey template service follow-up <DDMMYYYYHHmm>
```

These labels produce different full values even with an identical minute stamp. Verify field length/characters and check the proposed values against available owned records; different labels do not prove absence of prior records. If a repeated logical name is taken, use a checked readable distinction such as `survey template customer feedback second attempt`. Keep the exact prefix and minute timestamp contract; do not add seconds, epochs, UUIDs or random suffixes, delete existing records, or change the helper format. After a conclusively duplicate rejection, allow at most one checked scoped retry. An uncertain submission requires checking whether its exact record was created before any retry. Plain descriptions remain realistic unstamped sentences.

Phase 0 reports any scoped implementation values needing alignment; it does not edit steps/POMs or the helper. Present the actual feature diff and exact IDs for explicit terminal scenario approval, then stop before implementation. The exercise does not contain the full observed step contracts/feature contents, so only the data design and authoring procedure can be concretely produced here.

**Achievable artifact/status:** A collision-safe naming design now; in the real host, two reviewed-context scenario drafts with state `written` after authoring. Not scenario-approved, implemented or passed. Authorization permits the specified E2E creates, not unrelated cleanup or seed mutation.

**User-facing response:** “I’ll use the readable labels `survey template customer feedback` and `survey template service follow-up`. They produce distinct names in the same minute with the existing helper. I’ll check for existing matches and field limits, keep descriptions unstamped, and present the two scenario changes for approval before implementation.”

**Boundary source:** write-e2e-scenarios (revised snapshot: .agents/skills/write-e2e-scenarios/SKILL.md): “In terminal hosts, present the concrete batch and request explicit approval.”

## Case 7 — Continue a later batch in the same draft session

**Skills/references applied:** `write-e2e-scenarios`, shared workflow contract, flow discovery, E2E conventions, data safety and browser capabilities.

**Next allowed actions:** Accept the supplied exact-source, complete-scope external verification as satisfying the previous batch's gates and preserve its recorded `verified` state. It is a later user turn in the same persisted draft, so starting another batch is allowed. Do not invent a lifetime one-batch limit, demand a fresh draft/session, or repeat the already-satisfied previous checks.

Reuse the next scoped flow inventory, prior answers and any still-current decisions. Check the owning reviewed PRD, current feature namespace and source identity, and whether next-scope browser discovery and flow confirmation are already valid. Known inventory is not itself proof of confirmation. Complete missing safe discovery and call `confirm_flows` per affected file with its reviewed parent PRD when needed; do not repeat a still-valid gate without a changed scope/artifact. Write the next coherent scenario batch only after its applicable flow gate. Reuse IDs and record new allocations from the actual inventory. With no stated automatic mode, use manual scenario handling: `show_diff`, direct Changes > Approve scenarios, and end the turn before its implementation.

**Achievable artifact/status:** Previous batch remains `verified`; next batch is eligible to begin. A confirmed next inventory can be `pending` before authoring; known but unconfirmed inventory must not be mislabeled confirmed. It becomes `written` after real authoring, not approved or implemented merely because the previous batch passed. This exercise provides no next-batch feature content, so no concrete new scenarios or completed gates can be claimed.

**User-facing response:** “The previous batch has complete matching verification, so I can start the next batch in this draft. I’ll reuse the known inventory and valid decisions, complete any missing flow confirmation, then prepare the next scenario diff for Changes-panel approval.”

**Boundary source:** shared contract (revised snapshot: .agents/skills/ask-qa/references/workflow-contract.md): “An approved batch must be implemented and verified before the next batch starts”. That prerequisite is met for the previous batch here; it is not a prohibition on later batches in one session.

## Case 8 — Scoped child refresh with automatic acceptance

**Skills/references applied:** `write-prd`, shared workflow contract, PRD template, exploration checklist, browser capabilities and data safety.

**Next allowed actions:** Refresh the existing owning PRD at virtual database identifier `docs/prd/case-management/cases.md`. Do not create an integration-child PRD or put Q-Rex PRD changes into Git. Read the current parent and all relevant flat/nested feature context; preserve established requirement IDs, code, existing validated content and unrelated review states. Add new integration IDs only after checking the existing namespace. Record requirements, dependencies and gaps in the same parent's integration and related sections.

Re-explore the accessible integration scope through same-origin read-only discovery. Do not navigate to an unavailable separate platform, fabricate external observations, or infer the integration is absent. Mark its inaccessible handoff/external outcomes unverified, with the access needed to check them. Automatic approval does not supply platform access or enlarge mutation authorization. No live mutation is authorized by this refresh request.

Keep the working refresh draft pending review; preserve historical review metadata in the change log, clear current review fields while pending, mark new/changed items `needs-review`, and update `last_explored` only for areas actually checked. Once that accessible exploration and the complete proposal are ready, submit the reviewed version through `write_file`/`edit_file`. Allow-all accepts the native review automatically; do not ask for an extra human approval or impose a manual-only stop. Record `review_method: automatic` and `reviewed_by: Q-Rex automatic approval`, with the actual acceptance date. Proposed items become validated only through that accepted native operation; their provenance remains unchanged, unresolved conflicts remain `needs-review`, and external outcomes remain unverified. A scoped reviewed refresh can retain these explicit limits.

**Achievable artifact/status:** In the real host, a scoped refresh of the one parent PRD, reviewed after actual automatic native acceptance, with preserved previous validations and clearly unverified separate-platform behavior. No additional human review is required by the enabled mode; automatic acceptance must not be reported as human confirmation of product intent. The exercise itself supplies no new browser observations or native-operation result, so it can specify this deliverable but cannot claim it was saved or accepted. PRD refresh does not authorize scenario/code authoring beyond the user's request.

**User-facing response:** “I’ll refresh the integration coverage in the existing Cases PRD, preserving its IDs and prior validated requirements. I can check the same-origin portion; separate-platform outcomes will remain explicitly unverified. Allow-all will handle the native review automatically, recorded as automatic acceptance rather than human review.”

**Mode source:** shared contract (revised snapshot: .agents/skills/ask-qa/references/workflow-contract.md): “automatically accepts native PRD, flow and live-browser requests and bypasses scenario approval gates.” Scope, origin and data-safety limits still apply.

