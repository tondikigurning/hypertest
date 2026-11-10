# Commands, flags and troubleshooting

Verify the target package's scripts, configuration and active environment before running. For the project's broader execution guidance, including PowerShell, see [../../ask-qa/references/testing-operations.md](../../ask-qa/references/testing-operations.md).

## Flags

- `TEST_WRITE=1`: the Vitest writer produces committed unit catalogs and the aggregate produces dated reports. The BDD reporter refreshes catalogs for covered features even without this flag.
- `TEST_STRICT=1`: the scenario reporter fails when it finds executed Vitest tests without metadata; confirm that the selected project actually enables the reporter.
- `TEST_COVERAGE=1`: request code coverage for the aggregate.
- `TEST_E2E=1`: include the configured BDD suite in the aggregate; this does not by itself select smoke scenarios.
- `TEST_TAGS=smoke`: Vitest requires all listed tags; it does not exclude a scenario merely because it also has `quarantine`. BDD uses Playwright filters and its own fixture.
- `RUN_QUARANTINE=1`: the current BDD fixture permits quarantined scenarios to run; they are skipped by default. The current Vitest wrapper does not itself make quarantined failures non-blocking. The strategy's non-blocking intent and actual CI behavior must be reported separately.

Generate complete unit catalogs with all tests contributing to the affected catalog and no tag or name filters. The writer replaces each catalog with the results it receives; inspect the resulting diff.

## Command selection

| Purpose                 | Working directory  | Starting point and effects                                                                                                                                                    |
| ----------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused unit run        | Owning package/app | `pnpm exec vitest run <file>`; normally writes temporary reporter output when configured.                                                                                     |
| Regenerate unit catalog | Owning package/app | Run the complete contributing test file(s) with `TEST_WRITE=1`; inspect the printed catalog path and diff.                                                                    |
| Aggregate unit results  | Repo root          | `pnpm test:report`; invokes root Vitest and additional scenario-reporter projects, writes temporary output by default.                                                        |
| Aggregate including BDD | Repo root          | `TEST_E2E=1 pnpm test:report`; BDD requires its configured environment and can rewrite E2E catalogs even without `TEST_WRITE=1`. It is not inherently smoke-only.             |
| Official report         | Repo root          | `TEST_E2E=1 TEST_WRITE=1 TEST_COVERAGE=1 pnpm test:report`; writes catalogs and a dated report, and runs live BDD.                                                            |
| Existing results        | Repo root          | `node scripts/aggregate-report.mjs --no-run` aggregates existing temporary results; `--from-aggregate=<path>` re-renders an existing snapshot in place. Neither reruns tests. |

The inline environment examples use Bash syntax. In PowerShell set process environment variables and restore them afterward; when `pnpm.ps1` is blocked, use `pnpm.cmd`. For BDD execution inspect data safety and target environment first. Confirm selections and exit codes; a skipped or empty run is not a pass.

## Troubleshooting

- **Missing metadata or strict failure:** inspect the selected test and reporter configuration, then apply the unit authoring workflow.
- **Stale or incomplete catalog:** run all contributing tests without filters from the appropriate project, with `TEST_WRITE=1`; inspect the generated diff instead of hand-editing it.
- **No reporter output:** inspect the active config and Vitest project name; add or correct the reporter where appropriate.
- **Flaky test:** reproduce and diagnose it; tagging it `quarantine` alone does not currently guarantee Vitest or CI will ignore its failure.
- **E2E missing from aggregate:** check configured BDD feature globs, selected tests, runner output and `TEST_E2E`. A legacy runner is not automatically included.
- **`@fixme` versus `quarantine`:** `@fixme` marks a known E2E product defect with a real issue reference; quarantine describes unreliable tests. Inspect the active runner's skip and failure behavior.
