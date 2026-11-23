---
name: write-e2e-scenarios
description: Use a menu PRD and playwright-cli exploration to discover tenant business flows and write or maintain Gherkin scenarios with stable IDs and reusable references. Use for E2E discovery or scenario-intent changes; stops for review before implementation.
---

# Write E2E Scenarios (Phase 0 + maintenance)

Discover the requested business journeys, reconcile existing coverage and produce one reviewable Gherkin batch. This phase writes `.feature` files, a menu flow registry and shared exploration updates, not steps/POMs/mocks. The feature's `@flow:` tags remain the catalog category source.

Read the [shared workflow contract](../ask-qa/references/workflow-contract.md) for scope reuse, host-specific approvals, states and batch boundaries. Read [flow discovery](references/flow-discovery.md) and [scenario coverage and batching](references/scenario-coverage.md) in every mode, [E2E conventions](references/e2e-conventions.md) before assigning IDs/tags, and [data safety](references/data-safety.md) plus [browser capabilities](references/playwright-cli-exploration.md) before exploration.

For terminal discovery, read the current `ENV` from `e2e/.env.local` before choosing the browser target. Treat `.exploration.md` and `.flows.md` target notes as historical evidence, not current configuration; if they conflict with the file, use its valid `ENV` and correct the stale note without asking the user to reconfirm that environment. Ask about the target only when the file or `ENV` is missing/invalid, or the user explicitly requests a different one.

## Step 0 — Interview for scope (required)

Resolve module/menu and consequential context gaps using the shared contract, prior answers, supplied documents and existing artifacts. If the parent is unclear, investigate PRDs, features and navigation before asking one combined scope question. Derive routes and file names; do not ask the user to supply discoverable paths. Default to a full pass covering all supported, important E2E scenarios in scope, including regression; use smoke-only when explicitly requested or established by the user.

Before discovery in **any mode**, read the owning menu's active database PRD using its virtual identifier `docs/prd/<module>/<menu>.md`. Q-Rex uses file tools; terminal agents use the [database access procedure](../ask-qa/references/prd-database-access.md). An active PRD is a valid reference even if it has unvalidated items, unresolved questions or incomplete coverage; it has no draft/reviewed document status and does not need a PRD review before use. Record its identifier, relevant requirements and gaps. Explore the requested scope and report uncovered areas; do not block independent discovery or authoring merely because the active PRD is incomplete. If no active PRD exists, apply [write-prd](../write-prd/SKILL.md) to the owning menu. Other menus' PRDs provide supporting context only.

Use validated items according to their recorded review method and unvalidated `spec` as attributed requirements. Use evidenced `[observed]` behavior as the provisional scenario baseline, including when no source exists or for a recorded source-versus-actual discrepancy, unless the user has decided otherwise; this does not confirm product intent. Use relevant untagged or legacy PRD content as context, recording unknown provenance and checking it against available evidence; do not discard the active PRD because tags or IDs are absent. Assumptions do not establish intent. Reuse the shared context checklist; ask only consequential unanswered decisions. Include supported in-scope CRUD happy paths and other main business functions when discussing release priorities. Recommend their happy paths as smoke; do not infer “no smoke” from undocumented P0 priorities. Reuse authorized data scope and inspect owned-data prerequisites; a missing ticket or inaccessible branch remains an explicit gap.

## Step 1 — Discover and choose an approach

1. Resolve ownership and target paths using [test organization](../../../docs/automation/test-organization.md). Read the menu's flat feature and all descendant features; inventory IDs and `@flow:` tags, including known retired identities. File boundaries do not create new namespaces.
2. Apply [exploration reuse](../ask-qa/references/exploration-context.md): recover PRD-phase conversation evidence and the menu's `.exploration.md`, plus its flow registry and current features. Reconcile confirmed flows and gaps with the active PRD and feature contents; existing tags alone do not prove complete journeys. Build the remaining evidence questions before any browser call. A new skill/session or absent flow registry does not invalidate PRD-phase observations. Preserve IDs and reuse applicable evidence even if the browser is now unavailable.
3. Read all active PRD requirements in the requested scope, their journey groups or legacy candidate-flow section, shared rules, discrepancies and unverified areas. Build a coverage baseline from validated items, attributed unvalidated `spec`, and evidenced `[observed]` behavior as a provisional actual baseline; exclude retired items. Follow shared rule references into every applicable journey and retain their requirement IDs. Keep source, actual and unresolved product decisions visible where relevant. For a full pass, account for requirements deferred to later batches; for smoke-only, identify the relevant regression requirements as deferred. Read every current `features/_components/` master contract and decide which applies. Inspect scoped steps/POMs so reviewed Gherkin can reuse existing contracts.
4. Establish scoped UI coverage before confirming flows from applicable prior live observations and targeted exploration of remaining questions: navigation, tabs, menus, dialogs and conditional actions. Reconcile user goals, PRD requirements and UI observations with existing scenarios by outcomes and consequential branches. Persist newly observed facts and specific blockers in the shared exploration record. Keep PRD/actual mismatches in the registry; keep scenario coverage gaps in the exploration record and review output.
5. Choose the approach from complexity, breadth, dependencies, roles/data and reviewability; explain the evidence. Flow count is informational, never a threshold. Reassess as exploration expands.

| Mode | Deliverable |
| --- | --- |
| A — Registry only | Reconcile/confirm inventory and report covered, missing, stale and unresolved journeys; no Gherkin edits |
| B — Author confirmed flows | Explore the largest feasible missing/approved-to-extend scope, write scenarios and stop for review |
| C — Single pass | Discover/reconcile/confirm, explore and write the scoped scenarios for review together |
| D — Review existing flows | Reconcile evidence, recheck affected gaps/changes and review/extend existing scenarios, preserving IDs |

Inventory all identifiable in-scope flows, including individually named PRD-only candidates with their evidence limitations, before choosing a scenario batch. Batch boundaries limit detailed exploration and scenario authoring, not the flow inventory or confirmation. Plan batches using [scenario coverage and batching](references/scenario-coverage.md). Keep one flow ID when a flow spans files or batches, and record partial scope. Smoke-only writes supported CRUD and other release-gating happy paths; list remaining journeys as deferred. Approved scenario-only batches can continue before implementation and verification, subject to the shared contract's host-specific review constraints.

In registry-only mode, use the requirement mapping in Step 5 for existing scenarios in the inventory report, including gaps and deferred work.

If live exploration is unavailable, reuse applicable prior browser evidence and continue the supported scope through its gates. When required live evidence is missing, retain the draft inventory and exact blocker for affected work; PRD text alone does not satisfy discovery. Resume from saved evidence, feature contents, conversation scope and review output; repeat only a gate invalidated by changed artifacts or scope.

## Step 1b — Confirm the flow list (required for every authoring scope)

Present every identifiable candidate for inventory confirmation, including PRD-only candidates, with IDs, short goals/outcomes, exact proposed feature files, evidence level, total count, exclusions, relevant PRD IDs including shared rules, and unresolved gaps. Confirmation does not establish observed behavior or authorize scenario authoring without the required live evidence. List baseline requirements or branches without a represented flow, with reasons; flow confirmation must not silently remove them. For existing features include retained categories and proposed additions/changes/removals. Do not claim completeness beyond available evidence.

Use the shared contract's **flow confirmation** procedure: Q-Rex calls `confirm_flows` for each affected file with its owning PRD; terminal agents prepare the pending source comparisons in the [flow registry](references/flow-registry.md#flow-confirmation-provenance), explicitly ask whether the list has missing or extra flows and wait for confirmation. A chat answer is not a replacement for the Q-Rex tool. Confirmation approves only that described inventory, not scenarios or live mutations. Before detailed batch work or authoring, obtain the applicable decision and verify the sources have not changed while waiting. Reconfirm affected work if later discovery materially changes the inventory; preserve IDs.

Create or update `e2e/tests/bdd/features/<module>/<menu>.flows.md` using the mandatory [flow registry template](references/flow-registry-template.md): it has only `Flows` and `Gaps`. Register every confirmed flow in the requested inventory, including flows outside the first scenario batch; reconcile existing coverage and mark unwritten or partially written scope `pending`. In a terminal, record actual confirmation and source comparisons in `.exploration.md` as specified in [flow registry](references/flow-registry.md), then update those references after authoring. Only confirmed flows belong in the table. Record unresolved PRD/actual mismatches under Gaps: observed behavior absent from the PRD, or PRD requirements not observed in actual. For a PRD requirement not observed in actual, identify access/evidence limits when known and leave true absence unresolved until established. Before authoring or stopping, compare the registry against the confirmed inventory and current features: every confirmed flow has a row with all feature paths and a truthful status, and every unresolved PRD/actual mismatch has a specific next action. A registry from a prior session is a discovery handoff, not a substitute for a missing or invalidated host decision; terminal agents may reuse a matching recorded explicit decision without asking again.

## Step 2 — Explore selected journeys in depth

Use the same [host-specific browser loop](references/playwright-cli-exploration.md) for remaining initial or detailed evidence gaps. Assess each selected journey from entry to observable business outcome and its meaningful alternate paths against the shared record first; a PRD-phase attempt can already cover this depth. Flow confirmation itself requires no replay. Investigate only missing or affected branches, locators or request facts within data-safety scope. Use current snapshot refs when interacting, and persist newly verified reusable locators and supported network evidence. Record what the tools cannot establish in `.exploration.md`. Missing access/data is not evidence that a journey does not exist.

Make a lightweight inventory across the confirmed scope using the PRD, existing scenarios and available exploration evidence; mark areas that still need investigation. Start with the whole confirmed scope as the candidate batch. For each flow, identify and author every distinct, evidence-supported scenario branch that matters; continue beyond the primary success path through meaningful regression branches until the flow's supported coverage is exhausted. Before fixing the first batch boundary, close bounded, safe read-only evidence gaps exposed by observed controls or existing evidence, then apply the full branch checklist in [scenario coverage and batching](references/scenario-coverage.md) across as much of the scope as feasible. Continue independent flows when individual branches are blocked. Persist deferred or blocked scenario branches in the `.exploration.md` handoff so a later session can resume them; use registry Gaps for PRD/actual mismatches.

If actual behavior contradicts a source or PRD, use `write-prd` to record both in its dedicated discrepancy section. Default scenario expectations to the evidenced actual behavior while product confirmation is pending; preserve the source and distinguish this provisional choice from a product decision. If a child requirement is missing, record the gap and use `write-prd` to update the owning PRD when appropriate. Continue independent scenario discovery using the active PRD; a proposed PRD change awaiting its own review does not make the current active PRD unusable. Describe relevant gaps in flow and scenario review, and follow the existing PRD edit and scenario review gates when changing those artifacts. If product later confirms the source, update the PRD and affected scenarios through their review gates, preserving IDs and removing the resolved discrepancy from the active section. Treat a confirmed defect according to Step 4.

## Step 3 — Reconcile and author business outcomes

Classify each journey by evidence:

| Status | Action |
| --- | --- |
| Covered | Existing scenarios cover the relevant outcomes/branches; record any unverified scope separately |
| Partially covered | Extend missing consequential journeys while preserving IDs |
| Missing | Add the journey with new permanent scenario IDs and a stable flow category |
| Stale | Update mismatched scenarios in place, preserving scenario/flow IDs |
| Obsolete | Retire the journey and permanently reserve its IDs |
| Reusable match | Reuse the master step text and link its `@ref:TEN_COM_*` contract |

- Group scenarios by meaningful business goals and lifecycle outcomes. Design coverage for every baseline requirement and each applicable important E2E branch identified by the coverage checklist, including business validation, cancellation, state, role and failure cases supported by evidence. Report requirements and branches that cannot yet be covered; do not invent behavior or duplicate equivalent checks.
- Tag supported in-scope CRUD happy paths and other main release-gating business success journeys `@smoke`, honoring explicit exclusions. Use `@regression` for consequential alternatives. Do not invent unsupported CRUD operations or tag every validation/error as smoke. Report blocked baseline operations.
- For consequential API error/delay/auth-failure cases, use reviewed `@mock` contracts and applicable shared master steps/references. Never put `@mock` on `@smoke`; report mocked coverage separately from real backend behavior. See [mock policy](../write-e2e-code/references/msw-mocking.md) when deciding a mock-dependent scenario.
- A mutation must assert its data-changing outcome on the identified record, such as an appearing/disappearing row or changed detail/status. A toast may supplement that result; when persistence cannot be observed, explicitly limit the promised outcome rather than claiming it was verified. Preserve existing approved intent until its own review changes it.
- Dynamic “first available” values are suitable for reference choices, not unverified mutation targets. Use exact owned or explicitly approved identities under data-safety rules, including pipeline/membership changes.
- Apply `@production-restricted` to each scenario that would mutate data or perform an operation the user has identified as forbidden in production. Record the restriction and affected action in the feature and review output. If the production restriction answer is unresolved, report affected mutation scenarios as production eligibility unknown. Exclude restricted or unknown scenarios from production runs until the restriction is resolved and an approved safe treatment is implemented; the tag alone does not enforce a skip.
- Follow [test-data values](references/data-safety.md#test-data-values), including same-minute collision handling. Phase 0 reports scoped step/POM values needing alignment; only Phase 1 edits implementation.
- Use `Scenario Outline` with `Examples` only for reusable component contracts or their `@ref:TEN_COM_*` mirrors. Use plain scenarios for data-dependent business journeys. Note unavailable variants instead of inventing data.

## Step 4 — Record product defects

Describe expected versus actual behavior with the requirement source. Use `@fixme @ref:<real-ticket>` for a confirmed product defect, not the broken behavior as an assertion. If the ticket is missing, ask for it under the shared question boundary and leave the affected scenario as a documented candidate until it can carry a valid reference. Never invent a ticket or use quarantine as a substitute.

Capture safe trace/screenshot evidence only when the host exposes it. In Q-Rex, use a dated sanitized observation with available snapshot/network context and state that no trace/image was captured. Record evidence limitations under [browser capabilities](references/playwright-cli-exploration.md). Quarantine remains for demonstrated test unreliability.

## Step 5 — Write the feature batch

Use `<module>/<menu>.feature` for small scopes or files beneath `<module>/<menu>/` for child groups, following test organization. All children share the parent PRD and scenario namespace. Preserve inherited tags, backgrounds, examples, safety notes, flow order and existing bindings when splitting files. Register implementation paths during Phase 1 only.

Follow the conventions' header and tag order. Allocate `TEN_<CODE>_<FLG>_E2E_NNN` across all menu files and known retired IDs, with a sequence per flow abbreviation; never restart due to a new file.

Before review, reconcile every baseline requirement and every applicable important E2E branch identified in the coverage checklist against actual scenario preconditions and assertions, including existing coverage and applicable shared rules. Include evidenced observed branches even without a PRD ID; use a source or evidence reference. Identify the owning PRD and current content or version and the feature snapshot used, so the mapping can be reassessed if either changes. Present the mapping in the review summary and persist it in the owning menu's [scenario handoff](references/flow-registry.md#implementation-handoff) in `.exploration.md`, not in the PRD or `.flows.md`:

| PRD requirement / branch | Exact feature path + scenario identities | Asserted outcome / gap | Coverage |
| --- | --- | --- | --- |
| <ID and relevant condition> | <existing/new scenario IDs and source locations, or none> | <what is asserted, or reason and next action> | covered / partial / missing / blocked / deferred / excluded |

Allow many-to-many mappings; a matching title, setup step or `@ref:` alone does not cover an outcome. Distinguish scenarios by source location when IDs are missing or duplicated; do not silently choose an ambiguous match. A shared master counts only where the consuming menu scenario exercises the required contract. `covered` describes authored assertions, not implementation or a test pass. Report `@mock`, `@fixme` and quarantine limitations on affected rows; a mock cannot establish a required real integration outcome. Every non-covered row needs a reason and next action; exclusions need an established scope decision. Keep unresolved product intent visible separately. Reassess affected mappings when PRD content or feature snapshots change, following the existing review gates. Do not claim full coverage while any required branch is unresolved or lacks matching assertions; a reviewed batch can be complete while the menu still has gaps.

## Step 6 — Output and stop

Report journey status/action, PRD requirement IDs → exact feature/scenario IDs → promised outcome, flow categories added/retained/extended/retired, applicable master references, masters judged inapplicable, locator gaps, defects and evidence. Save new browser facts in the shared `.exploration.md` during discovery and before stopping, including registry-only or blocked work. Before scenario review, save the batch's [scenario handoff](references/flow-registry.md#implementation-handoff) in `.exploration.md`, referencing relevant shared evidence IDs and gaps, and point to both records in the report. Keep PRD/actual mismatches visible in `.flows.md`; keep unverified scenario branches and their next actions in `.exploration.md` and review output. Update affected flow rows; a partially written flow stays `pending`. Approval applies to the current snapshot and exact batch only.

Use the shared contract's **scenario approval** procedure. In Q-Rex, call `show_diff`, direct the user to Changes > Approve scenarios and end the turn; do not ask for a competing chat Yes. In terminal hosts, prepare the [scenario review record](references/flow-registry.md#terminal-scenario-review-record), present the concrete batch and request explicit approval. On the next turn after an explicit acceptance, record the actual decision against the unchanged batch before continuing. In manual mode, implementation resumes on a later user turn after that gate. Explain the next action without requiring another slash command. If Q-Rex's automatic mode is active, follow its configured gate handling and label the decision automatic. This phase never writes implementation.

## Related

- Product context: [write-prd](../write-prd/SKILL.md)
- Approved implementation: [write-e2e-code](../write-e2e-code/SKILL.md)
- General testing/app work: [ask-qa](../ask-qa/SKILL.md)
