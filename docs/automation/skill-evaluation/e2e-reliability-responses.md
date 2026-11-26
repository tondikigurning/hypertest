# Initial independent E2E skill responses

These are synthetic exercise outputs, not tenant requirements, approved scenarios or live results. Artifact filenames below identify temporary evaluation outputs. The original six-case trial used the initial candidate snapshot recorded in the baseline report. Case 2 was refined and retested separately after local execution exposed a missing classification; this original output remains unchanged.

# Offline exercise results

Inputs were limited to `cases.md` and the immutable `candidate` skill/reference snapshot. `snapshot-sha256.txt` records every snapshot file's SHA-256. Its raw-byte SHA-256 is `0f5f97ee8a1bc8abd0886a9cc36571e7cad97b6b8fec894494ff803facbcb6fe`. No repository, browser, tenant, credentials, installed package, test runner, or network was accessed. Code below is written and source-reviewed, not typechecked or executed. No user decision was invented.

## 1. Type selector repair

Written: `selector.ts`, exporting `SelectorPage(page)`, `open()` and `expectNextDisabled()`.

`open()` clicks the verified exact Create New button and waits for the correctly text-scoped dialog and its exact Next button. It no longer assumes the title has a heading role. `expectNextDisabled()` retains the visible, disabled Next assertion before any selection. No scenario or binding change is needed for this intent-preserving repair; committed-baseline identity is supplied by the exercise, not independently re-read.

The delayed insertion is handled by retrying locator assertions. This establishes readiness for the selection dialog, not a completed report or backend result. No data values were touched. Next validation, when an authorized fixture environment is available: run against delayed dialog insertion, assert disabled Next before selection, check affected E2E types and exact bindings. No runtime pass is claimed here.

## 2. Reset and no-match repair

Written: `list.ts`, exporting `ListPage(page)`, `reset()` and `hasNoMatches(): Promise<boolean>`.

`reset()` first waits out previous work, then arms an attribute observer before clicking Reset. It observes a busy cycle belonging to that reset, verifies the cleared search, and waits for busy to settle to false. A recorded old attribute value also captures a very short true-to-false cycle between assertion polls. The observer is disconnected in `finally`. This uses the supplied busy contract rather than changed row count: a different result with the same count still completes correctly. An input that clears immediately does not let the method return while old results remain.

`hasNoMatches()` waits for settled results and returns true only for the exact visible empty-state text inside the unique results container. A stale message while busy cannot authorize a skip. False means settled results did not expose that empty state; it is not proof of ownership, usable state or an executable target. No timeout is caught or translated to false: a permanently busy render, missing/ambiguous results or other Playwright error remains an error. A caller can skip only after awaiting a true result, with its applicable data policy; it must preserve thrown failures.

Limits: the supplied contract exposes busy for reset work. A no-op Reset that never enters busy, or replacement of the entire results element during reset, is not specified. This implementation fails boundedly rather than mistaking either case for settled new results. If such behavior exists, obtain its evidenced action-completion contract and adapt this boundary. The caller must await its action owner before querying absence; `hasNoMatches()` cannot correlate an unrelated, not-yet-started external action. No request URL or row-identity attribute was invented.

Next meaningful fixture checks: old row A to new row B with equal count; old empty message retained while busy before rows appear; settled empty result; short busy pulse; and indefinite busy raising an error. These checks were not run in the offline exercise. No data values were touched.

## 3. Lifecycle setup and uncertain Save

All four scenario approvals match the current contracts, so no repeat scenario review is needed. Plan four independent scenario-local articles; reuse helpers and provisioning recipes, never one mutable article or another scenario's final state. Record the exact owned identity as soon as Save can be reconciled, and carry it through every transition and cleanup.

The immediate blocker is the earliest shared create/Save transition. Save timed out before ID capture; it may have committed. Do not click Save again, create another article as an implicit retry, archive a search match, or switch to the historical seed article. A historical approval comment supplies no current-session seed exception.

Next actions in order:

1. Inspect the available full local error, call log, context and trace for that exact first attempt. Record the first failing phase and source/patch/target, without exporting private diagnostics. The truncated, deduplicated historical evidence JSON cannot diagnose the several branches. In this offline scope the trace was not supplied as an allowed file, so it has not been inspected and no root cause is established.
2. Reconcile the attempted unique article name/reference using the supported read-only lookup, settled results and exact owned identity. Look at the response or captured navigation only if the actual trace supplies it; do not guess an endpoint. If exactly one verified owned article exists, recover its ID/state and treat the create outcome according to the actual asserted evidence, retaining the original failure. If absence is conclusively established, a fresh bounded attempt may be considered after diagnosis. If identity/existence stays ambiguous, stop mutation and retain an explicit unresolved-artifact cleanup handoff. Do not infer absence from a timeout.
3. Inspect the existing helpers, fixtures and callers; correct only a fault supported by the diagnosis at the responsible create/readiness boundary. Independent source work on the other already-evidenced transitions can proceed, but their live setup still needs independent safe articles. The supplied exercise has no helper code to edit.
4. Implement a scenario-local fixture that provisions and verifies each article's required starting state through evidenced UI transitions. Store identity independently of final test assertions. Submit, revision and publish use their own targets and verified required states; the exact revision-state recipe is not supplied here and must come from the approved scenario/helper evidence, not an invented lifecycle.
5. Cleanup in a failure-safe finalizer only when the exact article identity and E2E ownership are established. Archive only that verified owned article using the supported cleanup path; verify cleanup. Cleanup must retain the primary failure and report its own failure separately. An uncertain create without an exact verified identity remains a disclosed possible orphan, not a license for broad name-based deletion.
6. Check bindings, exact collection and scoped E2E types first. After configuration, restrictions, data scope and notification effects are checked, run the repaired create path and a consequential supported alternate early, with full first-attempt evidence. Do not execute publish merely to test setup: publishing can notify users and archival cannot undo notifications. Honor current authorization for those effects and any production restriction; scenario approval alone is not that authorization. Then complete all four independent scenarios and verify the exact full approved scope when safe.

Use the existing `e2eValue` helper for identifying names, with readable operation-specific labels and verified collision handling; use realistic unstamped body/comment text. No seed-data exception is currently justified: UI owned-data provisioning exists and the failed Save is unresolved, not confirmed unavailable data. No live implementation, cleanup, rerun or notification occurred here.

## 4. Templates scenario review request

One previously confirmed flow, `TEN_TPL_CREATE_FLOW`: create a template or leave/reject the create journey, with role restrictions. Exact intended file: `e2e/tests/bdd/features/reports/templates.feature`. Owning active database PRD: `docs/prd/reports/templates.md`, supplied content reference `fixture-prd-v1`. Prior explicit flow confirmation and unchanged source comparison are supplied and reused; this is not another flow-confirmation request.

Three new plain business scenarios are authored in `templates.feature`; there were no existing or retired TPL IDs. All three accessible supported outcomes are in this batch, including regression branches. The confirmed fourth branch lacks read-only-role access; it remains individually blocked, not excluded or deferred for convenience. `templates.flows.md` therefore keeps the flow `pending`. See `templates.exploration.md` for the durable mapping and pending review record.

| Flow goal / requirement and condition | New scenario, title and asserted outcome | Evidence / coverage |
| --- | --- | --- |
| TEN_TPL_CREATE_FLOW; PRD_TPL_001; PRD_TPL_004 administrator allowed | `TEN_TPL_CRT_E2E_001` — Administrator creates an owned named template and sees its saved detail. As administrator, create a unique E2E-owned named template; saved detail must identify the same template and show the same name. `@smoke`, production-restricted. | E1; create and saved read detail covered by authored assertions; administrator-allowed portion covered. |
| TEN_TPL_CREATE_FLOW; PRD_TPL_002; unchanged form | `TEN_TPL_CRT_E2E_002` — Cancel an unchanged create form without saving. Open an unchanged new form, cancel, return to Templates list without saving. `@regression`. | E2; covered by authored assertions. |
| TEN_TPL_CREATE_FLOW; PRD_TPL_003; name empty | `TEN_TPL_CRT_E2E_003` — Reject an empty template name and retain the unchanged form. Attempt Save with empty name; assert exact `Name is required` and unchanged form. `@regression`. | E3; covered by authored assertions. |
| TEN_TPL_CREATE_FLOW; PRD_TPL_004; read-only role | No authored scenario; prohibited-create UI outcome is not known. | Blocked; unavailable role and unchanged saved blocker. Obtain authorized read-only access and observe the actual denial before authoring and reviewing it. PRD_TPL_004 overall remains partial. |

No baseline requirement lacks a represented flow. No update/delete/search/recovery branches are supplied or invented; categories beyond these requirements remain unexamined. There is no existing scenario coverage, no retired work, and no additional later flow. The batch adds one create/detail smoke journey and two consequential regression outcomes. No mock, quarantine, fixme, defect or fabricated ticket is introduced. No component master source or reference was supplied, so master applicability is unassessed; no invented `@ref` replaces these business assertions. Recover applicable masters before implementation.

E1–E3 and their existing locator/transition evidence are reused for the configured matching non-production target/role. Their actual observation dates and literal locator expressions were not included in the exercise; they have not been relabeled as fresh observations. Each branch's evidenced entry, outcome and prerequisites are sufficient for authoring. Implementation must recover the reusable expressions and actual cleanup/readiness recipe from those existing records, not invent them. Login comes from the authenticated project. Only owned creations are allowed; production mutations are forbidden and create is marked accordingly. Cancel and invalid-name scenarios assert no saved mutation; execute only under their inspected current data behavior. Tags do not enforce production safety.

Pending terminal review: complete raw-byte SHA-256 of `templates.feature` is `d5bea7aba14ec8bdccfdb4107415f95feb33d34c8705d18a2e2cc7abf4d7a7ef`. The decision covers that complete file snapshot and exactly the three new IDs above, not the blocked branch or any implementation. Exact Gherkin is supplied in the accompanying feature artifact; this table describes every proposed change and outcome. No approval has been received. No implementation or execution occurred.

**Review request to present at this phase boundary:** Do you explicitly approve the three new scenarios above in the supplied complete feature snapshot? After acceptance, rehash the unchanged bytes and record the actual manual decision before implementation. Then apply `write-e2e-code` to that approved scope; leave read-only denial blocked until its evidence and scenario review exist. Acceptance does not grant live-data permission or establish a pass.

This is prepared offline review material, not an actual response by the user. No further case-4 work or implementation is authorized by a pending record.

## 5. Q-Rex cumulative native review boundary

The Templates baseline contract is eligible in principle for intent-preserving missing bindings, and historical human approval remains unknown. Here Q-Rex manual mode has an unapproved changed `.feature` snapshot elsewhere in the same draft. That native boundary blocks `write-e2e-code` activation and all E2E implementation writes workspace-wide, including this unchanged baseline. Chat “yes, continue” neither accepts that snapshot nor enables automatic approval.

Concrete next action: use scoped reads and `read_baseline_feature` to establish the cumulative scenario-only diff and inherited context. Existing PRD/flow/browser evidence stays reusable where matching; do not call `confirm_flows` again solely because implementation was requested. Route changed intent through `write-e2e-scenarios`, complete its concrete cumulative review description with exact changed files/instances and existing source identity, then call `show_diff`. Tell the user to inspect the Chat request and Changes and use the explicit scenario approval control; stop for that native decision. The supplied exercise has no actual changed feature text or tool responses, so I cannot invent its IDs, diff snapshot or an accepted review. No implementation edits yet means review is not obstructed by implementation; preserve all current work.

After native acceptance of the current complete snapshot, implement the requested baseline bindings through scoped tools only, preserving its actual historical review status. No shell, standalone typecheck, collection, DOM-eval or browser-tool workaround is available. Report an implementation draft with pending checks and exact Changes identity; do not call it implemented. `run_draft_scenario` can later execute only one uniquely identified approved implemented scenario, with browser Variables, owned data and separate explicit data-safety approval; availability of that runner is not permission to use it now. Its temporary artifacts do not upload official evidence. A terminal reviewer must check the exact draft source for binding collection and E2E types. No native calls or edits were actually performed in this offline case.

**Prepared native-review message:** Review the cumulative scenario-only changes in Chat and Changes, then accept or reject them using the explicit scenario approval control. Implementation will remain paused until the current snapshot is accepted. This pause is required by the snapshot's shared workflow contract, “an unapproved changed-feature snapshot anywhere in the draft also blocks activation of `write-e2e-code` and E2E implementation writes workspace-wide,” under `candidate/.agents/skills/ask-qa/references/workflow-contract.md`.

## 6. Full selection, stale evidence and cost

Reuse matching manual approvals, scenario contracts, applicable prior browser outcomes/locators and the saved unchanged blocker context. Opening a chat does not require a freshness visit or invalidate those facts. Reuse completed unaffected checks; the shared locator edit changes current source, so execution depending on it must be rerun. Do not label the old run current merely because target and scenario intent match.

| Evidence | Defensible result / limit |
| --- | --- |
| Code written for five unique instances in two files / two batches | All five have code, but completion gates remain open. Exact paths/IDs/source locations and the changed locator's callers are not supplied in this exercise; recover them without inventing identities. |
| Exact collection lists four of the required five | Incomplete selection. Reconcile intended five against collected four and configuration/binding registrations, including nested paths and inherited context. No successful subset finishes either batch. |
| Root `pnpm typecheck` passed | True for its configured root scope only (`src`, `vite.config.ts`). It supplies no E2E type evidence. Inspect E2E package/scripts/config and invoke the supported scoped type check over affected steps/POM/fixture/config imports. No exact runnable scoped command can be selected from the supplied facts. |
| Representative path passed | Evidence only for that particular path/source/target; not all five. |
| Prior full report for the patch before the later locator edit | Selected eligible denominator = 5. First attempt: 3 passed / 5 = 60%; 1 skipped / 5 = 20%; 1 failed / 5 = 20%. Blocked = 0, not run = 0; no mocks or quarantine. The failed instance passed on retry: final 4 passed / 5 = 80%, with 1 skipped and 1 retry-green/flaky instance. A retry pass does not erase its first failure or make the skipped scenario pass. |
| Shared locator changed after that run | Affected execution evidence is stale. Determine all callers, check a narrow affected path and consequential alternate first, then the complete exact five for the current patch/target when safe. Retain the old report explicitly as historical and preserve first attempts. Unaffected evidence remains reusable if its independence is established. |
| Fewer entrypoint words | Smaller instruction text is observable. Authoring time, comparable token use and workflow improvement are unmeasured; no speed, cost or reliability improvement is established. |

Next actions: recover a five-row source-instance inventory covering both batches; fix the collection mismatch; run missing scoped E2E types and relevant non-live caller checks; inspect the full failing first-attempt diagnostics before changing or retrying anything. Explain the skip without converting it to a verified result or changing the eligible denominator. Inspect current setup, data/target restrictions and side effects, then run the affected safe path plus alternate and the complete exact five on the current source. Report exact selection/revision/patch, commands, environment and first-attempt versus retry outcomes. Do not regenerate BDD concurrently with the local runner. Do not rerun unchanged passing checks unless the edit affects them or a concern remains.

Current state: code written / implementation draft; complete collection, E2E types and current execution pending. Matching scenario approvals remain valid if feature bytes are unchanged. Neither `implemented` nor `verified` is established. Evidence-upload status is not supplied and cannot be inferred from a report or process status.

To assess workflow cost, compare the same requirements/assertions, all five instances, target, skip/mock rules and host/model/effort. Measure active authoring/implementation time separately from review wait and execution duration. Capture comparable actual model usage, distinguishing cached input and output, plus tool/verification costs. Shorter instructions are only a proxy. Even a subsequent five-of-five run would establish that batch result, not guaranteed reliability or complete business-flow coverage.

## Artifacts and unresolved facts

Written only under this output directory: `selector.ts`, `list.ts`, `templates.feature`, `templates.flows.md`, `templates.exploration.md`, `responses.md`, `snapshot-sha256.txt`. Principal ambiguities: reset no-op/container-replacement behavior; inaccessible full lifecycle diagnostics and exact attempted article identity/state; unspecified revision setup and publish notification authorization; unavailable read-only role; missing literal reused locator/observation-date details; unsupplied Q-Rex changed-feature contents/native decision; missing exact five-instance inventory, E2E command configuration and current post-edit execution. None was silently filled with a fabricated result.


## Initial artifact: selector.ts

```ts
import { expect, type Page } from '@playwright/test';

export class SelectorPage {
  constructor(private readonly page: Page) {}

  private get dialog() {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByText('Select Report Type', { exact: true }),
    });
  }

  private get nextButton() {
    return this.dialog.getByRole('button', { name: 'Next', exact: true });
  }

  async open(): Promise<void> {
    await this.page.getByRole('button', { name: 'Create New', exact: true }).click();
    await expect(this.dialog).toBeVisible();
    await expect(this.nextButton).toBeVisible();
  }

  async expectNextDisabled(): Promise<void> {
    await expect(this.nextButton).toBeVisible();
    await expect(this.nextButton).toBeDisabled();
  }
}
```


## Initial artifact: list.ts

```ts
import { expect, type Page } from '@playwright/test';

export class ListPage {
  constructor(private readonly page: Page) {}

  private get results() {
    return this.page.getByTestId('results');
  }

  async reset(): Promise<void> {
    // Finish any previous action before associating the next busy cycle with reset.
    await expect(this.results).toHaveAttribute('aria-busy', 'false');
    // Arm before clicking so even a short true -> false cycle cannot be missed
    // between assertion polls. Old attribute values retain a batched busy pulse.
    const readiness = await this.results.evaluateHandle((element) => {
      const state = { sawBusy: false, settled: false };
      const observer = new MutationObserver((changes) => {
        state.sawBusy =
          state.sawBusy ||
          element.getAttribute('aria-busy') === 'true' ||
          changes.some((change) => change.oldValue === 'true');
        state.settled = state.sawBusy && element.getAttribute('aria-busy') === 'false';
      });
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['aria-busy'],
        attributeOldValue: true,
      });
      return { state, disconnect: () => observer.disconnect() };
    });

    try {
      await this.page.getByTestId('reset').click();
      await expect(this.page.getByTestId('search')).toHaveValue('');
      await expect
        .poll(() => readiness.evaluate(({ state }) => state.settled))
        .toBe(true);
      await expect(this.results).toHaveAttribute('aria-busy', 'false');
    } finally {
      await readiness.evaluate((observation) => observation.disconnect());
      await readiness.dispose();
    }
  }

  async hasNoMatches(): Promise<boolean> {
    await expect(this.results).toHaveAttribute('aria-busy', 'false');
    return this.results.getByText('No Data Available', { exact: true }).isVisible();
  }
}
```


## Initial artifact: templates.feature

```gherkin
# Intended path: e2e/tests/bdd/features/reports/templates.feature
# Owning PRD: docs/prd/reports/templates.md (database); content: fixture-prd-v1
# ID prefix: TEN_TPL_CRT_E2E_NNN; no prior or retired TPL IDs supplied.
# Data safety: create only scenario-local E2E-owned templates; preserve exact identity for cleanup.
# Production: template mutations are forbidden. Exclude create from production execution;
# @production-restricted records the restriction and does not enforce it at runtime.
# Evidence: E1 create/detail/identity/cleanup; E2 unchanged cancel; E3 empty-name validation.
# Read-only access under PRD_TPL_004 is blocked by unavailable role; no outcome is invented.

Feature: Reports Templates creation

  @TEN_TPL_CRT_E2E_001 @smoke @production-restricted @flow:TEN_TPL_CREATE_FLOW @type:positive
  Scenario: Administrator creates an owned named template and sees its saved detail
    Given an administrator is viewing Reports Templates
    When they create a new E2E-owned template with a unique name
    Then the saved detail identifies that template and shows the same name

  @TEN_TPL_CRT_E2E_002 @regression @flow:TEN_TPL_CREATE_FLOW @type:ui-interaction
  Scenario: Cancel an unchanged create form without saving
    Given an administrator has opened a new template form in Reports Templates
    And the create form is unchanged
    When they cancel template creation
    Then they return to the Templates list without saving a template

  @TEN_TPL_CRT_E2E_003 @regression @flow:TEN_TPL_CREATE_FLOW @type:negative
  Scenario: Reject an empty template name and retain the unchanged form
    Given an administrator has opened a new template form in Reports Templates
    When they try to save the template with an empty name
    Then the template form shows "Name is required"
    And the create form remains unchanged
```


# Targeted final-snapshot exercise

A fresh evaluator, with no earlier response or failure report, received only the final snapshot and clarified case 2. The input now explicitly defines the caller boolean and rendering-failure edge states. This is a new targeted exercise, not a paired trial isolating the effect of instruction changes.

﻿Created list.ts from the verified fixture contract using the supplied write-e2e-code skill and reliability guidance.

reset() clicks once, confirms the cleared query, and waits for settled, unambiguous rendered results. It does not rely on row-count changes or an old empty message. hasNoMatches() returns true only for settled explicit emptiness without rows, and false only for settled matching rows without the empty message. Busy, neither-result and conflicting-result states remain unresolved until the bounded Playwright assertion fails; locator and other errors propagate.

Implementation draft; checks pending. No types, collection or execution checks were run, as this task allows only snapshot/request reads and output writes. The actual POM/callers, scenario identities, branch/base, Playwright configuration and environment were not supplied; integration and configured timeout behavior remain unverified. No data values, mocks or fixture wiring were changed.


## Final artifact: list.ts

```ts
﻿import { expect, type Locator, type Page } from "@playwright/test";

export class ListPage {
  private readonly query: Locator;
  private readonly resetButton: Locator;
  private readonly results: Locator;

  constructor(page: Page) {
    this.query = page.getByTestId("search");
    this.resetButton = page.getByTestId("reset");
    this.results = page.getByTestId("results");
  }

  async reset(): Promise<void> {
    await this.resetButton.click();
    await expect(this.query).toHaveValue("");
    // Reset marks results busy synchronously; only its settled render is usable.
    await this.hasNoMatches();
  }

  async hasNoMatches(): Promise<boolean> {
    const rows = this.results.getByRole("row");
    const emptyMessage = this.results.getByText("No Data Available", {
      exact: true,
    });
    let confirmedNoMatches = false;

    await expect
      .poll(
        async () => {
          if ((await this.results.getAttribute("aria-busy")) !== "false") {
            return false;
          }

          const [rowCount, emptyVisible] = await Promise.all([
            rows.count(),
            emptyMessage.isVisible(),
          ]);

          // Discard an observation if another transition began while reading it.
          if ((await this.results.getAttribute("aria-busy")) !== "false") {
            return false;
          }

          if (rowCount === 0 && emptyVisible) {
            confirmedNoMatches = true;
            return true;
          }
          if (rowCount > 0 && !emptyVisible) {
            confirmedNoMatches = false;
            return true;
          }

          // Neither state, or both together, remains unresolved.
          return false;
        },
        {
          message:
            "Expected settled results with either matching rows or an explicit empty state",
        },
      )
      .toBe(true);

    // An unresolved observation throws above; it never becomes a false/skip.
    return confirmedNoMatches;
  }
}
```
