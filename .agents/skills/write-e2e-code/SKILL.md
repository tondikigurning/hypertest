---
name: write-e2e-code
description: Implement or technically maintain playwright-bdd steps, Page Objects, Component Objects, fixtures and reviewed mocks for existing or approved scenarios, preserving intent and verifying bindings, types and actual outcomes separately.
---

# Write E2E Code

Complete every eligible scenario in the requested scope, including multiple approved batches, as reusable steps/POMs/COMs and supporting fixtures. Preserve assertions, IDs and scenario intent. Continue independent feasible work when another scenario is blocked; a representative pass does not finish the batch.

Read the [shared workflow contract](../ask-qa/references/workflow-contract.md), [exploration reuse](../ask-qa/references/exploration-context.md), [E2E conventions](../write-e2e-scenarios/references/e2e-conventions.md) and [data safety](../write-e2e-scenarios/references/data-safety.md). Reuse unchanged material already in context; read only changed or missing sources. Prepare concrete artifacts before questions, then honor the shared question boundary. Review, command/file permissions and live-data authorization are distinct.

## 1. Resolve scope and eligibility

Inventory exact feature paths and scenario instances across the requested menu/files, all applicable batches, inherited tags/backgrounds/examples, bindings, registered paths, fixtures and supporting code. Missing or duplicate IDs need source locations; never silently select an ambiguous identity. A matching step name or catalog entry alone is not a complete implementation. Preserve a narrower explicit scope.

| Scenario/source evidence | Implementation decision |
| --- | --- |
| New or changed intent | Require approval of the current exact feature snapshot and scenario scope. |
| Unchanged committed-baseline scenario with a clear contract | Implement missing code without a new design gate; historical review stays unknown unless evidenced. Compare actual baseline contents including inherited context; a catalog entry is insufficient. |
| Existing implemented scenario, intent-preserving repair/refactor | Repair without a new scenario-design gate; preserve its contract and inspect data safety. |
| Missing scenario or ambiguous/changed intent | Apply [write-e2e-scenarios](../write-e2e-scenarios/SKILL.md) to the same target, retaining context and its PRD/discovery/review prerequisites. A host write block is not a missing scenario. |

Terminal approvals use the [review record](../write-e2e-scenarios/references/flow-registry.md#terminal-scenario-review-record); record a just-received explicit acceptance against unchanged bytes before other work. Reuse a matching decision on resume. Q-Rex requires its native control or configured automatic mode; chat Yes is insufficient. Any unapproved changed-feature snapshot in Q-Rex manual mode blocks this skill and implementation writes workspace-wide, even for baseline cases. Review the cumulative scenario-only snapshot first where possible. Preserve existing implementation edits that block later review; use the supported separate draft workflow or finish the permitted approved scope, never reset or move work implicitly.

Recover `.exploration.md`, scenario handoffs, `.flows.md`, current features and active menu PRD where available. Compare scenario/snapshot and PRD references as specified in [implementation handoff](../write-e2e-scenarios/references/flow-registry.md#implementation-handoff). Assess mapping, locator applicability, approval and live-data permissions separately. Reconstruct missing links from accessible sources; missing PRD/handoff metadata does not block independently eligible intent-preserving work or erase verified locators. A different worktree does not inherit uncommitted records. Do not re-explore solely for a phase/session change.

## 2. Build shared paths from verified evidence

Read affected features, relevant `steps/_shared/`, module steps/POMs/COMs, fixtures, utilities and their callers. Follow linked `@ref:TEN_COM_*` masters exactly. Use [test organization](../../../docs/automation/test-organization.md) for nested/split ownership; children share the menu PRD and ID namespace.

Read [reliable implementation and diagnosis](../write-e2e-scenarios/references/reliable-e2e.md) before writing or repairing interactions. Group eligible scenarios by shared setup/transition; implement and check a representative path plus an important alternate early, then complete all remaining scenarios. Every scenario establishes its own prerequisites; do not depend on execution order or another scenario's mutable state.

For each required locator, reuse applicable verified evidence or verified code for the actual environment, page, role and state. Feature text, bare `eNN` or an assumed accessible role does not verify it. For missing/contradicted evidence, use [host browser capabilities](../write-e2e-scenarios/references/playwright-cli-exploration.md) for that gap only, with fresh refs after navigation/rerender. Q-Rex has no DOM eval/run-code/attribute inspection; use supported alternatives and report unresolved locator-dependent code as incomplete. Missing live access does not block independent evidenced work.

## 3. Implement without changing the contract

- Steps delegate: Given establishes prerequisites, When acts, Then or POM `expect*` asserts. COMs own shared interaction; reusable step text lives in `steps/_shared/`, never `steps/_components/`. Register injectable classes in `fixtures/base.fixture.ts` and preserve other callers.
- Implement consequential branches and reviewed field/validation behavior alongside the primary journey. A gap needing changed intent returns to scenario review; do not silently weaken or strengthen the approved assertion.
- Tie readiness to the control/result needed next. Await completion of reset/search/filter/tab transitions, not just a visible shell or changed input. Keep exact target identity through setup, action, assertion and cleanup. Use bounded observation retries, never retry a mutation or entire journey to hide failure.
- Apply the single data-value convention to scoped step/POM files touched in this pass, using the existing helper and readable collision handling; list aligned files/fields. No unrelated sweep. Verify actual owned rows, provision safely when supported, and follow the scoped seed exception before skipping an unavailable mutation. Preserve failure-safe cleanup and disclose downstream/restoration limits. Historical comments grant no current-session seed permission.
- For reviewed `@mock` work, read [MSW guidance](references/msw-mocking.md) and actual request contracts before handlers; no smoke mocks or fabricated schemas. Assert promised UI behavior on the identified target. Mocked status/toast alone cannot substitute for its visible outcome or required real integration.

## 4. Validate and diagnose

First check non-live bindings, exact collection and types where supported. Inspect `e2e/package.json`, invoked runner and config before choosing commands; the root TypeScript check excludes E2E, so check affected E2E code and its fixture/config imports explicitly. Verify registration of all affected nested paths and moved IDs. Zero/partial selection or generation success is not verification. Do not generate BDD concurrently with the local runner; generated files are shared. An unfiltered `pnpm test:bdd` can run the suite, import results and upload evidence.

When safe and authorized, run a narrow representative shared path and consequential alternate before propagating helpers across a large batch. Inspect selected setup/steps/POMs/tags, current target configuration and data prerequisites first. Record exact selection/source/environment and first-attempt outcomes. At the first failure, use [diagnosis](../write-e2e-scenarios/references/reliable-e2e.md#diagnose-before-retrying); change only what evidence supports and rerun the affected path before broader verification. Consult [troubleshooting](references/troubleshooting.md) for matching symptoms only. Rerun an unchanged failure only to test a concrete transient hypothesis with safe side effects.

| Host | Supported verification |
| --- | --- |
| Terminal | Binding generation, exact collection, scoped types, targeted execution after data-safety review. Use full Playwright diagnostics, not only truncated/deduplicated evidence JSON. |
| Q-Rex | Source/binding inspection and `run_draft_scenario` for one uniquely identified approved, implemented scenario, with E2E-owned data, browser Variables and separate explicit data-safety approval. Isolated artifacts stay temporary; collection and standalone types are unavailable. No shell/browser-tool workaround. |

Complete feasible work across all eligible scenarios, then verify the complete exact selection. For affected shared code, include relevant callers in non-live checks and safe regression selection. Unavailable live checks need an exact handoff, not another approval question merely to report them. Explorer-checkout results never verify an unmerged draft. External results advance only matching current source and complete scope under the shared contract.

Never turn a readiness timeout, ambiguous locator or inaccessible UI into an absent-data skip. Establish an observable settled result before declaring a prerequisite missing. Preserve failures and report skips/blocked/not-run separately. Do not add mocks, retries, quarantine, skip or relax assertions to improve the displayed pass rate.

## 5. Save evidence and report

Update affected `.exploration.md` entries with new/corrected locator, interaction, request and readiness evidence and blockers, preserving reused dates and evidence IDs. Keep `.flows.md` for confirmed inventory and PRD/actual gaps only. Do not rewrite unchanged logs or copy large feature/browser content when an exact snapshot reference exists.

Report per scenario or compact group with identical evidence: requirement, exact path/identity, code written, locator/binding gaps, collection, types, actual execution and evidence source. Retain each distinct failure/blocker and next action. List material files, reusable helpers, fixture/mock/path wiring, data-value alignment and commands run or pending. Separate mocked UI from real backend coverage, first attempts from retries and execution from uploads.

Advance to `implemented` only after bindings/collection and types succeed, and `verified` only when every required scenario passes in the intended environment. Q-Rex reports **implementation draft; checks pending**, retaining `approved` for an approved changed batch until those checks exist; unknown baseline review stays unknown. Include branch/base, full Changes snapshot or revision plus complete patch, exact files/instances, baseline/approval evidence, pending commands, intended environment and safe selection. Preserve prior evidence when incomplete and invalidate affected results after source changes. A representative pass never verifies the remainder; identify every remaining scenario and next action, then stop after all feasible scope is handled.
