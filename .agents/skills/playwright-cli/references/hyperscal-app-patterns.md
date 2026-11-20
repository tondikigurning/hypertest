# Hyperscal tenant browser patterns

Treat page names, routes, data, labels and locators as environment-dependent. Discover the scoped page through app navigation, the PRD and existing E2E artifacts, then confirm current controls with a fresh `playwright-cli snapshot`; do not assume a fixed home page, module list, label or test ID.

Use the configured target environment and existing authentication setup. Read variable names from config without printing credential values. Keep credentials, storage state, snapshots and traces containing sensitive data out of logs and version control.

For project E2E discovery follow [write-e2e-scenarios](../../write-e2e-scenarios/SKILL.md), including [data safety](../../write-e2e-scenarios/references/data-safety.md); for approved BDD implementation use [write-e2e-code](../../write-e2e-code/SKILL.md). Check existing shared steps and POM/COM implementations before creating new patterns. Prefer observable state and verified locators over fixed sleeps or guessed selectors. Before mutating data, identify and recheck the exact target. Use E2E-owned data; seed mutations require explicit scoped approval, including when upstream-only data prevents creation in the current menu. Explain the dependency before confirmation and restore and verify wherever possible.

Follow [host capabilities](../../write-e2e-scenarios/references/playwright-cli-exploration.md). Q-Rex exposes managed snapshots, locator generation, request listings and console context; full request details, arbitrary JavaScript and trace/image capture are unavailable. Terminal hosts may use installed CLI request/detail commands after checking help, with the task's named session. Close only the browser owned by the task.
