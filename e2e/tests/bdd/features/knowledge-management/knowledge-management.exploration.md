# Knowledge Management exploration

## Scope and sources

- Owner: knowledge-management/knowledge-management; full menu pass including owned cross-menu outcomes. AI generation, chatbot logic other than content-serving API, and case functions beyond article linking are excluded by the PRD.
- Target: STT1, Converge; authenticated role unknown. Production mutation restrictions were previously asked and remain unanswered; production eligibility of mutations is unknown.
- Active PRD: `docs/prd/knowledge-management/knowledge-management.md`, SHA-256 UTF-8 `8d63e5ac8fbd9ccc28717e07b5182349dd396d642b03fa946e7a47ddf4641a70`. PRD-phase detailed exploration record referenced by the PRD is absent from this checkout. The PRD retains sanitized factual observations; reuse only the detail it actually states. Existing menu features, registry, steps and POMs were not found in this checkout. UI build unknown.

## Exploration inventory

| Item / branch | Source / PRD IDs | Evidence | Remaining gap / next action |
| --- | --- | --- | --- |
| Create draft, validation, category dependency | PRD_KMG_001, 004–006, 014, 018 | PRD KM-create-01, KM-lifecycle-01; E2 | Primary text create and observed required-field/entity branches are authored; media, duplicate title, unsaved populated exit and role permissions need evidence. |
| Update, review, revision and version publication | PRD_KMG_001–003, 007, 018 | PRD KM-lifecycle-01, KM-review-version-01; E4 | Draft submission, cancel, approval cancel, revision request, edit-after-feedback, resubmission and version publication are authored; role separation and Superseded versus Archived remain unresolved. |
| Archive and restore | PRD_KMG_012, 026 | PRD KM-archive-01; E4 | Confirmed archive/restore plus cancellation outcomes are authored; consumer search effects and permissions remain unverified. |
| List, detail, filters and search | PRD_KMG_008–009, 011, 015 | PRD KM-entry-01, KM-filter-01, KM-category-filter-01; E1, E3 | Status tabs, version history/preview, exact search, no-result, status/category filters are authored; suggestions and active-only agent search remain unverified. |
| Portal, mobile, multilingual, media consumption | PRD_KMG_010, 013, 020 | Source only; E3 management Article tab | Published content can be read in the authenticated management detail UI; customer/agent portals, role access, mobile, languages and media require suitable access and evidence. |
| Case linking and escalation guidance | PRD_KMG_016–017, 019 | Source; PRD notes prior empty Case Knowledge state | Find accessible case with suitable safe data; guidance exceptions unknown. |
| Roles and management of categories, tags, settings | PRD_KMG_009, 018–022 | Source only; E3 category filter | Category filtering is authored; tag browsing/admin, settings and role-specific UI/search/API rules need evidence from suitable accounts. |
| Reporting and external distribution | PRD_KMG_023–024 | Source only | Reporting and platform access, API contracts and authentication unknown. |
| Capacity, performance, backup and restore | PRD_KMG_025 | Source only | Operational evidence and quantitative targets needed; not represented as a UI E2E flow. |

## Evidence

### E1 — Article list and filter entry

- Observed: 2026-11-24, terminal playwright-cli, STT1 authenticated account, role unknown.
- Navigation from home opened Knowledge Management / Articles. The list showed Published, All, Draft, Pending Approval, Need Revision, Superseded and Archived tabs, Create, search, Add Filters and sort controls. An E2E article's version 2 appeared Published and Active and version 1 Superseded in displayed rows after Reset. The Add Filters dialog offered Status; selecting it did not establish filtered results.
- Locators observed from CLI-generated actions: `getByTestId('btn-clear-filters')`, `getByTestId('btn-add-filter')`, `getByTestId('filter-option-article_status')`; applicability is this menu and observed state. No outcome assertion was verified for the filter selection.
- Requests: not inspected. No screenshot or trace captured. Continue with an applied filter and safe assertions; distinguish list presentation from search or portal access.

### E2 — Create wizard entry and cancel

- Observed: 2026-11-24, terminal playwright-cli, STT1 authenticated account, role unknown; read-only form inspection, no fields submitted.
- The Create action opened a four-step wizard: Details, Content, Summary and Completed. Details required Article Name, Entity, CTS Category, Description and Visibility. CTS Category was disabled before selecting an entity. Visibility offered Internal and External. Selecting Cancel from the empty Details step returned to the article list without submitting the form.
- Verified interaction: `getByTestId('btn_cancelCreateKnowledgeManagement')` from the current create wizard closed it; current-route outcome returned to the article list. No data mutation was performed.
- Requests: not inspected. No screenshot or trace captured. Entity-dependent enablement beyond the PRD-observed Converge choice remains as recorded in PRD_KMG_014.

### E3 — Read-only search, filters, version detail and published content

- Observed: 2026-11-24, terminal playwright-cli, STT1 authenticated account, role unknown; only E2E-owned article records were searched or opened.
- Searching a known E2E title returned its matching article and versions. A deliberately unmatched title showed “No Data Available” with no article rows.
- On All, applying Status = Published removed the observed Superseded result from the filtered list. Applying Category = Complaint showed matching articles whose displayed category paths were under Complaint, including the E2E-owned article path.
- The article detail exposed Details, Article and Revision tabs. Revision listed version 2 as Active and version 1; selecting version 1 opened a preview with its saved earlier content. The Article tab displayed the saved content of the published E2E-owned article.
- Requests: not inspected. No screenshot or trace captured. Search suggestion behavior, consumer-portal visibility, role-specific results, sort ordering and pagination were not established. The Article tab was in the authenticated Knowledge Management management UI; it does not verify agent/customer portal access.

### E4 — E2E-owned review, revision, update and archive decisions

- Observed: 2026-11-24, terminal playwright-cli, STT1 authenticated account, role unknown. A uniquely named E2E-owned article was created for this branch exploration; no seed article was mutated.
- Canceling Submit For Approval left a Draft article unchanged. Confirming it moved the article to Pending Approval. Canceling the Approval Article decision left it Pending Approval.
- Saving Request Revision with a comment moved the row to Needs Revision. The comment appeared in the article's Edit comments panel. The status tab itself is labeled Need Revision.
- Editing the article body after the revision request saved the new content; the article remained Needs Revision. Confirming Submit For Approval again moved it to Pending Approval. Saving the immediate approval decision then moved it to Published with an Active badge.
- Canceling Archive left a Published article unchanged. Confirming Archive moved the E2E-owned article to Archived; its row menu offered Unarchive. Canceling Unarchive left it Archived. The article was left archived as cleanup.
- The row action menu also showed Delete on an E2E-owned article. Delete was not selected; the active PRD does not describe this action and no delete behavior was verified.
- Requests: not inspected. No screenshot or trace captured. The authenticated role is unknown, so these observations do not prove role separation or access policy. Production eligibility remains unknown while the production restriction question is unanswered.
### E5 — retained list criteria and draft cleanup

- Observed: 2026-11-25, terminal `playwright-cli`, STT1 authenticated account, role unknown. The Articles page retained a prior search term and an applied category filter after opening the list. The Reset control cleared both; an E2E-owned version 1 Draft row then appeared in the unfiltered list. Searching that exact title showed its Draft row.
- The Draft row's action menu offered Archive. Archiving the exact E2E-owned article created by the interrupted diagnostic run returned the success message. No seed article was changed. A targeted direct Playwright BDD run of `TEN_KMG_CRT_E2E_001` later passed with the list reset/search wait and Draft cleanup changes; its E2E article was cleaned up by the fixture. This run did not invoke the evidence-upload wrapper.
- Requests: the CLI request list showed successful Knowledge article-list responses, but no request body or screenshot was retained. The displayed list state is the evidence for the retained criteria and matching Draft row.

## Flow confirmation provenance

### Full Knowledge Management inventory — confirmed

- Decision: user explicitly confirmed the complete 14-flow inventory and the three proposed feature paths in chat on 2026-11-24 (“aku setuju, lanjutkan!”). The confirmation follows the displayed IDs, outcomes, paths, evidence levels, PRD mapping, exclusions and gaps. Proposed code KMG follows the active PRD. This confirms the inventory only; it is not scenario approval or production mutation authorization.
- Source comparison before decision: active PRD SHA-256 `8d63e5ac8fbd9ccc28717e07b5182349dd396d642b03fa946e7a47ddf4641a70`; proposed `knowledge-management/knowledge-management/functional.feature`, `integration.feature`, and `access-and-distribution.feature` were absent. The confirmed list names three planned feature paths. Before this expanded batch, only `functional.feature` had authored scenarios; the other two planned files remain absent pending suitable live evidence. The expanded batch adds scenarios to the already-confirmed ORGANIZE and CONSUME flows; it does not add or remove a flow. The current feature snapshot and review digest are recorded below.

## Scenario handoffs

### Batch 1 — initial article authoring, lifecycle and list journeys (superseded)

- Scope and status: this initial set contained `TEN_KMG_CRT_E2E_001`–`005`, `TEN_KMG_REV_E2E_001`–`002`, `TEN_KMG_EDT_E2E_001`, `TEN_KMG_ARC_E2E_001`–`002`, `TEN_KMG_LST_E2E_001`–`002`, and `TEN_KMG_SFI_E2E_001`. It was pending manual review and received no approval before the feature file was expanded. Its digest identifies the former 13-scenario snapshot only; review the current expanded snapshot below. Owning PRD SHA-256 remains `8d63e5ac8fbd9ccc28717e07b5182349dd396d642b03fa946e7a47ddf4641a70`.
- Shared masters reviewed: `_components/filter-search.feature`, `filter.feature`, `pipeline.feature`, `sort.feature`, and `view-detail.feature`. None is referenced by this batch: the authored checks cover the menu wizard, lifecycle states and article detail route; the search/filter scenario asserts control availability only and does not implement a shared filter contract. Reassess after applied filter outcomes and bindings are explored.
- Evidence: reusable prior PRD observations `KM-create-01`, `KM-lifecycle-01`, `KM-review-version-01`, `KM-archive-01`, `KM-entry-01`, `KM-detail-01`; current STT1 observations `E1` (list and filter entry) and `E2` (create wizard and cancel). Authenticated role unknown. Requests, screenshot and trace unavailable/not captured.
- Data and eligibility: every mutation targets an E2E-owned article. The production restriction question is unresolved; mutation scenario production eligibility remains unknown and those scenarios must not run against production until resolved. No non-E2E mutation is authorized. Use the shared E2E unique-value helper in implementation and verify exact ownership before each mutation.
- Coverage mapping:

| PRD requirement / branch | Exact feature path + scenario identities | Asserted outcome / gap | Coverage |
| --- | --- | --- | --- |
| PRD_KMG_001 create text article | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_001` | New article appears version 1 Draft and saved content appears in detail; media and attachments unverified. | partial |
| PRD_KMG_001 update/publish content | `knowledge-management/functional.feature` — `TEN_KMG_EDT_E2E_001` | Version 2 appears Published and Active; prior version appears Superseded. Editing fields and attachments unverified. | partial |
| PRD_KMG_002 review before publication | `knowledge-management/functional.feature` — `TEN_KMG_REV_E2E_001`, `TEN_KMG_REV_E2E_002` | Draft moves to Pending Approval; immediate approval publishes Active. Revision request and role separation unverified. | partial |
| PRD_KMG_003 previous version archival | `knowledge-management/functional.feature` — `TEN_KMG_EDT_E2E_001` | As observed, old version is Superseded. Equivalence to Archived is unresolved; preserve source/actual discrepancy. | partial |
| PRD_KMG_004 create and detail | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_001`, `TEN_KMG_LST_E2E_002` | Version 1 Draft and saved content in Article detail. | covered |
| PRD_KMG_005 required Details fields | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_002` | Empty Details remains open and shows all five recorded required-field messages. | covered |
| PRD_KMG_006 required article content | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_003` | Empty Content remains open with the recorded validation message. | covered |
| PRD_KMG_007 submit/approve outcomes | `knowledge-management/functional.feature` — `TEN_KMG_REV_E2E_001`, `TEN_KMG_REV_E2E_002` | Pending Approval and Published/Active outcomes asserted. Alternate revision request remains unverified. | partial |
| PRD_KMG_008 status list | `knowledge-management/functional.feature` — `TEN_KMG_LST_E2E_001` | All seven status views are offered; per-tab row semantics beyond observed records are not asserted. | partial |
| PRD_KMG_009 categories and tags | none | Current UI showed a category field; browsing/tag navigation and tag administration are not evidenced. Next: discover live category/tag navigation. | blocked |
| PRD_KMG_010 portals, languages, responsive access | none | No agent/customer portal or mobile/language outcome observed. Next: obtain suitable portal access and test data. | blocked |
| PRD_KMG_011 search suggestions and active-only agent results | `knowledge-management/functional.feature` — `TEN_KMG_SFI_E2E_001` | Search field presence asserted; search results, suggestions and agent-only active results not asserted. Next: safe read-only search with known E2E article. | partial |
| PRD_KMG_012 archived/inactive exclusion from consumer search | `knowledge-management/functional.feature` — `TEN_KMG_ARC_E2E_001`–`002` | Management list transitions asserted; consumer search/navigation exclusion not established. Next: test with suitable role/portal. | partial |
| PRD_KMG_013 guides, FAQ and multimedia self-service | none | Content forms and customer consumption unverified. Next: suitable portal access and media-owned test content. | blocked |
| PRD_KMG_014 entity enables category | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_004` | Category disabled before entity selection and enabled after selecting Converge. | covered |
| PRD_KMG_015 filters | `knowledge-management/functional.feature` — `TEN_KMG_SFI_E2E_001` | Status filter choice and search field are present; applied filter behavior is not asserted. Next: safely apply status filter and verify matching rows. | partial |
| PRD_KMG_016 case article linking | none | PRD notes prior Case Knowledge empty state; no article link outcome observed. Next: accessible case and suitable article. | blocked |
| PRD_KMG_017 escalation turnaround guidance | none | Guidance and exception rules not observed or specified. Next: identify escalation content and source of maintained guidance. | blocked |
| PRD_KMG_018 admin/author permissions and content management | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_001`, `TEN_KMG_REV_E2E_001`–`002` | Create and review actions observed on one unknown-role account; admin settings and permission boundaries unknown. Next: role-specific access. | partial |
| PRD_KMG_019 agent read/link and no-edit access | none | Agent account behavior and case linking unverified. Next: agent role access. | blocked |
| PRD_KMG_020 customer public-only access | none | Customer portal visibility unverified. Next: customer account/portal access. | blocked |
| PRD_KMG_021 inactive article role restriction | none | No role-specific inactive article access observed. Next: Quality/Training/KM and other role accounts. | blocked |
| PRD_KMG_022 UI/search/API role enforcement | none | API and role-specific boundaries unverified. Next: role accounts and supported API evidence. | blocked |
| PRD_KMG_023 knowledge analytics | none | Reports and metrics not explored. Next: reporting access and source data. | blocked |
| PRD_KMG_024 external knowledge APIs | none | External consumer/API contract not explored. Next: supported platform/API access and contract. | blocked |
| PRD_KMG_025 scale, performance, backups and recovery | none | Quantitative targets and operational evidence unavailable; no UI scenario authored. Next: define targets and obtain operational evidence. | blocked |
| PRD_KMG_026 archive and restore | `knowledge-management/functional.feature` — `TEN_KMG_ARC_E2E_001`–`002` | E2E-owned item leaves Published for Archived with recorded success message; unarchive returns it to Published and removes it from Archived. | covered |
| E2 observed cancel-without-submit branch | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_005` | Empty creation wizard closes to article list without submitting. | covered |
| E1 observed article search/filter controls | `knowledge-management/functional.feature` — `TEN_KMG_SFI_E2E_001` | Search and Add Filters/Status availability asserted; applied behavior remains unverified. | partial |

#### Scenario contract (exact)

Feature-level tags/background: none. Exact selected scenario text:

```gherkin
@TEN_KMG_CRT_E2E_001 @smoke @flow:TEN_KMG_CREATE_FLOW @type:positive
Scenario: Author creates a draft article
  Given the author has selected an available entity and CTS category
  When the author creates an internal article with a unique E2E title, description, and content
  Then the article list shows that title as version 1 Draft
  And the article detail shows the saved content

@TEN_KMG_CRT_E2E_004 @regression @flow:TEN_KMG_CREATE_FLOW @type:ui-interaction
Scenario: Selecting an entity enables the article category field
  Given the author is on the article creation Details step
  And the CTS Category field is disabled
  When the author selects the available Converge entity
  Then the CTS Category field becomes enabled

@TEN_KMG_CRT_E2E_002 @regression @flow:TEN_KMG_CREATE_FLOW @type:negative
Scenario: Article details cannot advance when required fields are empty
  Given the author is on the article creation Details step
  When the author selects Next with all Details fields empty
  Then the Details step remains open
  And the form shows "Article Name is required"
  And the form shows "Entity is required"
  And the form shows "CTS Category is required"
  And the form shows "Description is required"
  And the form shows "Visibility is required"

@TEN_KMG_CRT_E2E_005 @regression @flow:TEN_KMG_CREATE_FLOW @type:ui-interaction
Scenario: Author cancels article creation before saving
  Given the author is on the article creation Details step
  When the author selects Cancel without submitting the form
  Then the article creation wizard closes
  And the article list is shown

@TEN_KMG_CRT_E2E_003 @regression @flow:TEN_KMG_CREATE_FLOW @type:negative
Scenario: Article content cannot advance when empty
  Given the author has completed article Details and is on the Content step
  When the author selects Next without adding content
  Then the Content step remains open
  And the form shows "Please add some content to proceed."

@TEN_KMG_REV_E2E_001 @smoke @flow:TEN_KMG_REVIEW_FLOW @type:positive
Scenario: Author submits a draft for approval
  Given an E2E-owned article is in Draft status
  When the author confirms Approval for that article
  Then the same article appears in Pending Approval

@TEN_KMG_REV_E2E_002 @smoke @flow:TEN_KMG_REVIEW_FLOW @type:positive
Scenario: Approver publishes a draft immediately
  Given an E2E-owned draft article is awaiting approval
  When the approver saves the immediate approval and publication decision
  Then the same article appears as Published with an Active badge

@TEN_KMG_EDT_E2E_001 @smoke @flow:TEN_KMG_EDIT_FLOW @type:positive
Scenario: Publishing an updated article creates an active later version
  Given an E2E-owned article has a Published version 1
  When the author creates and publishes version 2 with updated content
  Then version 2 appears Published with an Active badge
  And version 1 appears in Superseded

@TEN_KMG_ARC_E2E_001 @smoke @flow:TEN_KMG_ARCHIVE_FLOW @type:positive
Scenario: Author archives a published article
  Given an E2E-owned article is Published
  When the author confirms Archive for that article
  Then the article disappears from Published
  And the same article appears in Archived
  And the success message is "Article \"<article title>\" archived successfully."

@TEN_KMG_ARC_E2E_002 @regression @flow:TEN_KMG_ARCHIVE_FLOW @type:positive
Scenario: Author restores an archived article
  Given an E2E-owned article is Archived
  When the author confirms Unarchive for that article
  Then the same article appears in Published
  And the article disappears from Archived

@TEN_KMG_LST_E2E_001 @smoke @flow:TEN_KMG_LIST_DETAIL_FLOW @type:positive
Scenario: Article list exposes its lifecycle status views
  When the user opens the Knowledge Management article list
  Then the list offers Published, All, Draft, Pending Approval, Need Revision, Superseded, and Archived views

@TEN_KMG_LST_E2E_002 @smoke @flow:TEN_KMG_LIST_DETAIL_FLOW @type:positive
Scenario: Article detail shows the content saved in its draft
  Given an E2E-owned article has been created as a draft
  When the user opens that article's detail
  Then the detail shows the content saved for the article

@TEN_KMG_SFI_E2E_001 @regression @flow:TEN_KMG_SEARCH_FILTER_FLOW @type:ui-interaction
Scenario: Article list exposes search and status filtering
  When the user opens Add Filters on the article list
  Then the filter choices include Status
  And the article list provides a search field
```
- Remaining branches: attachment/media creation; category/tag browsing; duplicate-title behavior; unsaved-change exit beyond the empty Cancel path; review revision request and role separation; archive role rules and consumer search effects; applied filters/search result assertions; pagination/sort; role-specific portals, case linking, escalation guidance, reports, distribution APIs and operations. Continue live evidence discovery for accessible branches; obtain missing roles, portal/API access and operational targets for blocked branches. No defect ticket supplied. No mock scenarios authored because no reviewed mock contracts or API error contract were evidenced.

#### Terminal scenario review

- Superseded pending record: this 13-scenario snapshot had raw-byte SHA-256 `1C2107F0A142B8BC1C64A8E42B29B29EDF497D8EC6CA3C5ECEFBB173FC5C7A11`. No approval was recorded. The feature changed before a decision, so only the expanded snapshot below is eligible for review.

### Batch 2 — expanded scenarios for confirmed functional flows

- Scope: 14 new scenarios were added to `e2e/tests/bdd/features/knowledge-management/functional.feature`; the 13 initial scenarios remain unchanged. The current complete feature therefore has 27 scenarios across 8 represented confirmed flows: Create (5), Review (6), Edit (2), Archive (4), List/Detail (4), Search/Filter (4), Organize (1), and Consume (1). This batch adds coverage to six represented flows and introduces scenarios for the already-confirmed Organize and Consume flows. Six confirmed flows still have no scenario in this file and remain pending for the access/evidence reasons below.
- Owning PRD: `docs/prd/knowledge-management/knowledge-management.md`; active content SHA-256 `8d63e5ac8fbd9ccc28717e07b5182349dd396d642b03fa946e7a47ddf4641a70`. Evidence: PRD observations `KM-create-01`, `KM-lifecycle-01`, `KM-review-version-01`, `KM-archive-01`, `KM-entry-01`, `KM-detail-01`; STT1 E1–E4 above. Authenticated role remains unknown; production mutation eligibility remains unknown. No implementation or test execution has occurred.
- Shared component masters were rechecked. `filter-search.feature` is not an exact match: its master uses the first visible row and does not cover exact-title matching or the no-result state. `filter.feature` requires an observed HTTP 200 contract and matching response rows; requests were not inspected, and the menu scenarios assert visible outcomes only. `view-detail.feature` covers the shared Details tab, not the menu's Article/Revision tabs or version preview. `sort.feature` is not applicable because row order was not established. `pipeline.feature` covers unrelated Active/Suspended-style pipeline states. No `@ref` is added because none of the current scenarios exercises a full matching master contract.

#### Current coverage mapping

| PRD requirement / branch | Exact feature path + scenario identities | Asserted outcome / gap | Coverage |
| --- | --- | --- | --- |
| PRD_KMG_001 create and update/publish content | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_001`, `TEN_KMG_EDT_E2E_001`–`002` | Draft creation/detail, published later version, and saved content update after a revision request. Media and other edit fields remain unverified. | partial |
| PRD_KMG_002 review before publication | `knowledge-management/functional.feature` — `TEN_KMG_REV_E2E_001`–`006` | Draft submission, submission cancel, decision cancel, revision request/comment, resubmission and immediate approval outcomes are asserted. Role separation remains unknown. | partial |
| PRD_KMG_003 previous version archival | `knowledge-management/functional.feature` — `TEN_KMG_EDT_E2E_001`, `TEN_KMG_LST_E2E_003`–`004` | Prior version appears Superseded, history shows Active later version, and selecting the earlier version shows its saved content. Superseded versus Archived is unresolved. | partial |
| PRD_KMG_004 create and detail | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_001`, `TEN_KMG_LST_E2E_002`, `TEN_KMG_CNS_E2E_001` | Created Draft and Published articles show saved content in their respective detail tabs. | covered |
| PRD_KMG_005 required Details fields | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_002` | Empty Details remains open and shows all five recorded required-field messages. | covered |
| PRD_KMG_006 required article content | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_003` | Empty Content remains open with the recorded validation message. | covered |
| PRD_KMG_007 submit/approve outcomes | `knowledge-management/functional.feature` — `TEN_KMG_REV_E2E_001`–`006` | Submit, cancel, revision, resubmission and publish branches are asserted; actor-specific authorization remains unverified. | partial |
| PRD_KMG_008 status list | `knowledge-management/functional.feature` — `TEN_KMG_LST_E2E_001`, `TEN_KMG_LST_E2E_003` | Seven status views are offered and revision history marks Active version. UI tab label “Need Revision” differs from observed row status “Needs Revision.” | partial |
| PRD_KMG_009 categories and tags | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_004`, `TEN_KMG_ORG_E2E_001` | Entity enables category selection; filtering Complaint returns the E2E-owned article under that category. Category browsing/navigation and tags remain unverified. | partial |
| PRD_KMG_010 portals, languages, responsive access | none; `TEN_KMG_CNS_E2E_001` is management UI only | Customer/agent portals, language variants and mobile behavior were not observed. Suitable accounts and portal access are needed. | blocked |
| PRD_KMG_011 search suggestions and active-only agent results | `knowledge-management/functional.feature` — `TEN_KMG_SFI_E2E_001`–`003` | Search field, exact-title result and no-result state are asserted. Suggestions and agent-only active result semantics remain unverified. | partial |
| PRD_KMG_012 archived/inactive exclusion from consumer search | `knowledge-management/functional.feature` — `TEN_KMG_ARC_E2E_001`–`004` | Archive, restore and cancel outcomes are asserted in the management list; consumer exclusion remains unverified. | partial |
| PRD_KMG_013 guides, FAQ and multimedia self-service | none | Customer-facing self-service content and media behavior need portal access and owned media data. | blocked |
| PRD_KMG_014 entity enables category | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_004` | Category is disabled before entity selection and enabled after selecting Converge. | covered |
| PRD_KMG_015 filters | `knowledge-management/functional.feature` — `TEN_KMG_SFI_E2E_001`, `TEN_KMG_SFI_E2E_004`, `TEN_KMG_ORG_E2E_001` | Status and category filters produce matching visible results. Other filter types/combinations remain unverified. | partial |
| PRD_KMG_016 case article linking | none | No suitable safe case was available/observed; case access is required. | blocked |
| PRD_KMG_017 escalation turnaround guidance | none | Guidance and exception rules were not observed or specified in the UI evidence. | blocked |
| PRD_KMG_018 admin/author permissions and content management | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_001`, `TEN_KMG_REV_E2E_001`–`006`, `TEN_KMG_EDT_E2E_002` | Operations were available to one account of unknown role. Admin settings and permission boundaries are not verified. | partial |
| PRD_KMG_019 agent read/link and no-edit access | none | `TEN_KMG_CNS_E2E_001` uses the management Article tab and does not establish agent access. Agent account and case context are needed. | blocked |
| PRD_KMG_020 customer public-only access | none | No customer portal/account was available; management UI content does not establish public visibility. | blocked |
| PRD_KMG_021 inactive article role restriction | none | Role-specific inactive-article access was not observed. Suitable role accounts are needed. | blocked |
| PRD_KMG_022 UI/search/API role enforcement | none | No role comparison or supported API contract was observed. Role accounts and API evidence are needed. | blocked |
| PRD_KMG_023 knowledge analytics | none | Reporting access and source data are unavailable. | blocked |
| PRD_KMG_024 external knowledge APIs | none | External API contract and authentication were not explored. | blocked |
| PRD_KMG_025 scale, performance, backups and recovery | none | Operational targets/evidence are unavailable; no UI E2E assertion is currently supported. | blocked |
| PRD_KMG_026 archive and restore | `knowledge-management/functional.feature` — `TEN_KMG_ARC_E2E_001`–`004` | E2E-owned article archive/restore and confirmation cancellation outcomes are asserted. | covered |
| E2 observed cancel-without-submit branch | `knowledge-management/functional.feature` — `TEN_KMG_CRT_E2E_005` | Empty creation wizard closes to article list without submitting. | covered |
| E3 observed search and empty state | `knowledge-management/functional.feature` — `TEN_KMG_SFI_E2E_002`–`003` | Exact known title returns an article; unmatched title displays “No Data Available” with no rows. | covered |
| E3 observed status and category filters | `knowledge-management/functional.feature` — `TEN_KMG_SFI_E2E_004`, `TEN_KMG_ORG_E2E_001` | Published status filter excludes the observed Superseded result; Complaint filter returns articles in that category path. | covered |
| E3 observed version detail | `knowledge-management/functional.feature` — `TEN_KMG_LST_E2E_003`–`004` | Revision tab lists versions/Active state and selected earlier version content. | covered |
| E3 observed published-content read | `knowledge-management/functional.feature` — `TEN_KMG_CNS_E2E_001` | Published article content is visible in the management UI Article tab; public/agent consumption is still unverified. | partial |
| E4 observed review/update decisions | `knowledge-management/functional.feature` — `TEN_KMG_REV_E2E_003`–`006`, `TEN_KMG_EDT_E2E_002` | Cancellations preserve source state; revision feedback appears in edit comments; saved update preserves Needs Revision; resubmission returns Pending Approval. | covered |
| E4 observed archive decisions | `knowledge-management/functional.feature` — `TEN_KMG_ARC_E2E_003`–`004` | Canceling Archive preserves Published; canceling Unarchive preserves Archived. | covered |
| E4 observed Delete row action (outside confirmed flow inventory) | none | Row action was visible but not selected; PRD does not describe deletion. Product decision and separate flow confirmation are required. | unverified |

#### Exact scenarios added in Batch 2

```gherkin
@TEN_KMG_REV_E2E_003 @regression @flow:TEN_KMG_REVIEW_FLOW @type:ui-interaction
Scenario: User cancels draft submission for approval
  Given an E2E-owned article is in Draft status
  When the user cancels the Submit For Approval confirmation
  Then the same article remains in Draft

@TEN_KMG_REV_E2E_004 @regression @flow:TEN_KMG_REVIEW_FLOW @type:ui-interaction
Scenario: User cancels a pending approval decision
  Given an E2E-owned article is in Pending Approval
  When the user cancels the Approval Article decision
  Then the same article remains in Pending Approval

@TEN_KMG_REV_E2E_005 @regression @flow:TEN_KMG_REVIEW_FLOW @type:positive
Scenario: User requests a revision with feedback
  Given an E2E-owned article is in Pending Approval
  When the user requests a revision with a comment
  Then the article appears as Needs Revision
  And the comment appears in the article's edit comments

@TEN_KMG_REV_E2E_006 @regression @flow:TEN_KMG_REVIEW_FLOW @type:positive
Scenario: User resubmits an article after revision
  Given an E2E-owned article is in Needs Revision with updated content
  When the user confirms Submit For Approval
  Then the same article appears in Pending Approval

@TEN_KMG_EDT_E2E_002 @regression @flow:TEN_KMG_EDIT_FLOW @type:positive
Scenario: User updates an article after a revision request
  Given an E2E-owned article is in Needs Revision with reviewer feedback
  When the user saves updated article content
  Then the article detail shows the updated content
  And the article remains in Needs Revision

@TEN_KMG_ARC_E2E_003 @regression @flow:TEN_KMG_ARCHIVE_FLOW @type:ui-interaction
Scenario: User cancels archiving a published article
  Given an E2E-owned article is Published
  When the user cancels the Archive confirmation
  Then the same article remains in Published

@TEN_KMG_ARC_E2E_004 @regression @flow:TEN_KMG_ARCHIVE_FLOW @type:ui-interaction
Scenario: User cancels restoring an archived article
  Given an E2E-owned article is Archived
  When the user cancels the Unarchive confirmation
  Then the same article remains in Archived

@TEN_KMG_LST_E2E_003 @regression @flow:TEN_KMG_LIST_DETAIL_FLOW @type:positive
Scenario: Article revision history identifies the active version
  Given an E2E-owned article has a Published version 2 and a Superseded version 1
  When the user opens the article's Revision tab
  Then the revision history lists versions 1 and 2
  And version 2 is marked Active

@TEN_KMG_LST_E2E_004 @regression @flow:TEN_KMG_LIST_DETAIL_FLOW @type:positive
Scenario: User previews content from an earlier article version
  Given an E2E-owned article has more than one version
  When the user selects an earlier version in the revision history
  Then the version preview shows that version's saved content

@TEN_KMG_SFI_E2E_002 @regression @flow:TEN_KMG_SEARCH_FILTER_FLOW @type:positive
Scenario: User searches for an E2E-owned article by title
  Given an E2E-owned article has a known unique title
  When the user searches for that exact title
  Then the matching article appears in the search results

@TEN_KMG_SFI_E2E_003 @regression @flow:TEN_KMG_SEARCH_FILTER_FLOW @type:negative
Scenario: Search with no matching article shows an empty state
  When the user searches for a title that matches no article
  Then the article list shows "No Data Available"
  And the list has no article results

@TEN_KMG_SFI_E2E_004 @regression @flow:TEN_KMG_SEARCH_FILTER_FLOW @type:positive
Scenario: User filters the article list by Published status
  Given the user is viewing the All article list
  When the user applies the Status filter for Published
  Then the results include Published articles
  And the results exclude Superseded articles

@TEN_KMG_ORG_E2E_001 @regression @flow:TEN_KMG_ORGANIZE_FLOW @type:positive
Scenario: User filters articles by category
  Given an E2E-owned article belongs to a category under Complaint
  When the user filters the article list by the Complaint category
  Then the results include the E2E-owned article
  And its category path is under Complaint

@TEN_KMG_CNS_E2E_001 @regression @flow:TEN_KMG_CONSUME_FLOW @type:positive
Scenario: User reads the content of a published article
  Given an E2E-owned article is Published with saved content
  When the user opens the article's Article tab
  Then the article tab shows the published content
```

- Other scenarios in the current feature: the 13 original scenarios and their exact text are retained unchanged in the “Scenario contract (exact)” block under Batch 1 above. The combined blocks describe all 27 scenarios in the current file.
- Remaining branches and next actions: Create has duplicate-title, media/attachment and populated-form exit behavior unverified; explore only with safe E2E-owned data. Edit has ordinary field/attachment alternatives unverified; inspect editable fields before adding distinct outcomes. Review has actor/role separation unverified; obtain role-specific accounts. Archive consumer-search effects and permission rules need a consumer account. List/detail still needs sort order and pagination evidence; do not author sort behavior until row order is observed. Search/filter still needs suggestions and additional filter semantics. Organize still needs category browsing and tag behavior. Consume still needs agent/customer portals, public-only visibility, mobile/language/media evidence. `TEN_KMG_CASE_LINK_FLOW` needs safe case access; `TEN_KMG_ESCALATION_GUIDANCE_FLOW` needs the guidance entry point and rules; `TEN_KMG_ACCESS_FLOW` needs role accounts; `TEN_KMG_ADMIN_FLOW` needs settings/category/tag administration access; `TEN_KMG_REPORTING_FLOW` needs reporting access/data; `TEN_KMG_DISTRIBUTION_FLOW` needs a supported external API contract and credentials. These six flows remain pending in `.flows.md` and have no scenario tags in this file.
- Product mismatch outside confirmed scope: the observed Delete row action is not authored as a scenario; clarify intent, update the owning PRD, and confirm a distinct flow before writing it. No defect ticket supplied. No mock scenarios were added because no reviewed mock contract or API error contract was evidenced.

#### Terminal scenario review

- Accepted manually on 2026-11-24; reviewer identity not recorded. Exact approved batch: the 14 additions above plus the 13 unchanged scenarios under Batch 1, in `e2e/tests/bdd/features/knowledge-management/functional.feature`, totaling 27 scenarios across 8 represented confirmed flows. Raw-byte SHA-256 for the complete approved feature file: `EBB9FD3769E5CDCE923726566C565240CA68D9464A9B4E739EC83CD68FBB78D3`. The current file digest was recalculated before implementation and matches this approved snapshot. This records scenario approval only; it does not grant live-data mutation approval or establish an execution result.

### Phase 1 implementation handoff — 2026-11-24

- Scope: all 27 approved scenarios in `functional.feature`, retaining their IDs and Gherkin text. Added reusable Knowledge Management page methods and step bindings for create validation/cancel, review and revision transitions, versioning, archive/restore, list/detail, search, status/category filtering, and published content reading.
- Code: `e2e/tests/bdd/pages/knowledge-management/KnowledgeManagementPage.ts`; `e2e/tests/bdd/steps/knowledge-management/functional.steps.ts`; registered `knowledgeManagementPage` with owned-record cleanup in `e2e/tests/bdd/fixtures/base.fixture.ts`; added the feature path to `BDD_FEATURES` in `e2e/playwright.bdd.config.ts`.
- Data: titles use the shared minute-stamped `e2eValue` helper and collision checks. Mutations search the exact tracked E2E-owned title. Teardown archives and verifies those articles, promoting only that owned record through the existing review path when needed. No seed article is selected for mutation. Scenario setup creates data through the UI.
- Evidence reused: locators and interactions in E1–E4 above, including observed tab labels, wizard fields, edit controls, approval/revision dialogs, archive/unarchive dialogs, filters, search, detail tabs and version preview. No new live browser interactions were needed for this implementation pass.
- Validation: root `pnpm typecheck` passed. An explicit TypeScript check covering the four changed TypeScript files passed: `pnpm exec tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --types node e2e/tests/bdd/pages/knowledge-management/KnowledgeManagementPage.ts e2e/tests/bdd/steps/knowledge-management/functional.steps.ts e2e/tests/bdd/fixtures/base.fixture.ts e2e/playwright.bdd.config.ts`. Biome does not process these E2E paths because `biome.jsonc` excludes `e2e/tests`; the scoped Biome attempt therefore reported zero files processed. BDD collection and execution remain pending; no scenario was run and no execution result is claimed.
- Environment and remaining checks: the observed target was STT1, authenticated role unknown. Production mutation eligibility remains unresolved; do not execute mutation scenarios against production. Before a reviewer runs BDD, inspect the selected setup and steps, confirm the intended non-production target and data-safety prerequisites, run collection for the exact 27 scenario IDs, and report collection/types/runtime results independently. The current approval digest identifies the approved Gherkin snapshot; code implementation did not change that file.









