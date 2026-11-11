---
name: write-e2e-scenarios
description: Explore tenants business flows with playwright-cli and write or maintain Gherkin scenarios, flow registries, stable IDs and reusable references. Use for E2E discovery or scenario-intent changes; stops for review before implementation.
---

# Write E2E Scenarios (Phase 0 + maintenance)

**Entity options input:** Select `Converge` by default whenever an Entity options input is encountered, unless the user explicitly requests a different entity. This default does not override data-safety or approval requirements.

Produces a flow inventory or reviewed `.feature` file for one sub-module (or module), according to the selected mode. Step definitions and page objects come next, in `write-e2e-code`, and only after scenario approval.

Conventions (IDs, flow tags, tag order, tag policy) are in [references/e2e-conventions.md](references/e2e-conventions.md). Data-safety rules are in [references/data-safety.md](references/data-safety.md). Browser commands are in [references/playwright-cli-exploration.md](references/playwright-cli-exploration.md).

For discovery in every mode, read [references/flow-discovery.md](references/flow-discovery.md). It defines how to trace the scoped UI, reconcile existing tests, record unknowns and revisit discoveries across batches. A source-only inventory is a draft, not proof of complete coverage.

**Data safety:** Use E2E-owned records for mutations; seed data and shared settings are read-only by default. Follow search → create → skip. If the required E2E data cannot be found or provided within scope, explain the limitation and ask permission to use non-E2E data for that specific scenario under [data-safety.md](references/data-safety.md). Record approval before mutation; restoration alone does not grant permission. Without approval, skip the affected mutation.

## Step 0 — Interview for scope (required)

Conduct Steps 0 and 0b as one conversation: ask exactly one question per turn, wait for the answer, and use it to choose the next question. Do not combine several questions into one message or tool call. Resolve each decision and any necessary follow-up before moving on. Use repository evidence to inform a recommendation when useful, and briefly explain the relevant evidence. Do not repeat answered questions or an unanswered question while waiting.

**Interview completeness gate:** Before dependent work, systematically account for every listed scope and context topic, including each applicable decision within a compound topic. Keep a working checklist across turns: answered (with the relevant answer), explicitly delegated or skipped (with assumptions), not applicable (with a concrete reason), or pending. Ask each pending applicable context decision one at a time; repository evidence alone is not an answer. Scope questions retain their stated conditions. Do not mark a topic not applicable merely because the user has not mentioned it, because the code suggests an answer, or to save time. A partial answer resolves only the part it addresses. Pause all task work while any question is pending, and do not begin dependent work until every applicable decision is resolved or explicitly delegated/skipped. Revisit the checklist if scope changes. Summarize delegated/skipped assumptions and material inapplicability or gaps in the outcome; preserve the checklist across interruptions.

Apply the following presentation and response rules to **every question and confirmation** in this skill and in skills that reference this section, including follow-ups and review gates. Before asking, identify the single decision, what the user already answered, and whether it is an approval gate. Ask once in the permitted question tool or in the final response, not both; do not echo the same question in a separate status message. A topic containing several decisions (such as validation and duplicate rules) needs separate questions when both answers matter.

**Reuse answers before asking:** For every question, first check the current request and earlier conversation, including answers given under another skill. Record and reuse an applicable, clear answer; do not ask or seek confirmation again just because the question appears in a checklist, a skill was invoked, or work moved to another phase. For partial answers ask only the unresolved part; for materially conflicting or genuinely ambiguous answers, explain the conflict and ask only what resolves it. Carry answers and explicit delegations across skill handoffs and interruptions, subject to their actual scope. Repository evidence may resolve technical scope, but does not by itself establish business intent or permission. A prior answer about scope or intent is not approval of a flow list, scenarios, or a data mutation; reuse explicit approval only when it covers the current artifact, scope and session under the applicable gate, and ask when it does not.

**Use the harness's interactive user-question/choice tool for every interview question whenever one is available and permitted.** Invoke the tool with exactly one question; do not merely print a list in commentary or a final message when the tool can present selectable answers. Follow the active harness's tool schema and rules, rather than assuming a particular tool name or interface.

**Number choice labels in both interactive tool calls and plain-text fallback.** Prefix each supplied option label with its actual sequential number, for example `1. Yes, system-settings / profanity (Recommended)` and `2. No, another scope`. Do this even when the harness renders the options as bullets or buttons; do not rely on the UI to add numbers. Tell the user they may select an option or reply with its number, and interpret a typed number as the corresponding pending choice. Do not prefix the question itself. A client-generated free-text/Other control cannot be numbered by the skill; respect the tool schema and do not add a duplicate just to number it.

In Codex, check which user-input tools and mode are actually available in the current session. If permitted, use `functions.request_user_input` in Plan mode for a blocking question, or `functions.request_user_input_async` in Default mode for a question eligible under its tool rules. Submit one question and its selectable options in the tool call, not as a plain-text imitation. The client supplies its own free-text answer option; do not add an `Other` option. A blocking tool returns the answer before continuing. An async tool returns immediately: stop all task work and wait for the user's actual response; do not run commands, browse, inspect files, edit, or start another question, even for independent work. Do not interpret the tool's return or a preselected option as an answer. If the harness cannot wait for an asynchronous response, end the turn without repeating the question and resume on the user's reply. Once an answer arrives, use it and ask the next question without requiring a new invocation of the skill.

For any other harness, use its available and permitted native question or choice mechanism, respecting its schema and lifecycle. If it waits for the answer, continue after the answer returns; if it delivers answers asynchronously or in a later user turn, resume the interview when the answer arrives. Do not assume a tool exists or that it behaves like Codex.

The skill cannot enable tools, change modes, override harness restrictions, or keep an assistant turn open by itself. If no permitted interactive tool exists, ask in plain text and end the turn awaiting a reply; on the user's next message resume the same interview and do not restart or repeat the question. A completed turn while awaiting that reply is not completion of the interview. Do not promise a clickable UI or automatic in-turn continuation when the harness does not provide it.

**Question format decision (mandatory for every question):** First identify the single decision and use conversation and relevant repository evidence to consider whether at least two distinct, meaningful answers can be offered. If so, ask a multiple-choice question with those answers and a free-text fallback, even if the user might prefer to provide details or an alternative. Use open-ended free text only when meaningful alternatives cannot be constructed without inventing product requirements, or the answer itself must be supplied as text (for example a spec path, ticket ID, exact message, or an unknown business-flow description). Do not default to open-ended questions merely because the topic is broad: split it into focused decisions and offer choices where evidence supports them. Never fabricate choices or imply that observed implementation establishes intended behavior.

- For every multiple-choice question, offer relevant, mutually distinguishable options and recommend exactly one: put it first, label it **Recommended**, and briefly explain the reasoning. Use available evidence and the user's goal; when evidence is insufficient, propose a reasonable provisional choice, explicitly state the assumption and uncertainty, and do not present it as an established requirement or policy. For an explicit approval or safety gate, recommend a non-approval or defer/review option when there is no basis to recommend approval; never treat a recommendation or preselection as consent. Provide a final **Type your own answer** fallback through the tool's built-in free-text/Other control; if the tool does not provide one, include it as an option and collect the user's text when selected. Follow the tool's limits on number of options. Examples when applicable: test mode (unit / integration / regression), error handling (throw / fallback / error state), or scope (identified candidate A / candidate B). Construct actual choices from the task, not these examples mechanically.
- For an open-ended question, ask directly and end with: “If you’re unsure, you can say ‘you decide’ and I’ll make a reasonable assumption.” Include this sentence in the native question itself when using a free-text control. Do not present **You decide** or **Skip** as options for an open-ended question. Use a permitted native free-text question control if available; otherwise ask in plain text. Do not force an extra selection before the user can type. Delegation does not replace explicit approval gates.
- If no permitted interactive tool can present a **multiple-choice** question, show a numbered list using `1.`, `2.`, and so on, never unnumbered bullets. Number every option, including **Type your own answer** when offered. Tell the user they can reply with a number or type an answer directly. Interpret a number as the corresponding option for the pending question. If they select **Type your own answer** without providing text, ask for the text in the next turn.
- If no permitted interactive tool can present an **open-ended** question, ask for the answer directly without a list of options, using the sentence above to offer delegation.

Never claim plain text choices are interactive. When a plain-text question is pending, end with the question itself; do not repeat it or add a separate message asking the user to answer the pending question.

Treat **You decide** as delegation for the question pending at the time; if the user explicitly delegates the entire interview, apply it to the remaining interview topics as well. Delegation is not a factual answer: investigate what can be established, and report unknowns and assumptions without asserting that an unlocated spec or other unverified item does not exist. Treat **Skip** as an unanswered topic; record resulting assumptions or gaps. A general “continue” after a recommendation may accept that recommendation when it is a normal interview decision, but does not answer a different pending question. Neither delegation nor “continue” grants approval for a seed mutation or another explicit approval gate, even when restoration is possible. Do not infer intent from source alone: identify source-derived behavior as an assumption and report missing product requirements.

For every yes/no confirmation in this workflow, offer explicit **Yes** and **No** choices, with room for the user to explain or request a change. Use the interactive choice tool when available and permitted; otherwise show numbered choices in the question. A preselected choice, silence, or an unrelated instruction is not an answer. If a tool returns immediately, pause all task work and wait for the user's response.

Ask for what you cannot determine yourself. Ask **only** for these:

1. **Module (required)**, the top-level route segment under `_protected+/`. Examples: `case-management`, `user-management`, `iam`. If the user does not know it, list the folders under `e2e/app/routes/_protected+/` and let them pick.
2. **Sub-module (required when the module has sub-modules)**. Examples: `users`, `user-groups` under `user-management`; `outage-management` under `case-management`. List the sub-module folders under the module route folder and ask which one.
3. **Requested scope or constraints**: infer the approach from discovery and existing artifacts; ask only when an unresolved decision materially affects the work.

Do **not** ask for these. Derive them, and state what you derived:

- **Routes**: from `e2e/app/routes/_protected+/<module>+/<submodule>+/`. Ask only if the folder layout is ambiguous.
- **Env file**: `e2e/.env.local` supplies `BASE_URL`, `E2E_USERNAME`, `E2E_PASSWORD`. Only mention it if the file is missing, and then ask the user for the values.
- **Smoke-only**: default is the full pass. Ask only if the user's wording implies a quick or critical-path-only pass.

If the user gives a sub-module outside the module (for example `outage-management` without `case-management`), resolve it by searching the route folders, then confirm the full scope before continuing.

### Choose the working approach

Use product context and requirements, source analysis, existing artifacts and live `playwright-cli` discovery for every scope. Inspect source and existing tests first, then explore accessible UI for candidate journeys before flow-list confirmation. Observe entry points and possible outcomes; follow journeys further where access, data and safety allow. Distinguish UI observations from source-only candidates and blocked branches. Apply data-safety rules from the start.

Choose the approach based on journey complexity, breadth of source and UI, roles, data and dependencies, estimated scenario volume, reviewability and whether work must span sessions. Flow count is informational only and never a threshold. Explain the choice and its evidence. Reassess as discovery progresses: if a single pass becomes difficult to manage, create a registry, preserve IDs, evidence and approvals, and continue in batches without repeating valid review gates.

- **Single pass (Mode C):** reconcile and confirm the flow list, explore journeys in depth and write the scenarios for review together. Review existing flows against discovered behavior using Mode D rules.
- **Registry and batches:** persist discovery across manageable source and browser chunks, including reviewed and remaining areas and limitations. Mode A registers the inventory only, with no Gherkin. After flow-list confirmation, choose a coherent batch, explore it in depth, write scenarios and stop for review; implement and verify the approved batch before the next. Mode B authors pending flows and Mode D reviews or extends existing flows. A batch may include both, applying each flow's status rules.

Group related journeys by complexity and reviewability; about 15 scenarios is a planning guide, not a cap. A complex flow may be a batch alone and several simple flows may be grouped. Do not split a flow merely to hit the guide; if needed, partition by meaningful journeys or outcomes while retaining flow identity and recording partial scope. Report the batch scope and rationale.

Modifier: `smoke-only` restricts output to `@smoke` scenarios, including the supported CRUD baseline and other release-gating paths. Non-smoke journeys are listed as "for a later pass", not written.

When the user names an existing flow, check its registry status before choosing: use B only for `pending`; use D to review or extend `legacy`, `implemented`, `verified` or `fixme` coverage. A `written` change awaits scenario review; an `approved` change awaits Phase 1. Do not create a new batch over those in-progress changes. If a pass is interrupted, resume from the registry and current artifacts, retain evidence and approvals, and repeat only the specific review gate invalidated by a material change.

For Mode D, re-explore affected journeys and compare existing scenarios with business outcomes, including partial coverage. Re-verify affected `@fixme` scenarios when possible, update statuses for changed flows, and list scoped step/POM files with test-data values that violate [data-safety.md](references/data-safety.md#test-data-values) for Phase 1.

## Registry workflow

Use the registry as the source of truth across sessions. Reconcile source, product context and browser observations before presenting the draft list for confirmation. Preserve existing flow and scenario IDs and record which areas remain unexplored. After confirmation, review and implement each selected batch before starting the next.

### Registry file

File: `e2e/tests/bdd/features/<module>/<submodule>.flows.md`. It sits next to the `.feature` file. Playwright and the catalog only load `.feature` files, so this file is never executed.

```markdown
# E2E flow registry: case-management / cases

Feature: tests/bdd/features/case-management/cases.feature
Code: CAS
Last source review: 2026-10-26

| Flow ID             | Section | Description                            | Source evidence                                                    | Priority | Batch | Status   | Scenarios                |
| ------------------- | ------- | -------------------------------------- | ------------------------------------------------------------------ | -------- | ----- | -------- | ------------------------ |
| TEN_CAS_LIST_FLOW   | LST     | Case list, pipeline tabs, filter, sort | routes/\_protected+/case-management+/\_case-management.\_index.tsx | P0       | 1     | approved | TEN_CAS_LST_E2E_001..006 |
| TEN_CAS_ASSIGN_FLOW | ASG     | Assign case to agent                   | components/cases/case-assign-dialog-right.tsx                      | P0       | 2     | written  | TEN_CAS_ASG_E2E_001..008 |
| TEN_CAS_OUTAGE_FLOW | OUT     | Create outage                          | components/outage-management/dialogs/create-outage.tsx             | P1       | 3     | pending  |                          |
```

Status values:

| Status        | Meaning                                                                                                                     | Set by                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `pending`     | Registered, not written                                                                                                     | Mode A                    |
| `written`     | Scenarios are in the `.feature` file, waiting for review                                                                    | Mode B                    |
| `approved`    | User approved the scenarios                                                                                                 | User, after review        |
| `implemented` | Steps/POM exist and their imports and bindings were validated; record typechecking separately                               | `write-e2e-code`          |
| `verified`    | All required scenarios in the reviewed scope actually passed in the intended environment; record mocks and backend coverage | `write-e2e-code`          |
| `fixme`       | The reviewed scope is blocked by a real product defect, tagged `@fixme @ref:<JIRA-ID>`                                      | After review/verification |
| `legacy`      | Already in the `.feature` file before the registry existed. Not re-reviewed unless Mode D is run                            | Mode A                    |
| `obsolete`    | Route or journey removed. ID kept, never reused                                                                             | Mode D                    |

Rules:

- Mode A marks flows already covered by the existing `.feature` as `legacy`, based on their `@flow:` tags. It never changes their IDs.
- A `legacy` tag means existing scenarios were found, not that the whole flow is covered or verified. Record missing variants and uncertainty separately; use Mode D to review and extend that flow while retaining its IDs.
- For a Mode D change to an existing flow, keep existing IDs and discovery notes, record the changed scenario IDs, and set that flow to `written` for review. After explicit approval, set it to `approved` so Phase 1 can implement the reviewed change. The status applies to that reviewed change; retain evidence and limitations for the rest of the flow.
- Track defect, skipped and blocked outcomes per scenario in notes even when the registry has one flow-level status. A newly authored or changed scenario, including `@fixme`, stays `written` until reviewed. After approval, use `fixme` for a scope wholly blocked by a known product defect; for mixed scopes preserve the applicable workflow status and record each defect separately. Do not describe a mixed or skipped batch as fully verified.
- Group batches by related journeys, complexity and reviewability; about 15 scenarios is a guide, not a limit. Order by priority, P0 first, and record the batch scope and rationale.
- Record a batch identifier, exact flow and scenario IDs, partial-flow scope, approval and verification evidence in registry rows or notes. A flow split across batches retains one flow ID; track each batch's scenario scope and status separately so a flow-level status never implies all branches were verified. After explicit scenario approval, mark the reviewed changes `approved` before Phase 1.
- Assign flow IDs and section codes in Mode A. Preserve existing scenario IDs; assign new scenario IDs when scenarios are authored in Mode B or D, using the next free number. Never renumber them.
- Mode B authors `pending` flows in the current batch. Apply Mode D rules to existing flows selected for review; do not overwrite `written` or `approved` changes.
- Keep the registry in sync with the `.feature` file. Each Mode B run updates the rows it wrote.

### Batch rules for Mode B

- Append the new scenarios to the existing `.feature` file, in the batch's flow section. Do not rewrite sections from earlier batches.
- Use the next free `NNN` for each `<FLG>` section, as set out in the conventions.
- Keep the file header and tag order unchanged.
- The stop message lists the batch, its flow IDs and scenario IDs, and the registry row changes. Then stop.
- **Undefined steps break the run.** Sub-modules already listed in `playwright.bdd.config.ts` are bundled by `bddgen`, so a written batch with steps that do not exist yet breaks the whole project. Tell the user to run `write-e2e-code` for the batch right after approval, before the next batch. If the sub-module is not yet in the config, do not add it until its batch is `implemented`.

## Step 0b — Context interview (required)

Scope tells the agent _where_ to look. Product context tells it _what matters_. Before starting dependent work, interview the user about the applicable unanswered topics below, one focused question per turn. These are topics to explore, not a script to recite: split compound topics into separate questions, adapt follow-ups to each answer, and probe consequential ambiguities or contradictions until there is a shared understanding. For multiple-choice questions, always recommend one option under the question-format rules above, while allowing a different answer. Read relevant repository evidence and any identified spec to avoid asking questions the agent can answer itself, but do not infer business intent or authorization from code alone. Skip topics already answered or clearly inapplicable. If the user explicitly skips or delegates the interview, proceed and report assumptions. Existing approval and data-safety gates still apply.

1. **Purpose and requirements:** what this sub-module does for the business, and where the spec lives (PRD, Jira keys such as `HYPCRE-123`, or a document path). The agent reads the spec before browsing.
2. **Business flows:** identify the sub-module's main functions and their release-gating (`@smoke`) happy paths. At minimum, include each supported, in-scope create, read, update and delete happy path; also identify other main business functions from requirements, discovery and context, and recommend their happy paths as smoke. CRUD is a minimum, not the complete smoke list. Do not recommend no smoke merely because P0 is undocumented. Ask only about unresolved priorities or explicit exceptions, and reuse the user's stated decisions.
3. **Expected rules:** validation rules, duplicate rules, and the exact success and error messages the UI must show.
4. **Access:** which roles can open this page and which must be denied. Use the test account in `e2e/.env.local` unless told otherwise.
5. **Data and mutations — required for any mutation flow:** which records must exist first, and whether the agent may create and delete `E2E`-prefixed records in this environment. Use E2E-owned data. When unavailable, investigate upstream provisioning; explain any dependency and obtain explicit scoped approval before touching seed data, recording it in the `.feature` file. Without approval, skip (see [references/data-safety.md](references/data-safety.md)).
6. **Known issues and scope:** bugs or expected-broken behavior with ticket IDs (these become `@fixme @ref:<JIRA-ID>`), and flows to leave out of this pass.

Rules:

- Never re-ask a question the user has already answered, in this message or earlier in the conversation. Reuse the answer. Ask only for what is still missing.
- If the user answers "skip", "none", or "you decide", continue and record every assumption in the final summary.
- Answers guide the work. If an answer contradicts the code, say so and ask which one is right.

## Step 1 — Source and browser discovery

1. Read the target `.feature` file if it exists. List the existing `@<ID>`, `@flow:` and `@fixme` tags.
2. Read the registry file `<submodule>.flows.md` if it exists (see "Registry file"). Its rows decide what Mode B works on. Do not re-register flows that already have a row.
3. Trace the scoped routes into their actual feature implementations and reachable UI, following [references/flow-discovery.md](references/flow-discovery.md). Routes are entry points, not a complete flow inventory: include in-page tabs, menus, dialogs, conditional actions and state-dependent journeys.
4. Read **every** file in `e2e/tests/bdd/features/_components/`. That folder is an open-ended inventory of reusable contracts (pipeline, filter, filter-search, sort, view-detail, and whatever has been added since). Decide which ones apply to this scope before you browse.
5. Check the existing step and POM files for the module, so you know which steps already exist.
6. Use `playwright-cli` to explore accessible scoped UI for possible journeys before flow-list review, following Step 2 and the discovery reference. Reconcile product context, source candidates, UI observations, existing scenarios and registry rows. Record observed entry points, possible outcomes, inaccessible or unverified branches and reasons. Report the count for information only; choose and explain the working approach using the criteria above.

For registry work, persist discovery progress and the draft registry across manageable chunks, including remaining areas. If the browser or environment is unavailable in any approach, preserve the draft and exact blocker; do not present source-only work as complete discovery or proceed to scenario authoring. Resume browser discovery when available.

## Step 1b — Confirm the flow list (required for every mode)

After defining the flows in Step 1, present the discovered in-scope flow list with a short description of each, the total count, explicitly excluded flows and unresolved discovery gaps. Do not claim the list is exhaustive when access, source or environment limitations prevent verification. For Mode A, write the draft registry first and link it for review; for an existing registry, present the relevant rows and any proposed additions, changes or removals. For Mode D, include the affected flows and any proposed scope changes.

Ask the user explicitly: "Are these flows exactly right for this scope, with none missing and none extra?" Offer **Yes** and **No**, with optional explanation or requested changes, ordered and numbered under the recommendation rules above. Use an interactive choice tool when available and permitted; otherwise show the numbered choices. Stop and wait for an explicit confirmation. Silence, a general instruction to proceed, or approval of a previous scope or batch is not confirmation of this list. If the user requests changes, revise the list or draft registry and ask again. Discovery browsing happens before this gate. Do not write or update scenarios or proceed to detailed batch work until the user confirms the current list. Mode A remains a registry-only pass.

If exploration later reveals a missing, extra or materially changed flow, pause and present the revised flow list for explicit confirmation before continuing with the affected work. Preserve existing flow IDs and the separate scenario review gate in Step 6. Flow-list confirmation does not approve scenarios or authorize Phase 1.

## Step 2 — Explore the live app (all approaches)

Use this loop for initial discovery before flow-list confirmation and again for detailed scenario exploration after confirmation. Initial discovery identifies possible journeys; detailed exploration checks selected journeys and outcomes. Do not author scenarios before the confirmation gate.

Use `playwright-cli`, not Playwright MCP. The full command reference and the exact rules are in [references/playwright-cli-exploration.md](references/playwright-cli-exploration.md).

Core loop:

1. Open one named `playwright-cli` session for the pass, then log in using the configured credentials. Use a persistent profile only when the task requires it. Keep the session for the pass.
2. Navigate to each route in scope. Snapshot, then grep the saved snapshot file for the section you need. Do not read the full tree inline.
3. Drive interactions with `eNN` refs from the latest snapshot.
4. Use `requests` and `request <n>` to confirm the real API shape and status before you assume a mock contract.
5. Take a screenshot only as a visual sanity check. Never use it as the locator source.
6. Pull locators (roles, text, `data-testid`) from the snapshot. Do not invent them.

For each batch, check the relevant states, conditional entry points and outcomes in the discovery reference. Record inaccessible or unverified branches with their reason; absence from the current account or data is not evidence that a flow does not exist. Reconcile new discoveries with the registry and the flow-list confirmation gate.

If the UI contradicts the spec, PRD or ticket (a real product bug, not an environment quirk), do not write the scenario to match the broken behavior. See Step 4.

## Step 3 — Decide per journey

For every journey found, classify it:

| Status                | Meaning                                                                                                    | Action                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Covered**           | Existing scenarios were compared with the discovered behavior and cover the relevant journeys and variants | No change; record any unverified branches separately                     |
| **Partially covered** | A flow has scenarios but discovered journeys or meaningful variants are missing                            | Preserve IDs and use Mode D to review and extend the flow                |
| **Missing**           | No `@flow` covers this journey                                                                             | Add a scenario with a new `@flow:` tag                                   |
| **Stale**             | `@flow` exists but the title or steps no longer match                                                      | Update in place. Keep the `@ID` and `@flow` stable. Never rename a flow. |
| **Obsolete**          | `@flow` exists for a route or journey that no longer exists                                                | Retire the scenario. Leave the ID unused forever.                        |
| **Reusable match**    | The interaction matches a `_components/` contract                                                          | Add `@ref:TEN_COM_<CMP>_E2E_<NNN>`                                       |

Authoring rules:

- Register the in-scope business journeys supported by evidence, including meaningful alternate outcomes and lifecycle paths. Write E2E scenarios for consequential cross-component or business behavior; leave isolated field, visual and component checks to unit or integration tests. Do not equate every UI action or technical endpoint with a business flow.
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

`@fixme` is for real product defects. The Vitest `quarantine` tag is for flaky tests. Never use one in place of the other.

## Step 5 — Write the `.feature` file

File: `e2e/tests/bdd/features/<module>/<submodule>.feature`. One sub-module, one file. The module folder matches the route segment exactly.

Follow the header and tag order in [references/e2e-conventions.md](references/e2e-conventions.md). Scenario IDs are `TEN_<CODE>_<FLG>_E2E_NNN`, where `NNN` resets for each flow section.

## Step 6 — Output and stop

Output a summary table:

| Journey | Status | Action taken |
| ------- | ------ | ------------ |

Also report: discovery evidence and unresolved gaps, reusable components linked via `@ref`, components judged not applicable, locator gaps (missing role labels or `data-testid`), and any new product bugs with their `@ref` and evidence path. Do not represent a source-only or blocked inventory as fully explored.

Before stopping, if a registry exists, set each changed flow in this batch to `written` for review, including changes containing `@fixme`; update its `Scenarios` column with existing and new IDs and the IDs changed in this pass. Record scenario-level defects and gaps separately. Preserve discovery notes and leave every other row unchanged.

Then **stop**. Do not write step definitions or POM code. Ask the user to review the batch, or the `.feature` file if this is a single-pass run. Offer **Yes, approve** and **No**, with optional explanation or requested changes, ordered and numbered under the recommendation rules above. Use an interactive choice tool when available and permitted; otherwise show the numbered choices. Wait for an explicit response; on No, revise and request review again. Phase 1 (`write-e2e-code`) starts only after approval for that batch, and must not change scenario intent or flow IDs.

For a registry batch, end with the next step: "Batch N is written. Approve it, or tell me what to change. After approval, run `write-e2e-code` for this batch before starting the next batch." Do not start the next batch in the same session.

## Related

- Write the step definitions, POM and MSW mocks for the approved scenarios: `write-e2e-code`
- Unit and integration tests: `write-unit-tests`
- Not sure which workflow applies: `ask-qa`
