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
- `observed`: seen in the live app during exploration. It shows what the product does, not what it should do. Never promote it to intent on your own.
- `assumed`: filled in because the user delegated or skipped a question. State the assumption so it can be challenged.

Only items accepted through the review gate carry `[validated]`; an item without it is unvalidated. Legacy `[needs-review]` also means unvalidated. Record `review_method` so automatic acceptance is distinguishable from human confirmation. Step 6 is the only place an `observed` item becomes `validated`; its provenance remains observed.

## Data safety

Exploration touches live environments. Read [data-safety.md](../write-e2e-scenarios/references/data-safety.md) before any browser interaction that could change data.

- Exploration is read-only by default: open pages, dialogs and forms, but do not submit.
- Submit or mutate only with E2E-owned records named by the data-safety rules (`E2E <relevant words> <DDMMYYYYHHmm>`), and only where the rules allow it. Seed data and shared settings are read-only. If the needed E2E data cannot be found or created within scope, explain the limitation and ask for explicit, scoped permission before touching anything else. Restoring state afterwards is not permission. Without permission, skip the mutation and record it as unverified.
- Never write credentials, tokens, cookies, personal data or real customer records into the PRD or into evidence names. Credentials come from the environment's configured variables and are never echoed. When the UI shows real data, describe it generically ("a customer name") instead of copying it.

## Step 0 — Interview for scope (required)

Apply the shared contract's scope and context checklist. Reuse supplied documents and prior answers, preserve provenance, and ask only for consequential gaps. A scope answer does not approve the PRD or a data mutation.

1. **Module and menu**: apply the shared scope guidance. Resolve both from the user's input and available evidence first; ask one combined question only if either remains unclear.
2. **Reference material**: reuse any document or explanation already supplied in this conversation. If none has been supplied, ask once whether the user can provide a document or explanation as an exploration reference. If none is available or the user declines, continue with exploration and record the gap. Use supplied material as a source of stated requirements and a guide for exploration.
3. **Environment**: in Q-Rex use the selected navbar environment and browser Variables. In a terminal host establish the intended environment from the request/configuration. Reuse established configuration; report missing access precisely and do not silently choose another target or request secrets in chat.

Live exploration with `playwright-cli` is required for every PRD create, import, review or refresh. If it is unavailable, preserve any draft and report the blocker; do not present the PRD as fully explored or ready for review until exploration is completed.

Derive the output path, menu code and artifact locations from available evidence. Use the configured base URL and credentials without printing their values. If configuration or access is unavailable, explain the missing prerequisite without requesting secrets in chat. State whether a PRD or `.feature` already exists.

The menu code (for example `STM`) prefixes requirement IDs. Preserve an existing established code. For a new menu, inspect existing feature/PRD allocations and choose an unused three-letter uppercase code compatible with the [scenario convention](../write-e2e-scenarios/references/e2e-conventions.md#scenario-ids); record it for scenario authoring to reuse. Preserve legacy IDs rather than renumbering to enforce a new allocation rule.

## Step 0b — Context interview (required)

Use the shared contract's six context topics as a gap checklist, reusing documents and earlier answers. Identify supported in-scope CRUD and other main business happy paths as smoke candidates; ask only about unresolved priorities, roles, rules or authorization. Record user statements as `spec`, delegated decisions as `assumed`, and missing defect tickets as unresolved. Skipping the interview does not waive review or data-safety gates. Preserve these answers for scenario discovery.

## Step 1 — Check existing artifacts

1. Resolve the owning product menu, then read its existing database PRD through the virtual identifier `docs/prd/<module>/<menu>.md`, plus the flat `.feature` and all files beneath its feature folder. Q-Rex uses file tools; terminal hosts follow the [database access procedure](../ask-qa/references/prd-database-access.md). Follow [test organization](../../../docs/automation/test-organization.md). Inventory known child groups and check which areas the existing PRD covers. Record requirements, cross-menu/platform dependencies, outcomes and unverified gaps in that single document; reference other database PRDs as supporting context. Reuse the existing document and its IDs for child-scoped work.
2. Choose the mode:
   - **Create**: no PRD exists.
   - **Import**: the user supplied a document. Normalize it (Step 2A), then explore (Step 2B).
   - **Review**: a matching proposal exists and needs review. Check its sources, gaps and provenance, and explore the requested scope before the review gate.
   - **Refresh**: a PRD exists and the user wants it updated or re-verified, or its coverage is insufficient for the requested scenario scope. Follow "Refresh mode" below and never overwrite validated items silently.
3. If the menu already has scenarios, read them. Their `@flow:` categories and IDs show existing coverage; the PRD must not contradict them without recording a discrepancy.

## Step 2A — Import a supplied document

Accept PDF, DOCX, Markdown, plain text or pasted content.

1. Extract the text and structure faithfully. Check tables, images and headers; if a part cannot be read, say so rather than guessing.
2. Map the content onto the template in [references/prd-template.md](references/prd-template.md). Label every mapped statement `spec`.
3. Put content that does not fit elsewhere under "Gaps and questions" or "Sources and exploration" instead of dropping or rewording it.
4. Never add behavior the document does not state. Flag contradictions and gaps inside the document as open questions.
5. Record the source briefly in the document (type, original file name and date).
6. Continue to Step 2B. Record any additional observed behavior as observed, not as a requirement.

## Step 2B — Explore the live app

Read [references/exploration-checklist.md](references/exploration-checklist.md) and the shared playwright-cli reference before the first interaction.

Use the shared [browser capability profile](../write-e2e-scenarios/references/playwright-cli-exploration.md) for the active host:

1. In Q-Rex use the managed authenticated browser; terminal hosts use one owned named session and configured credentials. Verify the target and available browser commands before interacting. Do not print secrets.
2. Navigate from the app's own navigation to the menu. Snapshot, then search the saved snapshot for the part you need instead of reading the whole tree.
3. Drive interactions with the `eNN` refs from the latest snapshot. Record method/path/status only when available from supported request evidence; Q-Rex exposes listings, not full request/response inspection.
4. Capture safe screenshots/traces only when the host supports them; Q-Rex records dated sanitized observations with available snapshot/network context instead. Reference actual evidence and record its limits under the exploration checklist. Never use screenshots as locator sources or imply an unavailable artifact was captured.
5. Work through the checklist for this menu: entry points, list behavior, detail, each create/edit/delete or other action, validation, empty and error states, role-dependent and state-dependent behavior, tabs, menus and conditional actions.

Record what is not reachable (a role you do not have, data that does not exist, a branch that needs a mutation you may not perform) as **unverified with the reason**. Absence from the current account or data is not evidence that a feature does not exist.

Initial exploration finds possible journeys; do not claim the PRD is exhaustive. Say what was and was not covered.

## Step 3 — Reconcile

Compare the sources: the spec (interview answers and document) against what you observed.

- Agreement: keep the item, label it with its strongest source, and cite the evidence.
- Observed but not in the spec: keep it as `observed`. Do not turn it into a requirement.
- In the spec but not observed: keep it as `spec` and add it to the exploration log as unverified.
- Conflict: record a **discrepancy** with both facts, the evidence, and the open question of which one is right. Do not resolve it yourself.
- If the live behavior contradicts a spec, PRD or ticket in a way that looks like a real product defect (not an environment quirk), list it as a **candidate defect** with expected versus actual behavior and an evidence reference. Ask for a ticket ID; never invent one. `write-e2e-scenarios` later turns confirmed defects into `@fixme @ref:<ticket>` scenarios.

## Step 4 — Write the PRD

Follow [references/prd-template.md](references/prd-template.md) for new documents. Preserve the existing structure of a PRD during a scoped review or refresh; do not reorganize it solely to match the new template. Write in English, because the repository content is English.

- Give every behavioral statement a stable ID `PRD_<CODE>_<NNN>` and a provenance tag. IDs are never renumbered or reused; retire an obsolete item instead of deleting its ID.
- Quote UI messages exactly as seen and say where you saw them (screen, environment, date). They feed later scenario assertions, so paraphrasing them is a defect.
- Describe consumer-visible behavior, not implementation. Do not name internal components, files or libraries you cannot verify.
- List candidate business flows (name, description, priority, smoke candidate, provenance) as input for the flow-list confirmation in `write-e2e-scenarios`. Do not assign flow or scenario IDs here.
- Cover the menu and its known child groups in the same document. Identify which groups or journeys were actually explored and which remain unverified. For a scoped refresh, update the affected requirements in place and retain unrelated requirements and their prior review state.

## Step 5 — Quality checks before review

Check the PRD against this list and fix what fails:

- Every behavioral statement has an ID, a provenance tag and, if observed, an evidence reference.
- No credentials, tokens, personal data or real customer records appear anywhere.
- Messages are exact, and each states where it was observed.
- Discrepancies, candidate defects, unverified branches and open questions are listed, not buried.
- New or changed items have no `[validated]` tag; preserve earlier validations for unchanged items. Only the review gate validates items.
- The exploration log states the environment, date, role used, and what was not covered.

## Step 6 — Review gate and stop

Present a short summary table (area, number of items by provenance, discrepancies, candidate defects, open questions) and make the exact proposed PRD available for review. In Q-Rex, direct the user to its PRD view. In a terminal host, save the complete proposal in the database with new/changed items unvalidated and prior accepted content preserved. Make the complete saved content inspectable and identify the database PRD.

Follow the shared contract's **PRD review** procedure. In Q-Rex propose the complete version through the file tool: include the intended validated items, reviewer/date and `review_method`; the native approval request displays that exact proposal and prevents saving until accepted. Keep unresolved conflicts unvalidated. Do not first collect a competing blanket approval with `ask_user`; use questions only for consequential item decisions. If rejected, preserve the draft, revise the proposal and request native review again. In automatic mode record automatic acceptance and continue under the contract rather than pausing for a manual review.

In a terminal host, follow the shared contract's review procedure: save and present the complete draft, then wait for explicit review of that exact content. If the user requests changes, revise the draft and present the new proposal. Do not add validations before acceptance. A create request is not approval. After acceptance, apply the agreed validations and metadata; keep unresolved items unvalidated. Silence or general permission to proceed is insufficient. A document may retain unresolved items; unvalidated observations, assumptions and conflicting requirements do not establish intended behavior.

In manual mode report the accepted PRD and end the turn. Resume scenario discovery on a subsequent user turn with the same scope and prior answers. The shared contract defines reviewer identity and provenance; the local preview does not authenticate an individual account.

End with the next step: the PRD is ready as input for `write-e2e-scenarios` for this module and menu, which will reuse the recorded answers, treat `validated` items as product context and treat unvalidated `observed` items as unconfirmed.

## Refresh mode

Use it when the app may have changed or the user wants to extend a PRD.

- Re-explore only the affected areas and compare with the existing items.
- Include prior reviewer/date/method, when known, in the review summary.
- Keep IDs. Remove `[validated]` from changed or conflicting items and identify those items and their changes in the review summary. Never overwrite a `validated` item silently.
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
