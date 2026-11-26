# E2E authoring workflow: baseline and evaluation plan

Established before changing the scenario and code skills, against checkout `26b3f17691f997a53b83192a6829393e137509eb`. This is an investigation record, not a claim that the workflow has improved.

## Available evidence

- `e2e/test-results/bdd-evidence-20148-1795592776306.results.json` contains 12 reported Knowledge Management outcomes dated 2026-11-25: 4 passed and 8 failed. The file records generated test paths and IDs, but not the selected eligible population, environment, source revision or full patch. Thus 4/12 (33.3%) describes these recorded outcomes only; the requested batch pass rate cannot be reconstructed. The current feature and implementation were last committed in `95e4d8a`, but the run cannot be attributed to that commit from this file. The handoff reports 27 intended IDs and STT1 observations; neither establishes the run's selection or target.
- Six of those eight failure messages are exactly 200 characters, the truncation limit in `packages/internal/test-utils/src/playwright/reporter.ts`; their visible signatures involve visibility assertions. Two are click timeouts. These are symptoms, not established root causes. The reporter only records tagged results, deduplicates by ID and keeps the first result, so the JSON alone cannot establish missing cases, unique source identities or final retry outcomes. Other files contain overlapping subsets and cannot be summed as independent batch results.
- The Knowledge Management handoff and implementation show that review and edit scenarios repeatedly prepare draft, approval and publication states through shared helpers. This is a concrete shared setup dependency, not evidence that scenarios depend on each other's execution. The runtime cost or contribution to failure is unknown. Compare setup versus action/assertion evidence before attributing a failure.
- The Report Templates handoff records incomplete pagination locator and readiness evidence; its steps also treat some unobserved prerequisites as skips after a timeout. A local result reports one failed list scenario, but its revision, selection and environment are not established. This exposes a diagnostic risk: an unavailable prerequisite and a slow or broken interaction can be conflated. Neither result establishes an application defect.
- Existing exploration records and active menu PRD are available; the records preserve gaps and scenario mappings, but the Knowledge Management implementation handoff predates the local results. The PRD is shared database content and its current content is not proof of its version at the run. No model identity or scenario/code authoring timestamps are available from these artifacts. Test `durationMs` measures individual execution, not authoring or review waiting.

## Evaluation protocol

Freeze the same representative menu, requirements and reviewed scenario identities, feature bytes, implementation patch, dependencies, host/model/effort, target and role, and safe data prerequisites for each comparison. Record exact source paths and locations as well as IDs; do not merge duplicate IDs. Keep raw artifacts private and share sanitized summaries. A changed application build, target or data state makes a before/after comparison potentially confounded.

Before execution, record the full selected and eligible scenario instances. The pass rate is **actually passed / selected and eligible**, including eligible instances that fail, skip, become blocked or never run in the denominator. Report passed, failed, skipped, blocked and not run separately, with reasons; keep ineligible cases and retry attempts separate. Reconcile selection and final per-instance outcomes with Playwright's full report, not just the deduplicating, truncated result JSON. Do not treat a process exit, collection, catalog entry or evidence upload as a pass.

Evaluate the same requirement-to-scenario/observable-outcome mapping and compare assertions, mock usage, quarantine and skips. Explain any removed, changed or deferred coverage; no assertion weakening or skipped/mocked scenarios may be counted as a quality gain. For stability, repeat the same safe selection with independent data and report per-scenario outcomes and prerequisites, not only an aggregate. Inspect setup, steps, tags, target and data-safety rules before each live run, including separate host-native approvals. Q-Rex draft runs are isolated, one scenario at a time, E2E-owned only; they are not official results.

For scenario writing and code writing separately, record wall-clock start, review request and decision timestamps, resume and completion timestamps, and interruptions where observable. Compute active work intervals and review wait separately; label estimates or missing timestamps. Record browser calls, repeated exploration and narrowly scoped verification attempts when available. Do not infer authoring time from test durations. Compare equivalent scopes and host constraints, and report review wait separately from agent work; do not claim speedup without comparable observations.

Use at least one lifecycle-heavy batch such as Knowledge Management and one list/read-only batch such as Report Templates when their exact history and safe environments can be established. Select an early representative setup/action/assertion path and a consequential alternate path after their existing approvals; preserve the complete batch and verify the remaining selection afterward. If execution is unavailable, evaluate handoff completeness, source matching, safe prerequisite classification and host-specific next actions using offline fixtures, and clearly leave live pass rate, stability and elapsed time unproved.

## Non-live review of the proposed workflow

Manual source walkthrough, not an autonomous model trial: for Knowledge Management, the saved handoff and code identify draft creation as a shared prerequisite for several approval and publication paths. An early selection can exercise creation and an approval branch once the exact scenarios are eligible and implemented; the remaining scenarios and their distinct outcomes still need implementation and verification. The historical results do not establish which transition failed or that this ordering would have prevented it.

For Report Templates, a timeout waiting for an empty state is insufficient to distinguish a matching value from a slow or inaccessible result. The revised code skill calls for a settled state and confirmed absence before categorizing a missing prerequisite; the existing implementation was not changed or re-run here. In Q-Rex, a seed-dependent example is ineligible for the E2E-owned-only draft runner; retain it as pending rather than treating an Explorer run against another checkout as draft verification.

The Q-Rex workflow and review suites passed 37/37 in this checkout, including existing tests for snapshot approval, cumulative scenario review, evidence handoff and draft-run activation. These scripted runtime tests do not evaluate a model following the revised text and do not run tenant BDD. No equivalent measured before/after authoring session or live comparison was available.

## New read-only execution baseline — 2026-11-26

The user authorized testing against the environment configured in `e2e/.env.local`; its value and credentials are intentionally not recorded. This is a terminal checkout run against the real backend, not a Q-Rex draft run. The account role and exact model identifier are unknown. The user's 30–60 minute estimate concerns the workflow, not a measured scenario-writing, code-writing or review interval.

Selection: eight unique Report Templates scenarios, selected by the existing feature and confirmed by exact scenario titles at collection. These cover list navigation, search/reset, pagination, filtering, empty saved views, type selection, cancel without saving, and read-only detail. The empty validation scenario that clicks Save was excluded; all other authored scenarios in this feature were selected. Setup authenticates; inspected steps and the report page fixture have no persisted mutations or cleanup actions. The test uses no `@mock`, `@fixme` or quarantine tags. It does not establish creation, editing, deletion, other roles or full menu coverage.

Both attempts used committed base `26b3f17691f997a53b83192a6829393e137509eb`, Node 26.13.0, pnpm 11.1.3, Playwright 1.61.1, the authenticated Chromium project, one worker and zero retries. `CI=1` was set; each attempt used a separate authentication state. The copied temporary BDD configuration changed only generated-output locations, with the feature selection and isolated output directories supplied by environment variables; it was removed after the run. No evidence upload or catalog synchronization was invoked. The configured tenant and relevant data may have changed between attempts.

Exact SHA-256 of relevant inputs during the runs:

| Input | SHA-256 |
| --- | --- |
| `reports/report-templates.feature` | `5cc0a764d3c544304354398f89491db03af9cc00cc44a663bd76827668ffc26e` |
| `steps/reports/report-templates.steps.ts` | `e7c517c6f33b192e195083c8edbc79391f22be66380a3d52413595730336d5b4` |
| `steps/reports/report-detail.steps.ts` | `831a222ace05a41f094e0d2cd262889ed9ce548390de5e12e1e760a9809660f9` |
| `pages/reports/ReportTemplatesPage.ts` | `bec5a8d226aca44d2da930007dab438f19a400d22a8b81a353ff50ea2a3ac08e` |
| `e2e/playwright.bdd.config.ts` | `d6dbad36d75e8bf60970d674a93b066f26845179499ea2a1b0b011e2bb86a416` |
| `write-e2e-code/SKILL.md` | `7e366bc58bfc023ed3f9483fe72ad36eb71cc51434494a930511594f674f0083` |
| `write-e2e-scenarios/SKILL.md` | `20a6c53b0de3c08b58aa0dc4fd2dde7ea8730cd67bc56de0efc65dab859b0b10` |

The tracked working-tree diff recorded during the first run hashed to `6a70fca3721791cc256fcfc381b02b70c39964587fed96c4a65d159d801429b5`. During the second run, independent changes appeared in four Explorer UI files; the later tracked diff hashed to `fb22a371a49f1e1468e4ee3de78f0fff8e0180f241245cddbbf0d00e270c87a6`. These files are not used by the direct BDD command, but the complete checkout was not identical. Untracked documentation and the evaluation script are outside those diff hashes. The exact report-feature and implementation file hashes above, rather than the Git commit alone, identify the test under observation.

After both runs, additional concurrent edits appeared in the shared workflow contract, both skills and runtime/UI files. The skill hashes in the table identify the earlier state recorded during the first run, not necessarily the checkout state when this record is read. Preserve and assess those independent edits separately when repeating an authoring evaluation.

| Scenario ID | Attempt 1 | Attempt 2 |
| --- | --- | --- |
| `TEN_RTM_LST_E2E_001` | failed, 8.708 s | passed, 5.417 s |
| `TEN_RTM_LST_E2E_002` | failed, 55.470 s | failed, 50.875 s |
| `TEN_RTM_LST_E2E_003` | skipped, 14.213 s | skipped, 2.849 s |
| `TEN_RTM_LST_E2E_004` | passed, 8.325 s | passed, 7.106 s |
| `TEN_RTM_SAV_E2E_001` | passed, 5.896 s | passed, 3.904 s |
| `TEN_RTM_CRT_E2E_001` | failed, 7.093 s | failed, 9.975 s |
| `TEN_RTM_CRT_E2E_003` | failed, 55.016 s | failed, 57.874 s |
| `TEN_RTM_VDT_E2E_001` | passed, 6.000 s | passed, 6.884 s |

Attempt 1: 3 passed, 4 failed, 1 skipped, 0 blocked and 0 not run: **3/8 = 37.5%**. Attempt 2: 4 passed, 3 failed, 1 skipped, 0 blocked and 0 not run: **4/8 = 50%**. These are separate executions, not a pooled pass rate. Their wall times including authentication and runner overhead were 185.06 s and 160.68 s; individual authentication took 12.674 s and 6.215 s. This does not measure authoring or review time. The runner classified pagination as skipped because the list had fewer than two pages; the implementation's readiness check was not independently verified, so the actual cause of the skip is not established.

Both search failures waited for the clear-filters control; both type-selection failures could not find the Next control in the expected dialog for the disabled assertion; both cancel failures waited for the Case Management control in that dialog. The list failure in attempt 1 could not find the expected Report Name button in the first table; it passed on attempt 2. These locate symptoms in the test path and expose one inconsistent outcome. They do not distinguish locator, synchronization, application and environment causes. No application defect, false expectation or cross-scenario dependency is established by these results alone. The scenarios preserve their existing assertions and tags; passing the subset does not prove the deferred menu intent or mutation coverage.

The [repeatable evaluation script](report-templates-readonly-evaluation.ps1) creates isolated generated and report paths and checks collection before executing. Before using it, inspect the current scenarios, setup, steps, fixtures, data and target and ensure no local BDD runner is active. It runs live read-only journeys and signs in; it is not an authorization for future mutations. The private local reports and traces can contain sensitive tenant information and must not be shared raw. The original attempts used an earlier version of this script whose SHA-256 was `f3661d51a4ebb013fb99044123b4a465fd985931f973623ba2d2094e725d3931`; the retained script adds identity and source checks, reports test failure in its exit code, and cleans up its own new temporary authentication states. Automatic review rejected cleanup of the two authentication state files created by the original attempts, so those sensitive ignored files remain in the local run directory.

These two attempts establish a reproducible starting point for this selected read-only test code, subject to the stated target/data and checkout limits. They were both run after the skill changes; they do not compare autonomous scenario/code authoring before and after those changes. A comparable authoring evaluation still needs the same reviewed scope, model and host, source snapshot, review-wait timestamps, and full coverage/assertion accounting.

## Test-code investigation and follow-up — 2026-11-26

Read-only terminal inspection on the configured target observed a list shell before the search input and table header were ready. The previous selector looked for a heading inside the report-type dialog, while the actual dialog contained the title as ordinary text and exposed the Case Management and Next buttons. An independently opened list contained retained search criteria and appeared to have no next page; after reset and settled results, its displayed range showed multiple pages. The baseline skips are therefore not proof of insufficient data. Rapidly resetting a no-match search and searching again reproduced an old empty result being observed while the earlier reset later replaced the new input. Pressing Escape by itself did not reproduce the reset failure.

The page object now waits for actual list controls, identifies the dialog by its observed text, waits for a reset to restore the populated list, and establishes the unfiltered displayed range before deciding whether a next page exists. An unavailable or unchanged ambiguous range fails rather than being reported as an insufficient-data skip. Three synthetic local browser tests exercise the actual page object: the corresponding tests failed before the relevant changes and passed afterward. Existing feature IDs, business assertions, mock settings and tags were retained. No product defect has been established.

An intermediate run with only the first readiness and locator changes gave 6/8 and 5/8 passed: reset still failed in both, and the short readiness timeout caused further failures. Those observations led to the additional reset synchronization and a 30-second readiness bound; they are not the final result.

Final follow-up: same eight feature identities, target configuration, authenticated project, real backend, CI setting, no retries, isolated output and no evidence upload as the new baseline. Relevant source hashes were checked before and after each attempt. The feature, both step files and BDD config hashes match the baseline table; the modified `ReportTemplatesPage.ts` hash was `fea1627db2ed660b596dcf4f9a9525e3b262fdaa7d315e2803c12af6515346cd`. Other concurrent checkout changes remain outside this comparison. The following durations are scenario durations, in seconds:

| Scenario ID | Follow-up 1 | Follow-up 2 |
| --- | --- | --- |
| `TEN_RTM_LST_E2E_001` | passed, 4.411 | passed, 7.414 |
| `TEN_RTM_LST_E2E_002` | passed, 5.643 | failed, 42.372 |
| `TEN_RTM_LST_E2E_003` | passed, 5.416 | passed, 7.210 |
| `TEN_RTM_LST_E2E_004` | passed, 6.214 | passed, 7.993 |
| `TEN_RTM_SAV_E2E_001` | passed, 5.681 | passed, 4.957 |
| `TEN_RTM_CRT_E2E_001` | passed, 10.982 | passed, 5.718 |
| `TEN_RTM_CRT_E2E_003` | passed, 5.407 | passed, 6.152 |
| `TEN_RTM_VDT_E2E_001` | passed, 6.142 | passed, 7.127 |

Follow-up 1: **8/8 = 100%**, 0 failed, 0 skipped, 0 blocked and 0 not run; 61.89 s wall time. Follow-up 2: **7/8 = 87.5%**, 1 failed, 0 skipped, 0 blocked and 0 not run; 104.74 s wall time. Authentication passed in both. In the remaining failure, the shell appeared but the search control did not become visible within 30 seconds during initial navigation. The saved snapshot does not establish whether the cause was application loading, environment or another issue. No automatic reload, assertion weakening or skip was introduced. Two trials do not establish long-term stability.

These results are comparable as a narrow test-code experiment, with the caveats that tenant data/state was not frozen, prior checkout changes continued outside the guarded paths, and the original baseline's pagination skip may have reflected retained filters. The follow-up cannot establish that the scenario/code skills autonomously produce better tests or shorten authoring. Evaluate that separately with paired, independently run authoring sessions using the same scope, model/effort, reviewed PRD, target state and review gates; record active scenario/code work separately from review wait, then assess complete intent/assertion coverage and repeated per-scenario outcomes without changing selection or mock/skip rules.

## Skill follow-up — 2026-11-26, base `aac0ccb`

The checkout was clean before this follow-up. Reviewed the preceding changes (`26b3f17`, `0e1b325`), saved exploration/handoffs, Report Templates POM/steps and local regression fixtures, runner/config/types, skill callers and shared review/reuse/data-safety contracts. Relevant prior terminal conversations were recovered locally for context and aggregate usage/tool activity only; private transcripts, tenant details and credentials are not copied here. The earlier investigation includes substantial cached prompt input and repeated diagnostic commands, but spans investigation, review waits and execution. It is not a controlled measurement of scenario/code authoring cost, and cannot establish a token/time saving for these edits.

The strongest established failures remain those reproduced above: the dialog title's assumed heading semantics, incomplete list readiness and a reset completing before results. The remaining 30-second loading failure and historical Knowledge Management visibility/click failures still lack discriminating evidence; no application defect or lifecycle root cause is asserted. Shared lifecycle provisioning is a high-impact investigation target, not a proven cause.

The instruction audit found decision gaps behind those failures: a generic requirement to verify locators/wait for settled results without a reusable transition contract; troubleshooting that presented symptoms as causes and suggested adding a mock tag without checking reviewed intent; repeated scope/reuse/review prose across entrypoints and references. Root `tsconfig.json` also excludes E2E, so its successful check alone cannot establish E2E type safety. These are observed instruction/configuration properties, not proof that every prior model failure came from them.

Changes:

- Shortened both skill entrypoints while retaining eligibility, whole-scope coverage, stable identities, cumulative/native review gates, external evidence states and data-safety links. Reviews still present every new/changed scenario and requirement-to-outcome coverage; detailed review preparation is disclosed at that step.
- Added one shared reliability reference for scenario prerequisites/target/transition/outcome, verified locator semantics, causal readiness, negative assertions, independent setup and explicit failure-versus-absence handling. It does not require optional locator evidence before an otherwise evidenced scenario can be reviewed.
- Implementation now calls for actual scoped E2E types, full diagnostics, representative shared-path validation before propagation, complete final selection, first-attempt accounting and bounded hypothesis-driven reruns. No blanket reload, mutation retry or timeout escalation was introduced.
- Reworked troubleshooting into evidence to check and conditional corrections. Adding a mock requires existing reviewed intent or scenario review; failure or incomplete readiness cannot be hidden as a skip.

Whitespace-delimited word counts, measured on actual files with the same method (not tokenizer measurements):

| Instruction | Before | After |
| --- | ---: | ---: |
| Scenario entrypoint | 3,406 | 1,296 |
| Code entrypoint | 2,360 | 1,384 |
| Combined entrypoints | 5,766 | 2,680 |

The final entrypoints are 53.5% shorter by this measure. Q-Rex includes the active entrypoint in `systemForStep()` in `agent-session.mjs`, so shrinking it reduces repeated instruction payload. References still consume context when consulted; the final added reliability and review references total 1,789 words. These figures do not establish a 53.5% reduction in complete workflow tokens, provider cost or elapsed time. `write-prd` and its shared contracts were preserved.

Behavioral validation used the [six offline requests](e2e-reliability-cases.md) and an independent agent with no parent discussion or proposed answers, an immutable instruction snapshot and only synthetic facts. Its permission scope was snapshot reads and temporary output writes; no tenant, credentials, live browser, publication or BDD generation. Cases request actual POM repairs, a scenario batch/review and decisions about lifecycle uncertainty, Q-Rex review blocking, incomplete checks and cost claims. The [archived actual responses and generated artifacts](e2e-reliability-responses.md) retain the initial output and the targeted final follow-up.

| Case | Observed initial decision / artifact | Assessment |
| --- | --- | --- |
| 1 — selector | Text-scoped dialog, delayed insertion awaited, disabled Next assertion retained | Local emitted-code fixture passed. |
| 2 — reset / no-match | Awaited a reset busy cycle without requiring row-count change; busy timeout propagated. However, missing empty text returned false without positively establishing matching rows. | Correction needed; emitted code passed 5/6 initial browser fixtures, failing the unresolved-result guard. |
| 3 — lifecycle | Reconciled uncertain Save before another mutation, rejected historical seed permission, preserved exact owned cleanup and independent setup | Supported decisions; no live lifecycle or diagnostics execution claimed. |
| 4 — scenarios | Authored create/detail, cancel and validation; kept unavailable-role branch blocked and flow pending; prepared exact-source manual review and requirement mapping | Supported scope and review decisions; no invented role, approval, locator or execution. |
| 5 — Q-Rex | Workspace-wide cumulative review block honored despite eligible baseline scenario and chat Yes | Native review required; no implementation or runner workaround. |
| 6 — completion/cost | Retained missing collection/types and stale post-edit execution; first-attempt 3/5 distinguished from retry-green; no measured token/time improvement claimed | Supported evidence accounting and next actions. |

The case-2 observation prompted a narrow instruction correction: both values of a boolean prerequisite need positive evidence, and neither/both result states must remain errors. Also clarified that existing application signals should precede custom observation machinery, and that independent mutable setup does not prohibit safe reuse of prior owned data. The input exercise now explicitly defines the boolean caller and unresolved/conflicting rendering states; its original wording had room for interpretation. A fresh evaluator received only the final snapshot and this clarified case, without earlier answers or failure diagnostics. It generated a simpler list POM with bounded observation of explicit rows versus empty state. Because both instructions and fixture wording changed, this is not a controlled causal comparison of the skill alone.

The [repeatable local browser harness](verify-generated-e2e.mjs) ran the initial selector plus final list POM after strict TypeScript compilation: seven cases cover delayed dialog, reset with unchanged row count, stale empty state while busy, settled empty state, indefinitely busy render, neither result and conflicting results. These use synthetic DOM and abort all browser requests; no tenant or credentials are involved. An initial `tsx` harness attempt also exposed a serialization-helper error inside the generated MutationObserver callback. That error did not reproduce after TypeScript emission, so it is not attributed to the tenant runner or used as a skill root cause. The conflicting-state fixture was corrected to give the empty message its own exact-text element; a parent containing both row text and empty text did not exercise that verified locator.

To reproduce, recover `selector.ts` from the archived initial output and `list.ts` from the final output into an ignored folder under `e2e/test-results/` (so installed E2E dependencies resolve). From the repository root, compile those two files with `pnpm.cmd exec tsc --strict --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --types node --outDir <folder>/compiled <folder>/selector.ts <folder>/list.ts`, then run `node docs/automation/skill-evaluation/verify-generated-e2e.mjs <folder>/compiled`. This does not generate or execute BDD.

Snapshot fingerprints sort all Markdown paths under `.agents/skills` plus `docs/automation/test-organization.md`, hashing each relative `/` path, NUL, LF-normalized UTF-8 content, NUL:

| Snapshot | Files | SHA-256 |
| --- | ---: | --- |
| Baseline at this turn | 33 | `d7e0fc2a1b5b2eefe2d5d1e064620f58e27b1f124893264d9e225b86b01bdf84` |
| Initial six-case candidate | 35 | `c0ee49c7938cb3f0663fa6e0e03d73eb5a55c477a81aebb19eeab9a0fddee768` |
| Final targeted candidate | 35 | `3d716b6513525633b1d3dbc1f35f98081c6e7df6830fb1ee8d3e01636c4dbbd9` |

Initial generated raw-byte identities: selector `6724b2e4b298049e2b4f4762661f92aefbb2cbf4ce73d80cf96a31487c67b3da`, list `591c70e6dfac99c0ba48bd8803e46d5a7a4fa643be75e82457179c7f9681c5a3`, feature `d5bea7aba14ec8bdccfdb4107415f95feb33d34c8705d18a2e2cc7abf4d7a7ef`. Final generated list: `fd91ca985ad2cd2f03d2e628d6a22fca696531577ff7b90a5a132d4acd8189fe`. The initial full case text has SHA-256 `6c7cb0687290135f412d2baeec2f3049f63a90c8131544b1682c231feb54e6d0`; the retained case file includes the disclosed case-2 clarification. The evaluators inherited the active model; no exact model/provider identifier was exposed or inferred. Each exercise was tried once per stated snapshot, not a statistical sample across models.
