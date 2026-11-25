# Report Templates flows

## Flows

| Flow | Outcome | Feature | Status |
| --- | --- | --- | --- |
| `TEN_RTM_LIST_FLOW` | Find templates via list, search, filters, sorting and pagination | `reports/report-templates.feature` | pending |
| `TEN_RTM_SAVED_VIEWS_FLOW` | Load a saved list view | `reports/report-templates.feature` | pending |
| `TEN_RTM_CREATE_FLOW` | Select and configure a report type, then create or cancel | `reports/report-templates.feature` | pending |
| `TEN_RTM_VIEW_DETAIL_FLOW` | Inspect a template report and its configuration | `reports/report-templates.feature` | pending |
| `TEN_RTM_EDIT_FLOW` | Candidate: update a template and observe its changed state | `reports/report-templates.feature` | pending |
| `TEN_RTM_DELETE_FLOW` | Candidate: delete a template and observe its removal | `reports/report-templates.feature` | pending |

## Gaps

- Pagination next/previous range changes and Report Name / Contains All no-match filtering were observed in RTM-scenario-01 but are not specified in the active PRD; use write-prd to assess and update the owning record.
- Workforce Management type selection showed fields and enabled Next (RTM-scenario-01), beyond PRD_RTM_004's Case Management observation. Use write-prd to assess and update the owning record; the downstream Workforce editor remains unverified.
