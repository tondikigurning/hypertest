# Scenario coverage and batching

For a full pass, find and cover all important E2E scenarios supported by the requested scope, active PRD, existing artifacts and live exploration. Smoke is a release-priority label, not the coverage target. Include supported regression scenarios in the same planning pass; reserve smoke-only for an explicit or established scope decision. Do not assume a flow has one scenario or that a happy path covers its alternatives.

## Examine each flow

For each flow selected for the current batch, inspect the following categories against the PRD, shared rules, existing scenarios and observed app behavior. Make an initial lightweight inventory of the wider confirmed scope and record areas needing later investigation; do not delay the first batch until every flow is explored in depth. These are prompts for discovery, not a mandate to invent a scenario in every category:

- Successful outcomes and materially different supported routes, including create/read/update/delete and other main operations.
- Business rules, required inputs, constraints and meaningful boundary or invalid values where they affect an end-to-end outcome; examine relevant individual fields and combinations when their rules differ.
- Distinct user decisions such as confirmation, cancellation and leaving with unsaved changes, when they affect data or business state.
- Relevant roles, access restrictions, ownership and permissions; visible and prohibited actions where evidence permits.
- Lifecycle states, prerequisites, transitions, dependent records and alternative outcomes, including repeat operations when behavior differs.
- Search/filter/sort, empty/no-result, pagination and detail behavior when necessary to find, understand or act on business records.
- Failure and recovery at meaningful service, authentication or integration boundaries, including retry, when supported by requirements or evidence and the applicable mock policy.
- Known defects, explicitly requested behaviors, cross-menu journeys and integration effects.

For each applicable branch, identify its source or observation, preconditions and observable outcome. Compare these with existing scenario assertions, not just titles or flow tags. Author distinct scenarios when conditions or outcomes exercise materially different business behavior; reuse an existing scenario or shared contract when it actually covers the branch. Do not multiply equivalent input samples, incidental UI states or component-only behavior without a separate E2E reason. Do not invent behavior, data, access or mock contracts; record an unverified or blocked branch and its reason instead. One scenario is valid only if the examined flow has no other supported, important uncovered branch; explain the result or gaps in review.

Classify each applicable branch as already covered, to be written in this batch, deferred to a later batch, blocked/unverified, or excluded by the user's established scope. Report why and the next action for every unresolved branch. Keep the minimal flow-registry table unchanged; record deferred and blocked flow/branch descriptions and next actions under its Gaps section, then remove them when resolved. A flow remains `pending` until all its confirmed in-scope scenarios are written. Do not claim full coverage from the number of flows or scenarios, or from unavailable roles and data.

For example, if a create flow's sources and exploration establish successful creation, duplicate-name rejection, cancellation without creating a record and a role denied access, assess all four outcomes separately. A success assertion alone covers only the first. If the denied role is unavailable, keep that branch unverified and identify the missing access; do not invent its UI outcome. If duplicate rejection and cancellation are accessible and not already asserted, include them as regression candidates. This example does not establish behavior in another menu.

## Choose a batch

First enumerate the known important candidates and existing coverage for the selected batch; record unexplored areas of the wider scope and revisit them in later batches. Choose the largest coherent batch that can realistically be explored, authored and reviewed with clear evidence and requirement mapping, and has a practical implementation and verification scope. Size by complexity and review effort rather than a default scenario count. Include the whole confirmed scope in one batch when it meets these conditions.

Prioritize business risk, main lifecycle outcomes and consequential regression branches, then expand with related supported scenarios that share prerequisites, roles, data or contracts. Prefer complete related journeys and combine compatible small flows to reduce review cycles. Continue adding meaningful coverage while evidence quality and reviewability remain manageable; every scenario needs a distinct E2E purpose. Keep important regression alongside its happy paths, and reuse existing coverage for equivalent outcomes.

Split when another group would introduce substantially different setup, roles, integrations or data-safety needs, when unresolved access or evidence would block otherwise ready work, or when the resulting diff and requirement mapping would become difficult to assess reliably. Account for Q-Rex's cumulative review snapshot when judging review effort. Split by meaningful outcomes or branches, retaining the flow ID and recording the remainder. A smaller batch needs a concrete complexity, dependency or review reason; reaching a scenario count is not a stopping condition. Preserve the full coverage plan across batches.

Explain the selected batch and its reasoning, identify exact flow/feature/scenario scope, and list remaining candidates and unexplored areas with their next action in the registry gaps and review. Reassess size as exploration exposes complexity or the user reports review friction. After approval, follow the shared contract to continue independent scenario-only batches; report implementation and verification separately and honor the host's cumulative review constraints.
