---
name: playwright-cli
description: Automate browser interactions, inspect pages and traffic, and assist Playwright testing with the installed playwright-cli. Apply project-specific test authoring and data-safety workflows where relevant.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)
---

# Browser automation with playwright-cli

Use the CLI for browser inspection and interaction. Confirm the installed `playwright-cli --help` and command-specific help: supported commands and options depend on the installed version. In PowerShell, use the installed `.cmd` shim if its PowerShell shim is blocked. Do not install or upgrade a tool merely because a documented feature is unavailable; first use a supported local alternative.

For this repo's tenant E2E work, [write-e2e-scenarios](../write-e2e-scenarios/SKILL.md) owns flow discovery and reviewed Gherkin; [write-e2e-code](../write-e2e-code/SKILL.md) owns implementation of approved scenarios. Read [data-safety.md](../write-e2e-scenarios/references/data-safety.md) before live mutations. A browser recording or generated snippet does not establish intended behavior or approve a scenario.

## Work with a session

Choose the target environment from the request and configuration. Use a named session you own and inspect an up-to-date snapshot before each interaction that needs a new ref:

```bash
playwright-cli -s=qa-task open <url>
playwright-cli -s=qa-task snapshot
playwright-cli -s=qa-task click <ref>
playwright-cli -s=qa-task fill <ref> "<value>"
playwright-cli -s=qa-task requests
playwright-cli -s=qa-task console
playwright-cli -s=qa-task close
```

Use role, label or verified test-ID locators from the snapshot or live element attributes; do not guess them. Prefer waiting for an observable state over sleeps or blanket network-idle waits. Re-snapshot after navigation or material UI changes. Use `find` or scoped snapshots when the page is large. See [element attributes](references/element-attributes.md).

Use named sessions to avoid interfering with existing browsers. Close or detach only the session started or attached for the task. Do not use `close-all`, `kill-all`, or delete a profile as routine cleanup. Preserve user-owned browser data and sessions. Avoid printing credentials, tokens, or sensitive request bodies; protect snapshots, storage state, traces and recordings as appropriate.

In PowerShell, quote URLs containing `&` and other shell metacharacters; use the syntax supported by the active shell. Check command output and errors rather than assuming an interaction succeeded.

## Task-specific guidance

- [Tenant app patterns](references/hyperscal-app-patterns.md): finding routes, authentication context and current UI evidence.
- [Running and debugging Playwright tests](references/playwright-tests.md): project runner, supported flags and safe execution.
- [Browser-assisted test authoring](references/test-generation.md): preserve reviewed behavior and use project authoring workflows.
- [Request mocking](references/request-mocking.md): inspect and simulate network behavior; apply project mock policy for BDD.
- [Running Playwright code](references/running-code.md): use `run-code` for operations not supported by CLI commands.
- [Session management](references/session-management.md), [storage state](references/storage-state.md), [tracing](references/tracing.md), and [video recording](references/video-recording.md): use the relevant reference only.
