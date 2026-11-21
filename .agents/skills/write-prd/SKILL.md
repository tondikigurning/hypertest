---
name: write-prd
description: Create, import, refresh or review a menu PRD or product requirements for the tenant app, including when E2E discovery lacks product context. Review observed behavior before treating it as validated.
---

# Write PRD (Phase −1)

Read the [shared workflow contract](../ask-qa/references/workflow-contract.md) for scope reuse, context gaps, environment/entity defaults, native PRD approval and review provenance. This skill owns product documentation; the contract owns shared host and review mechanics.

Produces one database PRD per menu, addressed by the virtual identifier `docs/prd/<module>/<menu>.md`. It runs **before** `write-e2e-scenarios`: the scenario skill reads this PRD for product context instead of tracing frontend source, which this project cannot see.

The PRD belongs to the real product menu and covers its child test groups and files, including cross-menu or
cross-platform journeys. When the request names a child, resolve its owning menu and create or update that same
menu PRD. Record child requirements, dependencies and gaps within its sections, preserving stable requirement IDs
and existing validated content. Record areas outside the explored or reviewed scope as unverified; do not imply the
whole menu was explored or validated. Never create a separate PRD for a child group or feature file.

That path is a virtual database PRD identifier for both hosts. Q-Rex uses its file tools and native PRD review. Terminal hosts use the [database access procedure](../ask-qa/references/prd-database-access.md) and the shared contract's explicit review procedure. Terminal hosts present the concrete proposal for review and mark only accepted requirements validated. If the host cannot load project skills by name, read this skill and its linked references directly before working.

This skill writes documentation only. It does not write `.feature` files, flow registries, scenario or flow IDs, steps, POMs or mocks. Those belong to `write-e2e-scenarios` and `write-e2e-code`.

References (read only when the step says so):

- [references/prd-template.md](references/prd-template.md): concise PRD structure and requirement-line format.
- [references/exploration-checklist.md](references/exploration-checklist.md): what to check and how to record it during live exploration.
- Shared with the scenario skill: [data safety](../write-e2e-scenarios/references/data-safety.md) and [playwright-cli exploration](../write-e2e-scenarios/references/playwright-cli-exploration.md). Use their browser and safety rules. PRD exploration can precede the scenario skill's PRD prerequisite.

## Why provenance matters

Without frontend source, every statement in the PRD comes from one of three places, and the reader must be able to tell which. Mixing them is how a PRD ends up describing a bug as intended behavior and a scenario later asserts it.

- `spec`: stated by a document or by the user (upload, pasted text, interview answer). Treat as intended behavior.
- `observed`: seen in the live app during exploration. Use evidenced behavior as a provisional PRD and scenario baseline, including when no source was provided or when it conflicts with a source, without claiming product intent has been confirmed.
- `assumed`: filled in because the user delegated or skipped a question. State the assumption so it can be challenged.

Only items accepted through the review gate carry `[validated]`; an item without it is unvalidated. Legacy `[needs-review]` also means unvalidated. Record `review_method` so automatic acceptance is distinguishable from human confirmation. Step 6 is the only place an `observed` item becomes `validated`; its provenance remains observed.

## Data safety

Exploration touches live environments. Read [data-safety.md](../write-e2e-scenarios/references/data-safety.md) before any browser interaction that could change data.

- Explore and create or mutate E2E-owned data within the requested scope under the data-safety rules and host approvals. Read seed and shared data only unless a scoped exception is approved.
- Submit or mutate E2E-owned records named by the data-safety rules (`E2E <relevant words> <DDMMYYYYHHmm>`) where those rules allow it. Seed data and shared settings are read-only unless the specific operation and record receive the applicable scoped exception under data safety. If needed E2E data cannot be found or created within scope, explain the limitation and seek that exception before touching non-E2E data. Restoring state afterwards is not permission. Without approval, skip the mutation and record it as unverified.
- Never write credentials, tokens, cookies, personal data or real customer records into the PRD or into evidence names. Credentials come from the environment's configured variables and are never echoed. When the UI shows real data, describe it generically ("a customer name") instead of copying it.

## Step 0 — Interview for scope (required)

Apply the shared contract's scope and context checklist. Reuse supplied documents and prior answers, preserve provenance, and ask only for consequential gaps. A scope answer does not approve the PRD or a data mutation.

1. **Module and menu**: apply the shared scope guidance. Resolve both from the user's input and available evidence first; ask one combined question only if either remains unclear.
2. **Reference material**: reuse any document or explanation already supplied. Neither a source document nor a business explanation is required: if none is available, proceed directly from existing artifacts and live exploration, and record that no source was provided. Use supplied material as a source of stated requirements and a guide for exploration; do not wait for a document or ask the user to explain behavior that can be discovered in the app.
3. **Environment**: use the host-specific configuration in the shared contract. Report missing access precisely without requesting secrets in chat.

Live exploration with `playwright-cli` is required for every PRD create, import, review or refresh. If it is unavailable, preserve any draft and report the blocker; do not present the PRD as fully explored or ready for review until exploration is completed.

Derive the output path, menu code and artifact locations from available evidence. Use the configured base URL and credentials without printing their values. If configuration or access is unavailable, explain the missing prerequisite without requesting secrets in chat. State whether a PRD or `.feature` already exists.

The menu code (for example `STM`) prefixes requirement IDs. Preserve an existing established code. For a new menu, inspect existing feature/PRD allocations and choose an unused three-letter uppercase code compatible with the [scenario convention](../write-e2e-scenarios/references/e2e-conventions.md#scenario-ids); record it for scenario authoring to reuse. Preserve legacy IDs rather than renumbering to enforce a new allocation rule.

## Step 0b — Context interview (required)

Use the shared contract's context checklist, reusing documents and earlier answers. Identify supported in-scope CRUD and other main business happy paths as smoke candidates; discover rules, messages and data prerequisites from sources and exploration. Ask only consequential unresolved decisions and the production restriction question specified by the contract. Record user statements as `spec`, delegated decisions as `assumed`, and missing defect tickets as unresolved. Skipping the interview does not waive review or data-safety gates. Preserve these answers for scenario discovery.

If the user provides no business information or declines to answer, continue independent discovery and draft from observed outcomes. Record unknown purpose, roles, rules and production restrictions as gaps; do not invent answers or block exploration solely for missing interview context. A production restriction with no answer leaves production eligibility unresolved under the scenario rules. If the owning menu cannot be determined from the request, selected context, existing artifacts or navigation, ask one focused scope question before choosing a target.

## Step 1 — Check existing artifacts

1. Resolve the owning product menu, then read its existing database PRD through the virtual identifier `docs/prd/<module>/<menu>.md`, plus the flat `.feature` and all files beneath its feature folder. Q-Rex uses file tools; terminal hosts follow the [database access procedure](../ask-qa/references/prd-database-access.md). Follow [test organization](../../../docs/automation/test-organization.md). Inventory known child groups and check which areas the existing PRD covers. Record requirements, cross-menu/platform dependencies, outcomes and unverified gaps in that single document; reference other database PRDs as supporting context. Reuse the existing document and its IDs for child-scoped work.
2. Choose the mode:
   - **Create**: no PRD exists. A source document or prior business explanation is optional; use live exploration and any existing artifacts to build the PRD.
   - **Import**: the user supplied a document. Normalize it (Step 2A), then explore the entire requested menu scope (Step 2B), including journeys and actions absent from the document. A source describes known behavior; it does not limit menu coverage unless the user explicitly limits the scope.
   - **Review**: a matching proposal exists and needs review. Check its sources, gaps and provenance, and explore the requested scope before the review gate.
   - **Refresh**: a PRD exists and the user wants it updated or re-verified, or its coverage is insufficient for the requested scenario scope. Follow "Refresh mode" below and never overwrite validated items silently.
3. If the menu already has scenarios, read them. Their `@flow:` categories and IDs show existing coverage; the PRD must not contradict them without recording a discrepancy.

## Step 2A — Import a supplied document

Accept PDF, DOCX, Markdown, plain text or pasted content.

1. Extract the text and structure faithfully. Check tables, images and headers where the host exposes them. Q-Rex supplies extracted PDF/DOCX text with extraction limitations, not embedded images or guaranteed table/layout structure. Treat those limitations and any pages with no extracted text as potentially missing material; do not claim they were inspected or assume every such page contains important content. Tell the user the concrete limitation and, when relevant content cannot otherwise be read, ask for an accessible text version or separately attached images of the relevant parts. Continue independent work; record unresolved source gaps rather than guessing. A PDF with no readable text must be OCR-processed before upload.
2. Map the content onto the template in [references/prd-template.md](references/prd-template.md). Label every mapped statement `spec`.
3. Preserve relevant unmapped requirements as open issues with source references; retain the original source for detail. Keep unrelated background in the source instead of copying it. Surface proposed scope or test-level exclusions for review rather than silently discarding requirements.
4. During normalization, do not attribute behavior to the document that it does not state. Flag contradictions and gaps inside the document as open questions. Separately discover and document additional in-scope behavior through live exploration.
5. Record the source briefly in the document (type, original file name and date).
6. Continue to Step 2B. Attribute additional live behavior as observed and reconcile discrepancies in Step 3.

## Step 2B — Explore the live app

Read [references/exploration-checklist.md](references/exploration-checklist.md) and the shared playwright-cli reference before the first interaction.

Use the shared [browser capability profile](../write-e2e-scenarios/references/playwright-cli-exploration.md) for the active host:

1. In Q-Rex use the managed authenticated browser; terminal hosts use one owned named session and configured credentials. Verify the target and available browser commands before interacting. Do not print secrets.
2. Navigate from the app's own navigation to the menu. Snapshot, then search the saved snapshot for the part you need instead of reading the whole tree.
3. Drive interactions with the `eNN` refs from the latest snapshot. Record method/path/status only when available from supported request evidence; Q-Rex exposes listings, not full request/response inspection.
4. Capture safe screenshots/traces only when the host supports them; Q-Rex records dated sanitized observations with available snapshot/network context instead. Reference actual evidence and record its limits under the exploration checklist. Never use screenshots as locator sources or imply an unavailable artifact was captured.
5. Inventory every in-scope function, action, journey and behavioral branch stated in all readable source documents and prior user explanations, with source references. Also discover and inventory every in-scope function and action reachable through the menu, including its tabs, menus, details, dialogs, conditional controls and linked journeys, even when absent from the sources. Work through the exploration checklist, including list behavior, create/edit/delete and other actions, validations, roles and states. Add newly revealed actions to the inventory as exploration proceeds.
6. Attempt each inventory item with `playwright-cli` through its available outcome and meaningful branches, including allowed E2E-owned mutations. For each item record what was attempted, the observed outcome and evidence, or the exact blocker and next step. Reconcile every source item and discovered action before review; a generic coverage summary is not a substitute. Track details in working notes or the exploration log, and carry consequential behavior and unresolved gaps into the PRD without copying a routine control inventory into requirements.

Continue discovering across the requested menu after all documented items have been explored. For each additional journey, action, rule or consequential branch, inspect reachable outcomes and dependencies and include supported findings in the same PRD as evidenced `[observed]` requirements. Do not stop at, discard, or omit a finding because the supplied document does not mention it. Honor an explicit narrower scope and record inaccessible areas as unverified.

For a source or PRD item that cannot be found or reached after checking available navigation, roles and data, ask the user how to access it, explaining what was tried. If a required form value cannot be determined safely from the UI, sources or E2E data conventions, ask for a suitable value or how to obtain one; do not request secrets in chat. Continue independent exploration while waiting. Record unresolved access, data or forbidden mutations as **unverified with the reason**. Absence from the current account or data is not evidence that a feature does not exist.

Continue until every in-scope source item and discovered action has been attempted or has a specific recorded blocker, pending user answer or explicit scope exclusion. Do not treat a blocked or untried item as explored. Report covered and unverified items, and never claim all possible product behavior was found: the inventory is bounded by accessible accounts, data, environment, scope and the available documents.

## Step 3 — Reconcile

Compare the sources: the spec (interview answers and document) against what you observed.

- Agreement: keep the item, label it with its strongest source, and cite the evidence.
- Observed but not in the spec, including when no spec was supplied: write consequential behavior as an `[observed]` requirement with evidence and a stable ID. Use it as the provisional actual baseline; do not present it as confirmed product intent. Include it in the PRD review proposal.
- In the spec but not observed: keep it as `spec` and add it to the exploration log as unverified.
- Conflict: by default use the actual behavior as the provisional requirement and scenario baseline, attributed as `observed` with evidence. Keep the affected requirement ID, invalidate its old review if changed, and retain the source's original wording or meaning and citation in a dedicated **Source vs actual discrepancies** section. Record actual behavior, evidence, affected requirement IDs, and that product confirmation remains open. Do not represent this default as a product decision. If the user has already established which behavior is correct, follow that decision instead.
- After product confirms the source behavior, update the PRD and affected scenarios through their existing review gates, retain IDs, and remove that resolved entry from the active discrepancies section. If product accepts actual behavior, remove the resolved entry after updating the PRD and applicable reviews. Preserve source and evidence in document history or references. Omit the section when no active discrepancies remain.
- If a discrepancy is confirmed as a product defect, record expected versus actual and a real ticket if available; ask for a missing ticket and never invent one. `write-e2e-scenarios` uses `@fixme @ref:<ticket>` for confirmed defects, rather than treating every discrepancy as a confirmed defect.

## Step 4 — Write the PRD

Follow [references/prd-template.md](references/prd-template.md) for new documents. Preserve the existing structure of a PRD during a scoped review or refresh; do not reorganize it solely to match the new template. Write in English, because the repository content is English.

- Give every behavioral statement a stable ID `PRD_<CODE>_<NNN>` and a provenance tag. IDs are never renumbered or reused; retire an obsolete item instead of deleting its ID.
- Quote assertion-relevant UI messages exactly and cite where they were stated or observed. Keep routine labels and helper text out unless explicitly required.
- Describe consumer-visible behavior, not implementation. Do not name internal components, files or libraries you cannot verify.
- For new PRDs, group requirements by business journey using the template's condition/action/outcome format. The groups supply candidate flows for `write-e2e-scenarios`; retain established priorities and consequential prerequisites, rules and integration boundaries. Do not assign flow or scenario IDs here.
- Cover the menu and its known child groups in the same document. Identify which groups or journeys were actually explored and which remain unverified. For a scoped refresh, update the affected requirements in place and retain unrelated requirements and their prior review state.

## Step 5 — Quality checks before review

Check the PRD against this list and fix what fails:

- Every behavioral statement has an ID, a provenance tag and, if observed, an evidence reference.
- Each requirement has a checkable outcome and enough actor/state/input context to derive its consequential branches. A success message alone does not establish a mutation's data outcome. Shared rules and sources are referenced rather than repeated.
- No credentials, tokens, personal data or real customer records appear anywhere.
- Assertion-relevant messages are exact and source-referenced; incidental UI inventories and implementation details are omitted unless explicitly required.
- Active source-versus-actual discrepancies have their own section with source, actual, evidence and affected IDs; candidate defects, unverified branches and open questions are listed, not buried.
- New or changed items have no `[validated]` tag; preserve earlier validations for unchanged items. Only the review gate validates items.
- The exploration log states the environment, date, role used, and what was not covered.
- Every in-scope source item and discovered function/action is accounted for in the exploration inventory, with an actual attempt and evidence or a specific blocker, pending answer or explicit exclusion and next step.
- Consequential in-scope behavior found outside the source is represented in the PRD with observed provenance and evidence, or has a specific documented gap; the source's coverage alone does not define the PRD's coverage.
- Every active in-scope requirement can feed scenario coverage, or has an explicit unresolved issue or proposed test-level boundary for review. No stated requirement disappears because it was inaccessible or inconvenient to test. Scenario mappings and run status remain in downstream review output.

## Step 6 — Review gate and stop

Present a short summary table (area, number of items by provenance, discrepancies, candidate defects, open questions) and make the exact proposed PRD available for review. Identify the active saved version separately from any unsaved proposal. In Q-Rex, direct the user to its PRD view. In a terminal host, save the complete proposal in the database with new/changed items unvalidated and prior accepted content preserved. Make the complete saved content inspectable and identify the database PRD.

Follow the shared contract's **PRD review** procedure. In Q-Rex propose the complete version through the file tool: include the intended validated items, reviewer/date and `review_method`; the native approval request displays that exact proposal and prevents saving until accepted. Keep unresolved conflicts unvalidated. Do not first collect a competing blanket approval with `ask_user`; use questions only for consequential item decisions. If rejected, preserve the draft, revise the proposal and request native review again. In automatic mode record automatic acceptance and continue under the contract rather than pausing for a manual review.

While a Q-Rex approval is pending or rejected, identify the previously saved active PRD as the scenario reference; the unsaved proposal is not active. If there was no active PRD, report that no active reference exists yet. Do not claim that the pending proposal was saved or used as scenario context.

In a terminal host, follow the shared contract's review procedure: save and present the complete draft, then wait for explicit review of that exact content. If the user requests changes, revise the draft and present the new proposal. Do not add validations before acceptance. A create request is not approval. After acceptance, apply the agreed validations and metadata; keep unresolved items unvalidated. Silence or general permission to proceed is insufficient. A document may retain unresolved items; unvalidated observations, assumptions and conflicting requirements do not establish intended behavior.

In manual mode report the accepted PRD and end the turn. Resume scenario discovery on a subsequent user turn with the same scope and prior answers. The shared contract defines reviewer identity and provenance; the local preview does not authenticate an individual account.

Explain that the active PRD is usable as input for `write-e2e-scenarios` even with unvalidated items, open questions or incomplete coverage; a document-level review status is not required. The scenario skill reuses recorded answers and may use evidenced observed behavior as the provisional baseline, including when no source is available; that does not establish product intent. PRD item validation, flow confirmation and scenario review remain separate decisions.

## Refresh mode

Use it when the app may have changed or the user wants to extend a PRD.

- Re-explore only the affected areas and compare with the existing items.
- Include prior reviewer/date/method, when known, in the review summary.
- Keep IDs. Remove `[validated]` from changed or conflicting items and identify those items and their changes in the review summary. Never overwrite a `validated` item silently.
- A change to shared prerequisites, referenced rules or source meaning also invalidates affected validations, even when the requirement line itself is unchanged.
- Add new items with new IDs. Retire removed behavior instead of deleting it.
- Update exploration notes for the areas you actually re-checked, not for the whole PRD.
- Run the review gate again, scoped to the changed items.

## Boundaries

- This skill does not write `.feature` files, registries, steps, POMs or mocks, and does not assign scenario or flow IDs.
- It does not decide product intent. When intent is unknown, it records an open question.
- It does not change other skills or project configuration.
- Running an exploration against a protected or shared environment follows the project's environment settings and the data-safety rules; when in doubt, stay read-only.

## Related

- Write the scenarios from this PRD: `write-e2e-scenarios`
- Implement approved scenarios: `write-e2e-code`
- Not sure which workflow applies: `ask-qa`
