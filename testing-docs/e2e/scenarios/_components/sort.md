# sort — Scenario Catalog

> Generated from tests. Do not edit by hand.

| ID | Type | Category | Method | Tags | Title | Expect | Scenario |
| -- | ---- | -------- | ------ | ---- | ----- | ------ | -------- |
| TEN_COM_SAP_E2E_001 | ui-interaction | Sort Controls — Component | e2e | regression, flow:TEN_COM_SORT_FLOW | All sort options work in both directions | each sort triggers an API call that returns HTTP 200; each sort response includes rows in the correct order | Given a list page with sort is open<br>When the user applies each sort option in ascending and descending direction<br>Then each sort triggers an API call that returns HTTP 200<br>And each sort response includes rows in the correct order |
| TEN_COM_SAP_E2E_002 | negative | Sort Controls — Component | e2e | regression, flow:TEN_COM_SORT_FLOW | Sort request shows error state when API returns 500 server error | the application shows an error state | Given a list page with sort is open<br>And the sort API is configured to return a 500 server error<br>When the user applies the first available sort option<br>Then the application shows an error state |
| TEN_COM_SAP_E2E_003 | edge-case | Sort Controls — Component | e2e | regression, flow:TEN_COM_SORT_FLOW | Sort shows loading state while waiting for a slow API response | a loading indicator or spinner is visible before the results load | Given a list page with sort is open<br>And the sort API response is delayed by 4 seconds<br>When the user applies the first available sort option<br>Then a loading indicator or spinner is visible before the results load |
