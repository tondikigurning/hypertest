# PRD template

The exact structure for `docs/prd/<module>/<submodule>.md`. Copy the skeleton, fill every section, and keep the section order. If a section has nothing to say, keep the heading and write `None.` so the reader knows it was considered, not forgotten.

## Contents

- Front matter
- Skeleton
- Requirement line format
- Provenance and review tags
- ID rules
- Writing rules
- Section guidance
- Worked example

## Front matter

```yaml
---
module: <module as named in the app navigation>
submodule: <sub-module as named in the app navigation>
code: <SHORT_CODE>            # uppercase, 2-5 letters, prefixes every requirement ID
status: draft                 # draft | reviewed
sources:
  - type: interview           # interview | upload | exploration
    ref: <short description, or original file name for uploads>
    date: YYYY-MM-DD
last_explored:                # one entry per area actually re-checked
  - area: <area name>
    env: <environment name>
    date: YYYY-MM-DD
reviewed_by:                  # empty until the review gate passes
reviewed_at:                  # empty until the review gate passes
---
```

Rules:

- `code` reuses the prefix in existing scenario IDs when available. Otherwise propose a short code from the sub-module name and record it here so `write-e2e-scenarios` can reuse it.
- `status` stays `draft` until the review gate in Step 6 passes. Only then set `reviewed`, `reviewed_by` and `reviewed_at`. A reviewed PRD may retain `needs-review` items: stated `spec` remains attributed to its source, while conflicting requirements, unvalidated observations and assumptions do not establish intended behavior.
- `sources` lists every origin of content: each uploaded file, the interview, and each exploration pass. Never include credentials or URLs that embed tokens.
- `last_explored` is updated per area, never for the whole PRD at once, unless every area was re-checked.

## Skeleton

```markdown
# <Sub-module> PRD

## 1. Purpose

<One or two sentences: what this sub-module does for the business and who uses it.>
Requirement sources: <document path, ticket keys such as ABC-123, or "none stated">.

## 2. Scope

**In scope**

- <function or area covered>

**Out of scope**

- <function, flow or role deliberately excluded, with the reason if the user gave one>

## 3. Roles and access

| Role | Can open the page | Can do | Must be denied | Provenance |
| --- | --- | --- | --- | --- |
| <role> | yes / no | <actions> | <actions> | spec / observed / assumed |

## 4. Data and preconditions

- <records that must exist first>
- <whether E2E-owned records may be created or deleted in which environment, per the data-safety rules>

## 5. Candidate business flows

Input for the flow-list confirmation in `write-e2e-scenarios`. No flow or scenario IDs here.

| Flow | Description | Priority | Smoke candidate | Provenance |
| --- | --- | --- | --- | --- |
| <name> | <one line> | high / medium / low | yes / no | spec / observed / assumed |

## 6. Behavior

### 6.1 Entry and navigation

- **PRD_<CODE>_001** [spec][needs-review] <statement>.

### 6.2 List

### 6.3 Detail

### 6.4 Actions

#### 6.4.1 <Action name, for example Create>

### 6.5 Validation and business rules

### 6.6 Empty, loading and error states

### 6.7 Role-dependent and state-dependent behavior

## 7. UI messages

Exact text as seen, one row per message.

| Message (exact) | Trigger | Screen | Provenance | Seen (env, date) |
| --- | --- | --- | --- | --- |
| "<exact text>" | <what causes it> | <screen or dialog> | observed | <env>, YYYY-MM-DD |

## 8. Discrepancies

Spec and live behavior disagree. Do not resolve them here.

### DISC-001 <short title>

- Spec says: <fact> (source: <document or interview answer>)
- Observed: <fact> (evidence: `<evidence ref>`, <env>, YYYY-MM-DD)
- Open question: which one is right?
- Related items: PRD_<CODE>_NNN

## 9. Candidate defects

Live behavior that looks like a real product defect, not an environment quirk.

### CAND-001 <short title>

- Expected: <behavior> (source: <spec or ticket>)
- Actual: <behavior>
- Evidence: `<evidence ref>`, <env>, YYYY-MM-DD
- Ticket: <ID given by the user, or "none yet, ticket requested">
- Related items: PRD_<CODE>_NNN

## 10. Unverified

| Item | Why it could not be verified | Needed to verify |
| --- | --- | --- |
| <branch, role, state or flow> | <no such role, no data, needs a mutation not permitted, and so on> | <account, data or permission> |

## 11. Open questions

1. <question> (raised in: <section or item ID>)

## 12. Exploration log

- Environment: <name>
- Date: YYYY-MM-DD
- Account/role used: <role name only, never credentials>
- Session: <playwright-cli session name>
- Covered: <areas and actions actually exercised>
- Not covered: <areas, roles, states, mutations skipped, with reasons>
- Evidence: `<evidence ref>` - <what it shows>

### Source notes

Content from an uploaded document that did not fit any section, kept verbatim or close to it, with its origin.

## 13. Change log

| Date | Change | Items affected | By |
| --- | --- | --- | --- |
| YYYY-MM-DD | Created (draft) | all | <identity> |
```

## Requirement line format

Every behavioral statement is one bullet, so it can be grepped and referenced:

```markdown
- **PRD_STM_014** [observed][needs-review] Clicking "Add" opens a dialog titled "Add Store". _Seen:_ Store list, staging, 2026-11-09. _Evidence:_ `STM-list-01`
```

Parts, in order:

1. `**PRD_<CODE>_<NNN>**`: the stable ID.
2. `[provenance]`: one of `spec`, `observed`, `assumed`.
3. `[review]`: one of `needs-review`, `validated`.
4. The statement: one sentence, consumer-visible behavior, present tense.
5. `_Seen:_` for `observed` items: screen, environment, date.
6. `_Evidence:_` for `observed` items: an accessible safe artifact path, or a reference to a dated, sanitized factual entry in the exploration log if no artifact can safely be retained. State that limitation; do not imply an artifact exists.
7. `_Source:_` for `spec` items when it helps: document name and section, or "interview answer".
8. `_Assumption:_` for `assumed` items: what was assumed and why, so it can be challenged.
9. `_Retired:_` only for retired items: date and reason. Keep the line and the ID.

A statement states one behavior. Split compound statements ("shows X and also allows Y") into two IDs.

## Provenance and review tags

| Tag | Meaning | Treat as |
| --- | --- | --- |
| `spec` | Stated by a document or by the user | Intended behavior |
| `observed` | Seen in the live app | What the product does, not what it should do |
| `assumed` | Filled in because the user delegated or skipped a question | A guess to be challenged |

| Review | Meaning |
| --- | --- |
| `needs-review` | Not yet confirmed by the user, or changed, or in conflict |
| `validated` | Confirmed by the user at the review gate |

- New and changed items start as `needs-review`; retain validation for unchanged items during refresh.
- Only the review gate in Step 6 sets `validated`. Never set it while drafting, even when an observation matches a spec.
- An `observed` item that was `validated` stays `observed`; validation records that the user accepted it as intended, not that the provenance changed.
- When agreement between spec and observation exists, keep the item with its strongest source (`spec`) and cite the observation as evidence.

## ID rules

- Format: `PRD_<CODE>_<NNN>`, zero-padded to three digits, numbered in order of creation, not in section order.
- IDs are never renumbered, reused or deleted. Retire an obsolete item by keeping its line and adding `_Retired:_ YYYY-MM-DD, <reason>`.
- Discrepancies use `DISC-NNN` and candidate defects use `CAND-NNN`, numbered per PRD.
- Do not create flow IDs, scenario IDs or `@tag` names here. Those belong to `write-e2e-scenarios`.

## Writing rules

- Write in English.
- Describe what the consumer sees and can do. Do not name internal components, files, libraries or API internals you cannot verify. A request's method, path and status may be cited in the exploration log or as evidence, not as product behavior.
- Quote UI messages exactly as seen, including punctuation, capitalization and placeholders, and say where you saw them. Paraphrasing a message is a defect because scenarios assert on it.
- Describe real data generically ("a customer name", "an order number"). Never copy real customer records, personal data, credentials or tokens.
- Do not promote `observed` to intent. If it looks wrong, record a discrepancy or candidate defect instead.
- Do not claim exhaustiveness. The exploration log states what was and was not covered.

## Section guidance

**Purpose and scope.** Use the user's words from the context interview. Out-of-scope items come from the "known issues and scope" answer.

**Roles and access.** One row per role the user named or that you observed. A role you could not test is listed with `Can do` and `Must be denied` marked `unverified`, and also appears in section 10.

**Data and preconditions.** Record what must exist before the flows work and what the data-safety rules allow. Never assume mutation permission.

**Candidate business flows.** Cover at least each supported create, read, update and delete happy path plus other main business functions. Recommend happy paths as smoke candidates. These are candidates only; `write-e2e-scenarios` confirms and numbers them.

**Behavior.** Group by what the user does, not by DOM structure. Use sub-sections 6.4.x for each action (create, edit, delete, export, status change, and so on). Add or remove sub-sections to fit the sub-module, but keep 6.1 to 6.7 present.

**UI messages.** One row per distinct message. If the same message appears in several places, list the trigger and screen for each.

**Discrepancies and candidate defects.** Keep them separate: a discrepancy is "sources disagree", a candidate defect is "the app looks broken". A conflict can be both; then record it in both and cross-link.

**Unverified.** Absence from the current account or data is not evidence a feature does not exist. List the item and what would be needed to verify it.

**Change log.** Required in every PRD. In Refresh mode, list each changed or newly conflicting item and mark it `needs-review`.

## Worked example

```markdown
---
module: Store Management
submodule: Store List
code: STL
status: draft
sources:
  - type: interview
    ref: scope and context interview
    date: 2026-11-09
  - type: exploration
    ref: playwright-cli session prd-stl
    date: 2026-11-09
last_explored:
  - area: List, Create
    env: staging
    date: 2026-11-09
reviewed_by:
reviewed_at:
---

# Store List PRD

## 1. Purpose

Lets operations staff view, add, edit and deactivate stores.
Requirement sources: none stated.

### 6.4.1 Create

- **PRD_STL_007** [spec][needs-review] A user with the Admin role can create a store. _Source:_ interview answer.
- **PRD_STL_008** [observed][needs-review] Clicking "Add" opens a dialog titled "Add Store" with required fields Name and Code. _Seen:_ Store list, staging, 2026-11-09. _Evidence:_ `STL-create-01`
- **PRD_STL_009** [assumed][needs-review] Duplicate store codes are rejected. _Assumption:_ the user delegated the duplicate rule; common for unique identifiers.

## 7. UI messages

| Message (exact) | Trigger | Screen | Provenance | Seen (env, date) |
| --- | --- | --- | --- | --- |
| "Store created successfully" | Save with valid data | Add Store dialog | observed | staging, 2026-11-09 |
```
