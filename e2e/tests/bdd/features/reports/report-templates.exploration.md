# Report Templates exploration

## Scope and sources

- Owner: Reports / Report Templates; full accessible menu scope, including linked journeys. Target: STT1; entity not selected, role unknown.
- Source: user named menu and URL; no business specification supplied. No existing `docs/prd/reports/report-templates.md`, menu feature, flow handoff, or prior exploration record found in this draft. Code allocated: RTM; allocation based on available feature and PRD paths; full catalog allocation check remains unverified.
- Context: User answered “nothing” when asked which data or operations are forbidden to mutate in production; interpreted as no specific restriction identified, not production authorization or a waiver of data safety. Intended business rules, roles, priorities and known defects remain unknown. Browser observations are provisional; no human product-intent decision has been made. Build unknown.

## Exploration inventory

| Item / branch | Source / PRD IDs | Evidence | Remaining gap / next action |
| --- | --- | --- | --- |
| Authenticated navigation and default list | User scope; PRD_RTM_001 | RTM-nav-01 | Other role and browser refresh/back behavior unverified. |
| Search, reset and no match | PRD_RTM_002 | RTM-list-01 | Search field coverage and matches not checked. |
| Filters, sort, pagination, refresh, table settings | Menu scope | RTM-list-01, RTM-scenario-01 | No-match name filtering and page navigation observed; matching/combinations, sorting, refresh and preference persistence untested; drag unavailable for column preference. |
| Load views | PRD_RTM_003 | RTM-list-01 | Loading a populated view or saving one unverified; current account had none. |
| Choose category and report type; preview | PRD_RTM_004 | RTM-create-01, RTM-scenario-01 | Workforce selection preview observed; type search and Workforce editor not tried. |
| Create editor, date filter, empty validation and cancel | PRD_RTM_005–007 | RTM-create-01 | Custom range, grouping, sorting, field search, preview data and other validation branches untested. |
| Save/create a template | Menu scope | RTM-create-01 | E2E search returned no matches; create requires field placement in a drag drop zone; managed browser has no drag action and clicking a field did not add it. No save submitted with valid input. Requires supported drag-capable exploration. |
| Template detail and configuration | PRD_RTM_008 | RTM-detail-01 | Other template types, sorting outcomes, export, edit, delete and other conditional actions not established; inspect safely with appropriate data and capability. |
| Edit/delete/other mutations | Menu scope | RTM-detail-01 | No E2E record found and creation blocked by drag capability. No seed mutation attempted; determine whether actions exist and provision owned data first. |
| Cross-menu report generation, roles and production restrictions | Menu scope | RTM-detail-01 | Detail showed case report data, but generation/handoff behavior and other roles remain unresolved. User identified no production-specific forbidden operations; data-safety authorization still applies. |

## Evidence

### RTM-nav-01 — Navigation and landing

- Observed 2026-11-25, PRD exploration, Q-Rex managed browser, STT1; role unknown. Home showed an authenticated account; Reports was opened from app navigation, then Report Templates from the Reports sidebar. The resulting page was the requested templates menu.
- The initial list showed template-name links, description, creator and creation date, search, filters, Created At sort, saved views, refresh, pagination, table settings and Create New. It initially displayed 50 rows per page; a live-updates-paused notice was visible. No account identity or actual row data retained.
- Verified navigation interaction: `getByTestId('reports-templates-menu-item')`. Requests not inspected; screenshots, traces and full request details unavailable in this host.

### RTM-list-01 — List interactions

- Observed 2026-11-25, STT1, role unknown. Entering `E2E` in search produced no rows and the exact messages “No Data Available” and “There are no items to display at this time.” Reset restored the populated list. The E2E search does not prove no owned record exists outside the search's unknown scope.
- Add Filters offered Created At, Created By, Description, Report Name and Updated By; sort showed Created At and offered the other four fields. Table preferences displayed 20/50/100/200 page sizes, four visible columns and Updated By hidden; actual changes not tried. Load Views opened a dialog stating “No available saved views found.” No saved view was created or applied.
- Verified interactions: `getByTestId('filter-search-input')`, `getByTestId('btn-clear-filters')`, `getByTestId('btn-add-filter')`, `getByTestId('btn-add-sort')`, `getByTestId('btn-load-saved-views')`, `getByTestId('table-settings-trigger')`. No network contract captured.

### RTM-create-01 — Type selection and editor

- Observed 2026-11-25, STT1, role unknown. Create New opened “Select Report Type” with Case Management and Workforce Management categories, Next disabled until a type was selected. Selecting a Case Management type displayed a field preview and enabled Next; Next opened the create editor.
- Editor showed searchable dimension/measure fields, name, description, default Last 7 days date filter, Values, group-row and group-column zones, preview and Save & Continue. Date choices included Last day, Last 7 days, Last month, Last 3 months and Custom. Empty Save & Continue showed “Name is required” and “Add at least one field to Values to continue”; no record was submitted. Cancel returned to list. Clicking a field did not populate Values; no supported drag action is exposed. An attempted fill returned a tool error and no saved mutation resulted.
- Verified interactions: `getByTestId('report-pivot-save-btn')`, `getByTestId('dropdown-date-range')`, `getByTestId('report-pivot-cancel-btn')`. No successful create, preview output or persistence verified. Request details unavailable.

### RTM-detail-01 — Existing template detail

- Observed 2026-11-25, STT1, role unknown: opening a non-E2E template link read-only led to detail showing the template and report type and a populated report table. Show Configuration expanded date filter and values. The example used Case Management data; no customer data or record identity is retained here. Search of the rendered screen did not find named Edit or Download controls, not proof such actions do not exist elsewhere.
- Verified interaction: `getByTestId('report-pivot-config-trigger')`. Other template types, report calculation correctness, user permissions, mutation and cross-menu side effects unverified.

### RTM-scenario-01 — Additional targeted read-only discovery

- Observed 2026-11-25, STT1, authenticated account, role unknown. On the populated list, Next Page moved from the initial range 1–50 to 51–100; Previous Page returned to page 1. A Report Name / Contains All filter with `E2E` displayed “No Data Available”; Reset restored the list. Filter application occurred on entry; matching and combined filter behavior remain unverified.
- In Create New, Workforce Management listed report types; selecting one displayed a field preview and enabled Next. Cancel closed the selector. No record was created. Requests, screenshots and traces not captured. Existing live-update warning and repeated console errors were visible but their cause and impact are unknown.
- Newly observed pagination, report-name filter and Workforce selection behavior is not in the current PRD; update via PRD review when appropriate. Their journey ownership is list or create respectively.

### RTM-code-01 — Implementation locator checks

- Observed 2026-11-25 on STT1, authenticated account, role unknown. Case Management type selection was repeated only to inspect editor selectors; generated `getByTestId('report-drop-zone-columns')`, `getByTestId('report-drop-zone-group-rows')`, `getByTestId('report-drop-zone-group-columns')` and the report-type text locator. Search fields generated generic `getByTestId('inputComponent')`; use its accessible textbox name from the snapshot pending collection/run validation. Cancelled the unchanged editor; no record was created.
- The pagination range appears next to Previous/Next; generated locator for the literal range embeds a volatile count. The draft POM uses the Next button's parent as a candidate range scope, not a verified reusable locator; inspect with a terminal browser before claiming implementation complete. Detail target discovery and template-to-type identity remain unverified. Requests, screenshots and traces unavailable.

### RTM-code-02 — Read-only template identity and preview

- Observed 2026-11-25, STT1, authenticated account, role unknown. Searching for the visible system template `Case Performance Report` returned a matching list link; opening it showed report type `(View Case Reporting Base)` and a table. `getByTestId('report-pivot-config-trigger')` opened a summary generated as `getByTestId('report-pivot-config-summary')` with Date Filter and Values. A later type-selector check confirmed `Case Number` appears in the selected OLA type preview. These observations do not establish test ownership or availability on other tenants. No mutation, image, trace or full request captured. Browser back via keyboard did not visibly return during exploration; candidate code navigates back to the list and repeats search instead.

### RTM-code-03 — Readiness, selector and retained search

- Observed 2026-11-26 using a separate terminal browser on the configured target; role and application build unknown. The visible list shell and disabled pagination appeared before the actual search control and Report Name header. Once those controls appeared, the list could still contain a retained search. After clearing that search and allowing the list to settle, the displayed range and enabled Next control established that more than one page was available. This does not establish the state of earlier runs or other tenants.
- The report type selector was a dialog containing the exact visible text `Select Report Type`, but that text was not exposed as a heading. Its Case Management and Next buttons were visible inside the dialog. After a no-match search, resetting and immediately searching again could leave the previous empty state visible while the reset later replaced the new input; awaiting the restored populated list avoided that observed race.
- Two read-only runs of the repaired checkout selected eight scenarios; all passed once, and seven passed in the other run. In the latter, the list shell remained present but the search control did not appear within 30 seconds. The cause and any relation to tenant availability remain unverified. Run evidence is recorded in `docs/automation/skill-evaluation/e2e-workflow-baseline-2026-11-26.md`; screenshots, traces, credentials and record identities are intentionally not copied here.

## Flow confirmation provenance

### Full menu inventory

- 2026-11-25: Q-Rex `confirm_flows` automatically accepted six flows in `reports/report-templates.feature`: LIST, SAVED_VIEWS, CREATE, VIEW_DETAIL, EDIT and DELETE under `TEN_RTM_*_FLOW`. This is automatic acceptance, not human review, scenario approval, or permission for live mutations.
- Compared against active `docs/prd/reports/report-templates.md` requirements PRD_RTM_001–008 and open issues, evidence RTM-nav-01, RTM-list-01, RTM-create-01, RTM-detail-01 and RTM-scenario-01. No pre-existing draft or local Reports feature or registry existed. All requirements map to list (001–002), saved views (003), create (004–007), detail (008). Edit/delete are PRD open-issue candidates, not observed features. Unknown lifecycle/cross-menu/role behavior remains a gap, not an invented flow. All paths and statuses are in `report-templates.flows.md`.

## Scenario handoffs

### Initial scenario batch — 2026-11-25

- Scope: `e2e/tests/bdd/features/reports/report-templates.feature`, nine new scenarios: TEN_RTM_LST_E2E_001–004, TEN_RTM_SAV_E2E_001, TEN_RTM_CRT_E2E_001–003, TEN_RTM_VDT_E2E_001. PRD `docs/prd/reports/report-templates.md`, current content requirements PRD_RTM_001–008 and open issues as read immediately before authoring. Q-Rex scenario snapshot identity is the complete current feature shown in Changes; no host digest was supplied, so exact snapshot comparison beyond current file content is not independently recorded. Recheck before implementation.
- Evidence RTM-nav-01, RTM-list-01, RTM-create-01, RTM-detail-01 and RTM-scenario-01. PRD review and flow confirmation automatic, not human. No implementation or test run; no mocks, quarantine or fixme. Reusable locators and limits are in the evidence above; creation drag locator/action unavailable. No data changes or cleanup in these scenarios; known no-match input must be established at execution, not assume E2E remains absent.

| Requirement or branch | Feature and scenario IDs | Asserted outcome / gap and next action | Coverage |
| --- | --- | --- | --- |
| PRD_RTM_001 initial list | `reports/report-templates.feature` TEN_RTM_LST_E2E_001 | List columns and pagination visible; default 50 / Created At not asserted because preferences can vary; establish clean preference setup then add an assertion. | partial |
| PRD_RTM_002 no match/reset | same feature TEN_RTM_LST_E2E_002 | Exact empty messages and populated reset, with a known no-match input. | covered |
| PRD_RTM_003 no saved views | same feature TEN_RTM_SAV_E2E_001 | Empty saved views message for an account with none. | covered |
| PRD_RTM_004 category/type selection | same feature TEN_RTM_CRT_E2E_001 | Disabled Next, selection, field preview and editor. | covered |
| PRD_RTM_005 editor configuration | same feature TEN_RTM_CRT_E2E_001 | Type, fields, Values, grouping, preview and default date; name/description and empty preview wording not asserted. Add after editor-specific assertions are warranted. | partial |
| PRD_RTM_006 empty validation | same feature TEN_RTM_CRT_E2E_002 | Both errors and unchanged editor. | covered |
| PRD_RTM_007 cancel unchanged editor | same feature TEN_RTM_CRT_E2E_003 | Return to list; no claim of persistence or dirty-state cancellation. | covered |
| PRD_RTM_008 template detail | same feature TEN_RTM_VDT_E2E_001 | Name, type, table, configuration date and Values. | covered |
| RTM-scenario-01 paging | same feature TEN_RTM_LST_E2E_003 | Range advances and returns when multiple pages exist. | covered |
| RTM-scenario-01 Report Name filter | same feature TEN_RTM_LST_E2E_004 | No matches and reset. Matching and combined filters require live evidence. | partial |
| RTM-scenario-01 Workforce category | none | Field preview and enabled Next observed but equivalent to type selection; downstream outcome unverified; investigate editor differences. | deferred |
| Create success / edit / delete | none | Valid creation blocked by unavailable drag; edit/delete not observed and no owned template found. Obtain drag-capable host and create owned data, then inspect actions and outcomes. | blocked |
| Sort, preference changes, populated views, errors, roles, integration | none | Outcomes or access/contracts unverified. Explore safely with appropriate data/roles; use reviewed mock contracts only where justified. | blocked |

- Masters examined: search may apply for a matching-result scenario, filter and sort share controls but their API/ordering contracts are not yet established; no matching master is asserted in this batch. Pipeline is not observed; view-detail master describes a panel, unlike this full-page template detail. Flow rows stay pending because supported or candidate branches remain unresolved.

### Implementation draft — 2026-11-25

- The unchanged nine-scenario feature corresponds to the scenario snapshot shown in the preceding turn; configured automatic mode permits implementation, not human review. PRD content matches the immediately prior conversation reading; there is no independently stored exact PRD or feature digest, so the handoff comparison remains incomplete. Current exact Changes snapshot must accompany terminal validation. Branch `draft/local/q-rex-workspace-c30f74e7`, base `f9ce6b8152978a35e8810d553e71bd0a836dbab0`.
- Draft POM `pages/reports/ReportTemplatesPage.ts`, steps `steps/reports/report-templates.steps.ts`, and `fixtures/base.fixture.ts` provide candidate bindings for LST_001–004, SAV_001 and CRT_001–003. LST_002/004 check the candidate no-match value first and skip if not confirmed; SAV_001 and LST_003 skip when prerequisites are absent. Pagination range scope remains unverified; empty-search readiness, selected type preview scope and locators require run validation. No scoped existing data values were modified, no mocks and no live data mutation.
- VDT_001 now has candidate bindings in `steps/reports/report-detail.steps.ts`: search for the observed system template by name, inspect its linked detail type, retain its exact link, return to the filtered list and reopen that link. This is read-only seed data, not E2E-owned data. Skip if that named reference is unavailable. Feature path registered in `e2e/playwright.bdd.config.ts`. The observed reference may not exist in other environments; no claim of generic matching. All nine require collection, types and execution validation. No isolated scenario run was attempted: the Q-Rex runner requires E2E-owned data and separate scoped authorization, neither established for this seed-dependent batch. No official result exists.
- Terminal handoff: on the complete current patch, inspect `e2e/package.json`, runner and config; with VDT and path registration drafted, run from `e2e` `pnpm bddgen`, then `pnpm exec playwright test --config=playwright.bdd.config.ts --project=bdd-chromium-authenticated --list --grep 'TEN_RTM_(LST|SAV|CRT|VDT)_E2E_'` and the repository's applicable TypeScript check. Confirm all nine exact IDs collected and all bindings resolve. Do not run the unfiltered `pnpm test:bdd`: it may sync or upload results. Live execution needs environment, ownership and scoped safety review first. Q-Rex cannot run standalone collection or type checks; no success is implied.

