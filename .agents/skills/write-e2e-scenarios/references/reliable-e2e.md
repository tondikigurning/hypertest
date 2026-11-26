# Reliable E2E contracts and interactions

Use the scenario-contract section before authoring/handoff, and the full reference before implementation or diagnosis. Store facts once in the menu's `.exploration.md`; reference evidence IDs from scenario/batch mappings. Unknown facts stay explicit gaps, not guessed implementation requirements.

## Scenario contracts

For each distinct branch, establish these facts from applicable evidence. Group scenarios sharing a setup/transition and reference the shared facts rather than replaying or copying them per scenario.

| Fact | Evidence needed |
| --- | --- |
| Prerequisite | Role, state, safe data availability and supported provisioning path. Distinguish confirmed absence from not yet loaded/inaccessible. |
| Target | How the exact record/reference is identified; ownership for mutations, collision handling and cleanup limits. A historical identity or an E2E search match alone is insufficient. |
| Transition | Actual control scope/locator, input/action, completion/readiness signal and next state. Opening a form does not establish successful submission. |
| Outcome | Consumer-visible assertion on that target, including persistence when promised, and what it does not establish. |

Do not put selector mechanics into Gherkin. Preserve business preconditions and assertions while recording technical gaps in the handoff. A missing locator can remain a specific implementation gap when observed behavior supports the scenario; missing outcome evidence cannot be replaced by an invented expectation. For lifecycle-heavy setup, identify the first unverified transition that affects several branches. Prioritize investigating it once within scope rather than duplicating uncertain helpers.

Read-only fixtures must fit the claim: an account with no saved views, a settled list with two pages, and a known no-match term are distinct prerequisites. Do not assume an environment will always have no E2E records. Prefer deterministic safely provisioned data where the scenario and authorization permit; otherwise disclose confirmed data limitations. Never fabricate emptiness or delete shared records to arrange a test.

## Implement readiness at transition boundaries

Playwright actionability does not establish that application initialization, debounced search or an earlier reset has finished. Put waits in the POM/COM method owning the transition so callers receive its promised next state.

- Verify locator semantics and scope against actual evidence: a visible title may be ordinary text rather than a heading. Prefer verified roles/labels/test IDs. Resolve ambiguity through the owning dialog/row/container and exact target; `.first()`, `nth()` or `force` cannot repair an unverified locator. Positional selection is appropriate only when position is itself evidenced and part of the contract.
- Wait for the actual control needed next and the settled result for the current action. A list shell, changed input, hidden reset button, disabled Next button or old empty message alone may precede new results. Confirm criteria, loading completion and result identity/range/state using signals the application actually exposes. An unchanged row count is not proof that a different query completed; do not require a count/range to change when valid results can be equal.
- Register a necessary response/navigation waiter before triggering its action. Correlate it to the actual request/action when supported, then assert the promised UI outcome. A response alone does not prove the rendered result. Do not invent endpoints or add request inspection that the host cannot perform.
- Use retrying locator assertions or bounded side-effect-free observation polling. One-shot `isVisible()`/`count()`/`isEnabled()` checks are not waits. Avoid fixed sleeps, blanket network-idle waits, nested long polling and blanket timeout increases; first identify the missing state and a justified bound.
- Do not catch a timeout and return `false`/empty data to satisfy a prerequisite guard. Classify confirmed settled absence separately from readiness failure, access failure and ambiguity. Only the first can support a data-unavailable skip; retain actual failure/blocker evidence for the others.
- A boolean prerequisite helper needs positive evidence for **both** return values. For `hasNoMatches`, true requires a settled explicit empty state; false requires settled matching rows. Neither state, or conflicting states, is unresolved and must fail rather than return false and trigger a skip. Use bounded observation of these alternatives, not just `!emptyMessage.isVisible()` after a loading flag disappears.
- Prefer ordinary assertions on evidenced application signals and existing helpers. Add custom browser instrumentation only when those cannot establish the required boundary and the host supports it; verify its execution and cleanup. This avoids rebuilding observation machinery per POM.
- Keep setup scenario-local, including search/filter/page/tab/preferences and owned mutable targets. Reuse methods and applicable facts, not another scenario's final state. Await reset before issuing a new search. Do not share an in-flight mutation target across scenarios or rely on test order; safe reuse of a prior owned record still follows data safety.

Negative assertions need a completed causal action: observing an old empty list cannot prove a new search has no matches; a transiently absent row cannot prove deletion. Check the settled state and exact target. Toasts supplement mutation outcomes; they do not prove persistence. Preserve the reviewed claim when adding synchronization.

## Diagnose before retrying

1. Identify the exact source/patch and scenario instance, environment, first failing phase (authentication, setup, action, assertion or cleanup), and first failing control/transition. Recover full assertion, call log, error context and trace when supported. The repository evidence JSON truncates messages, deduplicates IDs and can lose retry information; use full Playwright reports for diagnosis and selection accounting. Protect private artifacts.
2. Separate observed facts from hypotheses. Check locator resolution/semantics, application readiness, criteria/target identity, prerequisite provisioning and application/service response. A visibility timeout alone does not identify any one of these causes. If no evidence distinguishes them, retain an unresolved failure and name the missing diagnostic.
3. Make the smallest supported correction at the responsible shared boundary, inspect callers, and check an affected representative plus a consequential alternate before broad propagation. Synthetic delayed-render/reset fixtures can verify a reproduced timing or locator defect without tenant access; they do not verify backend behavior. Do not add tests that merely repeat instruction text.
4. After a material fix, rerun the affected safe selection with first-attempt outcomes visible. After narrow checks pass, run the complete eligible scope; repeat a safe selection when needed to assess demonstrated flakiness. Do not loop until green. After the same failure recurs without a new discriminating observation, stop repeating that experiment, preserve diagnostics and continue independent work or hand off its blocker.

Retry only safe observations. An uncertain mutation must first be reconciled against its exact target before any resubmission or cleanup; duplicate handling follows data safety. Do not auto-reload around a failure unless recovery is the reviewed behavior. Product defects need sourced expectations and the real-ticket workflow, not weaker assertions, new mocks or opportunistic quarantine.

## Account for reliability and cost

Keep the exact selected eligible scenario instances as the denominator: passed / selected eligible, with failed, skipped, blocked and not-run reported separately. Identify instances by source, not ID alone. Record first-attempt results separately from retry/flaky outcomes; retry-green is not proof of first-attempt reliability. Reconcile collection against intended selection before interpreting totals. Evidence upload and process success are separate from scenario outcomes.

For a workflow comparison, keep requirements, assertions, scope, mock/skip rules, host/model/effort and target comparable. Record active authoring/implementation time separately from review wait and test duration. Use reported token usage where available, distinguishing cached input and output; instruction size and fewer tool calls are proxies, not measured token or time savings. Reuse evidence and scoped file/snapshot reads, batch independent reads, and update only changed record entries. Do not repeat unchanged checks after they pass unless a new change or unresolved concern warrants it. No finite sample guarantees 100% reliability.
