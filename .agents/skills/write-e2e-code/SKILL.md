---
name: write-e2e-code
description: Implement or technically maintain e2e playwright-bdd steps, Page Objects, Component Objects, fixtures and mocks for reviewed Gherkin scenarios. Use after scenario review or for intent-preserving repairs to existing implementations.
---

# Write E2E Code (Phase 1)

**Entity options input:** Select `Converge` by default whenever an Entity options input is encountered, unless the user explicitly requests a different entity. This default does not override data-safety or approval requirements.

Generates the code behind an approved `.feature` file. Input is the reviewed Gherkin. Output is steps, POM methods, optional COMs, fixture wiring and mocks for one sub-module, or one flow in it.

For new or changed scenario intent, Phase 0 (`write-e2e-scenarios`) must produce an approved `.feature` first. Apply that workflow in the same conversation if needed; stop at its review gate. A technical repair or refactor of an existing implemented scenario may proceed from its established contract without a new design review when intent and IDs remain unchanged. If the intended behavior must change, return to Phase 0.

**Keep the requested target:** Resolve the user's named module and sub-module against the PRD, app navigation and feature contents. A feature in the same module is not automatically a candidate: offer or use it only when its contents or other evidence establish that it covers the requested target. Never substitute an unrelated sibling feature merely because the requested feature is missing. If the target is unambiguous and no matching approved feature exists, explain that Phase 0 is required and apply `write-e2e-scenarios` for that same target without asking the user to select a different scope or reconfirm the handoff. Follow Phase 0's PRD prerequisite, interview, flow-list confirmation and scenario review gates; do not implement until approval. Ask a focused question only if the target, matching feature location, or applicable approval genuinely remains ambiguous, and present only evidence-supported candidates plus the permitted free-text fallback. A user-provided feature path still needs its target and approval verified before Phase 1.

**Data safety:** Use E2E-owned records for mutations; seed data and shared settings are read-only by default. Follow search → create → skip. If the required E2E data cannot be found or provided within scope, explain the limitation and ask permission to use non-E2E data for that specific scenario under [data-safety.md](../write-e2e-scenarios/references/data-safety.md). Record approval before mutation; restoration alone does not grant permission. Without approval, skip the affected mutation.

Implement **approved batches only**, using the exact reviewed scenario IDs and flow categories from the current conversation registry and `.feature` review. Check that the current scope is `approved` before implementation. Each batch is implemented and verified before the next one starts. Intent-preserving technical repairs to an existing scenario do not require a new approval when its contract and IDs remain unchanged; preserve its scenario and check data safety.

Implement the reviewed business journeys and consequential branches in the approved scenarios. Do not expand them into field-by-field or component-level checks; route missing business journeys back to `write-e2e-scenarios`. An approved or verified batch does not prove that the whole business flow or sub-module has been discovered or covered.

Conventions: [../write-e2e-scenarios/references/e2e-conventions.md](../write-e2e-scenarios/references/e2e-conventions.md). Data safety: [../write-e2e-scenarios/references/data-safety.md](../write-e2e-scenarios/references/data-safety.md). MSW: [references/msw-mocking.md](references/msw-mocking.md). Troubleshooting: [references/troubleshooting.md](references/troubleshooting.md).

## Step 0 — Resolve scope and context

Follow the shared [question and approval guidance](../write-e2e-scenarios/SKILL.md#step-0--interview-for-scope-required). Use the reviewed scenarios, prior answers, conversation registry and project evidence to establish scope and context; do not re-interview for information already established by the scenario handoff. Ask only when a consequential decision remains unresolved after that inspection. Establish:

- The matching module, sub-module, feature and exact approved batch or existing scenario contract. A supplied path still needs target and approval verification.
- The test data, prerequisites and cleanup needed for mutations, following [data-safety.md](../write-e2e-scenarios/references/data-safety.md).
- Reusable steps, page/component objects, UI constraints, relevant mock contracts, environment and known defects. Inspect project files and browser evidence first; ask about unresolved product decisions or access.

Derive file names from the established project patterns. If target or approval is ambiguous, resolve it before dependent implementation. If the target has no approved scenario, apply Phase 0 for that target.

## Step 1 — Read before writing

1. Read the approved `.feature` and the shared context needed by the selected batch. Keep every `@ID`, `@flow:` and `@ref:` tag and scenario intent unchanged.
2. Read the shared fixtures, utilities, `steps/_shared/` and components relevant to the scope. Follow the [test-data convention](../write-e2e-scenarios/references/data-safety.md#test-data-values) when adding or changing values.
3. Read the existing POM and steps for the same module (for example `pages/user-management/UsersPage.ts`, `steps/user-management/users.steps.ts`) and copy their style.
4. Read every `@ref:TEN_COM_*` master in `features/_components/` that the scope links to. Its steps are the contract you must implement.

## Step 2 — Verify locators before writing the POM

Do not write a locator from memory. Open a named `playwright-cli` session, navigate to the page and take a `snapshot`. Search it for the role, text or `data-testid`; when needed, inspect live element attributes using supported CLI commands and confirm the locator against the page.

If a locator cannot be verified, say so in the summary and mark the gap. Do not guess.

## Step 2b — Align test data values in the files you touch

The data-value convention is enforced on every pass, not only for new scenarios. Two rules, decided per field:

- **Rule A — unique or findable test record** (name, subject, title, login email): `E2E <relevant words> <DDMMYYYYHHmm>`
  — `E2E profanity word 271020261108`. An updated value appends the operation (`E2E user group 271020261108 edited`).
- **Rule B — plain free text** (description, comment, remarks, body/content, notes): a realistic domain sentence with no
  `E2E` flag and no stamp — `Access role for the customer support team.`

Scan the step and POM files for the scope, including files you are only extending, and update every value that breaks
either rule: `Date.now()`/epoch suffixes, module codes or UUIDs as the readable part, and `E2E` or timestamp noise on
plain free text. Build Rule A values with `e2eTimestamp()` / `e2eValue("<relevant words>")` from
`utils/e2e-test-data.ts`, adding that helper from the snippet in
[../write-e2e-scenarios/references/data-safety.md](../write-e2e-scenarios/references/data-safety.md#test-data-values)
when it does not exist.

Do not change scenario intent, flow IDs or assertions, and do not sweep modules outside the current scope. List the
aligned files and fields in the summary.

## Steps 3–7 — Implement the approved scenarios

- Reuse existing shared steps and page/component objects. Steps delegate to POMs or COMs; `Given` sets preconditions, `When` acts and `Then` asserts. Place assertions in `Then` or POM `expect*` methods, not COMs. Shared step text belongs in `steps/_shared/`; keep `steps/_components/` empty.
- Express user-visible actions and expectations in the POM, using verified locators and the existing module style. Extend existing classes without breaking other flows. Use COMs for shared or stateful UI where appropriate and register injectable objects in `fixtures/base.fixture.ts`.
- Follow [MSW guidance](references/msw-mocking.md) for reviewed `@mock` scenarios. Confirm the actual request contract before implementing a mock; report mocks separately from real integration coverage.
- Mutation assertions must verify an observable data-changing outcome. Dynamic selection is suitable for reference values, not an unverified mutation target. Follow [data-safety.md](../write-e2e-scenarios/references/data-safety.md) for target identity, scoped exceptions and cleanup, including after failures.

## Step 8 — Verify

Check step bindings, collection and types for the affected scenarios. Before any live execution, inspect their setup, steps, POMs, tags and environment and follow [data-safety.md](../write-e2e-scenarios/references/data-safety.md). Select only the authorized scenarios and verify the selection using the active runner's options. Do not run BDD generation concurrently with the Automation local runner: they share generated files.

Inspect `e2e/package.json` and the runner script before choosing a command. `pnpm test:bdd` generates and runs BDD and can sync the catalog, import results and upload evidence when configured; an unfiltered invocation runs the suite. Report those effects and do not use the full suite as a default. If live execution is unavailable or unsafe, perform feasible non-live checks and report the exact blocker and unverified scope.

## Step 9 — Report and stop

Report implementation and verification per scenario. Update the affected conversation registry scope to `implemented` only after steps and bindings exist and collection/type validation succeeds; use `verified` only after every required scenario in that reviewed scope passes in the intended environment. Preserve `approved` or `implemented` when verification is incomplete, and record skips, quarantine, unavailable data, failures and unverified branches individually. Record actual commands and outcomes; `bddgen` success alone is generation, not proof that imports resolve or TypeScript compiles. A successful process or partial selection is insufficient to claim the whole batch passed. A verified batch does not prove complete business-flow coverage. Do not create a separate `.flows.md` file.

Distinguish UI execution with mocked responses from verification of real backend behavior. State which scenarios used `@mock`, the actual backend coverage, and any unverified integration outcomes. Do not treat an old approval as approval of new scenario intent.

Report: files created or changed, scenario IDs implemented, steps added, POM methods added, COMs added or reused, fixture entries, `@mock` handlers registered, existing data values aligned to the convention (files and fields), locator gaps still open, and the commands that need to run.

Do not change `.feature` scenario intent or flow IDs in this phase. If the feature file looks wrong, stop and send the user back to `write-e2e-scenarios`.

Then stop. Do not start the next batch in the same session.

## Related

- MSW rules and helpers: [references/msw-mocking.md](references/msw-mocking.md)
- Troubleshooting: [references/troubleshooting.md](references/troubleshooting.md)
- Exploring and writing the `.feature`: `write-e2e-scenarios`
- Not sure which workflow applies: `ask-qa`
