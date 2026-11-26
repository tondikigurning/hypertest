# E2E BDD troubleshooting

Symptoms are leads, not established causes. First use [failure diagnosis](../../write-e2e-scenarios/references/reliable-e2e.md#diagnose-before-retrying); inspect the actual contract and failing phase before applying a correction.

| Symptom | Evidence to check | Supported correction |
| --- | --- | --- |
| Step not found | Exact feature text/parameter format, binding imports and configured paths | Match the contract and register the actual path; collect the exact selection. |
| POM unavailable in steps | `BddFixtures` and `test.extend` wiring, including callers | Register the class in `fixtures/base.fixture.ts`; check affected E2E types. |
| Visible title but missing dialog/button | Actual accessible role, dialog scope and fresh locator evidence | Use verified text/role/test ID within its owner. Do not assume title text is a heading or select an arbitrary first match. |
| List is visible, control absent or pagination disabled | Shell versus initialized controls, retained criteria, settled results/range | Await the relevant transition; distinguish insufficient data from readiness/access failure before any skip. |
| Search/reset intermittently reads old results | Reset completion, debounce/request timing and result identity for current criteria | Await completed reset before the next query and its settled results. Input cleared or an old empty message alone is insufficient. |
| Lifecycle branches fail together | First shared provisioning/status transition, target identity and cleanup phase | Correct the earliest evidenced fault and check a representative plus alternate before extending helpers. Preserve independent scenario setup. |
| MSW not intercepting | Approved `@mock` contract, `network.enable()`, actual request and handler registration order | Follow [MSW guidance](msw-mocking.md). A missing tag is fixed only if mocking is already the reviewed intent; adding mocks to make live tests pass requires scenario review. |
| Shared mock targets wrong API | `pageContext` from tags/URL, actual helper routing and request contract | Synchronize page context in the appropriate Given; preserve caller behavior. |
| Smoke reaches MSW | Scenario/inherited tags and fixture activation | Restore the no-mock smoke contract; do not report mocked backend coverage as real. |
| `delay` import conflict | Local symbols | Alias the MSW import, e.g. `delay as mswDelay`. |
| Exploration consumes excessive context | Repeated unchanged reads, full snapshots or duplicated handoffs | Reuse shared evidence, scoped snapshot sections and one owned named session; persist only changed facts. |
| Rerun mutation fails or submission times out | Exact owned record/state, collision and uncertain prior submission | Reconcile existence before resubmitting. Apply data-safety collision/seed-exception rules and failure-safe cleanup; no arbitrary target fallback. |
| `@fixme` confused with quarantine | Sourced product defect plus real ticket versus demonstrated test instability | Follow conventions: both can skip under the selected runner and neither is a pass. BDD quarantine is skipped unless `RUN_QUARANTINE=1`. |

Full private Playwright diagnostics may contain sensitive tenant information. Keep raw reports/traces local and save only sanitized facts and actual limitations in the shared record.
