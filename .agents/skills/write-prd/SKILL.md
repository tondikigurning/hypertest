---
name: write-prd
description: Create, import, refresh or review a sub-module PRD or product requirements for the tenant app, including when E2E discovery lacks reviewed product context. Review observed behavior before treating it as validated.
---

# Write PRD (Phase −1)

Produces one reviewed Markdown PRD for one sub-module at `docs/prd/<module>/<submodule>.md`. It runs **before** `write-e2e-scenarios`: the scenario skill reads this PRD for product context instead of tracing frontend source, which this project cannot see.

This skill writes documentation only. It does not write `.feature` files, flow registries, scenario or flow IDs, steps, POMs or mocks. Those belong to `write-e2e-scenarios` and `write-e2e-code`.

References (read only when the step says so):

- [references/prd-template.md](references/prd-template.md): the exact PRD structure, front matter and requirement-line format.
- [references/exploration-checklist.md](references/exploration-checklist.md): what to check and how to record it during live exploration.
- Shared with the scenario skill: [data safety](../write-e2e-scenarios/references/data-safety.md) and [playwright-cli exploration](../write-e2e-scenarios/references/playwright-cli-exploration.md). Use their browser and safety rules. PRD exploration can precede the scenario skill's reviewed-PRD prerequisite.

## Why provenance matters

Without frontend source, every statement in the PRD comes from one of three places, and the reader must be able to tell which. Mixing them is how a PRD ends up describing a bug as intended behavior and a scenario later asserts it.

- `spec`: stated by a document or by the user (upload, pasted text, interview answer). Treat as intended behavior.
- `observed`: seen in the live app during exploration. It shows what the product does, not what it should do. Never promote it to intent on your own.
- `assumed`: filled in because the user delegated or skipped a question. State the assumption so it can be challenged.

After review each item is marked `validated` (the user confirmed it) or `needs-review` (it changed or conflicts). The review gate in Step 6 is the only place an `observed` item becomes `validated`.

## Data safety

Exploration touches live environments. Read [data-safety.md](../write-e2e-scenarios/references/data-safety.md) before any browser interaction that could change data.

- Exploration is read-only by default: open pages, dialogs and forms, but do not submit.
- Submit or mutate only with E2E-owned records named by the data-safety rules (`E2E <relevant words> <DDMMYYYYHHmm>`), and only where the rules allow it. Seed data and shared settings are read-only. If the needed E2E data cannot be found or created within scope, explain the limitation and ask for explicit, scoped permission before touching anything else. Restoring state afterwards is not permission. Without permission, skip the mutation and record it as unverified.
- Never write credentials, tokens, cookies, personal data or real customer records into the PRD or into evidence names. Credentials come from the environment's configured variables and are never echoed. When the UI shows real data, describe it generically ("a customer name") instead of copying it.

## Step 0 — Interview for scope (required)

Follow the [shared question and approval guidance](../write-e2e-scenarios/SKILL.md#step-0--interview-for-scope-required). Reuse the request, supplied documents and prior answers; investigate what can be established and ask only for consequential gaps. Preserve provenance and record unresolved assumptions. A scope answer does not approve the PRD or a data mutation.

1. **Module and sub-module**: apply the shared scope guidance. Resolve both from the user's input and available evidence first; ask one combined question only if either remains unclear.
2. **Reference material**: reuse any document or explanation already supplied in this conversation. If none has been supplied, ask once whether the user can provide a document or explanation as an exploration reference. If none is available or the user declines, continue with exploration and record the gap. Use supplied material as a source of stated requirements and a guide for exploration.
3. **Environment**: use the environment currently selected in the Automation navbar, as supplied to the agent session. Do not ask the user to choose an environment. If the selection, configuration or browser access is unavailable, report the exact blocker; do not silently choose another environment.

Live exploration with `playwright-cli` is required for every PRD create, import, review or refresh. If it is unavailable, preserve any draft and report the blocker; do not present the PRD as fully explored or ready for review until exploration is completed.

Derive the output path, sub-module code and artifact locations from available evidence. Use the configured base URL and credentials without printing their values. If configuration or access is unavailable, explain the missing prerequisite without requesting secrets in chat. State whether a PRD or `.feature` already exists.

The sub-module code (for example `STM`) prefixes requirement IDs. Reuse the code in existing scenario IDs when one is present. Otherwise propose a short code from the sub-module name, record it in the front matter, and let `write-e2e-scenarios` reuse it.

## Step 0b — Context interview (required)

Scope says where to look. Context says what matters. These six topics deliberately mirror the context interview in `write-e2e-scenarios`, so that answers recorded here are reused there instead of being asked again. Use these topics to identify consequential gaps; skip what the uploaded document, earlier answers or evidence already settle.

1. **Purpose and requirements**: what this sub-module does for the business, and where the spec lives (document path, ticket keys such as `ABC-123`, or none).
2. **Business flows**: the main functions and their release-gating (`@smoke`) happy paths. At a minimum identify each supported create, read, update and delete happy path, plus other main business functions. Recommend happy paths as smoke candidates; ask only about unresolved priorities.
3. **Expected rules**: validation rules, duplicate rules, and the exact success and error messages the UI must show.
4. **Access**: which roles can open this page and which must be denied, and which accounts are available for exploration.
5. **Data and mutations**: which records must exist first, and whether E2E-owned records may be created and deleted in this environment. Follow the data-safety rules; never assume permission.
6. **Known issues and scope**: bugs or expected-broken behavior with ticket IDs, and flows to leave out. Never invent a ticket ID; if there is none, say so and ask for one.

Record every answer with its provenance (`spec` for what the user stated, `assumed` for what you decided because they delegated). If the user skips or delegates the whole interview, continue and list each assumption in the summary. Explicit review and data-safety gates still apply.

## Step 1 — Check existing artifacts

1. Look for `docs/prd/<module>/<submodule>.md` and `<submodule>.feature`, and for sibling PRDs whose conventions you should match.
2. Choose the mode:
   - **Create**: no PRD exists.
   - **Import**: the user supplied a document. Normalize it (Step 2A), then explore (Step 2B).
   - **Review**: a matching draft exists and needs review. Check its sources, gaps and provenance, and explore the requested scope before the review gate.
   - **Refresh**: a PRD exists and the user wants it updated or re-verified, or its coverage is insufficient for the requested scenario scope. Follow "Refresh mode" below and never overwrite validated items silently.
3. If the sub-module already has scenarios, read them. Their `@flow:` categories and IDs show existing coverage; the PRD must not contradict them without recording a discrepancy.

## Step 2A — Import a supplied document

Accept PDF, DOCX, Markdown, plain text or pasted content.

1. Extract the text and structure faithfully. Check tables, images and headers; if a part cannot be read, say so rather than guessing.
2. Map the content onto the template in [references/prd-template.md](references/prd-template.md). Label every mapped statement `spec`.
3. Put content that does not fit any section under "Open questions" or the "Source notes" part of the exploration log instead of dropping or rewording it.
4. Never add behavior the document does not state. Flag contradictions and gaps inside the document as open questions.
5. Record the source in the front matter (`sources`: type `upload`, original file name, date).
6. Continue to Step 2B. Record any additional observed behavior as observed, not as a requirement.

## Step 2B — Explore the live app

Read [references/exploration-checklist.md](references/exploration-checklist.md) and the shared playwright-cli reference before the first interaction.

Use `playwright-cli`, with one named session for the pass:

1. Log in with the environment's configured credentials. Do not print them.
2. Navigate from the app's own navigation to the sub-module. Snapshot, then search the saved snapshot for the part you need instead of reading the whole tree.
3. Drive interactions with the `eNN` refs from the latest snapshot. Use `requests` and `request <n>` to record the real method, path and status of what each action calls.
4. Capture safe screenshots or traces where useful and reference an accessible path; never use screenshots as a locator source. Follow the evidence and sensitive-data rules in the exploration checklist. Do not assume an evidence-upload tool exists or commit large binaries unless the user asks.
5. Work through the checklist for this sub-module: entry points, list behavior, detail, each create/edit/delete or other action, validation, empty and error states, role-dependent and state-dependent behavior, tabs, menus and conditional actions.

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

Follow [references/prd-template.md](references/prd-template.md) exactly. Write in English, because the repository content is English.

- Give every behavioral statement a stable ID `PRD_<CODE>_<NNN>` and a provenance tag. IDs are never renumbered or reused; retire an obsolete item instead of deleting its ID.
- Quote UI messages exactly as seen and say where you saw them (screen, environment, date). They feed later scenario assertions, so paraphrasing them is a defect.
- Describe consumer-visible behavior, not implementation. Do not name internal components, files or libraries you cannot verify.
- List candidate business flows (name, description, priority, smoke candidate, provenance) as input for the flow-list confirmation in `write-e2e-scenarios`. Do not assign flow or scenario IDs here.
- Set `status: draft` in the front matter until the review gate passes.

## Step 5 — Quality checks before review

Check the PRD against this list and fix what fails:

- Every behavioral statement has an ID, a provenance tag and, if observed, an evidence reference.
- No credentials, tokens, personal data or real customer records appear anywhere.
- Messages are exact, and each states where it was observed.
- Discrepancies, candidate defects, unverified branches and open questions are listed, not buried.
- New or changed items are `needs-review`; preserve earlier validations for unchanged items. Only the review gate validates items.
- The exploration log states the environment, date, role used, and what was not covered.

## Step 6 — Review gate and stop

Present a short summary table (area, number of items by provenance, discrepancies, candidate defects, open questions) and link the PRD file or its diff for review.

Ask: "Is this PRD accurate enough to use as product context for scenarios?" Offer these choices and explain any recommendation:

1. Review item by item (recommend this when there are discrepancies, candidate defects or many unconfirmed `observed` items).
2. Approve: mark only the explicitly approved items `validated` and set `status: reviewed` (recommend this only when the user already confirmed the observed behavior during the interview and nothing conflicts).
3. Request changes.
Allow the user to explain or propose another action.

Pause until the user answers. Silence, a general "continue", or approval of an earlier scope is not approval of this gate. On "request changes", revise and ask again. On approval, update the front matter (`status`, `reviewed_by`, `reviewed_at`, using the identity the app provides) and only the approved item tags; retain unresolved items as `needs-review`. A reviewed document may contain unresolved items: stated `spec` remains attributed to its source, but conflicting requirements, unvalidated observations and assumptions do not establish intended behavior. Then stop. Resume `write-e2e-scenarios` on a subsequent turn when the requested scope has reviewed product context.

In the local Automation preview, the visible identity is `Local preview user`; use that value for `reviewed_by`. The preview does not authenticate an individual account.

End with the next step: the PRD is ready as input for `write-e2e-scenarios` for this module and sub-module, which will reuse the recorded answers, treat `validated` items as product context and treat unvalidated `observed` items as unconfirmed.

## Refresh mode

Use it when the app may have changed or the user wants to extend a reviewed PRD.

- Re-explore only the affected areas and compare with the existing items.
- Set `status: draft` while changes await review; preserve prior review metadata in the change log and clear the current review fields until approval.
- Keep IDs. Mark changed or conflicting items `needs-review` and list the change in the PRD's change log. Never overwrite a `validated` item silently.
- Add new items with new IDs. Retire removed behavior instead of deleting it.
- Update `last_explored` for the areas you actually re-checked, not for the whole PRD.
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
