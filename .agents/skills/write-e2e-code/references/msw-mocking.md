# Network mocking with MSW (apps/tenants BDD)

The BDD suite uses `@msw/playwright` (`msw` and `@msw/playwright` v0.6+) for tag-driven interception. It uses `page.route()` under the hood, so no service worker is needed. Both packages are in the `testing` catalog in `pnpm-workspace.yaml` and in `apps/tenants` devDependencies.

## Three layers

```
features/_components/*.feature     master contracts (happy path + @mock error/delay scenarios)
        |  @ref:TEN_COM_*_E2E_*
        v
features/<module>/*.feature        submodule scenarios reuse master Gherkin via @ref + @mock
        |
        v
steps/_shared/*.steps.ts           context-aware Given/When/Then (filter, search, sort, pipeline, view-detail)
        |  pageContext + list-page-network-utils.ts
        v
steps/<module>/*.steps.ts          module-specific mutation and auth mocks (create, edit, suspend, login)
```

| Layer                                       | Responsibility                                                                         | Examples                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Component masters (`features/_components/`) | Define reusable interaction and error/delay contracts once                             | `filter-search.feature`, `sort.feature`, `view-detail.feature` |
| Submodule features                          | Mirror masters with submodule IDs. Link via `@ref`. Do not duplicate step text         | `users.feature` `@ref:TEN_COM_FSR_E2E_002`                     |
| Shared steps (`steps/_shared/`)             | Generic Gherkin (`the search API ...`) resolved to the right list API by `pageContext` | `filter-search.steps.ts`, `feedback-state.steps.ts`            |
| Module steps                                | Page-specific mutation or auth endpoints the list helpers do not cover                 | `users.steps.ts`, `authentication.steps.ts`                    |

## When to use `@mock`

| Scenario tag        | MSW active   | Backend hit             | When                                                                         |
| ------------------- | ------------ | ----------------------- | ---------------------------------------------------------------------------- |
| `@smoke`            | never        | always                  | Release-gating P0 journeys. The real backend must validate production parity |
| `@regression`       | no (default) | yes                     | Stable reads, UI-only interactions, cancel and close flows                   |
| `@regression @mock` | yes          | intercepted per handler | Volatile mutations (create, update, delete) or error boundary and edge cases |

Never add `@mock` to a `@smoke` scenario.

Add `@mock` to a `@regression` scenario when either:

1. The scenario simulates an API error, delay or auth failure the real backend cannot reliably reproduce, or
2. The scenario performs a volatile mutation whose side effects can break later pipeline runs.

Component master error and delay scenarios in `features/_components/` always carry `@mock`. Submodule mirrors use `@mock @ref:TEN_COM_*_E2E_*` so the same shared steps hit the correct list API.

## Timing: which pattern to use

**Interaction-triggered** (filter, search, sort, pipeline tab, detail panel). Open the list against the real backend first. Register the handler in an `And` step. Then let the user action trigger the mocked request.

```gherkin
@TEN_COM_FSR_E2E_002 @regression @mock @flow:TEN_COM_FILTER_SEARCH_FLOW @type:negative
Scenario: Search shows error state when the API returns 500 server error
  Given a list page with search is open
  And the search API is configured to return a 500 server error
  When the user searches for "test"
  Then the application shows an error state
```

A submodule mirror uses the same steps with its own ID and `@ref`, for example `@TEN_USR_LST_E2E_006 @regression @mock @flow:TEN_USR_LIST_FLOW @type:negative @ref:TEN_COM_FSR_E2E_002`.

**Navigation-triggered** (initial load, auth redirect). Register the handler in a `Given` step before the `When` navigation. Use a raw `page.goto` that does not wait for the table. The POM `navigateTo()` waits for table rows, which would never resolve.

```gherkin
@TEN_USR_LST_E2E_013 @regression @mock @flow:TEN_USR_LIST_FLOW @type:negative
Scenario: App handles token expiration gracefully when the users API returns 401
  Given the users API is configured to return a 401 authentication error
  When the user navigates to the users list page
  Then the user is redirected to the login page or shown an access denied message
```

## Context-aware list handlers

Register list handlers through `list-page-network-utils.ts`. Never hard-code `/users/` vs `/user-groups/` in shared step text.

```ts
import { HttpResponse, delay as mswDelay } from "msw";
import { registerListFilterHandler } from "../../utils/list-page-network-utils";

Given("the search API is configured to return a 500 server error", async ({ network, pageContext }) => {
  registerListFilterHandler(network, pageContext, () =>
    HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
  );
});

Given("the search API response is delayed by 4 seconds", async ({ network, pageContext }) => {
  registerListFilterHandler(network, pageContext, async () => {
    await mswDelay(4_000);
    return HttpResponse.json({ data: [], totalCount: 0 });
  });
});
```

`registerListFilterHandler` registers GET and POST on the filter URL for the active page. Detail-panel mocks use `registerListDetail500()` or `registerListDetailHandler()`.

List-page `Given` steps call `syncPageContextFromScenario(pageContext, { url, tags })` first so `pageContext.currentPage` is set before navigation. `resolvePage()` then picks `usersPage` or `userGroupsPage` (or the matching page for the new module).

## Key helpers (`utils/list-page-network-utils.ts`)

| Helper                                                    | Purpose                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `navigateToList()`                                        | Go to the list path, reset filter/sort/pipeline URL state, wait for table rows        |
| `registerListFilterHandler()`                             | MSW handler for filter, search, sort and pipeline on the active list API (GET + POST) |
| `registerListDetail500()` / `registerListDetailHandler()` | MSW handler for detail-panel GET                                                      |
| `ensureListResponseTracking()` / `armListResponseProbe()` | Track in-flight list responses for assertions                                         |
| `waitForMocked500()` / `waitForDelayedListResponse()`     | Network evidence for the mocked response or delay; not proof of UI feedback           |

Constants (`utils/list-page-constants.ts`): `USERS_LIST_PATH`, `USERS_FILTER_API`, `USER_GROUPS_LIST_PATH`, `USER_GROUPS_FILTER_API`. Add the equivalent constants for a new list page rather than hard-coding URLs in steps.

## Shared feedback assertions (`steps/_shared/feedback-state.steps.ts`)

- The existing `Then the application shows an error state` may fall back to a mocked 500, and the existing loading step may fall back to a delayed response. Those fallbacks do not establish the visible behavior named in either step. Do not rely on them as proof of UI feedback.
- For a scenario promising visible error or loading feedback, assert the actual visible state. Network probes may supplement that assertion, but must not replace it. If feedback is absent, report the failure or product gap; do not change approved intent to match it.

For search, `filter-search.steps.ts` arms a response probe (`armListResponseProbe`) before typing, so delayed and error assertions stay reliable.

## Module-specific mutation and auth mocks

Volatile create, edit, delete and action flows use page-specific `Given` steps in `steps/<module>/` with direct `network.use()` calls:

```ts
import { http, HttpResponse } from "msw";

Given("the create user API is configured to return a 500 server error", async ({ network }) => {
  network.use(
    http.post(/\/iam\/tenant\/users/, () => HttpResponse.json({ message: "Internal Server Error" }, { status: 500 })),
  );
});
```

Auth mocks live in `steps/auth/authentication.steps.ts`. They do not use `pageContext`, because auth is not list-page scoped.

## Fixture behavior

`network` and `pageContext` run for every scenario (`fixtures/base.fixture.ts`). The network fixture reads the scenario tags at runtime:

```ts
if (testInfo.tags.includes("@mock")) await network.enable(); // activates MSW via page.route()
await use(network);
if (testInfo.tags.includes("@mock")) await network.disable();
```

For non-`@mock` scenarios, `enable()` is never called and every request reaches the real backend.

`@quarantine` scenarios are skipped unless `RUN_QUARANTINE=1` is set. Several `@mock` detail-panel and filter scenarios are quarantined while app instability is investigated.

## Tag placement

```gherkin
# Order: ID -> cross-cutting -> @mock -> @quarantine -> @flow -> @type -> @ref
@TEN_USR_LST_E2E_006 @regression @mock @flow:TEN_USR_LIST_FLOW @type:negative @ref:TEN_COM_FSR_E2E_002
```

- Keep `@mock` scenarios in the same flow section as their happy-path counterparts.
- For navigation-triggered mocks, register the handler in `Given` before the `When` step.
