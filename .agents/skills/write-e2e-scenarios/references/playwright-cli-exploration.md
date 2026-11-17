# Browser exploration by host

Read the [shared workflow contract](../../ask-qa/references/workflow-contract.md) for scope/environment/entity defaults and approval boundaries, and [data safety](data-safety.md) before interaction. Select the profile from the tools actually exposed, not commands mentioned in a reference.

## Q-Rex managed browser

Use the provided `playwright_cli` tool. The runtime owns the authenticated named session and starts it on demand; do not open another session, perform a separate login, inspect secret files or request credentials in chat. Missing configuration is resolved through the selected environment and browser Variables.

| Need | Supported action |
| --- | --- |
| Current element refs | `snapshot`; `find` with target text; read returned snapshot files with `read_file` |
| Navigation | `goto` with a URL/path within the selected target origin |
| Interaction | `click`, `fill`, `press`, `check`, `uncheck`, `select`, with the required `dataOwner` and native approval |
| Locator verification | `generate-locator` with a current element ref |
| Available network/console context | `requests`, `console` |
| Session cleanup | `close` for this managed browser only |

These tools do not expose shell/help commands, `request <n>` or full bodies/headers, DOM `eval`, `run-code`, screenshots, tracing, recording, network routing/mocking, storage operations or arbitrary browser JavaScript. Do not express an unsupported operation through another argument or tool. A terminal CLI's larger command set is not a bridge capability.

Use snapshots and locator generation for verified alternatives. Request listings establish only the fields they actually return; do not infer request bodies, response schemas or hidden attributes. For a mock whose contract remains unknown, inspect relevant existing reviewed test contracts and report any remaining implementation gap rather than inventing one.

For evidence, record a dated sanitized factual observation, environment, screen/role, exact visible outcome, and available snapshot/request context in the existing PRD log or review output. State that an image/trace/full request was not captured when unavailable. Never fabricate a saved artifact path. An unsupported evidence format alone need not block documenting an otherwise observed defect or PRD.

## Terminal CLI

Read [playwright-cli](../../playwright-cli/SKILL.md) and verify the installed `playwright-cli --help`/command help; use the `.cmd` shim if PowerShell blocks `.ps1`. Do not automatically install or upgrade. Use one owned named session consistently:

```bash
playwright-cli -s=qa-task open <url>
playwright-cli -s=qa-task snapshot
playwright-cli -s=qa-task find "<text>"
playwright-cli -s=qa-task click <ref>
playwright-cli -s=qa-task requests
playwright-cli -s=qa-task request <index>
playwright-cli -s=qa-task generate-locator <ref>
playwright-cli -s=qa-task close
```

Log in with configured credentials without printing them. Use a persistent profile only when needed, preserve other sessions and protect stored authentication. Use supported element inspection when snapshots are insufficient. Capture safe screenshots/traces where useful and supported; retain their real returned paths. Generic CLI examples do not override project authoring or data-safety gates.

## Evidence loop for both hosts

1. Navigate through the app's accessible navigation, using PRD/test artifacts as leads rather than guessing routes.
2. Snapshot and find the relevant section; use current `eNN` refs. Search/page large snapshots instead of loading the whole tree.
3. Follow the authorized journey and re-snapshot after navigation or material rerenders. Prefer observable state over sleeps or blanket network-idle waits.
4. Verify locators against the current page; if no supported alternative verifies one, record the gap.
5. Inspect available request evidence before asserting API/mock contracts. A response or request listing does not prove the visible state promised by a scenario.
6. Record inaccessible roles, unavailable data, blocked mutations and tooling limits individually. Protect credentials, customer data and sensitive request contents in notes and artifacts.

If no supported browser is available, retain the draft and exact blocker. PRD import text can be prepared, but review-ready PRDs and scenario discovery still require their scoped live exploration. Do not present a PRD-only inventory as browser discovery or author scenarios before that prerequisite.
