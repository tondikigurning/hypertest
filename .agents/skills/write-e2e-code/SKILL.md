---
name: write-e2e-code
description: Implement or technically maintain e2e playwright-bdd steps, Page Objects, Component Objects, fixtures and mocks for reviewed Gherkin scenarios. Use after scenario review or for intent-preserving repairs to existing implementations.
---

# Write E2E Code (Phase 1)

Implement one approved Gherkin batch as reusable steps, page/component objects, fixtures and reviewed mocks. Read the [shared workflow contract](../ask-qa/references/workflow-contract.md) for host-specific approval, scope, completion evidence and external verification handoff. Use [E2E conventions](../write-e2e-scenarios/references/e2e-conventions.md) and [data safety](../write-e2e-scenarios/references/data-safety.md) for identity and test data.

For new/changed intent, verify approval of the **current** feature snapshot and exact scenario IDs before implementation. In Q-Rex, chat approval is insufficient: use the actual Changes-panel decision or configured automatic mode. Existing implemented scenarios can receive intent-preserving technical repairs/refactors without a new scenario-design gate; preserve their contract and IDs and inspect data safety.

Preserve the requested module/menu. Resolve feature candidates by contents and product evidence, not sibling proximity. If no matching approved scenario exists, apply [write-e2e-scenarios](../write-e2e-scenarios/SKILL.md) yourself for that target, including its PRD/discovery/review prerequisites. Reuse context; ask only when target or approval remains materially ambiguous. Do not ask the user to pick an unrelated feature or invoke the handoff again.

## Step 0 — Resolve approved scope

Identify the exact batch files, scenario/source identities, flow categories and applicable approval, or the existing contract for a technical repair. Reuse the reviewed requirement-to-scenario mapping to preserve each promised outcome and branch, including applicable shared rules; when a mapping is unavailable, reconstruct affected links from the available PRD and approved scenarios or existing repair contract, and report uncertainty. A missing mapping or PRD does not create a new scenario-design gate for an intent-preserving repair. If changed PRD context changes the intended behavior, route the affected scope through scenario review before changing its contract. Read prior answers and reviewed context instead of re-interviewing. Establish environment, prerequisites, owned-data scope, cleanup and unresolved product decisions under the shared contract. Report each batch's implementation and verification independently; when execution is unavailable, produce the concrete handoff below.

## Step 1 — Read before writing

1. Read every approved feature and the owning menu's flat/nested features. Follow [test organization](../../../docs/automation/test-organization.md): children share one parent PRD and ID namespace. Preserve IDs, `@flow:`, `@ref:`, assertions and intent; splits retain inherited tags, backgrounds/examples, safety notes and flow order. Missing requirements belong in a refresh/review of that parent through `write-prd`.
2. Read relevant shared fixtures/utilities, `steps/_shared/`, components and the existing module's steps/POMs and callers. Reuse their style and bindings. Read each linked `@ref:TEN_COM_*` master: its step text is the contract.
3. Inspect actual mock contracts before applying [MSW guidance](references/msw-mocking.md). Consult [troubleshooting](references/troubleshooting.md) only for a matching symptom; do not copy known weak assertions merely because they exist.

## Step 2 — Verify locators

Read [browser capabilities](../write-e2e-scenarios/references/playwright-cli-exploration.md). Use the host's managed/owned session, navigate to the scoped page and inspect a current snapshot. Verify roles, labels and test IDs with supported inspection or `generate-locator`; refresh refs after navigation/material changes. Q-Rex has no `eval`/`run-code` or element-attribute command. Use verified alternatives and mark remaining gaps instead of inventing locators.

If live access is missing, preserve usable existing verified code and complete independent work. Report new locator-dependent implementation as incomplete where evidence cannot be established.

## Step 3 — Align scoped data values

Apply the single [test-data convention](../write-e2e-scenarios/references/data-safety.md#test-data-values), including readable names, minute stamps, plain free text and collision handling. Inspect step/POM files in scope, including those being extended, and align violating values in the same pass using the existing helper. Preserve scenario assertions/intent and avoid unrelated module sweeps. Report aligned files/fields.

Data eligibility does not grant mutation permission. Preserve exact target identity through each action; a successful generic search or arbitrary first row does not establish ownership. Missing owned data follows search → supported provisioning → scoped exception review → skip without approval. Inspect notification/downstream effects and restoration limits before any approved exception.

## Step 4 — Implement the reviewed contract

- Steps delegate to POMs/COMs: `Given` establishes prerequisites, `When` acts, `Then` asserts. Put assertions in Then steps or POM `expect*` methods; COMs own shared UI interaction. Shared step text belongs in `steps/_shared/`, not `steps/_components/`.
- Reuse shared/stateful components and register injectable POMs/COMs in `fixtures/base.fixture.ts`. Extend existing classes without breaking their other callers.
- Implement consumer-visible journeys and consequential branches from the approved scenarios, including any explicitly reviewed field or validation behavior. Route missing journeys or changed intent through `write-e2e-scenarios` with the same scope and prior answers, stopping at its applicable review gate.
- Use actual request evidence for reviewed `@mock` handlers. Mocks verify the promised UI contract, not real backend integration. Preserve the no-mock smoke rule.
- Assert the approved observable outcome on the identified target. Feedback/network evidence can supplement it; do not substitute a mocked HTTP status for visible UI feedback or silently strengthen/change an approved assertion. Report a contract gap for scenario review.
- Keep cleanup and target guards effective after failures wherever feasible. A previous approval comment is not current-session seed authorization.

## Step 5 — Validate with available capabilities

**Terminal host:** inspect `e2e/package.json`, invoked runner and config before choosing commands. Check affected bindings, collection and types. Register split/nested implementation paths and check collection of every moved ID. Before live execution inspect selected setup/steps/POMs/tags, establish the intended environment and follow data safety. Verify the exact selection; an unfiltered `pnpm test:bdd` runs the suite and may sync catalog, import results and upload evidence. Do not generate BDD concurrently with the Automation runner, which shares generated files.

**Q-Rex:** inspect source/bindings and finish feasible code, then use the shared contract's implementation handoff. Collection, standalone types and draft BDD execution are unavailable. Keep `approved` with an “implementation draft; checks pending” progress note until external evidence validates this exact source. Identify branch/base, current full Changes snapshot or supplied source revision/diff, files/scenario IDs, supported commands for a terminal reviewer, intended selection/environment and all pending checks. This is a useful completed drafting deliverable, not a claim that the batch is implemented/verified. The explorer checkout runner cannot validate it.

External results may advance only the matching current source and complete reviewed scope under the shared contract. If live execution is unsafe/unavailable, do feasible non-live work and record the exact unverified branches. No host may treat generation, an empty/partial selection or a successful process alone as a complete pass.

## Step 6 — Report and stop

Report per scenario: relevant PRD requirement, source ID/path, implementation written, locator/binding gaps, collection/types, actual execution and evidence source. Advance batch evidence to `implemented` only after bindings and collection/type checks succeed; advance to `verified` only after every required scenario passes in the intended environment. Record failures, skips, quarantine, mocks and unavailable checks separately. Preserve the prior batch evidence state when evidence is incomplete; the flow registry tracks authoring, not execution.

List material files, reused/added steps/POMs/COMs, fixture/mock wiring, data-value alignment and commands actually run or still required. Distinguish mocked UI coverage from real backend coverage. Do not change scenario intent in this phase.

End the turn with the batch result or concrete external-check handoff. A later turn may continue independent approved work under the shared contract; unavailable checks remain pending and never imply a pass. In Q-Rex, implementation changes can block review of additional scenario edits, so plan scenario-only batches first. Do not add another approval question merely to report an unavailable check.
