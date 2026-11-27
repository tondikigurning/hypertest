---
name: write-e2e-code
description: Implement approved or eligible existing Gherkin and maintain steps, Page Objects, components, fixtures and mocks without changing scenario intent; continue after scenario review.
---

# Write E2E Code

Complete all eligible scenarios in the requested scope as reusable steps/POMs/COMs and fixtures, preserving assertions and permanent IDs. Continue independent feasible work when one scenario is blocked; a representative pass does not finish a batch.

Apply the [shared workflow contract](../ask-qa/references/workflow-contract.md), especially **Continue and resume** and **Read only what the next action needs**, [exploration reuse](../ask-qa/references/exploration-context.md), [E2E conventions](../write-e2e-scenarios/references/e2e-conventions.md) and [data safety](../write-e2e-scenarios/references/data-safety.md). Reuse instructions, source maps, contracts and evidence already in context; read only missing/changed material. Review, command/file permission, live-data authorization and execution evidence remain separate.

## 1. Resolve eligibility and resume

Inventory exact feature paths/scenario instances across the requested menu/files and approved batches, including inherited tags/backgrounds/examples, bindings and path/fixture registration. Reuse the previous phase's inventory and implementation map. Missing/duplicate IDs require source locations; matching step names or catalog rows alone do not establish implementation.

| Source/intent | Decision |
| --- | --- |
| New or changed scenario intent | Require acceptance of the current exact snapshot/scope. |
| Unchanged committed-baseline scenario with a clear contract | Missing implementation may proceed without another design gate; compare actual baseline including inherited context. Historical review stays unknown unless evidenced. |
| Existing implementation, intent-preserving repair/refactor | Preserve the contract and inspect safety; no new scenario-design gate. |
| Missing scenario or ambiguous/changed intent | Apply `write-e2e-scenarios` to the same target, retaining context and this implementation objective for return. A host write block does not mean the scenario is missing. |

Record a just-received explicit terminal acceptance against unchanged bytes before other work using the [review record](../write-e2e-scenarios/references/flow-registry.md#terminal-scenario-review-record). Q-Rex requires native scenario approval or configured automatic mode; chat Yes is insufficient. In Q-Rex manual mode any unapproved changed-feature snapshot blocks this skill and implementation writes workspace-wide, including baseline cases. Finish planned scenario-only reviews before code where possible; preserve implementation edits that block later review and use the supported separate draft workflow rather than resetting/moving work implicitly.

Recover current contracts, active PRD where available, exploration/flow records and [batch handoff](../write-e2e-scenarios/references/flow-registry.md#implementation-handoff) only where missing from context or changed. Compare required sources for mappings/review separately from locator applicability and live permissions. Reconstruct missing links from accessible artifacts. An unavailable PRD/handoff does not erase verified locators or block independently eligible intent-preserving work; another worktree does not inherit uncommitted records.

## 2. Build shared paths from evidence

Inspect affected feature contracts and relevant `steps/_shared/`, module steps/POMs/COMs, fixtures, utilities and callers. Follow `@ref:TEN_COM_*` masters and [test organization](../../../docs/automation/test-organization.md) for nested ownership. Use known paths and scoped searches before broad discovery.

Apply [reliable E2E contracts and interactions](../write-e2e-scenarios/references/reliable-e2e.md). Group eligible scenarios by shared setup/transition; implement/check a representative path and consequential alternate early, then complete every remaining scenario. Each scenario establishes its own prerequisites and exact target independently of execution order.

Reuse verified locator evidence/code applicable to the target, page, role and state. Gherkin, bare `eNN` and assumed roles do not verify selectors. For a missing/contradicted locator use [host browser capabilities](../write-e2e-scenarios/references/playwright-cli-exploration.md) for that gap only, with fresh refs after navigation/rerender. Q-Rex lacks arbitrary DOM eval/attribute inspection; use supported alternatives and retain unresolved locator-dependent code as incomplete. Missing live access blocks only work needing missing evidence.

## 3. Implement the contract

- Steps delegate: Given establishes prerequisites, When acts, Then/POM `expect*` asserts. COMs own shared interaction; reusable step text lives in `steps/_shared/`. Register injectable classes in `fixtures/base.fixture.ts` and preserve other callers.
- Implement consequential reviewed branches alongside the primary journey. Changed assertions/intent return to scenario review; retain this implementation objective across the detour. Bind readiness to the required next control/result, including reset/search/filter/tab completion and exact identity through setup/action/assertion/cleanup. Use bounded observation retries; never retry mutations or entire journeys to hide failures.
- Apply the existing data-value helper and readable collision handling to scoped touched step/POM files; list aligned fields without an unrelated sweep. Verify current ownership/state, provision safely and follow the scoped seed exception before skipping unavailable mutations. Preserve failure-safe cleanup and downstream/restoration limits. Old comments and historical data identities grant no current permission.
- For reviewed `@mock` work, read [MSW guidance](references/msw-mocking.md) and actual request contracts. No smoke mocks or fabricated schemas. Assert promised visible behavior on the identified target; status/toast alone does not replace its outcome or required real integration.

## 4. Validate the exact selection

Inspect package scripts, invoked runner and config before choosing commands; reuse unchanged command knowledge. First verify non-live bindings, exact collection/path registration and scoped E2E types including fixtures/config imports. Root typecheck excludes E2E. Zero/partial selection or generation success is insufficient. Do not generate BDD concurrently with the local runner; generated files are shared. Unfiltered `pnpm test:bdd` can run the suite, import results and upload evidence.

| Host | Verification |
| --- | --- |
| Terminal | Binding generation, exact collection, scoped types and targeted execution after inspecting setup/steps/POMs/tags, current target/data and data safety. Use full Playwright diagnostics; evidence JSON may truncate/deduplicate failures. |
| Q-Rex | Source/binding inspection and `run_draft_scenario` for one uniquely identified approved/implemented scenario with E2E-owned data, browser Variables and separate explicit data-safety approval. Standalone collection/types are unavailable; no shell/browser workaround. Isolated results/artifacts remain temporary. |

When safe and authorized, run the representative shared path and consequential alternate before broad propagation. At the first failure apply [diagnosis before retrying](../write-e2e-scenarios/references/reliable-e2e.md#diagnose-before-retrying); consult [troubleshooting](references/troubleshooting.md) only for matching symptoms. Correct only evidenced causes and rerun the affected path before broader checks. Retry an unchanged failure only for a concrete transient hypothesis with safe side effects; reconcile an uncertain mutation before resubmitting.

After completing feasible code, verify the entire exact eligible selection and affected shared callers. Reuse unchanged successful checks until source changes or an unresolved concern warrants rerunning. Record selection/source/environment and first attempts separately from retries. A timeout/ambiguity/inaccessible UI is not absent data; establish settled absence before a prerequisite skip. Preserve failures, skips, blocked and not-run cases; do not weaken assertions or add retries, mocks, quarantine or skips to improve pass rate.

## 5. Save evidence and report

Update affected exploration evidence/handoffs and the continuation entry in place, preserving original dates, stable IDs and unrelated work. Reference contracts/evidence rather than copying logs or features; `.flows.md` keeps inventory and PRD/actual gaps only.

Report compact groups only when evidence is identical, retaining each exact scenario identity/path, requirement, code/binding/locator gaps, collection, types, execution source and distinct failure/blocker/next action. List material files, shared helpers, fixture/mock/path wiring, data-value alignment and actual/pending commands. Separate mocked UI from real integration, execution from upload and first attempts from retries.

`implemented` requires successful bindings/collection and types; `verified` requires every required scenario passing in the intended environment. Q-Rex reports **implementation draft; checks pending**, retaining `approved` for approved changed batches until those checks exist and unknown historical review for baseline cases. Supply branch/base, complete patch/snapshot identity, exact files/instances, approval/baseline evidence, safe selection, intended environment and pending commands. External results count only for matching current source and complete scope; explorer-checkout results do not verify an unmerged draft. Invalidate affected results after changes and report every unverified remainder without another question merely to report unavailable checks.
