---
name: write-e2e-scenarios
description: Use a reviewed sub-module PRD and playwright-cli exploration to discover tenant business flows and write or maintain Gherkin scenarios with stable IDs and reusable references. Use for E2E discovery or scenario-intent changes; stops for review before implementation.
---

# Write E2E Scenarios (Phase 0 + maintenance)

**Entity options input:** Select `Converge` by default whenever an Entity options input is encountered, unless the user explicitly requests a different entity. This default does not override data-safety or approval requirements.

Maintains the scoped flow registry from confirmed flow discovery and the `@flow:` categories in `.feature` files, then produces reviewed scenarios. The feature file is the source of truth for catalog categories; the catalog groups scenarios by category and lets users collapse each group. Keep discovery notes and unrepresented candidate flows in the conversation and review output. Do not create a separate `.flows.md` registry file. Step definitions and page objects come next, in `write-e2e-code`, and only after scenario approval.

Conventions (IDs, flow tags, tag order, tag policy) are in [references/e2e-conventions.md](references/e2e-conventions.md). Data-safety rules are in [references/data-safety.md](references/data-safety.md). Browser commands are in [references/playwright-cli-exploration.md](references/playwright-cli-exploration.md).

For discovery in every mode, read [references/flow-discovery.md](references/flow-discovery.md). It defines how to explore the scoped UI, reconcile the PRD and existing tests, record unknowns and revisit discoveries across batches.

**Data safety:** Use E2E-owned records for mutations; seed data and shared settings are read-only by default. Follow search → create → skip. If the required E2E data cannot be found or provided within scope, explain the limitation and ask permission to use non-E2E data for that specific scenario under [data-safety.md](references/data-safety.md). Record approval before mutation; restoration alone does not grant permission. Without approval, skip the affected mutation.

## Step 0 — Interview for scope (required)

Resolve scope and context from the request, prior answers, reviewed PRD and project evidence. Ask only for decisions that materially affect the work and cannot be established or reasonably assumed. Reuse answers across skill handoffs; report assumptions and unresolved gaps. An observation or code alone does not establish product intent or permission.

For questions across these E2E skills, follow the active harness's interaction rules. When choices help, offer meaningful alternatives, explain any recommendation and allow a free-text answer. Ask focused questions and avoid repeating answers. Continue independent work while a response is pending; wait for the answer before dependent work. A preselected option, silence or delegation is not consent.

Keep the PRD review, flow-list confirmation, scenario review and scoped live-data approval distinct. Reuse an explicit approval only when it covers the current artifact, scope and session under the applicable gate. Prepare the relevant artifact or safety details before requesting approval. Never infer approval from a general instruction to continue.

Resolve these scope decisions from the available evidence; ask when a material ambiguity remains:

1. **Module and sub-module**: resolve both together from the user's input, prior answers, PRD index, existing features and accessible navigation. A sub-module is required when the module has sub-modules. If both are clear, state the resolved scope and do not ask again. If either remains ambiguous, ask one combined question for the missing scope, offering evidenced choices where possible.
2. **Requested scope or constraints**: infer the approach from discovery and existing artifacts; ask only when an unresolved decision materially affects the work.

Do **not** ask for these. Derive them, and state what you derived:

- **Routes**: discover through the app navigation and browser, using the PRD and existing E2E artifacts as leads. Ask only when the target remains ambiguous.
- **Environment configuration**: use the project's configured base URL and credentials without printing them. If configuration is missing, explain how to configure it locally; never ask for secrets in chat.
- **Smoke-only**: default is the full pass. Ask only if the user's wording implies a quick or critical-path-only pass.

If only a sub-module is named, resolve its parent using the PRD, existing feature files and app navigation; ask only if the scope remains ambiguous.

### Choose the working approach

First satisfy the mandatory matching reviewed PRD prerequisite in Step 0b. PRD creation and review may use browser exploration before this scenario workflow resumes.

Use the reviewed PRD, existing E2E artifacts and live `playwright-cli` exploration for every scope. Explore accessible UI for candidate journeys before flow-list confirmation. Observe entry points and possible outcomes; follow journeys further where access, data and safety allow. Distinguish PRD requirements, UI observations and blocked branches. Apply data-safety rules from the start.

Choose the approach based on journey complexity, breadth of the PRD and UI, roles, data and dependencies, estimated scenario volume, reviewability and whether work must span sessions. Flow count is informational only and never a threshold. Explain the choice and its evidence. Reassess as discovery progresses: when the scope is too large for one review, split it into coherent batches and keep the exact scope, evidence and unresolved gaps in the flow registry notes in the conversation and review output. The registry is a workflow inventory, not a separate file; existing categories are represented by `@flow:` tags in `.feature` files.

- **Mode A — Registry only:** reconcile discovered journeys with existing scenarios, confirm the flow inventory, and report covered, missing, stale and unresolved areas. Do not write Gherkin in this mode.
- **Mode B — Author confirmed flows:** after flow-list confirmation, choose a coherent batch of missing or approved-to-extend flows, explore it in depth, write scenarios and stop for review. Implement and verify the approved batch before starting the next.
- **Mode C — Single pass:** reconcile and confirm the flow list, explore journeys in depth and write the scenarios for review together. Compare existing scenarios with discovered behavior and preserve their IDs.
- **Mode D — Review existing flows:** re-explore affected journeys, compare existing scenarios with business outcomes, and review or extend scenarios while preserving IDs. Report partial coverage and unresolved branches.

Modes may be split into batches when needed. Use the confirmed inventory and exact approved scenario IDs to identify each batch. Keep flow categories and IDs in the `.feature` file; keep unrepresented discovery notes and review progress in the conversation. Never create or update a separate `.flows.md` file.

Track each flow's workflow state in the conversation registry so the scenario and implementation gates remain explicit. These are workflow states, not catalog badges or `.feature` tags:

| State | Meaning | Next action |
| ----- | ------- | ----------- |
| `pending` | Confirmed flow with no authored scenario yet | Mode B |
| `written` | New or changed scenarios are awaiting review | Stop for the scenario review gate |
| `approved` | The user explicitly approved the current scenario changes | Phase 1 may implement them |
| `implemented` | Steps and bindings exist and collection/type validation succeeded | Verify in the intended environment |
| `verified` | All required scenarios in the reviewed scope passed in the intended environment | Report scope and remaining gaps |
| `fixme` | The reviewed scope is blocked by a real product defect, with `@fixme @ref:<ticket>` on affected scenarios | Re-verify when the defect is fixed |
| `legacy` | A scenario already existed before this registry review | Mode D to assess coverage |
| `obsolete` | The journey no longer exists | Retire the scenario and never reuse its ID |

Keep state and evidence per reviewed scenario scope in the conversation, not as a separate per-flow file. A flow split across batches retains one `@flow:` ID; never infer that every branch is implemented or verified from one batch's state. `written` is not approval, `approved` is not implementation, and a passing subset does not make an incomplete scope `verified`.

Group related journeys by complexity and reviewability; about 15 scenarios is a planning guide, not a cap. A complex flow may be a batch alone and several simple flows may be grouped. Do not split a flow merely to hit the guide; if needed, partition by meaningful journeys or outcomes while retaining the same `@flow:` category and recording partial scope in the review summary.

Modifier: `smoke-only` restricts output to `@smoke` scenarios, including the supported CRUD baseline and other release-gating paths. Non-smoke journeys are listed as "for a later pass", not written.

When the user names an existing flow, find its `@flow:` category in the feature file and compare its scenarios with discovered behavior. Review or extend the existing scenarios while preserving IDs. A pass interrupted between turns resumes from the feature file, conversation registry notes and review output; repeat only the review gate invalidated by a material change.

For review or extension of existing scenarios, compare their observed outcomes with requirements and meaningful alternate paths. Preserve IDs and report any scoped step/POM files with test-data values that violate [data-safety.md](references/data-safety.md#test-data-values) for Phase 1.

## Step 0b — Context interview (required)

Scope tells the agent _where_ to look. Product context tells it _what matters_. Use the topics below as a checklist for discovery. Consult the PRD, existing scenarios and user context first; ask only consequential unresolved questions. Record unknowns and assumptions without presenting them as confirmed requirements. Explicit review and data-safety gates still apply.

Before scenario discovery in any mode, find and read the matching `docs/prd/<module>/<submodule>.md`. A matching `status: reviewed` PRD covering the requested scope is mandatory. If it is absent, draft, or does not cover the scope, apply [write-prd](../write-prd/SKILL.md) to create, review or refresh it; stop at its review gate and resume this workflow only after the applicable PRD review is explicitly approved. If multiple PRDs match or scope is ambiguous, resolve that ambiguity. Reuse answered context. Treat validated items as confirmed product context and unvalidated `spec` items as stated requirements; keep unvalidated observations and assumptions visibly unconfirmed. Do not use unresolved conflicts or assumptions as intended behavior. Record the PRD path, status, relevant item IDs and gaps in the flow-list review. PRD approval does not approve the flow list or scenarios.

1. **Purpose and requirements:** what this sub-module does for the business, and where the spec lives (PRD, Jira keys such as `HYPCRE-123`, or a document path). The agent reads the spec before browsing.
2. **Business flows:** identify the sub-module's main functions and their release-gating (`@smoke`) happy paths. At minimum, include each supported, in-scope create, read, update and delete happy path; also identify other main business functions from requirements, discovery and context, and recommend their happy paths as smoke. CRUD is a minimum, not the complete smoke list. Do not recommend no smoke merely because P0 is undocumented. Ask only about unresolved priorities or explicit exceptions, and reuse the user's stated decisions.
3. **Expected rules:** validation rules, duplicate rules, and the exact success and error messages the UI must show.
4. **Access:** which roles can open this page and which must be denied. Use the test account in `e2e/.env.local` unless told otherwise.
5. **Data and mutations — required for any mutation flow:** which records must exist first, and whether the agent may create and delete `E2E`-prefixed records in this environment. Use E2E-owned data. When unavailable, investigate upstream provisioning; explain any dependency and obtain explicit scoped approval before touching seed data, recording it in the `.feature` file. Without approval, skip (see [references/data-safety.md](references/data-safety.md)).
6. **Known issues and scope:** bugs or expected-broken behavior with ticket IDs (these become `@fixme @ref:<JIRA-ID>`), and flows to leave out of this pass.

Rules:

- Never re-ask a question the user has already answered, in this message or earlier in the conversation. Reuse the answer. Ask only for what is still missing.
- If the user answers "skip", "none", or "you decide", continue and record every assumption in the final summary.
- Answers guide the work. If an answer contradicts the PRD or observed UI, record the discrepancy and resolve the intended behavior with the user.

## Step 1 — PRD and browser discovery

1. Read the target `.feature` file if it exists. List its scenario IDs and `@flow:` categories; these tags are the source of truth for catalog flow categories.
2. Rebuild the scoped flow registry from the confirmed flow list in the current conversation and existing feature scenarios. Track candidate flows that do not yet have scenarios, review scope and unresolved discovery gaps in the conversation; do not create a separate registry file.
3. Read the reviewed PRD's requirements, candidate flows, discrepancies and unverified areas. Use them to guide browser exploration, following [references/flow-discovery.md](references/flow-discovery.md). Include in-page tabs, menus, dialogs, conditional actions and state-dependent journeys.
4. Read **every** file in `e2e/tests/bdd/features/_components/`. That folder is an open-ended inventory of reusable contracts (pipeline, filter, filter-search, sort, view-detail, and whatever has been added since). Decide which ones apply to this scope before you browse.
5. Check the existing step and POM files for the module, so you know which steps already exist.
6. Use `playwright-cli` to explore accessible scoped UI for possible journeys before flow-list review, following Step 2 and the discovery reference. Reconcile PRD candidates, UI observations and existing scenarios. Record observed entry points, possible outcomes, inaccessible or unverified branches and reasons. Report the count for information only; choose and explain the working approach using the criteria above.

For broad work, explore in manageable chunks and keep the exact confirmed scope and remaining discovery gaps in the conversation. If the browser or environment is unavailable, preserve the draft inventory and exact blocker; do not present PRD-only work as complete discovery or proceed to scenario authoring. Resume browser discovery when available.

## Step 1b — Confirm the flow list (required for every authoring scope)

After defining the flows in Step 1, present the discovered in-scope flow list with a short description of each, the total count, explicitly excluded flows and unresolved discovery gaps. Do not claim the list is exhaustive when access, PRD coverage or environment limitations prevent verification. For existing features, include their current `@flow:` categories and any proposed additions, changes or removals.

Ask the user explicitly: "Are these flows exactly right for this scope, with none missing and none extra?" Offer **Yes** and **No**, with optional explanation or requested changes, with a short explanation of what is being approved. Use an interactive choice tool when available and permitted; otherwise show the numbered choices. Stop and wait for an explicit confirmation. Silence, a general instruction to proceed, or approval of a previous scope or batch is not confirmation of this list. If the user requests changes, revise the list and ask again. Discovery browsing happens before this gate. Do not write or update scenarios or proceed to detailed batch work until the user confirms the current list.

If exploration later reveals a missing, extra or materially changed flow, pause and present the revised flow list for explicit confirmation before continuing with the affected work. Preserve existing flow IDs and the separate scenario review gate in Step 6. Flow-list confirmation does not approve scenarios or authorize Phase 1.

## Step 2 — Explore the live app (all approaches)

Use this loop for initial discovery before flow-list confirmation and again for detailed scenario exploration after confirmation. Initial discovery identifies possible journeys; detailed exploration checks selected journeys and outcomes. Do not author scenarios before the confirmation gate.

Use `playwright-cli` when available. The command reference and availability fallback are in [references/playwright-cli-exploration.md](references/playwright-cli-exploration.md).

Core loop:

1. Open one named `playwright-cli` session for the pass, then log in using the configured credentials. Use a persistent profile only when the task requires it. Keep the session for the pass.
2. Navigate to each route in scope. Snapshot, then grep the saved snapshot file for the section you need. Do not read the full tree inline.
3. Drive interactions with `eNN` refs from the latest snapshot.
4. Use `requests` and `request <n>` to confirm the real API shape and status before you assume a mock contract.
5. Take a screenshot only as a visual sanity check. Never use it as the locator source.
6. Pull locators (roles, text, `data-testid`) from the snapshot. Do not invent them.

For each batch, check the relevant states, conditional entry points and outcomes in the discovery reference. Record inaccessible or unverified branches with their reason; absence from the current account or data is not evidence that a flow does not exist. Reconcile new discoveries with the confirmed flow list.

If the UI contradicts the spec, PRD or ticket (a real product bug, not an environment quirk), do not write the scenario to match the broken behavior. See Step 4.

## Step 3 — Decide per journey

For every journey found, classify it:

| Status                | Meaning                                                                                                    | Action                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Covered**           | Existing scenarios were compared with the discovered behavior and cover the relevant journeys and variants | No change; record any unverified branches separately                     |
| **Partially covered** | A flow has scenarios but discovered journeys or meaningful variants are missing                            | Preserve IDs and extend the existing scenarios                           |
| **Missing**           | No `@flow` covers this journey                                                                             | Add a scenario with a new `@flow:` tag                                   |
| **Stale**             | `@flow` exists but the title or steps no longer match                                                      | Update in place. Keep the `@ID` and `@flow` stable. Never rename a flow. |
| **Obsolete**          | `@flow` exists for a route or journey that no longer exists                                                | Retire the scenario. Leave the ID unused forever.                        |
| **Reusable match**    | The interaction matches a `_components/` contract                                                          | Add `@ref:TEN_COM_<CMP>_E2E_<NNN>`                                       |

Authoring rules:

- Group in-scope business journeys supported by evidence with meaningful alternate outcomes and lifecycle paths. Represent each journey with a stable `@flow:` tag in its scenarios. Keep E2E scenarios focused on business outcomes; do not equate every UI action or technical endpoint with a business flow.
- Treat each supported, in-scope CRUD happy path as a minimum sub-module release-gating smoke baseline, not an exhaustive list. Identify and recommend happy paths for other main business functions of the sub-module as smoke too; use requirements, discovery and user context to assess them, and resolve genuinely unclear priorities in the interview. Apply `@smoke` to the resulting meaningful success scenarios, and use `@regression` for consequential non-smoke variants. Do not invent unsupported CRUD operations or tag every validation, error or exploratory UI check as smoke. Record unavailable or blocked operations and their reasons; existing review, real-backend and data-safety rules still apply. An explicit user exception takes precedence.
- When a consequential business journey needs an API error, delay, or auth-failure scenario, add `@mock`. Reuse applicable `_components/` step text and add `@ref` to the component master. Never write duplicate mock Gherkin. `@mock` never goes on `@smoke`.
- Mutations (create, edit, delete, add/remove member, activate/suspend) must assert the **data-changing outcome**: a success toast, a row that appears or disappears, a changed value. Asserting only that a dialog closed is not enough.
- Use dynamic value selection ("first available role", "first available job title"). Do not hard-code environment data.
- Test-data values follow the two rules in [references/data-safety.md](references/data-safety.md#test-data-values): a unique or findable test record reads `E2E <relevant words> <DDMMYYYYHHmm>` (`E2E profanity word 271020261108`), and a plain free-text field (description, comment, remarks, body) is a realistic sentence with no `E2E` flag and no stamp. This phase does not edit step/POM code: list any scoped files whose existing values break the rules in the summary, and Phase 1 aligns them.
- `Scenario Outline` + `Examples` is for reusable component masters (`@ref:TEN_COM_*`) only. Use a plain `Scenario` for data-dependent journeys. If only one realistic variant exists, keep one `Scenario` and note the limitation.
- Use E2E-owned records; seed mutations require explicit scoped approval recorded as described in [references/data-safety.md](references/data-safety.md), plus restoration and verification wherever possible.
- Pipeline states and membership follow the same rule; restoration does not replace approval.

## Step 4 — Product bugs found during exploration

If the real behavior contradicts the spec, PRD or ticket:

1. Do not write the scenario to match the broken behavior.
2. Tag it `@fixme @ref:<JIRA-ID>`. If no ticket exists, tell the user to open one and ask for the ID. Do not invent one.
3. Save a trace or screenshot as evidence (`playwright-cli tracing-start` / `tracing-stop`, or `screenshot`) and record the path.
4. Note expected vs. actual behavior in the summary.

`@fixme` is for real product defects. Use `quarantine` only for demonstrated E2E test unreliability. Never use the tags interchangeably.

## Step 5 — Write the `.feature` file

File: `e2e/tests/bdd/features/<module>/<submodule>.feature`. One sub-module, one file. The module folder matches the route segment exactly.

Follow the header and tag order in [references/e2e-conventions.md](references/e2e-conventions.md). Scenario IDs are `TEN_<CODE>_<FLG>_E2E_NNN`, where `NNN` resets for each flow section.

## Step 6 — Output and stop

Output a summary table:

| Journey | Status | Action taken |
| ------- | ------ | ------------ |

Also report the flow-registry delta: categories added, retained, extended or retired, linked to their scenario IDs. The `.feature` tags record categories that have scenarios; unrepresented candidates, discovery evidence and unresolved gaps remain in the conversation and review output. Also report reusable components linked via `@ref`, components judged not applicable, locator gaps (missing role labels or `data-testid`), and any new product bugs with their `@ref` and evidence path. Do not represent a PRD-only or blocked inventory as fully explored.

Before stopping, update only the affected flow scopes in the conversation registry to `written`, including changes containing `@fixme`. Record existing and new scenario IDs and the IDs changed in this pass. Preserve all other states. After explicit scenario approval, mark the reviewed scope `approved` before Phase 1; approval does not change unrelated batches.

Then **stop**. Do not write step definitions or POM code. Ask the user to review the batch, or the `.feature` file if this is a single-pass run. Offer **Yes, approve** and **No**, with optional explanation or requested changes, with a short explanation of what is being approved. Use an interactive choice tool when available and permitted; otherwise show the numbered choices. Wait for an explicit response; on No, revise and request review again. Phase 1 (`write-e2e-code`) starts only after approval for that batch, and must not change scenario intent or flow IDs.

For a batch, end with the next step: "Batch N is written. Approve it, or tell me what to change. After approval, run `write-e2e-code` for these scenarios before starting the next batch." Do not start the next batch in the same session.

## Related

- Write the step definitions, POM and MSW mocks for the approved scenarios: `write-e2e-code`
- Not sure which workflow applies: `ask-qa`
