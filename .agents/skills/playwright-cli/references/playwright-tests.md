# Running and debugging Playwright tests

Inspect the owning package's scripts, runner version and configuration first. For tenant BDD, `pnpm test:bdd` from `e2e` runs `bddgen` before Playwright; inspect selected setup and mutation steps against [data-safety.md](../../write-e2e-scenarios/references/data-safety.md) before running. Use the reviewed BDD authoring workflow for scenario or step changes.

Check the installed runner's `playwright test --help` before choosing flags. The project's Playwright 1.55.1 documents boolean `--debug`; do not assume it supports `--debug=cli` or a CLI-attach session. Use the supported inspector, traces, or a separate CLI browser session as appropriate. If a newer installed runner actually exposes debug attachment, follow that version's help.

Select the smallest relevant test for diagnosis, use the correct configuration and working directory, and account for setup dependencies. A listing or generation step alone is not a test pass. Keep sensitive authentication state out of output and version control. Rerun the affected behavior after a requested fix and report failures, skips and environment limitations. Stop only debug processes and sessions started for this task.
