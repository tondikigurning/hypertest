# Browser session management

Use a named session so the task's browser is distinct from existing sessions:

```bash
playwright-cli -s=qa-task open <url>
playwright-cli -s=qa-task snapshot
playwright-cli -s=qa-task close
```

Run `playwright-cli list` when needed to identify sessions. Close only the session started for the task. If attached to an existing external browser, use the installed CLI's `detach` command for that session rather than closing the user's browser. Avoid `close-all`, `kill-all` and `delete-data` as routine cleanup: they can affect other work.

Use a persistent profile only when the task requires persisted state. An existing profile can contain credentials and user data; do not delete, overwrite or reuse it without appropriate authorization. See [storage-state.md](storage-state.md). Verify attach, browser and profile options in installed `playwright-cli --help`.
