---
name: playwright-cli
description: Automate browser interactions, inspect pages and traffic, and assist Playwright testing with the installed playwright-cli. Apply project-specific test authoring and data-safety workflows where relevant.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)
---

# Browser automation with playwright-cli

Read the [shared workflow contract](../ask-qa/references/workflow-contract.md) for authorized scope, target/entity defaults and approval boundaries. Before browser work select the actual host profile in [browser capabilities](../write-e2e-scenarios/references/playwright-cli-exploration.md).

**Q-Rex:** use only the managed `playwright_cli` actions in that profile. Its browser is already configured by the runtime; `generate-locator` replaces arbitrary DOM inspection. The terminal examples and references below do not add tools to Q-Rex. Report unsupported trace/image/request detail accurately.

**Terminal host:** confirm the installed `playwright-cli --help` and command-specific help: supported commands depend on the installed version. In PowerShell, use the `.cmd` shim if `.ps1` is blocked. Do not install or upgrade merely because a documented feature is unavailable; first use a supported local alternative.

For this repo's tenant E2E work, [write-e2e-scenarios](../write-e2e-scenarios/SKILL.md) owns flow discovery and reviewed Gherkin; [write-e2e-code](../write-e2e-code/SKILL.md) owns implementation of approved scenarios. Read [data-safety.md](../write-e2e-scenarios/references/data-safety.md) before live mutations. A browser recording or generated snippet does not establish intended behavior or approve a scenario.

## Work with a terminal session

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
- Terminal only: [request mocking](references/request-mocking.md), applying the project mock policy for BDD; [custom Playwright code](references/running-code.md), subject to the same task/data authorization.
- Terminal only: [session management](references/session-management.md), [storage state](references/storage-state.md), [tracing](references/tracing.md), and [video recording](references/video-recording.md). Load only the needed reference and check local support.
