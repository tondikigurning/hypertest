---
name: write-e2e-scenarios
description: Discover flows and author or review Gherkin scenarios from the active menu PRD and browser evidence, including continuation after PRD work.
---

# Write E2E Scenarios

Produce evidence-supported business scenarios in `.feature`, a confirmed menu `.flows.md` inventory and a resumable `.exploration.md` handoff. Implementation belongs to `write-e2e-code` after the applicable scenario gate.

Apply the [shared workflow contract](../ask-qa/references/workflow-contract.md), especially **Continue and resume** and **Read only what the next action needs**, and [exploration reuse](../ask-qa/references/exploration-context.md). Load missing instructions once; reuse unchanged context from PRD work. Apply [data safety](references/data-safety.md) before authoring or interaction.

## 1. Resume at the first unfinished action

Recover the owning menu, requested endpoint, active database PRD, exploration/flow records and exact feature scope from current context. Load only missing/changed material. For ownership use [test organization](../../../docs/automation/test-organization.md); children share one PRD and ID namespace. Inventory flat and descendant features for IDs and coverage. Inspect relevant shared component contracts and `@ref:TEN_COM_*` masters; find existing step/POM contracts through scoped searches and read bodies/callers only where needed.

Q-Rex reads the virtual `docs/prd/<module>/<menu>.md` with file tools; terminals use [database access](../ask-qa/references/prd-database-access.md). An incomplete/unvalidated active PRD is usable; a pending unsaved proposal is not active. If absent, apply `write-prd` to the same owner and retain this scenario objective for return. Supporting menus do not replace its PRD.

Preserve provenance and unknown intent: attributed `spec`, legacy content and evidenced observed behavior remain usable with their uncertainty; observation is a provisional actual baseline. Reuse prior business answers and restrictions. Default to a full pass with important regression branches unless the user established narrower scope. Resolve only consequential unanswered decisions under the shared question rules. Read current host target configuration before browser work.

Choose registry-only, author confirmed flows, discover-and-author, or review existing coverage from the requested outcome. Registry-only maps existing assertions and gaps without Gherkin edits. A still-matching confirmed inventory or reviewed batch resumes at its next action rather than repeating earlier steps.

## 2. Reconcile and confirm the flow inventory

Apply [flow discovery](references/flow-discovery.md) and [coverage/batching](references/scenario-coverage.md) to recovered evidence. Account for every scoped PRD journey/shared rule and observed action as a named flow, branch, established exclusion or specific gap. Inventory the whole requested scope before choosing a batch, including individually named PRD-only candidates and later work; a tag or one success scenario does not establish complete coverage.

List precise missing evidence questions before any browser call. Apply [host browser capabilities](references/playwright-cli-exploration.md) only when live work remains. Investigate missing/affected outcomes and feasible safe read-only branches; provision E2E-owned data where authorized. Reuse unchanged observations and blockers, including when the browser is unavailable. Missing access does not establish absence.

Present one complete inventory: total; each flow ID, goal, exact feature path, PRD/shared-rule IDs, known branches, evidence level and gaps; existing/proposed/deferred/excluded scope and unrepresented baseline requirements. Use the shared flow-confirmation gate and [source comparisons](references/flow-registry.md#flow-confirmation-provenance). Reuse a matching actual decision. Material inventory/source changes require affected reconfirmation while preserving IDs.

After confirmation, write every confirmed flow/path to `.flows.md` using its [template](references/flow-registry-template.md) and [rules](references/flow-registry.md). Keep only `Flows` and `Gaps`: `pending` until the confirmed scope is fully authored, then `written`; Gaps contains PRD/actual mismatches. Batch progress, branch gaps and review provenance stay in `.exploration.md`.

## 3. Author all supported outcomes in the batch

Apply [scenario contracts](references/reliable-e2e.md#scenario-contracts) and [ID/tag conventions](references/e2e-conventions.md). Up to 12 confirmed flows form one batch; larger scopes use the fewest balanced batches at most 12 each, targeting 8–12 where possible. Flow count never caps scenarios or branches. Retain the ordered plan for the entire requested scope.

For each current flow, name its primary successful outcome, assess every applicable coverage-checklist category and compare actual existing assertions. Author each distinct supported uncovered outcome, including consequential regression branches. Record blocked/unverified branches and next actions; continue independently supported work. An unresolved primary outcome keeps the flow pending. Preserve permanent/retired IDs, approved intent and inherited tags/backgrounds/examples/safety notes when splitting files; path registration belongs to implementation.

- Express business preconditions, actions and observable results in Gherkin. Shared setup/transition evidence, exact target, readiness, locator gaps and cleanup belong in the handoff once, referenced by evidence ID. Capture useful locators while already inspecting UI; temporary refs or outcome text alone do not verify one.
- Each supported mutation needs successful submission and an assertion on the exact owned record, with supported persistence and cleanup, unless already covered or explicitly excluded/blocked/unverified. Cancellation, validation and feedback alone do not cover success. Follow the [mutation contract](references/scenario-coverage.md#successful-mutations), data values/collision handling and scoped exceptions. Report conflicting scoped step/POM values for implementation; do not edit that code here. Tag forbidden production actions `@production-restricted`; unanswered restrictions leave eligibility unknown.
- Group scenarios by business goal/lifecycle outcome; reuse applicable master step text and `@ref`. Business journeys use plain scenarios; outlines serve shared component contracts/mirrors. Avoid equivalent samples and incidental component-only checks. Authenticated projects supply login; include it explicitly only when authentication or a clean-session project requires it.
- Use `@smoke` for supported main release-gating journeys including in-scope CRUD success; consequential alternatives use `@regression`. For mock-dependent cases read the [mock policy](../write-e2e-code/references/msw-mocking.md); no smoke mocks or invented schemas. Confirmed product defects assert sourced expectations with `@fixme @ref:<real-ticket>`; ask for a missing ticket, never substitute quarantine.

Record source/actual discrepancies through `write-prd` and registry Gaps, retaining the original scenario objective across that scoped detour. Use evidenced actual behavior provisionally while product confirmation is pending; an unfinished refresh does not block independent supported work.

## 4. Save the handoff and request review

Apply [scenario review](references/scenario-review.md) once to reconcile complete inventory/counts, requirement-to-scenario-to-outcome mapping, exact contracts/snapshot, evidence links, readiness/setup/cleanup gaps and review provenance. Save the durable batch entry in `.exploration.md`; reference prior evidence rather than copying logs. Partial flows remain pending.

Present every new/changed scenario grouped by flow, exact paths/IDs, outcomes, totals, requirement mapping, limitations and remaining work. Combine tables when all review fields remain visible; links alone are insufficient. State actual implementation/execution status and the exact scope of the requested decision.

Use the shared host gate: Q-Rex `show_diff` and native scenario approval; terminal pending [review record](references/flow-registry.md#terminal-scenario-review-record) and explicit acceptance of unchanged bytes. Stop for manual review. On acceptance record/check the decision first, then follow **Continue and resume**: remaining planned scenario-only batches, then `write-e2e-code` for eligible scope. Respect Q-Rex's cumulative snapshot and implementation-write restrictions. Keep the next action in the continuation entry; no further skill name is required from the user.
