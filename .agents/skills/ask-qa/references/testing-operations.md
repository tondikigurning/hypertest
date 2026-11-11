# Carry out testing work

Read this for execution, investigations, reviews, maintenance and testing infrastructure changes. Combine it with the relevant authoring skill when editing tests. Commands and paths below are examples to verify against the live repo, not replacements for the current scripts/configuration.

## When no existing workflow fits

Use this for any testing-related request not covered by a specialist or a procedure below. The absence of a named mode, existing test suite or source-map entry does not exclude it.

1. Establish the outcome and relevant project boundary: what the user needs to know, decide, produce or change, and what evidence would demonstrate success. Infer what the repo and conversation already establish; ask only for consequential unknowns.
2. Discover the affected behavior, requirements, dependencies and testing support. Follow relevant code and configuration beyond the source map when needed. Separate unsupported tooling from missing documentation and missing intended-behavior decisions.
3. Choose or develop the smallest suitable approach. Reuse existing project conventions and apply specialist procedures to any covered portion. If the request requires a new capability, identify and implement the necessary additions within the authorized scope; do not silently substitute an easier testing concern or redefine success around the existing tools.
4. Carry out the requested work and validate it with evidence appropriate to the outcome. This may mean an explanation grounded in sources, a justified testing decision, an executable check, a repeatable process or a verified implementation. Preserve the existing review and data-safety boundaries.
5. Report what was established or completed, the evidence, and concrete remaining constraints. When the environment or an unresolved decision prevents part of the outcome, finish independent work and identify the smallest missing prerequisite. Do not present lack of familiarity or absence from this document as a capability boundary.

## Run the requested tests

1. Inspect the relevant `package.json`, selected test files and runner configuration. Establish the working directory, script target, filter/project selection and prerequisites. Prefer a finite, scoped run over a watch process. For an explicitly requested full run, run that scope rather than silently substituting a subset.
2. Check the relevant environment without printing credential values. For live E2E, inspect the selected setup and mutation steps/POMs against the data-safety reference before execution. A configured fallback URL is not evidence that it is the user's intended environment. Ask only if the target cannot be established from the request, conversation or local configuration. Do not run unsafe seed mutations just because an existing test contains them.
3. State the command, scope and material side effects briefly. Local test execution, BDD generation and required artifact regeneration are ordinary parts of an authorized testing task. Check the working tree so their effects can be distinguished from existing work.
4. Execute with the actual shell, wait for completion and inspect the exit code, selected test count, failures and skips. Confirm filters matched the intended tests. A zero-test run is not a pass. Capture enough evidence to diagnose a failure without exposing credentials or dumping huge logs.
5. Inspect generated changes and output paths. Report the observed result and artifacts. For a run-only request, report failures and investigate enough to explain them; edit code when repairs are also requested or authorized. Do not silently turn a run-only request into a repair/refactor project.

### Command selection and shell handling

- Unit/integration: run from the owning package/app to preserve reporter context. A scoped local invocation can be `pnpm exec vitest run <test-file>`. Read that package's config and scripts first; a directory filter or project flag may be needed.
- Unit catalogs: regenerate using `TEST_WRITE=1` from the owning project with all tests contributing to each affected catalog and without name/tag filters. The writer replaces a catalog with received results, so inspect the generated diff.
- BDD: from `e2e`, `pnpm test:bdd` generates with `bddgen` and then runs Playwright using `playwright.bdd.config.ts`. Verify forwarded flags before narrowing by scenario/flow/project. Do not execute stale generated tests after `.feature` changes. Generation may inspect all configured features even when execution is filtered, so an unrelated undefined step can block a scoped run; report that dependency rather than changing unrelated scenarios.
- BDD catalog writes: the reporter refreshes catalogs for covered features even without `TEST_WRITE=1`. Filtered-out scenario rows retain previous status/last-run. Inspect row timestamps; do not describe a partial run as fresh verification of the whole catalog.
- BDD quarantine: inspect the current fixture. It currently skips `@quarantine` unless `RUN_QUARANTINE=1`. Vitest quarantine and BDD quarantine do not necessarily execute the same way. Do not clear `@fixme` or quarantine to manufacture a pass; investigate the underlying issue when requested.
- Vitest quarantine: the current wrapper and reporter do not themselves make a tagged failure non-blocking; `TEST_TAGS` matches all requested tags, so a scenario carrying both smoke and quarantine can match a smoke filter. Inspect the actual job and distinguish implementation from the strategy's intended policy.
- Reports: root `pnpm test:report` invokes `scripts/aggregate-report.mjs`; inspect which runners and extra packages it actually runs. `TEST_E2E=1` includes BDD, `TEST_WRITE=1` writes a dated report, and `TEST_COVERAGE=1` requests code coverage. BDD's catalog writes still apply during an otherwise temporary aggregate run.
- Existing-result modes: `node scripts/aggregate-report.mjs --no-run` aggregates existing results; `--from-aggregate=<path>` re-renders a saved snapshot in place. Neither reruns tests. Inspect input timestamps and scope for stale or mixed results and label them clearly.
- Storybook: inspect `apps/docs/package.json` and the CI job first. Its `test` script builds, installs browsers and manages a server; `test-storybook` expects a reachable Storybook. Choose the path that fits the requested scope and current server, and stop only processes you started.
- Use Bash `TEST_WRITE=1 <command>` syntax only in Bash-compatible shells. In PowerShell, set process environment variables, execute the command, capture its exit code, and restore their previous values in `finally`. Do not leave `TEST_TAGS`, `TEST_WRITE`, `CI`, `RUN_QUARANTINE` or other task-specific flags set for later runs. Quote paths and filter expressions for the actual shell. Existing environment filters must be accounted for when promising a full run.
- If PowerShell blocks the `pnpm.ps1` shim under its execution policy, use the installed `pnpm.cmd` entry point rather than changing the machine's policy.

If a prerequisite fails, identify the actual cause (dependency, browser, build, auth, app reachability, permission or data), attempt an appropriate fix within scope, and retry when new evidence justifies it. Do not repeatedly run the same failing setup or claim unexecuted tests passed. Finish checks that do not depend on the missing prerequisite, then give the exact remaining command, working directory and prerequisite.

## Investigate, fix or refactor

Reproduce with the smallest relevant test selection and read the full failure and related implementation before editing. Distinguish product defects from incorrect tests, async/setup problems, missing data/environment, configuration, generator/reporter defects and stale artifacts. A troubleshooting table suggests hypotheses; it does not establish the cause.

For requested repairs, change the responsible layer and apply its specialist workflow. Preserve behavior, assertions, permanent IDs, references and review history during refactors. Follow shared fixtures, POM/COM and mock consumers to avoid fixing one scenario while breaking another. If expected behavior is unclear or contradicts requirements, resolve it before rewriting assertions. For a product defect outside the authorized scope, report expected versus actual with evidence and the proposed next action.

For flaky behavior, use targeted reruns or traces only as needed to establish a cause, then verify the fix with a justified repeat. Prefer stable observable-state waits, deterministic setup and appropriate mock boundaries. Do not use blanket timeout/retry increases, weaker assertions or skips as the repair. Quarantine, when appropriate and authorized, is a disclosed temporary treatment of unreliability, not proof that the defect is fixed.

Verify the affected behavior first, then shared consumers or required checks justified by the change. New regression tests should exercise meaningful behavior. When writing them, apply `write-unit-tests` or the reviewed E2E workflow. Regenerate affected catalogs through their producers; inspect diffs for missing rows and unintended ID/status changes.

## Maintain and enhance the testing system

For Automation app work, use the app entries in the source map to trace the relevant UI, server, catalog, runner and evidence chain. Implement the requested app outcome directly, including cross-layer changes when needed. Read the app README and draft specification alongside current code: proposed hosted behavior is not evidence that it already exists. Preserve stable scenario identities and accurately distinguish generated catalog results, execution availability, actual runs and evidence freshness. Change generated catalogs through their producers, not by hand.

The current local runner is a loopback development preview, not a hosted execution service: inspect its actual restrictions and the README before changing or exposing it. Running scenarios can mutate live data and refresh catalogs; inspect the selected setup and steps against E2E data-safety rules before execution. Do not run BDD generation concurrently with the local runner because generated files are shared. For changes involving sessions, runner access, artifacts or Drive, trace authorization, environment isolation, input validation and secret handling; preserve existing limits unless the requested feature explicitly addresses them. Do not treat a local preview as proof of hosted readiness.

Validate the affected app behavior with suitable focused checks, using the app's actual scripts and existing server tests. Apply `write-unit-tests` for Vitest authoring and the E2E specialist workflows when changing scenario intent or E2E implementation; ordinary app UI/server changes alone do not require a scenario-design interview or approval. Use browser inspection when it helps verify a UI change and follow the browser skill when applicable.

For reporter, schema, generator, aggregation or export changes, trace the relevant chain: authored scenario metadata → runner/adapter → result JSON → catalog/aggregate → rendered report/export. Identify which producers and consumers are affected. Preserve the result contract and output paths unless the requested change calls for a migration.

Read nearby tests and add or update meaningful behavior checks when needed. For example, a filtered BDD catalog run should preserve unexecuted rows and their prior results; an aggregation change should not silently count stale inputs as a fresh full run. Use focused fixtures or a temporary output directory for generator checks where supported, so validation does not overwrite unrelated reports. Do not regenerate every report to validate a small renderer change.

For runner configuration or CI changes, inspect workflow callers, working directories, package/build prerequisites, environment-variable names, selection, failure propagation, artifacts and catalog freshness checks. Validate the requested behavior with a suitable local equivalent when feasible. Distinguish a local check from an actual CI run. A currently non-blocking test job is an implementation fact, not permission to weaken other gates. Do not change QA-owned targets merely to satisfy coverage checks.

For testing docs or skills, edit the maintained source and check references, commands and related workflow boundaries. Keep generated catalogs/reports separate from hand-maintained guidance. Do not copy long procedures from a specialist into this skill; improve the owning workflow when authorized and refer to it.

For external export, inspect the CLI and prepare a local preview/dry run first. Root `pnpm test:export --dry-run --report <report-dir>` is a starting point to verify. Publishing to Google Drive/Sheets or triggering remote CI requires authorization for that action and destination; reuse existing explicit authorization. An ordinary request to generate a local report does not imply publication. Never expose credential values or repeat an ambiguous external mutation blindly; inspect the destination state before a retry.

## Review coverage or teach a workflow

For a review/audit, compare requirements and consumer-visible behavior with actual tests and recent execution evidence. Report gaps, weak assertions, inappropriate mocking, duplicate coverage, inaccessible roles/data and misleading metrics with paths and practical impact. Separate missing tests, stale specifications and missing verification. Review-only requests produce findings and recommendations; implement changes when the user asks for them.

For coverage, distinguish code coverage, scenario-type coverage, and business-flow coverage. The generated flow metric counts flows declared in feature scenarios; registry-only candidates are outside its denominator. Check meaningful branches and discovery limitations before declaring a module covered. A raw percentage alone does not establish testing quality or release readiness.

For teaching, follow the main skill's owner-style explanation. Use a real local example and explain how to read its metadata, run it and interpret its artifacts. If the user requests a hands-on change, carry it through the applicable specialist workflow and verification. If only a walkthrough is requested, show the example without editing the repo.
