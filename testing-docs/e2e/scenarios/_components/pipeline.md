# pipeline — Scenario Catalog

> Generated from tests. Do not edit by hand.

| ID | Type | Category | Method | Tags | Title | Expect | Scenario |
| -- | ---- | -------- | ------ | ---- | ----- | ------ | -------- |
| TEN_COM_PIP_E2E_001 | ui-interaction | Pipeline Renderer — Component | e2e | regression, flow:TEN_COM_PIPELINE_TAB_FLOW | Selecting a pipeline tab activates it | the "&lt;tab&gt;" pipeline tab is active | Given a list page with pipeline tabs is open<br>When the user selects the "&lt;tab&gt;" pipeline tab<br>Then the "&lt;tab&gt;" pipeline tab is active<br>Example: tab=Active<br>Example: tab=Suspended<br>Example: tab=Account Lockout<br>Example: tab=Invited<br>Example: tab=Cancelled |
| TEN_COM_PIP_E2E_002 | negative | Pipeline Renderer — Component | e2e | regression, flow:TEN_COM_PIPELINE_TAB_FLOW | Pipeline tab request shows error state when API returns 500 server error | the application shows an error state | Given a list page with pipeline tabs is open<br>And the pipeline tab API is configured to return a 500 server error<br>When the user selects the "Suspended" pipeline tab<br>Then the application shows an error state |
