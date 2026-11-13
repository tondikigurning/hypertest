---
module: System Settings
submodule: Profanity Settings
code: PRF
status: reviewed
sources:
  - type: interview
    ref: Supplied QA scenario context and request to explore read-only; no separate product reference
    date: 2026-11-13
  - type: exploration
    ref: Authenticated browser session, sanitized log below
    date: 2026-11-13
last_explored:
  - area: Navigation, filter card, manage panel, add input, no-match search, filter confirmation cancellation
    env: STT1
    date: 2026-11-13
reviewed_by: automatic session approval (not human reviewed)
reviewed_at: 2026-11-13
---

# Profanity Settings PRD

## 1. Purpose

The page presents a global profanity filter and management of words and phrases. This description is based on the UI and remains unconfirmed as product intent. Requirement sources: no separate product specification stated; supplied QA scenarios are existing test expectations, not an authoritative product specification.

## 2. Scope

**In scope**

- Profanity settings navigation, filter status and confirmation, and word/phrase management, including candidate list and mutation journeys.

**Out of scope**

- Changes to scenarios, implementation and configuration; this is a documentation-only pass.
- Live submissions and mutations were excluded from this pass at the user's request for read-only exploration.

## 3. Roles and access

| Role | Can open the page | Can do | Must be denied | Provenance |
| --- | --- | --- | --- | --- |
| Current authenticated account; role not established | Yes, observed | Open the page and panel, search, open and cancel filter confirmation | Unverified | observed; log PRF-nav-01, PRF-list-01, PRF-toggle-01 |
| Other roles | Unverified | Unverified | Unverified | assumed; no role matrix supplied |

## 4. Data and preconditions

- An authenticated STT1 browser session was available; role and access policy remain unknown.
- Existing list records were used read-only. For future mutations, use verified E2E-owned data named according to project data-safety rules; shared settings and non-E2E records require their applicable scoped safety authorization. No mutations were performed in this pass.
- Edit and delete journeys require an appropriate custom word; the existence or ownership of any specific usable test record was not established.

## 5. Candidate business flows

These are unconfirmed candidates inferred from the supplied QA context and observations; priorities follow existing QA context and are not product-approved.

| Flow | Description | Priority | Smoke candidate | Provenance |
| --- | --- | --- | --- | --- |
| View and find words | Navigate to settings and inspect, search, filter, sort and paginate the list | high | yes | observed and assumed from QA context |
| Change filter status | Review and confirm or cancel a filter-status change | high | yes | observed and assumed from QA context |
| Add word or phrase | Create a custom entry | high | yes | assumed from QA context |
| Edit word or phrase | Change a custom entry | high | yes | assumed from QA context |
| Delete word or phrase | Confirm removal of a custom entry | high | yes | assumed from QA context |

## 6. Behavior

### 6.1 Entry and navigation

- **PRD_PRF_001** [observed][needs-review] The System Settings sidebar offers "Profanity Settings" and opens the profanity settings page. _Seen:_ STT1, 2026-11-13. _Evidence:_ PRF-nav-01.
- **PRD_PRF_002** [observed][needs-review] The page displays a "Profanity Filter" card with a status label and switch. _Seen:_ profanity settings, STT1, 2026-11-13. _Evidence:_ PRF-nav-01.
- **PRD_PRF_003** [observed][needs-review] The page displays a "Manage Word/Phrase" section with a "Manage" action. _Seen:_ profanity settings, STT1, 2026-11-13. _Evidence:_ PRF-nav-01.

### 6.2 List

- **PRD_PRF_004** [observed][needs-review] Selecting "Manage" opens a panel titled "Settings" containing a word list. _Seen:_ manage panel, STT1, 2026-11-13. _Evidence:_ PRF-list-01.
- **PRD_PRF_005** [observed][needs-review] The list has "Word/Phrase" and "Type" columns. _Seen:_ manage panel, STT1, 2026-11-13. _Evidence:_ PRF-list-01.
- **PRD_PRF_006** [observed][needs-review] The panel provides search, "Add Sort", "Add Filter", and previous and next page controls. _Seen:_ manage panel, STT1, 2026-11-13. _Evidence:_ PRF-list-01.
- **PRD_PRF_007** [observed][needs-review] Some rows labeled "Custom" display two unlabeled row buttons, while a visible row labeled "Default" has an empty action cell. _Seen:_ manage panel, STT1, 2026-11-13. _Evidence:_ PRF-list-01. The buttons' functions and the rule for all rows were not verified.
- **PRD_PRF_008** [assumed][needs-review] Search, filtering, sorting and pagination return the corresponding matching, ordered or requested entries. _Assumption:_ existing QA scenarios describe these expectations; only a no-match search was exercised.

### 6.3 Detail

None verified; a separate record detail view was not explored.

### 6.4 Actions

#### 6.4.1 Filter status

- **PRD_PRF_009** [observed][needs-review] Selecting the active filter switch opens a confirmation with "Confirm" and "Cancel" actions. _Seen:_ filter confirmation, STT1, 2026-11-13. _Evidence:_ PRF-toggle-01.
- **PRD_PRF_010** [observed][needs-review] Cancel closes that confirmation without a confirmed update. _Seen:_ filter confirmation, STT1, 2026-11-13. _Evidence:_ PRF-toggle-01. Persistence and final state were not separately checked.
- **PRD_PRF_011** [assumed][needs-review] Confirming a filter change updates the status and produces success feedback. _Assumption:_ supplied QA context; shared setting was not changed.

#### 6.4.2 Create

- **PRD_PRF_012** [observed][needs-review] The manage panel provides a "Write a Word..." input and an "Add" action. _Seen:_ manage panel, STT1, 2026-11-13. _Evidence:_ PRF-list-01.
- **PRD_PRF_013** [assumed][needs-review] Adding an acceptable entry creates a custom word and clears the input. _Assumption:_ supplied QA context; no submission was made.

#### 6.4.3 Edit

- **PRD_PRF_014** [assumed][needs-review] A custom entry can be edited and the updated value appears in the list. _Assumption:_ supplied QA context; edit was not exercised.

#### 6.4.4 Delete

- **PRD_PRF_015** [assumed][needs-review] A custom entry can be deleted after confirmation and is then absent from the list. _Assumption:_ supplied QA context; delete was not exercised.

### 6.5 Validation and business rules

- **PRD_PRF_016** [observed][needs-review] The "Add" action is disabled when the input is empty. _Seen:_ manage panel, STT1, 2026-11-13. _Evidence:_ PRF-list-01.
- **PRD_PRF_017** [observed][needs-review] After entering the sample `test@` into the add input, the "Add" action appeared enabled; no submission was made. _Seen:_ manage panel, STT1, 2026-11-13. _Evidence:_ PRF-validation-01. This single sample does not establish the complete character rule or server behavior.

### 6.6 Empty, loading and error states

- **PRD_PRF_018** [observed][needs-review] A search for a deliberately unmatched value displayed a no-data state. _Seen:_ manage panel, STT1, 2026-11-13. _Evidence:_ PRF-empty-01.
- **PRD_PRF_019** [assumed][needs-review] The word list displays loading and error states for delayed or failed requests. _Assumption:_ supplied QA context; these conditions were not induced.

### 6.7 Role-dependent and state-dependent behavior

- **PRD_PRF_020** [observed][needs-review] The filter displayed "Filter is Active" with its switch checked during this pass. _Seen:_ profanity settings, STT1, 2026-11-13. _Evidence:_ PRF-nav-01. Other states were not tested.

## 7. UI messages

| Message (exact) | Trigger | Screen | Provenance | Seen (env, date) |
| --- | --- | --- | --- | --- |
| "Are you sure you want to Disable the Profanity Filter?" | Select active filter switch | Confirmation dialog | observed, needs-review; PRF-toggle-01 | STT1, 2026-11-13 |
| "No Data Available" | Search for an unmatched value | Manage panel | observed, needs-review; PRF-empty-01 | STT1, 2026-11-13 |
| "There are no items to display at this time." | Search for an unmatched value | Manage panel | observed, needs-review; PRF-empty-01 | STT1, 2026-11-13 |

## 8. Discrepancies

No established spec-versus-observation discrepancies. The supplied QA scenario expects rejection of unspecified invalid characters; `test@` enabled Add, but it is not established that `@` is invalid, nor whether rejection occurs later. Clarify rather than treating this as a defect.

## 9. Candidate defects

None established: there is no authoritative expected character rule or other confirmed conflicting requirement.

## 10. Unverified

| Item | Why it could not be verified | Needed to verify |
| --- | --- | --- |
| Create, update, delete, success and error toasts, persistence and side effects | Read-only pass; no submission | Suitable E2E-owned records and applicable scoped safety approval |
| Confirming filter status change, inactive state, update failure | Shared setting not changed | Explicit applicable scoped shared-setting authorization and restoration plan |
| Edit/delete dialogs and cancellation; full row-action rules | Not exercised in this limited pass | Read-only exploration of suitable rows |
| Search matching, sort, filters, pagination, loading and server-error behavior | Controls visible but not exercised, except no-match search | Additional safe exploration or appropriately authorized tests |
| Valid characters, length, duplicates and exact validation errors | Only one non-submitted sample checked | Product specification and safe validation exploration |
| Allowed and denied roles | Current account role unknown; no other role tested | Role matrix and appropriate accounts |
| Refresh/back, detail, first-use empty state, state-dependent and cross-cutting behavior | Not covered in this pass | Additional read-only exploration and suitable states |

## 11. Open questions

1. What are the authoritative requirements or ticket references, and what business effects does enabling the filter have?
2. Which roles may view or modify settings, and which must be denied?
3. What are the exact allowed characters, length and duplicate rules, including whether `@` is permitted and when validation occurs? What are the exact success and error messages?
4. Are all default entries immutable, and which row actions apply to custom entries?
5. Are the candidate happy paths and priorities appropriate for release gating? Are any flows excluded or known broken, and are there ticket IDs?
6. Can E2E-owned words be safely created and deleted in STT1 in a future scoped pass, and what downstream effects could occur? The present pass was read-only.

## 12. Exploration log

- Environment: STT1.
- Date: 2026-11-13, as shown by the browser session.
- Account/role used: authenticated account; role not established. Authentication was verified by reaching the home page and navigating into System Settings.
- Session: tool-managed authenticated playwright-cli browser session; no separate session name exposed.
- Covered: navigation, filter status, opening and cancelling its confirmation, manage panel, list controls and column labels, initial Add state, one unsent input sample, no-match search.
- Not covered: all submissions and mutations, other roles, full CRUD dialogs, successful list search, sorting, filtering, pagination, error/loading injection and other branches; coverage is not exhaustive.
- Evidence: dated sanitized factual entries below; no screenshots or snapshots are retained as PRD evidence because the live view contained real data. These entries do not imply that a safe artifact was saved.
  - `PRF-nav-01`: navigated from home to System Settings and its Profanity Settings sidebar item; page showed filter card, checked active switch and Manage section.
  - `PRF-list-01`: Manage opened Settings panel with two named columns, search, sort and filter controls, pagination and Add input. Custom rows showed two unlabeled buttons; a visible default row had an empty action cell. Empty input had disabled Add.
  - `PRF-validation-01`: typed `test@` without submitting; Add appeared enabled.
  - `PRF-empty-01`: unmatched search showed the exact no-data heading and explanatory sentence in section 7.
  - `PRF-toggle-01`: clicking the active switch opened the quoted confirmation; Cancel closed it. No confirmation was submitted.
- Network observation: opening the page produced `GET /system-settings/profanity.data` HTTP 200 and opening the list produced `POST /api/v1.0/organization/tenant/profanity-words/filter` HTTP 200. No mutation endpoint was exercised.

### Source notes

The supplied existing feature describes expected list, toggle, create, edit and delete journeys, including mock error and loading cases. Those scenario assertions are QA context rather than independently confirmed product requirements. A historical shared-setting approval in that feature is not reused for this session.

## 13. Change log

| Date | Change | Items affected | By |
| --- | --- | --- | --- |
| 2026-11-13 | Created; session's automatic approval applied without human review or validating individual observations | All | Automation |
