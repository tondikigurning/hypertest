# filter — Scenario Catalog

> Generated from tests. Do not edit by hand.

| ID | Type | Category | Method | Tags | Title | Expect | Scenario |
| -- | ---- | -------- | ------ | ---- | ----- | ------ | -------- |
| TEN_COM_FIL_E2E_001 | ui-interaction | Filter — Component | e2e | regression, flow:TEN_COM_FILTER_FLOW | Each filter option triggers API and returns matching rows | the filter triggers an API call that returns HTTP 200; the filter response includes rows that match the selected value | Given a list page with filters is open<br>When the user applies the "&lt;filter_option&gt;" filter option<br>Then the filter triggers an API call that returns HTTP 200<br>And the filter response includes rows that match the selected value<br>Example: filter_option=created_at<br>Example: filter_option=display_name<br>Example: filter_option=created_by_name<br>Example: filter_option=sub_tenant_unit_uuid |
| TEN_COM_FIL_E2E_002 | negative | Filter — Component | e2e | regression, flow:TEN_COM_FILTER_FLOW | Filter request shows error state when API returns 500 server error | the application shows an error state | Given a list page with filters is open<br>And the filter API is configured to return a 500 server error<br>When the user applies the first available filter option<br>Then the application shows an error state |
| TEN_COM_FIL_E2E_003 | edge-case | Filter — Component | e2e | regression, flow:TEN_COM_FILTER_FLOW | Filter shows loading state while waiting for a slow API response | a loading indicator or spinner is visible before the results load | Given a list page with filters is open<br>And the filter API response is delayed by 4 seconds<br>When the user applies the first available filter option<br>Then a loading indicator or spinner is visible before the results load |
