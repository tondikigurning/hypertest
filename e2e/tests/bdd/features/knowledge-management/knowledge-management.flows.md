# Knowledge Management flows

## Flows

| Flow | Outcome | Feature | Status |
| --- | --- | --- | --- |
| `TEN_KMG_CREATE_FLOW` | Create a draft article and validate required details and content | `knowledge-management/functional.feature` | written |
| `TEN_KMG_EDIT_FLOW` | Update an article and create a new version | `knowledge-management/functional.feature` | written |
| `TEN_KMG_REVIEW_FLOW` | Submit a draft for review and publish an approved version | `knowledge-management/functional.feature` | written |
| `TEN_KMG_ARCHIVE_FLOW` | Archive and restore an article | `knowledge-management/functional.feature` | written |
| `TEN_KMG_LIST_DETAIL_FLOW` | Find article versions and inspect saved content | `knowledge-management/functional.feature` | written |
| `TEN_KMG_SEARCH_FILTER_FLOW` | Search and filter articles | `knowledge-management/functional.feature` | written |
| `TEN_KMG_ORGANIZE_FLOW` | Navigate knowledge by category and tag | `knowledge-management/functional.feature` | written |
| `TEN_KMG_CONSUME_FLOW` | Read public and agent knowledge content | `knowledge-management/functional.feature` | written |
| `TEN_KMG_CASE_LINK_FLOW` | Find and link knowledge to a case | `knowledge-management/integration.feature` | pending |
| `TEN_KMG_ESCALATION_GUIDANCE_FLOW` | Use article turnaround guidance during a case | `knowledge-management/integration.feature` | pending |
| `TEN_KMG_ACCESS_FLOW` | Apply role-based access to article actions and visibility | `knowledge-management/access-and-distribution.feature` | pending |
| `TEN_KMG_ADMIN_FLOW` | Manage knowledge categories, tags and settings | `knowledge-management/access-and-distribution.feature` | pending |
| `TEN_KMG_REPORTING_FLOW` | Identify content gaps from knowledge reports | `knowledge-management/access-and-distribution.feature` | pending |
| `TEN_KMG_DISTRIBUTION_FLOW` | Serve knowledge content to external consumers | `knowledge-management/access-and-distribution.feature` | pending |

## Gaps

- PRD_KMG_003 / S1 §§3.1, 4: S1 describes automatic archival of the previous version; STT1 observation KM-review-version-01 showed version 1 as Superseded when version 2 was Published and Active. Whether Superseded is equivalent to Archived remains unresolved. Next action: product clarification or evidence establishing the status relationship.
- PRD_KMG_008: the status tab is labeled “Need Revision,” while an article after a revision request is displayed with row status “Needs Revision” (E4). Whether these are only label variations or distinct state terminology is unresolved. Next action: confirm the intended status label and state model.
- PRD_KMG_009: filtering by the Complaint category was observed (E3), but category browsing/navigation and tag discovery or administration remain unverified. Next action: explore category navigation and tag controls when accessible.
- PRD_KMG_010, 013, 019–020: customer and agent portals, their role-specific content access, public-only visibility, multilingual/mobile layouts, and multimedia self-service remain unverified; current authenticated role is unknown and the Article tab observation is in the management UI. Next action: obtain suitable customer/agent accounts and portal access.
- PRD_KMG_011, 015: exact-title search, no-result state, Published status filtering, and category filtering were observed (E3), but suggestions, active-only agent search, and other filter combinations remain unverified. Next action: explore these behaviors with a suitable consumer role and known E2E-owned records.
- PRD_KMG_012: archive/restore management transitions were observed, but exclusion of archived or inactive articles from consumer search/navigation remains unverified. Next action: verify from an agent/customer portal.
- PRD_KMG_016–017: case linking and escalation turnaround guidance remain unverified; no suitable case or guidance workflow was explored. Next action: obtain safe case access and confirm where guidance is maintained.
- PRD_KMG_018, 021–022: role-specific author/admin permissions, inactive-article restrictions, and UI/search/API enforcement remain unverified because only one account of unknown role was available. Next action: obtain role-specific accounts and supported API evidence.
- PRD_KMG_023–025: analytics, external knowledge APIs, and scale/performance/backup/recovery targets remain unverified or lack access/defined measures. Next action: obtain reporting and API access, operational evidence, and quantitative targets.
- Observed menu row actions include “Delete” for an E2E-owned article (E4), but the active PRD does not describe deletion and no delete action was performed. This is an unconfirmed candidate outside the confirmed 14-flow inventory. Next action: clarify whether deletion is an intended Knowledge Management journey; if accepted, update the PRD and confirm a separate flow before authoring its scenario.

