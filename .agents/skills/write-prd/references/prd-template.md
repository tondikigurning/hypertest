# PRD template

The structure for new `docs/prd/<module>/<menu>.md` documents. Copy the skeleton and keep the main sections and review-findings subsections in order. Use `None.` for an empty section or findings subsection. Behavior subsections depend on the menu. Existing PRDs remain valid in their original structure; follow the scoped refresh rules rather than reorganizing them solely to match this template.

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
menu: <menu as named in the app navigation>
code: <SHORT_CODE>            # new allocations: exactly 3 uppercase letters; preserve existing codes/IDs
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
review_method:                # empty until accepted; manual | automatic (Q-Rex configured mode only)
---
```

Rules:

- `code` reuses an established prefix when available. For a new allocation, inspect existing feature/PRD codes and choose an unused three-letter uppercase code compatible with the scenario convention. Preserve legacy codes and IDs instead of renumbering them.
- `status` stays `draft` until Step 6's gate accepts the proposed database version. In Q-Rex the reviewed payload is proposed to the native write approval before saving; include `reviewed_by`, `reviewed_at` and `review_method` for the actual decision mode. Terminal hosts use the [database access procedure](../../ask-qa/references/prd-database-access.md), present the complete draft, and set review metadata only after explicit acceptance under the [shared review contract](../../ask-qa/references/workflow-contract.md#hosts-and-review-gates). Automatic acceptance is not human confirmation. A reviewed PRD may contain unvalidated items: stated `spec` stays attributed, while conflicts and unvalidated observations/assumptions do not establish intent.
- `sources` lists every origin of content: each uploaded file, the interview, and each exploration pass. Never include credentials or URLs that embed tokens.
- `last_explored` is updated per area, never for the whole PRD at once, unless every area was re-checked.

## Skeleton

```markdown
# <Menu> PRD

## 1. Overview and scope

<One or two sentences: what this menu does for the business and who uses it.>
Requirement sources: <document path, ticket keys such as ABC-123, or "none stated">.

**In scope**

- <menu function or child test group and its covered journeys>

**Out of scope**

- <function, child group, flow or role deliberately excluded, with the reason if the user gave one>

## 2. Roles and access

| Role | Can open the page | Can do | Must be denied | Provenance |
| --- | --- | --- | --- | --- |
| <role> | yes / no | <actions> | <actions> | spec / observed / assumed |

## 3. Data and preconditions

- <records that must exist first>
- <whether E2E-owned records may be created or deleted in which environment, per the data-safety rules>

## 4. Candidate business flows

Input for the flow-list confirmation in `write-e2e-scenarios`. No flow or scenario IDs here.

| Flow | Description | Priority | Smoke candidate | Provenance |
| --- | --- | --- | --- | --- |
| <name> | <one line> | high / medium / low | yes / no | spec / observed / assumed |

## 5. Behavior and business rules

### <Relevant activity, for example Entry and navigation>

- **PRD_<CODE>_001** [spec] <statement>.

## 6. UI messages

Exact text as seen, one row per message.

| Message (exact) | Trigger | Screen | Provenance | Seen (env, date) |
| --- | --- | --- | --- | --- |
| "<exact text>" | <what causes it> | <screen or dialog> | observed | <env>, YYYY-MM-DD |

## 7. Review findings and gaps

### Discrepancies

Spec and live behavior disagree. Do not resolve them here.

#### DISC-001 <short title>

- Spec says: <fact> (source: <document or interview answer>)
- Observed: <fact> (evidence: `<evidence ref>`, <env>, YYYY-MM-DD)
- Open question: which one is right?
- Related items: PRD_<CODE>_NNN

### Candidate defects

Live behavior that looks like a real product defect, not an environment quirk.

#### CAND-001 <short title>

- Expected: <behavior> (source: <spec or ticket>)
- Actual: <behavior>
- Evidence: `<evidence ref>`, <env>, YYYY-MM-DD
- Ticket: <ID given by the user, or "none yet, ticket requested">
- Related items: PRD_<CODE>_NNN

### Unverified

| Item | Why it could not be verified | Needed to verify |
| --- | --- | --- |
| <branch, role, state or flow> | <no such role, no data, needs a mutation not permitted, and so on> | <account, data or permission> |

### Open questions

1. <question> (raised in: <section or item ID>)

## 8. Exploration log

- Environment: <name>
- Date: YYYY-MM-DD
- Account/role used: <role name only, never credentials>
- Session: <playwright-cli session name>
- Covered: <areas and actions actually exercised>
- Not covered: <areas, roles, states, mutations skipped, with reasons>
- Evidence: `<evidence ref>` - <what it shows>

### Source notes

Content from an uploaded document that did not fit any section, kept verbatim or close to it, with its origin.

```

## Requirement line format

Every behavioral statement is one bullet, so it can be grepped and referenced:

```markdown
- **PRD_STM_014** [observed] Clicking "Add" opens a dialog titled "Add Store". _Seen:_ Store list, staging, 2026-11-09. _Evidence:_ `STM-list-01`
```

Parts, in order:

1. `**PRD_<CODE>_<NNN>**`: the stable ID.
2. `[provenance]`: one of `spec`, `observed`, `assumed`.
3. Optional `[validated]`: present only after acceptance through the review gate. Without it, the item is unvalidated.
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
| `validated` | Accepted through the review gate; `review_method` distinguishes manual confirmation from configured automatic acceptance |

- New, changed and conflicting items have no `[validated]` tag; retain validation for unchanged items during refresh. Legacy `[needs-review]` means unvalidated and may be removed when that item is edited; never treat it as acceptance.
- Only Step 6's accepted review sets saved content to `validated`. A Q-Rex native write proposal may contain its intended validations, but it is not an accepted version until the write's review gate succeeds. Matching observations/specs alone do not validate a draft.
- An `observed` item that was `validated` stays `observed`; validation records acceptance under the recorded review method, not a change to its source provenance. Automatic acceptance must not be described as a human establishing product intent.
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

**Purpose and scope.** Use the user's words from the context interview. Identify known child test groups and which journeys are covered, excluded or unverified within this one menu PRD. Out-of-scope items come from the "known issues and scope" answer. A scoped refresh must not imply every child was explored.

**Roles and access.** One row per role the user named or that you observed. A role you could not test is listed with `Can do` and `Must be denied` marked `unverified`, and also appears under Review findings and gaps > Unverified.

**Data and preconditions.** Record what must exist before the flows work and what the data-safety rules allow. Never assume mutation permission.

**Candidate business flows.** Cover at least each supported create, read, update and delete happy path plus other main business functions. Recommend happy paths as smoke candidates. These are candidates only; `write-e2e-scenarios` confirms and numbers them.

**Behavior and business rules.** Group requirements by relevant user activities and business journeys, not DOM structure. Add subsections only for areas relevant to the menu, such as navigation, list, create, edit, assignment or integration. Include applicable validations, empty/loading/error states, role/state conditions and cross-menu or platform dependencies with the activity they affect. For integration journeys record participants, prerequisites and observable outcomes owned by this menu. Use the exploration checklist for every area, without requiring its categories as headings. Summarize checked areas that are not present in the exploration log; record inaccessible or untested areas under Unverified with the reason.

**UI messages.** One row per distinct message. If the same message appears in several places, list the trigger and screen for each.

**Review findings and gaps.** Keep the four subsections distinct: a discrepancy is "sources disagree", a candidate defect is "the app looks broken", an unverified item needs evidence, and an open question needs a decision. A conflict can be both a discrepancy and a candidate defect; cross-link them instead of repeating details. Keep each finding's ID, evidence, related requirements and ticket status where applicable.

**Unverified.** Absence from the current account or data is not evidence a feature does not exist. List the item and what would be needed to verify it.

**Avoid repetition.** Put each behavioral rule in Behavior, exact messages in UI messages and factual evidence in the exploration log; cross-reference them where needed. Scope records deliberate exclusions, while Unverified records in-scope areas that could not be checked. Preserve enough detail for reviewers and scenario discovery to understand each finding without consulting unavailable evidence.

## Worked example

```markdown
---
module: Store Management
menu: Store List
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
review_method:
---

# Store List PRD

## 1. Overview and scope

Lets operations staff view, add, edit and deactivate stores.
Requirement sources: none stated.

## 5. Behavior and business rules

### Create

- **PRD_STL_007** [spec] A user with the Admin role can create a store. _Source:_ interview answer.
- **PRD_STL_008** [observed] Clicking "Add" opens a dialog titled "Add Store" with required fields Name and Code. _Seen:_ Store list, staging, 2026-11-09. _Evidence:_ `STL-create-01`
- **PRD_STL_009** [assumed] Duplicate store codes are rejected. _Assumption:_ the user delegated the duplicate rule; common for unique identifiers.

## 6. UI messages

| Message (exact) | Trigger | Screen | Provenance | Seen (env, date) |
| --- | --- | --- | --- | --- |
| "Store created successfully" | Save with valid data | Add Store dialog | observed | staging, 2026-11-09 |
```
