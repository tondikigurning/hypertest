# Knowledge Management exploration

## Scope and sources

- Owner: Knowledge Management / Knowledge Management, confirmed by STT1 navigation. Source: user-uploaded `prd-knowledge-management.md`, draft v0.1 (requirements section 7); source statements are not live observations. Cross-menu and external journeys remain in scope.
- Active database PRD: `docs/prd/knowledge-management/knowledge-management.md`, requirements PRD_KMG_001–025. PRD_KMG_004–008 and 014–015 are observed, automatically validated facts; source-derived `[spec]` requirements remain unvalidated. PRD_KMG_003 is provisional observed behavior with unresolved source discrepancy.
- User said no Knowledge Management data or operations are restricted from mutation in production; this is not production execution authorization and does not waive E2E ownership or data-safety requirements. Potential smoke candidates: create/publish, search and ticket linking, subject to safe data and evidence.
- Previous Cases E5 (STT1, 2026-11-23, role unknown) showed “No articles found” in one case Knowledge area; not evidence about menu behavior or linking.
- Authenticated STT1 account displayed Tondiki Gurning; role unknown. Entity Converge was available. UI showed “Live updates are paused”; other list interactions worked. No image, trace, full request or response details are available.

## Exploration inventory

| Item | Source | Attempt / remaining gap |
| --- | --- | --- |
| Menu, status list and creation details | Attachment §3.1 | KM-entry-01, KM-create-01; list counts/tabs, search, reset, header sort and pagination observed in KM-list-controls-01. Table settings panel was not exposed. |
| Create/update/publish articles, guides, media, attachments | Attachment §3.1 | Internal article create/publish KM-lifecycle-01; edit and second version KM-edit-list-01, KM-review-version-01. Guides, media, attachments and external authoring outcomes remain unverified. |
| Review, versions, archival and restore | Attachment §§3.1, 4, 7 | Revision and publish transitions observed; prior version appears Superseded, not Archived. Published article archive and unarchive were performed on owned data in KM-archive-01; product equivalence and restore details unresolved. Delete unverified. |
| Categories, tags, languages, responsive portals | Attachment §§3.2, 3.7 | CTS category observed; tags, translations, responsive/mobile and customer portals unverified. |
| Search, suggestions, filters and active/inactive visibility | Attachment §§3.3, 3.5, 4 | Management search/no-result and visibility filter observed. Other filter application was attempted: Category selection had no available options for the chosen query; filter result cannot be verified. Agent search/suggestions/visibility remain unverified. |
| Ticket linking and escalation TAT | Attachment §§3.4, 4 | Cases E5 only; linking and TAT unverified. |
| Roles and permissions | Attachment §§2, 3.5 | Account role unknown; other role access unverified. |
| Analytics/feedback | Attachment §3.6 | Not located; account/evidence required. |
| API/security/scalability/backup/recovery | Attachment §§3.8, 6 | API contract, owners and NFR targets unavailable. |
| Additional accessible actions | Menu discovery | Archive/unarchive outcomes observed; Delete action remains untested on an owned record. |

## Evidence

### KM-entry-01 — 2026-11-24, STT1, authenticated account, role unknown
Home's Knowledge Management link opened Articles. Published, All, Draft, Pending Approval, Need Revision, Superseded and Archived tabs were visible. List displayed search, filters, sort, reset, saved views, refresh, table settings, pagination, and article rows with version/status/visibility/category. Internal and External visibility values appeared. Initial zero counts were transient during loading. “Live updates are paused” appeared. No screenshot/trace or request bodies.

### KM-create-01 — 2026-11-24, STT1, authenticated account, role unknown
Create opened a four-stage wizard: Details, Content, Summary, Completed. Details has required Article Name, Entity, CTS Category, Description and Visibility; CTS Category initially disabled until Entity. Visibility choices Internal and External. Empty Details + Next kept the page open and showed exactly: “Article Name is required”, “Entity is required”, “CTS Category is required”, “Description is required” and “Visibility is required”.

### KM-create-02 — 2026-11-24, STT1, authenticated account, role unknown
Entity options initially showed “No options found”; the empty form was canceled. The cause is unknown; issue resolved after browser variables refreshed.

### KM-filter-01 — 2026-11-24, STT1, authenticated account, role unknown
Add Filters displayed approver, article number, category, creator, publication date, status, subtype, summary, title, type, version number and visibility. Initial application outcome not checked.

### KM-lifecycle-01 — 2026-11-24, STT1, authenticated account, role unknown
Entity later offered Converge; selecting it enabled CTS Category. Created an E2E-owned internal article through Details, Content and Summary. Empty Content + Next blocked progression with “Please add some content to proceed.” Completing valid content reported “New Article has been successfully created”; the article appeared as version 1 Draft and detail showed saved content. Draft menu offered Edit, Approval, Delete, Archive. Confirmed Approval moved the same article to Pending Approval; dialog offered immediate approval/publication or Request Revision with optional comments. Default approval moved it to Published with Active badge; toast “Article Approve successfully”. Account could submit and approve its own article; no general permission inference. Article remains in STT1. No screenshot/trace/full request.

### KM-detail-01 — 2026-11-24, STT1, authenticated account, role unknown
Owned published article Details showed saved category/version/visibility/description; Article showed content; Revision showed version 1 Active. Published item menu offered Edit, Delete, Archive.

### KM-edit-list-01 — 2026-11-24, STT1, authenticated account, role unknown
Exact owned title search returned the article; Visibility Equal False retained its Internal row. Editing the exact published article description left v1 Published and created v2 Draft with changed description. The article remains in STT1.

### KM-review-version-01 — 2026-11-24, STT1, authenticated account, role unknown
Requested revision with comment; v2 appeared Need Revision / Needs Revision. Resubmitting returned it to Pending Approval; approving showed v2 Published/Active and v1 Superseded. Source calls prior version archived; relationship between Superseded and Archived remains unresolved. Owned v2 article remains in STT1.

### KM-search-empty-01 — 2026-11-24, STT1, authenticated account, role unknown
An unmatched management-list search showed “No Data Available” and “There are no items to display at this time.” Not agent-search evidence.

### KM-cancel-create-01 — 2026-11-24, STT1, authenticated account, role unknown
Cancel on untouched blank create wizard returned to the list without submitting; no filled unsaved form tested.

### KM-list-controls-01 — 2026-11-24, STT1, authenticated account, role unknown
All showed 111 rows across pages; Published 46, Draft 4, Superseded 20, Archived 41 at observation time. Reset cleared an unmatched search and visibility filter. Article No. header set sort label to Article Number and reordered results; Article header set label Title and visibly ordered titles alphabetically. Page 2 showed 51–100; Previous Page returned to page 1. Draft and Archived tabs showed distinct result sets. Table settings opened but no panel was exposed. No mutation. No screenshot/trace/full request.

### KM-archive-01 — 2026-11-24, STT1, authenticated account, E2E-owned published article
From the exact owned article, Archive opened a confirmation dialog naming it with Cancel and Archive. Cancel left Published intact. Confirming Archive reported `Article "E2E knowledge article 241120260934" archived successfully.` The article disappeared from Published and appeared in Archived. The same owned archived article then exposed Unarchive. Unarchive opened a confirmation dialog; confirming reported it was unarchived successfully and removed it from Archived, restoring it to Published. No delete was performed. The item is currently restored to Published. No screenshot/trace/full request captured. This live action is evidence, not reusable permission for later sessions or production.

### KM-category-filter-01 — 2026-11-24, STT1, authenticated account, role unknown
On the Published list with exact owned-title search, Add Filters → Category opened a category-value search. Searching the visible Converge complaint/service category produced “No items available.” Filter could not be applied to an actual category value, so result matching is unverified. No data mutation. No screenshot/trace/full request.

## Flow confirmation provenance

2026-11-24: `confirm_flows` automatically accepted the 13 candidates listed in `.flows.md` for `knowledge-management/knowledge-management.feature`, against active `docs/prd/knowledge-management/knowledge-management.md`. Automatic, not human reviewed. Earlier candidate and source context came from the user-provided PRD; PRD_KMG_025 is an operational evidence gap, not an asserted UI flow. Exclusions: case-management functions beyond article linking, AI generation, chatbot logic beyond content-serving API.

2026-11-24: Reconfirmed all 13 retained IDs automatically after PRD_KMG_003 became provisional observed behavior. Later resumed scenario flow inventory reconfirmation also automatically accepted all 13 IDs. Scope unchanged.

## Scenario handoffs

### Previous batches — 2026-11-24

Active PRD `docs/prd/knowledge-management/knowledge-management.md` includes PRD_KMG_001–025. Earlier feature snapshots progressed from 5 to 12 to 13 scenarios. User reported accepting a 12-scenario batch; this does not establish approval of the current changed cumulative snapshot. Baseline feature is unavailable at draft base. No implementation, collection/type checks or execution.

Earlier mapping: PRD_KMG_001/004 → CRT_001 and EDT_001 (create/update; media/guides/attachments/external still partial); PRD_KMG_005 → CRT_002 (five required errors); PRD_KMG_006 → CRT_003 (empty content); PRD_KMG_002/007 → REV_001–003 (pending/revision/resubmit/publish, alternatives incomplete); PRD_KMG_003 → EDT_002 (actual Superseded result, discrepancy unresolved); PRD_KMG_008/014 → CRT_001, VDT_001 and list statuses/category dependency (partial); PRD_KMG_015 → LST_003 (visibility false only); PRD_KMG_009–013 and 016–025 largely unrepresented because portals, role, integration, analytics, API and NFR evidence inaccessible or unspecified. Archive/delete had no prior scenarios.

### Current scenario batch — 2026-11-24

- Active PRD: `docs/prd/knowledge-management/knowledge-management.md`, PRD_KMG_001–025. Source `[spec]` requirements remain unvalidated; existing observed items retain automatic review method. PRD_KMG_003 mismatch unresolved.
- Current feature snapshot: `e2e/tests/bdd/features/knowledge-management/knowledge-management.feature`, 21 scenarios. Baseline at draft base unavailable. Existing 13 IDs retained; new IDs ARC_001–003 and LST_004–008. ARC_003 is now Unarchive, based on KM-archive-01; the previous draft-archive proposal was not evidenced. Flow inventory of 13 IDs was automatically reconfirmed before authoring; no inventory changes.
- Flow state: all 13 flows remain `pending`. CREATE 4, REVIEW 3, EDIT 2, ARCHIVE 3, LIST 8, DETAIL 1 have authored portions. ORGANIZE, LANGUAGE, SELF_SERVICE, TICKET_LINK, ACCESS, ANALYTICS and API still have no scenarios. Branches remain outstanding in all authored flows.
- PRD_KMG_001/004: CRT_001 and EDT_001 assert internal creation and saved draft update; guides, media, attachments, external remain partial/unverified. PRD_KMG_005 CRT_002 covers all five observed required errors. PRD_KMG_006 CRT_003 covers empty content block. PRD_KMG_002/007 REV_001–003 cover submit/publish/revision/resubmit; reviewer separation, cancellation and other review branches remain partial. PRD_KMG_003 EDT_002 asserts observed Superseded status, not Archived; product intent unresolved. PRD_KMG_008/014 CRT_001, VDT_001, LST_008 assert observed details/status/category behavior; customer/agent exposure not covered. PRD_KMG_015 LST_003 covers only Visibility Equal False; category filter was not applicable because no category values were available for selection.
- KM-list-controls-01 maps to LST_004 Reset, LST_005/006 Article No./Title sort and visible order, LST_007 next/previous page, LST_008 Draft/Archived tabs. These assert observed outcomes; exact sort direction toggling and table settings are not claimed.
- KM-archive-01 maps to ARC_001 archive confirmation and Published-to-Archived result; ARC_002 cancel preserves Published; ARC_003 unarchives the exact owned archived article and asserts return to Published. Do not mark Delete covered: no delete operation was exercised. The article was restored during this live exploration and currently resides Published.
- Remaining CREATE/EDIT/REVIEW: external creation, guides/media/attachments, finer validation boundaries, request-revision cancel, edit variants and downstream effects need evidence. Remaining ARCHIVE: draft archive and delete are unverified; published archive/unarchive and archive cancellation are represented. Remaining DETAIL: full revision history beyond active version is incomplete. LIST: other filter outcomes, sort toggling, settings/page size are unverified. Independent flows require accounts, navigation, data and contracts. PRD_KMG_025 needs quantitative targets and service-owner evidence. No confirmed product defect/ticket.
- Registry retains all 13 flow rows as `pending`. Gaps retain PRD/actual issues: PRD_KMG_003 Superseded vs source Archived; unsupported media/guides; PRD_KMG_009–024 blocked/unverified; PRD_KMG_025 NFR targets; observed archive control/outcome and detailed revision history absent or incomplete in PRD. Next steps: resolve product wording through PRD workflow; obtain role/portal/integration access and contracts; inspect owned data for draft archive/delete only if needed; identify NFR owners/targets.
- Shared masters inspected in current local source: filter-search, filter, pipeline, sort and view-detail. Their full contracts/API/mock assertions are not evidenced on Knowledge Management, so no `@ref` mirrors. No scoped KM steps/POMs; no verified reusable locator recorded. No implementation, collection, standalone type-check, or test execution.
- Browser is authenticated as of this exploration; live updates paused and console errors reported. Bounded list exploration succeeded. No image/trace/full request captured.
