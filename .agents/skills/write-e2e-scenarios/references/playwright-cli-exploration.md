# Playwright CLI for exploration

Prefer `playwright-cli` for exploration: it saves snapshots to disk and returns element refs. If it is unavailable, use the availability fallback below.

The full command list is in the `playwright-cli` skill (`.agents/skills/playwright-cli/SKILL.md`). Verify command availability with the installed CLI's help. Key commands for this workflow:

| Need                   | Command                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Open the browser       | `playwright-cli -s=qa-task open` (use `--persistent` only when persisted state is needed)    |
| Navigate               | `playwright-cli goto <url>`                                                                  |
| Accessibility snapshot | `playwright-cli snapshot` (saves a file and returns `eNN` refs)                              |
| Search a snapshot      | `playwright-cli find "<text>"` or grep the saved file                                        |
| Interact               | `click <ref>`, `fill <ref> "<text>"`, `press <key>`, `check <ref>`, `select <ref> "<value>"` |
| Confirm API shape      | `playwright-cli requests`, `playwright-cli request <n>`                                      |
| Console errors         | `playwright-cli console`                                                                     |
| Evidence for `@fixme`  | `playwright-cli tracing-start` / `tracing-stop`, or `screenshot`                             |
| Command help           | `playwright-cli --help`                                                                      |

## Rules

1. Use one named session for the pass and log in once using configured credentials. Preserve other sessions and avoid exposing credentials.
2. Read saved snapshots with grep for the section you need. Never read the full tree inline.
3. Use `eNN` refs from the latest snapshot directly. Do not hand-write selectors from memory.
4. When the accessibility tree is ambiguous (for example Shadow DOM), inspect live element attributes through supported `playwright-cli` commands and confirm the locator against the page. If it cannot be verified, record the gap; do not guess.
5. Use `requests` to confirm real API routes, methods and status codes before you write any `@mock` scenario.
6. Screenshots are for visual sanity checks only.

## Availability

Check `playwright-cli --version` and `playwright-cli --help`. If unavailable, inspect locally installed tools and use a supported alternative where possible. Do not install or upgrade automatically.
