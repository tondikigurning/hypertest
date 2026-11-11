# E2E conventions (e2e BDD)

## Where things live

```
e2e/tests/bdd/
  features/<module>/<feature>.feature   # _components/ holds reusable master contracts
  steps/<module>/<feature>.steps.ts     # _shared/ holds cross-module steps
  pages/<module>/<PageName>.ts          # one POM per page, grouped by module
  components/<ComponentName>.ts         # flat: COMs are UI-component scoped
  fixtures/base.fixture.ts              # registers POMs/COMs, pageContext, MSW network fixture
  utils/                                # list-page constants + network helpers
```

Naming rule: folder names inside `features/`, `steps/` and `pages/` must match the route module segment exactly. Auth lives under `auth/` (maps to `_public+/`). `features/_components/` is reserved for reusable master contracts. Their steps resolve from `steps/_shared/` or module files, not `steps/_components/`, which must stay empty.

## Scenario IDs

- Sub-module and module scenarios: `TEN_<CODE>_<FLG>_E2E_<NNN>`
  - `<CODE>` is 3 characters: the sub-module code when the module has sub-modules, otherwise the module code.
  - `<FLG>` is exactly 3 characters: the abbreviated flow section.
  - `<NNN>` restarts at `001` for each `<FLG>` section.
- Component masters: `TEN_COM_<CMP>_E2E_<NNN>` (no `<FLG>`; one file per component).

Examples: `TEN_USR_LST_E2E_003` (flow `TEN_USR_LIST_FLOW`), `TEN_AUT_LOG_E2E_001` (flow `TEN_LOGIN_FLOW`), `TEN_COM_FSR_E2E_001`.

IDs are permanent. Retire, never renumber. To pick the next number, find the highest `NNN` for the same `<CODE>_<FLG>` within that feature file and add 1.

## Test data values

Two rules, decided per field:

- **Unique or findable test record** (name, subject, title, login email): `E2E <relevant words> <DDMMYYYYHHmm>` —
  `E2E profanity word 271020261108`. Relevant words, never a module code (`E2E-PRF-…`) and never an epoch
  (`Date.now()`). An updated value appends the operation (`E2E user group 271020261108 edited`).
- **Plain free text** (description, comment, remarks, body, notes): a realistic domain sentence with no `E2E` flag and
  no stamp.

Shared helper: `e2e/tests/bdd/utils/e2e-test-data.ts` (`e2eTimestamp()`, `e2eValue("<relevant words>")`),
added on first use if absent. Full rules and the helper source: [data-safety.md](data-safety.md#test-data-values).

When a workflow touches a step or POM file, align the data values in that file to these rules in the same pass.

### Module and sub-module codes

| Level      | Code  | Maps to                                        |
| ---------- | ----- | ---------------------------------------------- |
| module     | `HOM` | `_protected+` shell (home landing + launcher)  |
| sub-module | `USR` | `user-management` / `users`                    |
| sub-module | `UGP` | `user-management` / `user-groups`              |
| module     | `AUT` | `auth` (login / logout)                        |
| module     | `IAM` | `iam`                                          |
| sub-module | `ACR` | `iam` / `access-roles`                         |
| sub-module | `PMS` | `iam` / `permission-sets`                      |
| module     | `CAS` | `case-management` (and its `cases` sub-module) |
| sub-module | `CDB` | `case-management` / `dashboard`                |
| module     | `ORG` | `organization-management`                      |
| module     | `WFM` | `workforce-management`                         |
| sub-module | `WKO` | `workforce-management` / `work-orders`         |
| sub-module | `WDB` | `workforce-management` / `dashboard`           |
| module     | `AUD` | `audit-center`                                 |
| module     | `SYS` | `system-settings`                              |
| module     | `DSH` | `dashboard`                                    |

Outage management is a sub-module of `case-management` (route `case-management+/outage-management+/`). If it has no code in the table yet, propose one that does not collide with `CAS` or `CDB`, and confirm it with the user before adding it here.

### Flow tags and flow sections

Use flow tags for meaningful business journeys, not every UI control or endpoint. An existing tag or passing scenario shows coverage of the scenario, not necessarily all branches of the journey. Source-only candidates and unresolved discovery gaps belong in the flow registry; the generated flow-coverage metric uses tags in feature scenarios and does not count registry-only candidates. See [flow-discovery.md](flow-discovery.md).

Flow tag convention: `@flow:TEN_<CODE>_<ACTION>_FLOW` (sub-module and module scenarios). Use full readable action names (`LIST`, `CREATE`, `LOGIN`, `FILTER_SEARCH`). The `<FLG>` in the ID is the 3-character abbreviation of the same section.

Flow IDs are stable forever. Never rename or reuse one.

`USR` mapping:

| `@flow:`                     | `<FLG>` | Scenario ID example   | Section                      |
| ---------------------------- | ------- | --------------------- | ---------------------------- |
| `TEN_USR_LIST_FLOW`          | `LST`   | `TEN_USR_LST_E2E_001` | List, pipeline, filter, sort |
| `TEN_USR_VIEW_DETAIL_FLOW`   | `VDT`   | `TEN_USR_VDT_E2E_001` | View detail panel            |
| `TEN_USR_CREATE_FLOW`        | `CRT`   | `TEN_USR_CRT_E2E_001` | Create user wizard           |
| `TEN_USR_EDIT_FLOW`          | `EDT`   | `TEN_USR_EDT_E2E_001` | Edit user                    |
| `TEN_USR_UPDATE_ACCESS_FLOW` | `UAC`   | `TEN_USR_UAC_E2E_001` | Update application access    |
| `TEN_USR_MANAGE_GROUPS_FLOW` | `MGP`   | `TEN_USR_MGP_E2E_001` | Manage group memberships     |
| `TEN_USR_SUSPEND_FLOW`       | `SUS`   | `TEN_USR_SUS_E2E_001` | Suspend user                 |
| `TEN_USR_ACTIVATE_FLOW`      | `ACT`   | `TEN_USR_ACT_E2E_001` | Activate user                |
| `TEN_USR_REMOVE_FLOW`        | `RMV`   | `TEN_USR_RMV_E2E_001` | Remove user                  |
| `TEN_USR_RESEND_INVITE_FLOW` | `RIN`   | `TEN_USR_RIN_E2E_001` | Resend invite                |
| `TEN_USR_CANCEL_INVITE_FLOW` | `CIN`   | `TEN_USR_CIN_E2E_001` | Cancel invite                |
| `TEN_USR_UNLOCK_FLOW`        | `ULK`   | `TEN_USR_ULK_E2E_001` | Unlock account               |

Auth: `TEN_LOGIN_FLOW` → `LOG` (`TEN_AUT_LOG_E2E_001`), `TEN_LOGOUT_FLOW` → `LGO` (`TEN_AUT_LGO_E2E_001`).

Component masters, optional `@flow` (coverage only, not encoded in the ID):

| Component file          | ID prefix             | Optional `@flow:`            |
| ----------------------- | --------------------- | ---------------------------- |
| `filter-search.feature` | `TEN_COM_FSR_E2E_NNN` | `TEN_COM_FILTER_SEARCH_FLOW` |
| `filter.feature`        | `TEN_COM_FIL_E2E_NNN` | `TEN_COM_FILTER_FLOW`        |
| `pipeline.feature`      | `TEN_COM_PIP_E2E_NNN` | `TEN_COM_PIPELINE_TAB_FLOW`  |
| `sort.feature`          | `TEN_COM_SAP_E2E_NNN` | `TEN_COM_SORT_FLOW`          |
| `view-detail.feature`   | `TEN_COM_VDT_E2E_NNN` | `TEN_COM_VIEW_DETAIL_FLOW`   |

`@mock` scenarios belong in the same flow section as their happy-path counterparts.

## Feature file header and tags

```gherkin
# ID prefix: TEN_<CODE>_<FLG>_E2E_NNN  (NNN resets per flow section)
# Component masters: TEN_COM_<CMP>_E2E_NNN
#   @TEN_DSH_LST_E2E_001        scenario ID (required, stable forever)
#   @smoke / @regression        cross-cutting labels
#   @mock                       MSW interception (never on @smoke)
#   @quarantine                 flaky test (runner-specific execution policy)
#   @flow:TEN_DASHBOARD_FLOW    journey identifier for coverage
#   @priority:P0|P1|P2          optional
#   @type:positive              positive | negative | ui-interaction | edge-case
#   @ref:TEN_COM_*_E2E_*        optional reusable component link
#   @ref:HC-467                 optional issue link
#   @fixme @ref:<JIRA-ID>       known product bug (always paired)
# Data safety: use E2E-owned records; seed mutations require explicit scoped approval here.
#   Explain upstream-only data dependencies before confirmation; restore and verify wherever possible.

Feature: Dashboard Access

  @TEN_DSH_LST_E2E_001 @smoke @flow:TEN_DASHBOARD_FLOW @type:positive
  Scenario: Authenticated user lands on the dashboard after login
    Given the user is logged in
    When they navigate to the dashboard
    Then the dashboard page is visible
```

Tag order: ID → cross-cutting (`@smoke`/`@regression`) → `@mock` → `@quarantine` → `@flow` → `@type` → `@ref`.

## Tag policy

- `@smoke`: business-critical, release-gating success journeys. For sub-module E2E, the baseline includes at least the happy path of each supported, in-scope create, read, update and delete operation, unless the user explicitly excludes one. CRUD is a minimum: identify and recommend happy paths for other main business functions as smoke too, using requirements, discovery and user context. Do not invent unsupported operations or classify all error and validation variants as smoke. Document blocked or unavailable operations, and preserve the no-`@mock` and data-safety rules.
- `@regression`: non-smoke scenarios selected for E2E, including consequential negative paths or bug guards. The tag does not by itself justify adding isolated component checks to E2E.
- `@mock`: see the rule in `write-e2e-code/references/msw-mocking.md`.
- `@fixme`: real application defect, paired with `@ref:<JIRA-ID>`. Playwright marks it skipped, so a normal run cannot demonstrate recovery. To verify a fix, temporarily run the specific scenario without the skip in a controlled local selection, restore the tag if it still fails, and clear it only after an observed pass; preserve review requirements for any scenario-intent change.
- `quarantine`: the E2E scenario is unreliable. The BDD fixture currently skips `@quarantine` unless `RUN_QUARANTINE=1` is set. Check the selected runner and CI job rather than assuming quarantine is non-blocking.
- Never use `@fixme` and `quarantine` interchangeably.
