---
name: write-e2e-code
description: Implement or technically maintain e2e playwright-bdd steps, Page Objects, Component Objects, fixtures and mocks for reviewed Gherkin scenarios. Use after scenario review or for intent-preserving repairs to existing implementations.
---

# Write E2E Code (Phase 1)

**Entity options input:** Select `Converge` by default whenever an Entity options input is encountered, unless the user explicitly requests a different entity. This default does not override data-safety or approval requirements.

Generates the code behind an approved `.feature` file. Input is the reviewed Gherkin. Output is steps, POM methods, optional COMs, fixture wiring and mocks for one sub-module, or one flow in it.

For new or changed scenario intent, Phase 0 (`write-e2e-scenarios`) must produce an approved `.feature` first. Apply that workflow in the same conversation if needed; stop at its review gate. A technical repair or refactor of an existing implemented scenario may proceed from its established contract without a new design review when intent and IDs remain unchanged. If the intended behavior must change, return to Phase 0.

**Keep the requested target:** Resolve the user's named module and sub-module against routes, feature contents and registry evidence. A feature in the same module is not automatically a candidate: offer or use it only when its contents or other evidence establish that it covers the requested target. Never substitute an unrelated sibling feature merely because the requested feature is missing. If the target is unambiguous and no matching approved feature exists, explain that Phase 0 is required and apply `write-e2e-scenarios` for that same target without asking the user to select a different scope or reconfirm the handoff. Follow Phase 0's interview, flow-list confirmation and scenario review gates; do not implement until approval. Ask a focused question only if the target, matching feature location, or applicable approval genuinely remains ambiguous, and present only evidence-supported candidates plus the permitted free-text fallback. A user-provided feature path still needs its target and approval verified before Phase 1.

**Data safety:** Use E2E-owned records for mutations; seed data and shared settings are read-only by default. Follow search → create → skip. If the required E2E data cannot be found or provided within scope, explain the limitation and ask permission to use non-E2E data for that specific scenario under [data-safety.md](../write-e2e-scenarios/references/data-safety.md). Record approval before mutation; restoration alone does not grant permission. Without approval, skip the affected mutation.

For new or changed scenarios using a registry and batches, read the registry file `e2e/tests/bdd/features/<module>/<submodule>.flows.md` (see write-e2e-scenarios, "Registry file"). Implement **approved batches only**, using the exact reviewed scope. Each batch is implemented and verified before the next one starts. Do not implement `written` flows, because they are not approved yet. Intent-preserving technical repairs to an existing implemented or verified flow do not require a new approved batch; preserve its scenario contract and check data safety.

Implement the reviewed business journeys and consequential branches in the approved scenarios. Do not expand them into field-by-field or component-level checks; route missing business journeys back to `write-e2e-scenarios`. An approved or verified batch does not prove that the whole business flow or sub-module has been discovered or covered.

Conventions: [../write-e2e-scenarios/references/e2e-conventions.md](../write-e2e-scenarios/references/e2e-conventions.md). Data safety: [../write-e2e-scenarios/references/data-safety.md](../write-e2e-scenarios/references/data-safety.md). MSW: [references/msw-mocking.md](references/msw-mocking.md). Troubleshooting: [references/troubleshooting.md](references/troubleshooting.md).

## Step 0 — Interview for scope (required)

For questions and confirmations throughout this skill, follow the question-presentation and response-handling instructions in [write-e2e-scenarios Step 0](../write-e2e-scenarios/SKILL.md#step-0--interview-for-scope-required). Apply only those interaction instructions, not its scope or scenario workflow. Ask one focused question at a time and adapt to the answer.

Before every question, apply the shared reuse-answers rule: use clear applicable answers from the request or earlier conversation, including across Phase 0 and Phase 1; ask only for missing or genuinely ambiguous parts. Preserve distinct explicit approval gates.

For every question, apply the mandatory question-format decision in that section: offer meaningful alternatives and a free-text fallback when possible, and always recommend one option with its reasoning and any uncertainty; use open-ended text only under the stated conditions and include the delegation sentence.

After asking any question or confirmation, pause all task work until the user answers, including independent investigation and tool calls; follow the shared async and plain-text waiting rules.

**Mandatory interview completeness gate:** Before dependent implementation, account for every scope topic and every applicable decision in each context topic below. Track each as answered, explicitly delegated/skipped with assumptions, not applicable with a concrete reason, or pending. Ask every pending applicable context decision one at a time and wait for the answer; a partial answer covers only the part answered. Do not infer an answer or inapplicability from code or silence. Keep the checklist across turns and interruptions, revisit it when scope changes, and report assumptions and material gaps. Scope questions remain conditional as stated below. Follow the detailed gate and interaction rules in [write-e2e-scenarios Step 0](../write-e2e-scenarios/SKILL.md#step-0--interview-for-scope-required). Explicit review and data-safety approvals still apply; this gate does not introduce a new scenario-design review for intent-preserving technical repairs.

Ask only for what you cannot determine:

1. **Module (required)** and **sub-module (required when the module has sub-modules)**. Check for an approved `.feature` at `e2e/tests/bdd/features/<module>/<submodule>.feature` and other evidence-supported matching locations. If several plausible features cover the requested target, list those candidates and ask; do not list unrelated sibling features. If none exists, follow the Phase 0 handoff above.
2. **Flow scope**: pick one of these, and ask only if the user has not said:
   - **Batch (for registry-based work)**: implement the exact approved batch recorded in the registry, including its reviewed flow and scenario scope. Batch size follows the approved grouping and has no flow-count limit. If the batch or its approval is unclear, resolve it before implementation; do not combine independently approved batches.
   - **One flow**: a single `@flow:` ID (for example `TEN_USR_CREATE_FLOW`). Add methods to the existing POM and do not recreate the class.
   - **Whole file**: when the approved scope was reviewed as a single pass and implementation is manageable together, irrespective of flow count.
3. **Smoke-only (optional)**: ask only if the user wants a release-gating pass.

Derive the rest yourself:

- POM class name: PascalCase of the feature scope plus `Page`. `user-groups.feature` → `UserGroupsPage`, `outage-management.feature` → `OutageManagementPage`.
- File targets: `steps/<module>/<submodule>.steps.ts`, `pages/<module>/<PageName>.ts`.

## Step 0b — Context interview (required)

The approved `.feature` says what to test, not how the environment behaves. Before starting dependent work, interview the user about applicable unanswered topics below one focused question at a time, adapting follow-ups to the answers. Do not treat repository evidence as a substitute for the interview. Skip questions already answered in the conversation or clearly inapplicable. Wait for a response; silence is not an answer. If the user explicitly skips or delegates the interview, proceed and report assumptions. Existing approval and data-safety gates still apply.

1. **Test data — required for any mutation flow:** which records mutations need, whether `E2E`-prefixed records are used, and who cleans up after runs. Use E2E-owned records. When unavailable, investigate upstream provisioning; explain any dependency and obtain explicit scoped approval before touching seed data, recording it in the `.feature` file. Without approval, skip (see [data-safety.md](../write-e2e-scenarios/references/data-safety.md)).
2. **UI quirks:** custom widgets, portals, Shadow DOM, or missing `data-testid` attributes that the accessibility snapshot may not describe well.
3. **Mocks:** the endpoints `@mock` scenarios should intercept, and the error codes or delay the scenarios expect. If unknown, the agent confirms the traffic with `playwright-cli requests` and proposes mocks for approval.
4. **Reuse:** existing POM, COM, or step files to extend, files that must not change, and `_shared` steps that already cover part of the scope.
5. **Environment and known gaps:** whether the app runs locally with `.env.local` ready, and scenarios already known to fail from product bugs (these get `@fixme`, not debugging).

Rules:

- Never re-ask a question the user has already answered, in this message or earlier in the conversation. Reuse the answer. Ask only for what is still missing.
- If the user answers "skip" or "you decide", continue and record every assumption in the summary.
- Answers guide the implementation. Locators still come from a real snapshot or the frontend source.

## Step 1 — Read before writing

1. Read the approved `.feature` completely. Keep every `@ID`, `@flow:` and `@ref:` tag exactly as written. Do not change scenario intent or flow IDs. For a batch, read only the sections for the batch's flows for writing, but read the whole file for the shared step text and existing tags. Do not read other batches' scenarios into the work.
   1a. Read the registry file and note the batch's flow rows, discovery evidence and unresolved gaps. Only these rows change in this session; preserve discovery notes, including gaps outside the approved scenarios.
2. Read the shared pieces you will reuse: `fixtures/base.fixture.ts`, `fixtures/page-context.ts`, `utils/list-page-network-utils.ts`, `utils/list-page-constants.ts`, `utils/e2e-test-data.ts` (add it from the snippet in [../write-e2e-scenarios/references/data-safety.md](../write-e2e-scenarios/references/data-safety.md#test-data-values) when absent), the matching `steps/_shared/*.steps.ts`, and any `components/*.ts` that the scope uses (for example `PipelineComponent.ts`, `DataTableComponent.ts`, `FilterComponent.ts`, `ConfirmModalComponent.ts`, `ResponseModalComponent.ts`).
3. Read the existing POM and steps for the same module (for example `pages/user-management/UsersPage.ts`, `steps/user-management/users.steps.ts`) and copy their style.
4. Read every `@ref:TEN_COM_*` master in `features/_components/` that the scope links to. Its steps are the contract you must implement.

## Step 2 — Verify locators before writing the POM

Do not write a locator from memory. Verify each one in one of two ways:

- Open a named `playwright-cli` session, then `goto` the route and take a `snapshot`. Search the saved snapshot for the role, text or `data-testid`.
- Read the frontend component source under `e2e/app/` and confirm the attribute.

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

## Step 3 — Write the step definitions

File: `e2e/tests/bdd/steps/<module>/<feature>.steps.ts`

```ts
import { createBdd } from "playwright-bdd";
import { test } from "../../fixtures/base.fixture";

const { When, Then } = createBdd(test);

When("they navigate to the dashboard", async ({ dashboardPage }) => {
  await dashboardPage.navigateTo();
});

Then("the dashboard page is visible", async ({ dashboardPage }) => {
  await dashboardPage.expectLoaded();
});
```

Rules:

- Steps call POM or COM methods. Never put raw locators inline in a step.
- `Given` sets up a precondition, `When` performs an action, `Then` asserts. `expect()` lives in `Then` steps or in POM `expect*` methods, never in a COM.
- A step text used by more than one feature goes in `steps/_shared/`. Do not duplicate it per module.
- `steps/_components/` must stay empty. Component master steps resolve from `_shared/` or module files.
- Import the MSW delay as `import { delay as mswDelay } from "msw"`.
- Reuse existing `_shared` steps for filter, search, sort, pipeline, view-detail and feedback. Check `steps/_shared/` first. Duplicating them is a defect.
- For mutations, the `Then` step asserts the outcome (for example the success toast). It does not only check that the dialog closed.
- For `@mock` scenarios, see [references/msw-mocking.md](references/msw-mocking.md).

## Step 4 — Write or extend the POM

File: `e2e/tests/bdd/pages/<module>/<PageName>.ts`

```ts
import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class DashboardPage {
  constructor(private readonly page: Page) {}

  private get heading(): Locator {
    return this.page.getByRole("heading", { level: 1 }).first();
  }

  async navigateTo(): Promise<void> {
    await this.page.goto("/dashboard");
  }

  async expectLoaded(): Promise<void> {
    await this.page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await expect(this.heading).toBeVisible();
  }
}
```

Rules:

- Use private getters for reusable static locators; parameterized locator methods are appropriate when needed. Do not hard-code environment-specific data in methods.
- Public methods express user-observable actions or expectations.
- `expect()` is allowed in POM `expect*` methods and not in COMs.
- With `--flow`: add methods to the existing class. Do not rewrite methods that other flows use.

## Step 5 — Compose Component Objects (when needed)

Create or reuse a COM when a shared UI component appears in 2 or more features, or has internal state (tabs, modals, dropdowns). Otherwise write steps against the POM directly.

File: `e2e/tests/bdd/components/<ComponentName>Component.ts`. Existing components use either a `Component` suffix or a plain name (`PipelineComponent.ts`, `DataTableComponent.ts`). Follow the naming of the component closest to the one you add.

```ts
import type { Locator, Page } from "@playwright/test";

export class PipelineComponent {
  constructor(private readonly page: Page) {}

  private get tabList(): Locator {
    return this.page.getByRole("tablist").first();
  }

  tab(label: string): Locator {
    return this.tabList.getByRole("tab", { name: new RegExp(label, "i") });
  }

  async selectTab(label: string): Promise<void> {
    await this.tab(label).click();
  }
}
```

Compose it inside the POM (`readonly pipeline: PipelineComponent; this.pipeline = new PipelineComponent(page);`). Shared step definitions call `usersPage.pipeline.selectTab(...)`.

Check `components/ProfileMenuComponent.ts` for the reference structure.

## Step 6 — Register in the fixture

`e2e/tests/bdd/fixtures/base.fixture.ts`: add the POM or COM to `BddFixtures` and to `test.extend<BddFixtures>({...})`. A POM that is not registered cannot be injected into steps.

## Step 7 — Mutation acceptance criteria

- Dynamic values only. Choose "first available" data. Do not hard-code environment-specific job titles, roles or groups.
- E2E-owned values follow Rule A: `E2E <relevant words> <DDMMYYYYHHmm>` (`E2E profanity word 271020261108`), built with `e2eValue("<relevant words>")` / `e2eTimestamp()` from `e2e/tests/bdd/utils/e2e-test-data.ts` (add the helper from the snippet in data-safety.md if absent). Never `Date.now()`, never a module code (`E2E-PRF-…`) or random token as the words.
- Plain free text follows Rule B: description, comment, remarks and body fields get a realistic domain sentence with no `E2E` flag and no stamp (`Access role for the customer support team.`). See [../write-e2e-scenarios/references/data-safety.md](../write-e2e-scenarios/references/data-safety.md#test-data-values).
- Assert the backend outcome: success toast text that matches the operation, the row appearing or disappearing, the changed value visible.
- Data safety: use E2E-owned records; seed mutations require explicit scoped approval recorded in the `.feature` file. Capture, restore and verify original state wherever possible, including after failure; see [data-safety.md](../write-e2e-scenarios/references/data-safety.md). Guard the approved record and current-session authorization before execution; historical approval comments do not authorize later runs.
- Pipeline state and membership follow the same approval rule. "First available" selection applies to reference values, never to an unverified mutation target.

## Step 8 — Run and report

```bash
cd e2e
pnpm test:bdd                   # bddgen + run the BDD suite (needs the live app and .env.local)
```

The Automation API derives the scenario catalog from BDD feature files and syncs metadata to PostgreSQL. The Playwright reporter writes per-run results to JSON; the BDD script imports environment-scoped results when configured. Scenario catalogs are not generated as Markdown files. Report the selected scenarios, actual outcomes, evidence upload status and any unrun scope separately.

Run the commands yourself where the environment allows it. If you cannot run them (no live app, no credentials), say so and list the exact command for the user.

## Step 9 — Update the registry and stop

Update the registry rows for the batch only:

- `approved` → `implemented` once reviewed step definitions and page objects exist and their imports and step bindings are validated. `bddgen` success alone is generation, not proof that imports resolve or TypeScript compiles; report separately any typecheck or collection not run.
- `implemented` → `verified` only when all required scenarios in the reviewed scope actually pass in the intended environment. Record skips, quarantine, unavailable data and failures individually; a successful process or partial selection is insufficient. Mark a wholly defect-blocked reviewed scope `fixme`; for mixed scopes retain the appropriate workflow status and document affected scenario IDs and evidence.
- Never change `written`, `pending`, `legacy` or `obsolete` rows.

These statuses describe the scenarios in this batch, not complete business-flow coverage. Retain and report unverified branches, unavailable roles or data, and other discovery gaps even when the batch is `verified`.

Distinguish UI execution with mocked responses from verification of real backend behavior. State which scenarios used `@mock`, the actual backend coverage, and any unverified integration outcomes. For a technical repair of existing implemented scenarios, preserve their registry status unless observed evidence justifies a change; do not treat an old approval as approval of new scenario intent.

Report: files created or changed, steps added, POM methods added, COMs added or reused, fixture entries, `@mock` handlers registered, existing data values aligned to the convention (files and fields), locator gaps still open, the registry rows changed, and the commands that need to run.

Do not change `.feature` scenario intent or flow IDs in this phase. If the feature file looks wrong, stop and send the user back to `write-e2e-scenarios`.

Then stop. Do not start the next batch in the same session.

## Related

- MSW rules and helpers: [references/msw-mocking.md](references/msw-mocking.md)
- Troubleshooting: [references/troubleshooting.md](references/troubleshooting.md)
- Exploring and writing the `.feature`: `write-e2e-scenarios`
- Not sure which workflow applies: `ask-qa`
