# E2E skill decision and implementation exercises

Offline exercises for the actual scenario/code skills. Give an evaluator only an immutable skill/reference snapshot, these requests and supplied fixtures. Do not supply prior conclusions or expected answers. The evaluator may read the snapshot and write artifacts in its temporary output directory; no tenant, credentials, network, publication, BDD generation or live mutation. Record actual outputs and snapshot identity before scoring. This is behavioral validation, not a live pass-rate benchmark.

## 1. Implement a type-selector transition

Request: use `write-e2e-code` to repair the existing intent-preserving POM. Preserve the assertion that Next is disabled before selection. Produce `selector.ts`, exporting `SelectorPage` with `constructor(page: Page)`, `open()` and `expectNextDisabled()`.

Terminal host. Existing scenario and bindings are unchanged from committed baseline. No scenario intent change. Browser evidence is current for the configured target and role. All available DOM evidence is supplied below. No browser visit is needed. Verified locators: `getByRole('button', {name: 'Create New', exact: true})`, `getByRole('dialog').filter({has: page.getByText('Select Report Type', {exact: true})})`, and that dialog's exact Next button.

The fixture initially has `<button>Create New</button>`. Clicking it adds `<div role="dialog"><div>Select Report Type</div><button disabled>Next</button></div>` after a delay. The old POM scopes the dialog using `getByRole('heading', {name: 'Select Report Type'})`. Imports from `@playwright/test` are available.

## 2. Implement reset and a no-match prerequisite

Request: repair an existing POM, preserving business behavior. Produce `list.ts`, exporting `ListPage` with `constructor(page: Page)`, `reset()` and `hasNoMatches(): Promise<boolean>`. The caller needs a known no-match term: true establishes that precondition; false means actual matching rows make that term unsuitable and the caller may skip. Preserve unresolved states and other errors.

Terminal host; baseline and evidence are unchanged. Verified fixture contract: `getByTestId('search')` is the query, `getByTestId('reset')` clears it, and `getByTestId('results')` is a unique results container. That container exposes `aria-busy="true"` during work and `"false"` once results reflect the current action. Its rows have role `row`; confirmed empty results expose the exact text `No Data Available` inside the container. After reset, the query clears immediately but old results remain until busy becomes false. Before reset there can be one row; afterward there can also be one row with a different identity. The empty-state message can also remain visible while loading. A render can fail to settle; the fixture may then remain busy indefinitely. The previous implementation waits for the query to empty and maps an empty-state timeout to `false`.

Diagnostic edge state: the results container can be present with `aria-busy="false"` but neither rows nor the empty-state message after a rendering failure. This is not confirmed data absence or a matching result. Conflicting rows and empty state likewise leave the prerequisite unresolved. Reset sets busy synchronously on click and settles after an asynchronous result update; neither a no-op reset nor container replacement is part of this supplied fixture.

## 3. Lifecycle setup and uncertain submission

Request: use `write-e2e-code` to plan implementation and early verification for approved article-create, submit-for-review, revision and publish scenarios. Give the setup/cleanup strategy and next actions.

Terminal host; all four current scenario contracts have matching recorded manual approvals. Each requires its own E2E-owned article; UI provisioning, review and publish transitions are evidenced. Helpers and fixtures exist. The create flow has just timed out after Save, before an article ID was captured. No diagnostic has established whether the article exists. Cleanup can archive only an exact verified owned article, and publishing can notify users. The full error/trace is available locally but not yet inspected. A historical evidence JSON contains truncated visibility errors from several branches and a previous approval comment for a seed article.

## 4. Author full supported coverage and request review

Request: use `write-e2e-scenarios` to author the full accessible scope for Reports / Templates in `e2e/tests/bdd/features/reports/templates.feature` and present the scenario-review request. Save the feature and a compact handoff/review response in the output directory.

Terminal host. Active database PRD was supplied in this conversation, exact content reference `fixture-prd-v1`: `PRD_TPL_001` create an owned named template and see its saved detail; `PRD_TPL_002` cancel an unchanged create form and return to the list without saving; `PRD_TPL_003` reject empty name with `Name is required`; `PRD_TPL_004` administrators may create, read-only roles may not. Current configured non-production target and role match all dated browser observations. The user already answered production restrictions: mutations forbidden in production. No live browser is available now.

Applicable prior live evidence `E1` establishes successful owned-template creation through supported controls, saved detail with the same name, identity and cleanup; `E2` establishes cancel without saving and return to list; `E3` establishes the exact empty-name error and unchanged form. Reusable locator and transition evidence exists for each; no mocks. Read-only-role access is unavailable and has a saved unchanged blocker. User explicitly confirmed flow `TEN_TPL_CREATE_FLOW`, file above and all four branches in the preceding turn. The pending/source comparison is supplied as unchanged and the actual confirmation is recorded; no existing feature or retired TPL IDs. TPL is the established reserved menu code. No scenario approval has occurred. Authenticated project supplies login. No implementation writes are authorized in this phase. Safe artifact snapshot identities can be calculated from output files; do not invent a user acceptance.

## 5. Q-Rex cumulative review boundary

Request: use `write-e2e-code` to implement missing bindings for an unchanged committed-baseline scenario in Templates.

Q-Rex manual mode. The baseline scenario's clear contract is unchanged including inherited context, but another feature in this same draft has unapproved scenario-intent changes. There are no implementation edits yet. The active database PRD, flow confirmation and verified browser evidence are present. Tools: scoped file tools, `read_baseline_feature`, `show_diff`, `confirm_flows`, `ask_user`, managed `playwright_cli` and `run_draft_scenario`. No shell or standalone type checks. User said in chat, “yes, continue”; no explicit scenario approval control was accepted.

## 6. Complete evidence and workflow cost

Request: use `write-e2e-code` to finish/report a two-batch implementation and assess whether verification and workflow improvement are established.

Terminal host. Source and manual approvals match the requested five unique scenario instances across two files. Code is written for all five. A representative path passed; exact collection lists only four. Root `pnpm typecheck` passed, but its configuration includes only `src` and `vite.config.ts`; no scoped E2E type result exists. A full report for the same patch/target records three passed, one skipped and one failed first attempt; the failed scenario passed on retry. There are no mocks or quarantine. The selected eligible population is all five, with no blocked/not-run cases. One shared locator changed after that run, with no new execution. The new skill entrypoint has fewer words; neither measured authoring time nor comparable model-usage data exists. A previous browser outcome and saved locators remain applicable; opening a new chat has not changed target, role or UI. State what to reuse, what to check next and which claims can be made.
