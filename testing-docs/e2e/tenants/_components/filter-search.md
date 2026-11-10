# filter-search — Scenario Catalog

> Generated from tests. Do not edit by hand.

| ID | Type | Category | Method | Tags | Title | Expect | Scenario |
| -- | ---- | -------- | ------ | ---- | ----- | ------ | -------- |
| TEN_COM_FSR_E2E_001 | positive | Filter Search — Component | e2e | regression, flow:TEN_COM_FILTER_SEARCH_FLOW | Search input filters rows by the first visible row "&lt;field&gt;" | the search returns matching rows | Given a list page with search is open<br>When the user searches for the first visible row "&lt;field&gt;"<br>Then the search returns matching rows |
| TEN_COM_FSR_E2E_002 | negative | Filter Search — Component | e2e | regression, flow:TEN_COM_FILTER_SEARCH_FLOW | Search shows error state when the API returns 500 server error | the application shows an error state | Given a list page with search is open<br>And the search API is configured to return a 500 server error<br>When the user searches for "test"<br>Then the application shows an error state |
| TEN_COM_FSR_E2E_003 | edge-case | Filter Search — Component | e2e | regression, flow:TEN_COM_FILTER_SEARCH_FLOW | Search shows loading state while waiting for a slow API response | a loading indicator or spinner is visible before the results load | Given a list page with search is open<br>And the search API response is delayed by 4 seconds<br>When the user searches for "test"<br>Then a loading indicator or spinner is visible before the results load |
