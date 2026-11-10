# Scenario ID scheme

```
<PKG>_<COMPONENT>_<TIER>_<NNN>

FLT_BLN_UT_003
 |   |   |   +-- sequence number
 |   |   +------ tier
 |   +---------- component code (BLN = boolean-input)
 +-------------- package code (FLT = filters)
```

IDs are **permanent**. A removed scenario's ID is retired: never reused, never renumbered.

## Package codes

| Code  | Package / app             |
| ----- | ------------------------- |
| `DV`  | `packages/dataview`       |
| `UI`  | `packages/internal/ui`    |
| `FLT` | `packages/filters`        |
| `CMD` | `packages/command`        |
| `FRM` | `packages/internal/form`  |
| `UTL` | `packages/internal/utils` |
| `TRN` | translation               |
| `API` | api                       |
| `TEN` | `apps/tenants`            |
| `ADM` | `apps/admin`              |
| `SSO` | `apps/sso`                |

Component codes are assigned per package (e.g. `PIP` = pipeline-renderer, `BLN` = boolean-input, `CAL` = calendar, `TPC` = template-calendar). Reuse existing codes from source and catalogs. For a new component, choose a noncolliding 3-letter code and report it; ask only when a project ownership decision is unclear.

## Tier codes

| Code  | Meaning                     |
| ----- | --------------------------- |
| `UT`  | Unit                        |
| `IT`  | Integration                 |
| `E2E` | End-to-end (Playwright BDD) |
| `MAN` | Manual (human-only check)   |

E2E IDs for `apps/tenants` use an extended format; see `.agents/skills/write-e2e-scenarios/references/e2e-conventions.md`.

## Picking the next number

1. Search current test source and generated catalogs for the same `<PKG>_<COMPONENT>_<TIER>_` prefix. Inspect relevant git history and recorded retirements where available; catalogs alone may be missing or stale.
2. Use a number above the highest known current or retired number for that prefix. Start at `001` only when the available evidence shows no earlier IDs; report uncertainty when history is unavailable.
3. Sequence each tier independently (`_UT_`, `_IT_`, `_MAN_`). Preserve existing IDs in conversions and refactors; never recycle retired IDs.
