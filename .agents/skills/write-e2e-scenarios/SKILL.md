---
name: write-e2e-scenarios
description: Use a reviewed sub-module PRD and playwright-cli exploration to discover tenant business flows and write or maintain Gherkin scenarios with stable IDs and reusable references. Use for E2E discovery or scenario-intent changes; stops for review before implementation.
---

# Write E2E Scenarios (Phase 0 + maintenance)

Discover the requested business journeys, reconcile existing coverage and produce one reviewable Gherkin batch. This phase writes `.feature` files, not steps/POMs/mocks. Keep candidate flows, scope and review progress in conversation; the feature's `@flow:` tags are the catalog category source. Do not create `.flows.md` files.

Read the [shared workflow contract](../ask-qa/references/workflow-contract.md) for scope reuse, host-specific approvals, states and batch boundaries. Read [flow discovery](references/flow-discovery.md) in every mode, [E2E conventions](references/e2e-conventions.md) before assigning IDs/tags, and [data safety](references/data-safety.md) plus [browser capabilities](references/playwright-cli-exploration.md) before exploration.

## Step 0 — Interview for scope (required)

Resolve module/submodule and consequential context gaps using the shared contract, prior answers, supplied documents and existing artifacts. If the parent is unclear, investigate PRDs, features and navigation before asking one combined scope question. Derive routes and file names; do not ask the user to supply discoverable paths. Default to a full pass; use smoke-only when requested or established by the user.

Before discovery in **any mode**, read the owning submodule's single `docs/prd/<module>/<submodule>.md`. In Q-Rex use file tools with that virtual database identifier. `status: reviewed` and relevant coverage are mandatory, including for child groups. If absent, draft or insufficient, apply [write-prd](../write-prd/SKILL.md) to that same parent and stop at its review gate. Other submodules' PRDs provide supporting context only. Record the PRD path, status, relevant requirement IDs and gaps for flow review.

Use validated items according to their recorded review method and unvalidated `spec` as attributed requirements. Unvalidated observations, assumptions and unresolved conflicts do not establish intent. Reuse the shared context checklist; ask only consequential unanswered decisions. Include supported in-scope CRUD happy paths and other main business functions when discussing release priorities. Recommend their happy paths as smoke; do not infer “no smoke” from undocumented P0 priorities. Reuse authorized data scope and inspect owned-data prerequisites; a missing ticket or inaccessible branch remains an explicit gap.

## Step 1 — Discover and choose an approach

1. Resolve ownership and target paths using [test organization](../../../docs/automation/test-organization.md). Read the submodule's flat feature and all descendant features; inventory IDs and `@flow:` tags, including known retired identities. File boundaries do not create new namespaces.
2. Rebuild the scoped conversation registry from current features and prior confirmed discovery. Keep unrepresented candidates and limitations visible; existing tags alone do not prove complete journeys.
3. Read PRD candidates, discrepancies and unverified areas. Read every current `features/_components/` master contract and decide which applies. Inspect scoped steps/POMs so reviewed Gherkin can reuse existing contracts.
4. Explore accessible scoped UI before confirming flows: navigation, tabs, menus, dialogs and conditional actions. Reconcile user goals, PRD requirements and UI observations with existing scenarios by outcomes and consequential branches. Record inaccessible roles, data, integrations, unsafe mutations and other gaps with evidence and reasons.
5. Choose the approach from complexity, breadth, dependencies, roles/data and reviewability; explain the evidence. Flow count is informational, never a threshold. Reassess as exploration expands.

| Mode | Deliverable |
| --- | --- |
| A — Registry only | Reconcile/confirm inventory and report covered, missing, stale and unresolved journeys; no Gherkin edits |
| B — Author confirmed flows | Explore one coherent missing/approved-to-extend batch, write scenarios and stop for review |
| C — Single pass | Discover/reconcile/confirm, explore and write the scoped scenarios for review together |
| D — Review existing flows | Re-explore affected journeys and review/extend existing scenarios, preserving IDs |

About 15 scenarios is a planning guide, not a cap. Group by meaningful journeys/outcomes; keep one flow ID when a flow spans files or batches, and record partial scope. Smoke-only writes supported CRUD and other release-gating happy paths; list remaining journeys as deferred. Implement and verify a reviewed batch before the next batch starts under the shared contract.

If live exploration is unavailable, retain a draft inventory and the exact blocker. Do not call PRD-only work complete discovery or proceed to authoring. Resume from feature contents, conversation scope and review output; repeat only a gate invalidated by changed artifacts or scope.

## Step 1b — Confirm the flow list (required for every authoring scope)

Present the discovered flows with IDs, short goals/outcomes, exact feature files, total count, exclusions, relevant PRD IDs and unresolved gaps. For existing features include retained categories and proposed additions/changes/removals. Do not claim completeness beyond available evidence.

Use the shared contract's **flow confirmation** procedure: Q-Rex calls `confirm_flows` for each affected file with its owning reviewed PRD; terminal agents explicitly ask whether the list has missing or extra flows and wait for confirmation. A chat answer is not a replacement for the Q-Rex tool. Confirmation approves only that described inventory, not scenarios or live mutations. Before detailed batch work or authoring, obtain the applicable decision. Reconfirm affected work if later discovery materially changes the inventory; preserve IDs.

## Step 2 — Explore selected journeys in depth

Use the same [host-specific browser loop](references/playwright-cli-exploration.md) for initial discovery and detailed exploration. Trace each selected journey from entry to observable business outcome and inspect meaningful alternate paths, within data-safety scope. Use current snapshot refs and verified locators; inspect available network evidence before assuming a mock contract. Record what the tools cannot establish. Missing access/data is not evidence that a journey does not exist.

If the product contradicts intended requirements, preserve intent and record the discrepancy/defect. If a newly discovered child requirement is absent from the parent PRD, refresh/review that parent through `write-prd` before affected authoring.

## Step 3 — Reconcile and author business outcomes

Classify each journey by evidence:

| Status | Action |
| --- | --- |
| Covered | Existing scenarios cover the relevant outcomes/branches; record any unverified scope separately |
| Partially covered | Extend missing consequential journeys while preserving IDs |
| Missing | Add the journey with new permanent scenario IDs and a stable flow category |
| Stale | Update mismatched scenarios in place, preserving scenario/flow IDs |
| Obsolete | Retire the journey and permanently reserve its IDs |
| Reusable match | Reuse the master step text and link its `@ref:TEN_COM_*` contract |

- Group scenarios by meaningful business goals and lifecycle outcomes. Include consequential changes to outcome, permissions, decisions or integration boundaries; do not enumerate every field, button, endpoint or visual variation as E2E.
- Tag supported in-scope CRUD happy paths and other main release-gating business success journeys `@smoke`, honoring explicit exclusions. Use `@regression` for consequential alternatives. Do not invent unsupported CRUD operations or tag every validation/error as smoke. Report blocked baseline operations.
- For consequential API error/delay/auth-failure cases, use reviewed `@mock` contracts and applicable shared master steps/references. Never put `@mock` on `@smoke`; report mocked coverage separately from real backend behavior. See [mock policy](../write-e2e-code/references/msw-mocking.md) when deciding a mock-dependent scenario.
- A mutation must assert its data-changing outcome on the identified record, such as an appearing/disappearing row or changed detail/status. A toast may supplement that result; when persistence cannot be observed, explicitly limit the promised outcome rather than claiming it was verified. Preserve existing approved intent until its own review changes it.
- Dynamic “first available” values are suitable for reference choices, not unverified mutation targets. Use exact owned or explicitly approved identities under data-safety rules, including pipeline/membership changes.
- Follow [test-data values](references/data-safety.md#test-data-values), including same-minute collision handling. Phase 0 reports scoped step/POM values needing alignment; only Phase 1 edits implementation.
- Use `Scenario Outline` with `Examples` only for reusable component contracts or their `@ref:TEN_COM_*` mirrors. Use plain scenarios for data-dependent business journeys. Note unavailable variants instead of inventing data.

## Step 4 — Record product defects

Describe expected versus actual behavior with the requirement source. Use `@fixme @ref:<real-ticket>` for a confirmed product defect, not the broken behavior as an assertion. If the ticket is missing, ask for it and leave the affected scenario as a documented candidate until it can carry a valid reference; continue independent work. Never invent a ticket or use quarantine as a substitute.

Capture safe trace/screenshot evidence only when the host exposes it. In Q-Rex, use a dated sanitized observation with available snapshot/network context and state that no trace/image was captured. Record evidence limitations under [browser capabilities](references/playwright-cli-exploration.md). Quarantine remains for demonstrated test unreliability.

## Step 5 — Write the feature batch

Use `<module>/<submodule>.feature` for small scopes or files beneath `<module>/<submodule>/` for child groups, following test organization. All children share the parent PRD and scenario namespace. Preserve inherited tags, backgrounds, examples, safety notes, flow order and existing bindings when splitting files. Register implementation paths during Phase 1 only.

Follow the conventions' header and tag order. Allocate `TEN_<CODE>_<FLG>_E2E_NNN` across all submodule files and known retired IDs, with a sequence per flow abbreviation; never restart due to a new file. Record a requirement-to-scenario mapping in the review summary, not a separate registry file.

## Step 6 — Output and stop

Report journey status/action, PRD requirement IDs → exact feature/scenario IDs → promised outcome, flow categories added/retained/extended/retired, applicable master references, masters judged inapplicable, locator gaps, defects and evidence. Keep unrepresented candidates and unverified branches visible. Update only affected registry scopes to `written`, including scenarios carrying `@fixme`; preserve unrelated states. Approval applies to the current snapshot and exact batch only.

Use the shared contract's **scenario approval** procedure. In Q-Rex, call `show_diff`, direct the user to Changes > Approve scenarios and end the turn; do not ask for a competing chat Yes. In terminal hosts, present the concrete batch and request explicit approval. In manual mode, implementation resumes on a later user turn after that gate. Explain the next action without requiring another slash command. If Q-Rex's automatic mode is active, follow its configured gate handling and label the decision automatic. This phase never writes implementation.

## Related

- Product context: [write-prd](../write-prd/SKILL.md)
- Approved implementation: [write-e2e-code](../write-e2e-code/SKILL.md)
- General testing/app work: [ask-qa](../ask-qa/SKILL.md)
