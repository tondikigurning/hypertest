# Hypertest Automation sources

Paths are relative to the repository root. Follow callers and imports when the requested behavior crosses modules.

## Project guidance

| Topic | Start here |
| --- | --- |
| Local preview, setup, secrets and runner limits | `README.md`, `docs/automation/README.md`, `SPEC.md` |
| Contributor rules | `AGENTS.md`, `CLAUDE.md` |
| E2E business-flow discovery, review gates and registry | `.agents/skills/write-e2e-scenarios/SKILL.md`, its `references/flow-discovery.md`, scoped `.feature` and `.flows.md` files |
| Scenario IDs, tags, data safety and reusable contracts | `.agents/skills/write-e2e-scenarios/references/e2e-conventions.md`, `references/data-safety.md`, `e2e/tests/bdd/features/_components/` |
| Reviewed step definitions, page objects, fixtures and mocks | `.agents/skills/write-e2e-code/SKILL.md` and its relevant references |
| Browser inspection and authenticated sessions | `.agents/skills/playwright-cli/SKILL.md` and its relevant references |

## Automation app

| Topic | Start here |
| --- | --- |
| Explorer, scenario details, filters and catalog loading | `src/app/`, `src/features/scenarios/`, `server/modules/catalog/` |
| Run selection, execution, progress and cancellation | `src/features/runs/`, `server/modules/runs/`, `e2e/playwright.bdd.config.ts` |
| Evidence viewing and Drive upload | `src/features/evidence/`, `server/modules/evidence/`, `packages/internal/test-utils/src/export/evidence-cli.ts` |
| Agent sessions and draft review | `src/features/agent/`, `server/modules/agent/` |
| Commands and build configuration | `package.json`, `e2e/package.json`, `vite.config.ts`, `pnpm-workspace.yaml` |

The README and live implementation describe the local preview. The specification is a draft for a hosted product; verify code before claiming hosted behavior.

## E2E sources and artifacts

| Topic | Start here |
| --- | --- |
| Authored BDD scenarios | `e2e/tests/bdd/features/` |
| Step definitions, page/component objects, fixtures and test data | `e2e/tests/bdd/steps/`, `pages/`, `components/`, `fixtures/`, `utils/` |
| BDD execution and project selection | `e2e/package.json`, `e2e/playwright.bdd.config.ts`, `e2e/tests/bdd/setup/` |
| Scenario metadata and Playwright result reporting | `packages/internal/test-utils/src/playwright/`, `packages/internal/test-utils/src/schema/` |
| Scenario catalog synchronization | `server/modules/catalog/` reads authored feature files and syncs metadata into PostgreSQL |
| Local results and browser evidence | `temp/test-results/`, `e2e/playwright-report/bdd/`, `e2e/test-results/bdd/`; check timestamps and actual output paths |
| E2E result persistence | `server/modules/results/`, run result consumers and the database schema |

Before running scenarios that can mutate live data, inspect their setup and steps and follow the E2E data-safety guidance.
