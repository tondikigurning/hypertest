# E2E data safety: E2E-owned data only

**Default rule: automation never edits, updates or deletes data it did not create.** Seed data (existing non-E2E
data) in the shared environment is read-only unless the user explicitly approves a scoped exception below.
A record being visible, or a change being restorable, is never permission to mutate it.

Read-only journeys (list, filter, search, sort, view detail, open a dialog and cancel) may use seed data freely.
Mutation journeys (create, edit, delete, suspend, activate, remove, unlock, resend/cancel invite, add/remove member,
status transitions) must target a record the E2E suite created, marked with an `E2E` prefix, unless the explicit
approval process below has been completed.

## Three-tier strategy (default, no approval needed)

```
Tier 1: search for the "E2E" prefix  -> reuse an E2E entity from a previous run, mutate it
Tier 2: create an E2E entity         -> create it, then mutate it
Tier 3: skip                         -> no E2E-owned record: skip with a clear reason
```

Never add an implicit fourth tier. There is no "fall back to the first visible row". The default remains
search → create → skip. If the data required by a scenario cannot be found among E2E-owned records and cannot
be created or otherwise provisioned within the authorized scope, the agent must recognize this limitation,
explain it and ask whether the user permits non-E2E data for that specific scenario before concluding Tier 3.
This is an explicit approval gate, not automatic fallback permission. Without approval, skip the mutation.

Apply these tiers to every entity based on capabilities verified in the current UI and reviewed PRD, not a predefined
module or entity list. Discover the supported lookup, creation or provisioning flow, required permissions and
state, and whether it is feasible within the authorized scope. Do not assume a dialog, wizard or upstream flow
exists based on the module name. If neither Tier 1 nor Tier 2 can produce an E2E-owned record, the mutation
scenario is Tier 3 and skips unless the user explicitly approves the scoped exception below.

## Exception review: required E2E data cannot be found or provisioned

Trigger this review when no usable E2E-owned record is available and the agent cannot provide the required data
itself within the authorized scope. Data supplied by another menu/module or platform, with no local create flow,
is one possible cause, not a prerequisite for the exception. Establish the actual limitation from current evidence;
do not assume it from a module name or from the absence of a search or create control alone.

1. Search for a usable E2E-owned record and verify its identity and required state. If search is unavailable,
   inspect available rows or another supported lookup; absence of a search control does not establish absence of E2E data.
2. Check whether the required record and state can be created or otherwise provisioned. Prefer a supported
   creation or upstream flow that produces E2E-owned data when feasible within the authorized scope.
   Use E2E-owned source records for upstream prerequisite actions when possible.
   Do not expand into another platform or mutate an upstream seed record without authorization.
3. If no usable E2E-owned record can be found or provisioned, ask whether the user permits non-E2E data for this
   specific scenario and propose a verified existing record under the approval process below. Explain why the
   required data cannot be provided, any upstream dependency, the intended changes and downstream effects,
   and the cleanup limits. If no suitable existing record can be identified, report that gap and ask the user
   to identify one as part of the same request; permission alone does not supply or identify a valid record.
   Ask for explicit confirmation before any non-E2E mutation, including upstream prerequisite actions.
4. While confirmation is pending, continue independent read-only work only. On refusal or without approval,
   skip the affected mutation with the dependency and approval reason recorded. Never report it as verified.

Example confirmation (replace placeholders with verified details before asking):

> `<Explain the verified reason the required E2E data cannot be found or provided in this scope.>`
> No usable E2E-owned record can be found or provisioned in this scope. May I perform `<operation>` on
> `<entity and record ID>` for scenario `<scenario ID>` in `<environment>`, with `<cleanup and verification plan>`?
> `<Disclose any notifications, external effects, or state that cannot be restored.>`
>
> 1. Yes, approve this record and operation.
> 2. No, skip this mutation.

Use the available permitted interactive question tool where possible and allow an explanation or requested change.
The approval is required even when restoration is possible.

## Test data values

Two rules. Decide per field, not per flow.

| Rule                          | When                                                                                                                   | Shape                                                  | Examples                                                                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. E2E-owned unique value** | The field is unique, or the record must be findable as test data (name, subject, title, login email)                   | `E2E <relevant words> <DDMMYYYYHHmm>`                  | `E2E profanity word 271020261108`, `E2E user group 271020261108`, `E2E knowledge article 271020261108`, `e2e.user.271020261108@partner.convergeict.com` |
| **B. Plain free text**        | No uniqueness is needed and the value does not identify test data (description, comment, remarks, body/content, notes) | A realistic domain sentence, with no flag and no stamp | `Access role for the customer support team.`, `Please update the examples in the second section before resubmitting.`                                   |

Never acceptable anywhere:

- `Date.now()` or any epoch in place of the stamp (`E2E-PRF-1793011205025`).
- A module code or a random token as the "relevant words" part (`E2E-PRF-…`, `E2E-UGP-…`, a UUID).
- The `E2E` flag or a timestamp on a plain free-text field (`E2E automated description 271020261108`).

The stamp is `DDMMYYYYHHmm` in local time (`271020261108` = 27-10-2026 11:08). Keep the whole value inside the field's
`maxLength` and allowed-character rules, and keep the `E2E` token at the start so search-first reuse by the `E2E`
keyword still matches. An update/copy value appends the operation: `E2E user group 271020261108 edited`.

### Helper

Add `e2e/tests/bdd/utils/e2e-test-data.ts` on first use when it does not exist:

```ts
const pad = (value: number): string => String(value).padStart(2, "0");

/** Local-time stamp DDMMYYYYHHmm (e.g. 271020261108). */
export function e2eTimestamp(date: Date = new Date()): string {
  return [
    pad(date.getDate()),
    pad(date.getMonth() + 1),
    date.getFullYear(),
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
}

/** `E2E <label> <stamp>` — e.g. e2eValue("profanity word") -> "E2E profanity word 271020261108". */
export function e2eValue(label: string, date: Date = new Date()): string {
  return `E2E ${label} ${e2eTimestamp(date)}`;
}
```

Usage:

```ts
import { e2eTimestamp, e2eValue } from "../../utils/e2e-test-data";

const word = e2eValue("profanity word"); // E2E profanity word 271020261108
const renamed = `${e2eValue("user group")} edited`; // E2E user group 271020261108 edited
const description = "Permission set for the customer support team."; // plain free text
```

### Align existing code in scope

These rules are a convention, not a one-off. Phase 0 only reports the scoped files that break them. Then, whenever the
phase that writes code (Phase 1, `write-e2e-code`) opens a step or POM file, it updates the violating values in that file
in the same pass and lists the changed files in the summary. Do not sweep modules outside the current scope.

## Explicit approval for non-E2E data

A mutation may touch a non-E2E record **only** when the user explicitly approves the specific record and operation.
During scenario or code work, record the approval in the `.feature` header or applicable flow section before the
live mutation or authoring the affected scenario or implementation. During PRD-only exploration, record the scoped
approval in the conversation before mutation; record only a sanitized summary in the PRD exploration log. If the
scenario is later authored, its current-session approval must also be recorded in the `.feature`. Approval may be
requested when the dependency is discovered; it is not limited to the initial interview.

During Phase 0 (`write-e2e-scenarios`) or Phase 1 (`write-e2e-code`), explain these facts, then ask one focused
confirmation question with explicit **Yes** and **No** choices:

1. The environment, scenario, entity type and exact record identity the scenario would mutate.
2. Why no E2E-owned record can be used, including unavailable lookup/create flows and any upstream dependency.
3. Exactly what mutation and cleanup will happen, including downstream effects. Capture the original state,
   restore it and verify restoration, including after failure, wherever possible. Disclose anything that cannot
   be undone (for example notifications or external transitions) and obtain approval for those effects too.

Rules for the answer:

- **Default is no.** Silence, a preselected choice, "you decide", or an ambiguous answer is not approval. Keep a
  pending confirmation unresolved until the user responds; do not perform dependent mutations while waiting.
- Approval must be explicit and scoped to the environment, scenario, exact record and operation. Never treat it
  as blanket permission or fall back to another record if the approved one is unavailable.
- Approval never carries over to another scenario, another record, another feature or a later session.
- Without recorded approval in the file, the step must not target seed data; make it skip instead.

Record the approval in the feature file header (or the flow section it applies to):

```gherkin
# seed-data-mutation-approved: <YYYY-MM-DD> <approver> — <environment> — <scenario ID> — <entity/record ID> — <mutation> — <reason> — <cleanup and irreversible effects>
```

The comment records authorization; it does not enforce it at runtime. Before each live execution, ensure that
approval still applies in the current session and guard the exact target. A historical approval comment is not
permission for later sessions or unattended runs; skip when current scoped authorization is absent.

## Step pattern

Search first. Inspect the actual result rows and establish a specific E2E-owned record's identity. If none exists, create one only when a supported create flow is available within scope, then locate and verify the created record. If the required E2E data cannot be found or provisioned, explain the limitation and ask for scoped permission to use non-E2E data under the exception review above. Without approval, skip with a clear reason. Keep the exact E2E-owned or explicitly approved record identity through the flow and verify it still identifies the target immediately before each mutation; do not fall back to an arbitrary first row.

Inspect the implementation of any reused search helper: a successful search interaction, retained filter or
truthy result does not necessarily establish record existence or ownership. Inspect the actual scoped row and
its identifying field; use a dedicated verified locator or helper when needed. A generic text match elsewhere
in the response does not establish ownership of a row.

## When the required state comes from seed data

Pipeline-tab and membership flows (suspend → Suspended tab, activate → Active tab, unlock, remove a group member) may
**read** seed data, but must not mutate it. Reach the state with an E2E-owned record instead (for example create an
E2E user, then suspend it to reach the Suspended tab). If the required E2E record or state cannot be provided,
ask for scoped permission under the exception review above; without approval, skip.

## When not to use this pattern

- Values that cannot be chosen freely and cannot be found in the environment (for example a valid ID from another
  system). If real data cannot be provisioned and no scoped exception is approved, use `@mock` with a success
  handler only where the reviewed scenario and mock policy permit; otherwise skip. A mock does not verify the
  real upstream integration. See `write-e2e-code/references/msw-mocking.md`.
- Read-only journeys. They do not mutate anything, so seed data is fine and no approval is needed.

Prefer dynamic "first available" selection for read-only reference choices, where the scenario permits it,
before resorting to `@mock`. Selecting a reference value does not authorize mutation of that referenced record.
The mutation target must still be E2E-owned or explicitly approved.
