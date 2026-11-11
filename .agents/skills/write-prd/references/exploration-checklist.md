# Exploration checklist

What to check, and how to record it, during live exploration (Step 2B). Read this and the shared [playwright-cli exploration](../../write-e2e-scenarios/references/playwright-cli-exploration.md) and [data safety](../../write-e2e-scenarios/references/data-safety.md) references before the first interaction.

Exploration finds possible journeys. It does not prove the PRD is complete. Every result goes into the PRD as `observed`, never as intent.

## Contents

- Before you start
- Ground rules
- Checklist by area
- How to record an observation
- Evidence
- Recording what you could not reach
- Stop and ask
- Coverage statement

## Before you start

- [ ] Scope is settled: module, sub-module, environment (Step 0).
- [ ] Available context for roles, accounts, data, mutation permission and known issues has been gathered; gaps are recorded (Step 0b).
- [ ] Credentials come from the environment's configured variables. Never print or echo them.
- [ ] You know whether E2E-owned records may be created or deleted here. If unknown, stay read-only.
- [ ] A named `playwright-cli` session exists for this pass, and you can name it in the exploration log.
- [ ] If reference material was supplied, list its statements so you can compare them with the live app.

## Ground rules

1. Read-only by default. Open pages, dialogs and forms; do not submit.
2. Mutate only E2E-owned records, named `E2E <relevant words> <DDMMYYYYHHmm>`, and only where the data-safety rules and the user's answer allow it. Seed data and shared settings are read-only.
3. If you cannot find or create the E2E data you need, stop and ask for explicit, scoped permission. Restoring state afterward is not permission.
4. Navigate from the app's own navigation, not by guessing URLs.
5. Snapshot first, then search the saved snapshot for the element you need. Do not read the whole tree.
6. Drive interactions with the `eNN` refs from the latest snapshot. Re-snapshot after any change that re-renders the page.
7. Use `requests` and `request <n>` to capture the real method, path and status of what each action calls.
8. Screenshots show what you saw. They are never a locator source.
9. When the UI shows real data, describe it generically. Do not copy real names, emails, phone numbers or order numbers into notes or evidence names.

## Checklist by area

Work through each area that exists for this sub-module. If an area does not exist, record "not present" with how you checked. If it exists but you cannot reach it, record it as unverified (see below).

### 1. Entry and navigation

- [ ] Path through the app's navigation to the sub-module (menu labels as shown).
- [ ] Page title, breadcrumbs, tabs and sub-navigation.
- [ ] Default landing state: selected tab, default filters, default sort.
- [ ] What happens on refresh and on browser back from a detail or dialog.
- [ ] Behavior for a role that should not have access (redirect, message, hidden menu item). Only if such an account is available.

### 2. List and table

- [ ] Columns, their labels, and which are sortable.
- [ ] Default sort order and page size; pagination controls and page-size options.
- [ ] Search: scope (which fields), trigger (typing, button, Enter), clear behavior, no-result state.
- [ ] Filters: each filter, its options, combination behavior, reset behavior.
- [ ] Row actions and bulk actions; which are conditional on status or role.
- [ ] Status badges or labels and what each value means as shown.
- [ ] Empty state (no data) and no-match state (search or filter with no result), including message text.
- [ ] Loading state, if visible.
- [ ] Export or download controls and what they offer (do not rely on file contents unless verified).

### 3. Detail and view

- [ ] How a record is opened (row click, link, action menu) and where it opens (page, drawer, dialog).
- [ ] Sections, fields and labels shown; read-only versus editable.
- [ ] Tabs inside the detail and what each contains.
- [ ] Related records, history or audit sections.
- [ ] State-dependent content (fields or actions that appear only for certain statuses).

### 4. Actions (create, edit, delete and others)

For each action the sub-module supports (create, edit, delete, activate/deactivate, approve/reject, import, export, duplicate, assign, and so on):

- [ ] Entry point (button, menu item, row action) and its exact label.
- [ ] Form or dialog: title, fields, labels, required markers, defaults, placeholders, field types, option lists.
- [ ] Cancel and close behavior; unsaved-changes prompts.
- [ ] Confirmation dialogs: exact title, body text and button labels.
- [ ] Submit result (only if mutation is permitted): success message, where the user lands, how the list or detail updates.
- [ ] Failure result: error message text and where it appears (field, banner, toast).
- [ ] Side effects visible in the UI (status change, counters, related lists).
- [ ] The request the action sends: method, path, status (from `requests`).

If mutation is not permitted, open the form and observe it, but do not submit. Record the submit result as unverified.

### 5. Validation and business rules

Only check validation that can be triggered without submitting data you must not create, or with E2E-owned data.

- [ ] Required fields: what happens when each is empty (inline message, disabled button, blocked submit) and the exact text.
- [ ] Format rules: length limits, allowed characters, numeric ranges, date rules, email or phone format.
- [ ] Duplicate rules: which field must be unique and the message shown.
- [ ] Dependent fields: fields that show, hide, enable or disable based on another field.
- [ ] Cross-record rules: for example, an item that cannot be deleted while in use, with the message shown.
- [ ] Rules the user stated in the interview, each confirmed or contradicted.

### 6. Messages and feedback

- [ ] Every success, error, warning and info message seen, copied exactly.
- [ ] For each: trigger, where it appears (toast, banner, inline, dialog), whether it auto-dismisses.
- [ ] Tooltips and helper text on controls.
- [ ] Differences between client-side messages and server-side messages, when distinguishable.

### 7. Empty, loading and error states

- [ ] First-use empty state and its call to action.
- [ ] Loading indicators and what the page shows while loading.
- [ ] Error state when a list or detail fails to load, if it can be reached safely. Do not break the environment to force one.
- [ ] Session timeout or unauthorized behavior, only if the user asked for it and it is safe.

### 8. Role-dependent and state-dependent behavior

- [ ] For each available role: what is visible, enabled, hidden or denied.
- [ ] For each record status: which actions are available.
- [ ] Controls that appear only under conditions (feature flags, settings, data), and what the condition appears to be. Mark the condition `observed`, not as a rule.

### 9. Cross-cutting UI

- [ ] Menus, popovers, dropdowns and their option lists.
- [ ] Keyboard behavior that matters to the flow (Enter submits, Escape closes), only if you tested it.
- [ ] Language or locale variations, only if the user raised them.
- [ ] Responsive behavior, only if in scope.

## How to record an observation

For each thing you saw, capture what you will need to write one requirement line:

| Field | Example |
| --- | --- |
| Area | Store list > Create |
| What happened | Clicking "Add" opens a dialog titled "Add Store" |
| Exact text | "Add Store", "Name", "Code", "Save" |
| Where | Store list, staging |
| Date | YYYY-MM-DD |
| Account/role | role name only |
| Request | POST, path, status (if an action) |
| Evidence ref | `STL-create-01` |

Then write the PRD line in the format from [prd-template.md](prd-template.md). Keep notes factual: what you saw, not why you think it behaves that way.

## Evidence

- Save safe evidence to a locally accessible path and refer to that path; use an available evidence tool only if one is actually provided. Do not commit large binaries to the repository unless the user asks. If evidence cannot safely be retained, add a dated, sanitized factual entry to the exploration log, reference it from the observation, and record the limitation without claiming a retained artifact.
- Name evidence `<CODE>-<area>-<NN>`, for example `STL-create-01`. Names must not contain customer names, emails, tokens or other personal data.
- One evidence item per observation that matters. Do not screenshot every step.
- Before saving a screenshot, check it for visible real customer data or secrets. If present, do not store it as evidence; describe the observation in words instead.

## Recording what you could not reach

Absence from the current account or data is not evidence that a feature does not exist. Record it in the PRD's "Unverified" section with a reason:

| Reason | How to write it |
| --- | --- |
| No account for that role | "Role <name> not available for exploration." |
| No suitable data | "No record in status <X> existed; action <Y> for that status not seen." |
| Needs a mutation not permitted | "Submit not performed; mutation not permitted in <env>." |
| Environment limitation | "Feature not reachable in <env>: <what you saw>." |
| Needs a condition you could not set | "Control appeared to depend on <condition>; not reproduced." |

Add what would be needed to verify it: an account, data, or explicit permission.

## Stop and ask

Pause the affected interaction and ask the user when:

- A step would change data you are not sure you may change.
- You need E2E data you cannot find or create within scope.
- The UI shows real customer data and you are unsure how to handle it.
- Live behavior contradicts the spec in a way that may be a real defect and you need a ticket ID. Never invent one.
- You hit a login wall, MFA or a protected environment you were not cleared to use.
- Exploration reveals a sub-module boundary different from the one agreed (for example, the page contains another sub-module's functions).

## Coverage statement

End every exploration pass with a short statement for the PRD's exploration log:

- Covered: the areas and actions you exercised, per this checklist.
- Not covered: the areas, roles, states and mutations you skipped, and why.
- Coverage is not exhaustive: it reflects the account, data and environment you used on that date.
