# Scenario review and handoff

Read before presenting an authored or changed scenario batch. Follow the shared contract's host-specific review gate; this checklist prepares its review material and does not introduce another approval.

## Reconcile coverage

Compare every baseline requirement and important branch identified by the coverage checklist with actual scenario preconditions and assertions. Include existing coverage, applicable shared rules and observed branches without PRD IDs. Identify the active owning PRD content/version and exact feature snapshot used. Save the mapping in the menu's `.exploration.md` [scenario handoff](flow-registry.md#implementation-handoff), not the PRD or `.flows.md`.

| Requirement / branch and condition | Exact feature + scenario identities | Asserted outcome / gap | Coverage |
| --- | --- | --- | --- |
| PRD/source/evidence ID | Existing/new IDs; location if missing/duplicated; or none | Actual assertion, or reason and next action | covered / partial / missing / blocked / deferred / excluded |

Allow many-to-many mappings. A title, setup step, tag or `@ref` alone does not cover an outcome. A shared master counts only where its consuming scenario exercises the required contract. `covered` describes authored assertions, not implementation or execution. Show mock, fixme and quarantine limitations on affected rows; a mock cannot establish required real integration. Every non-covered row needs a reason and next action, with an established scope decision for exclusions. Keep product-intent uncertainty distinct. Reassess affected rows when PRD/features change. A complete reviewed batch can coexist with menu gaps; do not claim full menu coverage while required branches remain unresolved.

## Save a resumable batch

Follow [flow registry](flow-registry.md#implementation-handoff) for exact scenario contracts/snapshot identities, PRD comparison, terminal source digests and decisions. Reference shared evidence IDs instead of copying browser logs. Include the branch's role/data prerequisites, exact target selection, setup/transition/readiness evidence, cleanup limits and unresolved locator/product gaps from [reliable E2E contracts](reliable-e2e.md#scenario-contracts). Mark unknown facts explicitly.

Preserve permanent identities, unaffected entries and actual observation dates. `.flows.md` contains only the full confirmed inventory and PRD/actual gaps; partially authored flows stay `pending`. Record deferred/blocked scenario branches and their next actions in `.exploration.md`. Registry-only or blocked work still saves newly obtained evidence before stopping.

## Present the concrete decision

The response itself must contain:

- Total flows and new/changed scenarios in the exact batch, reconciled with current features. Group every scenario by flow ID and plain-language goal, with exact feature path, scenario ID, descriptive title/outcome and new/changed status. Use source locations for missing/duplicate IDs.
- Requirement-to-scenario-to-outcome mapping above, applicable master references, masters judged inapplicable, evidence/locator gaps, defects and mock/quarantine limits. A combined table is fine if it retains every field; file links alone are insufficient.
- Existing coverage and confirmed flows/branches outside this batch, each with status, reason and next action. Distinguish existing scenarios from newly authored work. Explain batch boundaries and categories added, retained, extended or retired.
- Whether implementation and execution have occurred, the exact snapshot/scope the requested decision covers and the next action after acceptance. Flow confirmation and this review grant no live-data permission or test pass.

Q-Rex calls `show_diff`, points to the review request in Chat and its Changes link, then stops in manual mode. Terminal agents prepare the pending [scenario review record](flow-registry.md#terminal-scenario-review-record), present the exact changes and request explicit acceptance. Do not record approval until the actual decision is received and unchanged bytes are checked. Use configured automatic Q-Rex decisions truthfully when enabled. This phase never writes implementation.
