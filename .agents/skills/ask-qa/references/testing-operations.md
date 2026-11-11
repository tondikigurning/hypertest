# Carry out E2E and Automation work

Use this for E2E execution, scenario maintenance, test infrastructure and Automation app changes. Apply the scenario or code skill when the work changes those artifacts.

## When no workflow fits

1. Establish the requested outcome and inspect the relevant app behavior, feature files, runner configuration and consumers.
2. Choose the smallest action within the user's scope. Preserve scenario IDs, review history, generated artifacts and the local runner's access limits.
3. Validate with evidence appropriate to the change. Do not treat a successful build or test generation as a passed browser scenario.
4. Report completed changes, checks actually run and any remaining constraint.

## Run BDD scenarios

1. Read the selected .feature setup, steps, tags and page/component objects. Follow .agents/skills/write-e2e-scenarios/references/data-safety.md before scenarios that can mutate live data.
2. Establish the target environment and credentials without printing secret values. A configured fallback URL does not prove that it is the intended environment.
3. Check the working tree and report the command, selection and material side effects before running.
4. Run from the e2e package with pnpm test:bdd. This runs BDD generation and Playwright; do not run it concurrently with the Automation local runner because generated files are shared.
5. Inspect the selected count, failures, skips and generated output paths. A filtered run does not freshly verify scenarios it did not execute.

The runner skips @quarantine scenarios unless RUN_QUARANTINE=1 is set. Inspect the active fixture and filters before interpreting a selection. Do not remove @fixme or quarantine tags to manufacture a pass.

## Maintain scenarios and scenario metadata

- Change scenario intent only through the flow-list confirmation and scenario review gates in write-e2e-scenarios. Technical implementation and repair of reviewed scenarios follow write-e2e-code.
- Keep BDD feature files as the authored scenario source. The Automation API syncs their metadata to PostgreSQL; BDD runs write result JSON separately.
- Keep catalog metadata, actual Playwright outcomes and evidence upload status distinct.

## Maintain the Automation app

Read README.md, docs/automation/README.md, SPEC.md, package.json and vite.config.ts before changes to the app or runner. Trace UI, server, catalog, result and evidence consumers as applicable. The local preview is loopback-only and is not a hosted execution service.

Use the checks appropriate to the changed code: pnpm exec biome check src server vite.config.ts drizzle.config.ts, pnpm typecheck, and pnpm build. Use the browser skill when browser behavior needs inspection. Run BDD scenarios only when requested or needed for the change, after checking data safety.

For reporter or catalog changes, trace authored feature metadata → PostgreSQL catalog sync, and Playwright execution → result JSON → evidence handling. For runner or CI changes, inspect working directories, environment names, selection, failure propagation and artifact paths. A workflow definition is not evidence of a successful run.

## Review coverage

Compare business requirements and user-visible outcomes with the actual feature scenarios and recent execution evidence. Report missing journeys, weak assertions, mock boundaries, inaccessible roles/data and misleading coverage metrics with paths and impact. A matching flow tag or passing batch does not prove that the complete business flow has been discovered or covered.
