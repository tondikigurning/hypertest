---
name: write-e2e-scenarios
description: Discover menu business flows from its active PRD and browser evidence, then write or maintain reviewable Gherkin scenarios with stable IDs. Use for E2E discovery or scenario-intent changes; stops for scenario review before implementation.
---

# Write E2E Scenarios

Produce evidence-supported business scenarios and a resumable review handoff. Write `.feature`, menu `.flows.md` and `.exploration.md` files; implementation belongs to [write-e2e-code](../write-e2e-code/SKILL.md).

Read the [shared workflow contract](../ask-qa/references/workflow-contract.md) and [exploration reuse](../ask-qa/references/exploration-context.md). Read [data safety](references/data-safety.md) before authoring or interaction. Reuse unchanged instructions, answers and evidence already in context; read changed or unavailable material once. Keep reviews, browser permissions, data authorization and test results separate. Prepare concrete artifacts before questions or manual reviews, then stop under the shared question boundary.

## 1. Recover scope and evidence

- Resolve the owning module/menu from sources and navigation. Read its active database PRD, `.exploration.md`, `.flows.md`, flat and descendant features, and relevant steps/POMs and callers. Use [test organization](../../../docs/automation/test-organization.md) for ownership. Children share one menu PRD and ID namespace. Inspect reusable `features/_components/` contracts for applicability and follow relevant `@ref:TEN_COM_*`; unchanged unrelated masters need no full reread.
- Q-Rex reads the virtual `docs/prd/<module>/<menu>.md` through file tools; terminal agents use [database access](../ask-qa/references/prd-database-access.md). An incomplete or unvalidated active PRD is usable context. If absent, apply [write-prd](../write-prd/SKILL.md). A pending unsaved proposal is not the active PRD. Other menus provide supporting context only.
- Preserve requirement provenance: accepted items retain their review method; attributed `spec` remains a source; evidenced actual behavior is a provisional baseline, not confirmed product intent. Reconcile legacy untagged content rather than rejecting it. Report uncertainties and continue independently supported scope.
- Default to a full pass including important regression branches; smoke-only requires an established user choice. Reuse purpose, priorities, roles, defects, exclusions and authorized data scope. Ask only consequential gaps investigation cannot settle, including unresolved production restrictions required by the shared contract.
- For a terminal browser target, read the configured `ENV` from `e2e/.env.local` without printing secrets. Its valid current value overrides historical notes. Q-Rex uses its selected environment and browser Variables. Ask about configuration only when missing, invalid or explicitly changed.

Choose registry-only, author confirmed flows, discover-and-author, or review existing coverage according to the request and evidence. Flow count is not a limit. Registry-only reports existing requirement-to-assertion coverage and gaps without Gherkin edits.

## 2. Inventory and confirm flows

Apply [flow discovery](references/flow-discovery.md) and [coverage and batching](references/scenario-coverage.md). Reconcile every in-scope PRD journey, shared rule and observed action to a named flow, branch, established exclusion or specific gap. Inventory the whole requested scope before choosing a scenario batch, including individually named PRD-only candidates and later batches. Existing tags or one success scenario do not establish complete journeys.

Before browser work, list precise remaining evidence questions. Applicable PRD-phase observations count, even in a new session or with no browser now available. Read [data safety](references/data-safety.md) and [host browser capabilities](references/playwright-cli-exploration.md) before interactions. Investigate only missing or affected facts, including bounded safe read-only branches; reuse unchanged blockers until their prerequisites change. Provision E2E-owned data through supported authorized flows when needed. Missing access is not proof a feature is absent.

Present the complete proposed inventory in the response: total flows; each ID, goal, exact proposed feature path, PRD/shared-rule IDs, known branches, evidence level and gaps; existing, proposed, deferred and excluded scope. Identify baseline requirements lacking a represented flow and why. Confirmation accepts the described inventory only.

Use the shared contract's flow-confirmation gate. Q-Rex calls `confirm_flows` for each affected file with its owning PRD. A terminal prepares the pending source comparisons in [flow confirmation provenance](references/flow-registry.md#flow-confirmation-provenance), asks whether flows are missing or extra, and waits. Reuse an evidenced still-matching terminal decision; verify sources on acceptance and resume. Material inventory changes require affected reconfirmation, preserving IDs.

After confirmation, update the menu registry using the [template](references/flow-registry-template.md) and [registry rules](references/flow-registry.md). It has only `Flows` and `Gaps`: every confirmed flow and all its paths, including later batches; `pending` until its confirmed scope is fully authored, then `written`. Neither status implies review or execution. Put PRD/actual mismatches with next actions in registry Gaps; scenario branch progress and confirmation provenance belong in `.exploration.md`.

## 3. Establish testable branches

Use the coverage checklist for every selected flow. Start with the whole confirmed scope as the candidate batch; include supported distinct success and consequential alternate outcomes. Existing coverage counts only when its assertions cover the condition and outcome. Continue independent branches when another is blocked. Split only for a concrete evidence, host or accuracy/review constraint; a scenario count, different setup or future implementation effort alone is insufficient. Account for every omitted branch and next action.

Before authoring, apply [reliable scenario contracts](references/reliable-e2e.md#scenario-contracts). Connect shared setup and lifecycle transitions to existing evidence once. Identify missing preconditions, exact target, readiness and observable outcome rather than letting implementation guess them. Capture reusable locators while already inspecting relevant UI; temporary `eNN` refs or outcome text alone are not locator evidence. Keep technical detail in the handoff and business behavior in Gherkin.

Record source/actual discrepancies through `write-prd` and registry Gaps. Use evidenced actual behavior provisionally while product intent is pending; a proposed PRD refresh does not block independent supported work. For a confirmed defect, assert sourced expected behavior and use `@fixme @ref:<real-ticket>`. If the ticket is missing, ask and retain a documented candidate; never invent one or substitute quarantine. Save sanitized supported evidence and state unavailable screenshot/trace/request capabilities truthfully.

## 4. Author the batch

Read [E2E conventions](references/e2e-conventions.md) before IDs/tags. Preserve permanent scenario/flow IDs, retired identities and existing approved intent; changed intent follows review. Reconcile covered, partial, missing, stale, obsolete and reusable-master cases. Splits preserve inherited tags, backgrounds, examples, safety notes, flow order and bindings; path registration is Phase 1 work.

- Group by business goals and lifecycle outcomes. Add distinct evidenced branches without multiplying equivalent samples or component-only checks. Use master step text with its `@ref` where applicable. `Scenario Outline` is for reusable component contracts and their mirrors; business journeys use plain scenarios.
- Use `@smoke` for supported in-scope CRUD happy paths and other main release-gating journeys, honoring explicit exclusions; consequential alternatives use `@regression`. Report unsupported or blocked operations. Read [mock policy](../write-e2e-code/references/msw-mocking.md) for mock-dependent cases; no `@mock` on smoke or invented request contracts.
- Each mutation asserts its outcome on the identified record; feedback supplements record/status/persistence evidence. If persistence cannot be observed, limit the promised claim explicitly for review. Dynamic read-only reference choices are allowed where the contract permits; mutation targets require verified ownership or the exact scoped exception.
- Follow data values and collision handling in data safety. Report violating scoped step/POM values for Phase 1; do not edit implementation here. Mark user-forbidden production actions `@production-restricted` with the restriction; unresolved production mutation eligibility stays unknown. The tag alone does not enforce safety.
- Authenticated projects supply login setup. Start at the business precondition/action; include explicit login only when authentication is under test or a clean-session project requires it.

## 5. Reconcile and request scenario review

Use [review and handoff](references/scenario-review.md) before presenting the batch. Save its exact contract/snapshot, requirement-to-scenario-to-outcome mapping, evidence links, setup/readiness/cleanup gaps and review provenance in `.exploration.md`. Preserve observation dates and unaffected entries; reference evidence instead of duplicating it. Reconcile the full inventory and feature counts; a partial flow stays `pending`.

Present every new/changed scenario grouped by flow, exact paths, totals, requirement mapping, limitations and remaining branches in the response itself. State implementation/execution status and what this decision covers. A feature link alone is insufficient review material.

Q-Rex uses `show_diff` and the explicit scenario approval control in Chat/Changes; chat Yes is insufficient. Terminal agents prepare the [pending review record](references/flow-registry.md#terminal-scenario-review-record), request explicit acceptance and stop. On the next turn, record actual acceptance against unchanged bytes before continuing. Manual scenario authoring ends its turn; configured Q-Rex automatic mode follows its gates and labels decisions automatic. Plan Q-Rex's cumulative scenario-only reviews before implementation, which can block later reviews. Explain the next action without requiring another slash command.
