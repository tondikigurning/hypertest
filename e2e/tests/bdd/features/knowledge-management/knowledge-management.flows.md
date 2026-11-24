# Knowledge Management flows

## Flows

| Flow | Outcome | Feature | Status |
| --- | --- | --- | --- |
| `TEN_KMG_CREATE_FLOW` | Create articles and guides with required content | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_REVIEW_FLOW` | Submit, review and publish articles | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_EDIT_FLOW` | Update articles and versions | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_ARCHIVE_FLOW` | Archive, restore or delete articles | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_LIST_FLOW` | Find and browse articles | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_DETAIL_FLOW` | Read content, details and history | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_ORGANIZE_FLOW` | Manage categories and tags | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_LANGUAGE_FLOW` | Access translated content | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_SELF_SERVICE_FLOW` | Consume public self-service knowledge | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_TICKET_LINK_FLOW` | Search and link articles in cases | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_ACCESS_FLOW` | Enforce knowledge access by role | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_ANALYTICS_FLOW` | Analyze searches, views and feedback | `knowledge-management/knowledge-management.feature` | pending |
| `TEN_KMG_API_FLOW` | Distribute content through APIs | `knowledge-management/knowledge-management.feature` | pending |

## Gaps

- PRD_KMG_003: source says the prior published version is archived, while STT1 showed it as Superseded after publishing version 2 (KM-review-version-01). Confirm whether these states are equivalent; product intent remains unresolved.
- PRD_KMG_001: guides, media and attachment outcomes remain unobserved; investigate accessible authoring controls and suitable test data.
- PRD_KMG_009–013, 016–024: category/tag management, multilingual/customer portals, active-only agent search, ticket linking, TAT, role access, analytics and external API remain unestablished due to account/evidence/contract limits; locate suitable access and contracts. Absence is unresolved, not established.
- PRD_KMG_001: media, guides and attachment outcomes remain unobserved; investigate accessible authoring controls and suitable test data.
- PRD_KMG_009–013, 016–024: category/tag management, multilingual and customer portals, active-only agent search, ticket linking, TAT, roles, reports and external API not established by available account/evidence; locate access, appropriate role accounts and integration contracts. Absence is unresolved.
- PRD_KMG_025: scalability, recovery and performance targets/outcomes require operational evidence and defined targets; identify service owners.
- KM-archive-01: Archive moved an E2E-owned published article from Published into Archived, and Unarchive returned it to Published. Update the owning PRD to describe observed lifecycle behavior and reconcile archived/inactive visibility requirements (including PRD_KMG_012) with portal behavior when role access is established; customer/agent surfaces remain unobserved.
- Observed Delete control and detailed version-history surface have absent or incomplete PRD outcomes (KM-lifecycle-01, KM-detail-01); investigate owned-data effects and update the owning PRD where appropriate. No deletion outcome has been established.
