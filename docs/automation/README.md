# Automation

Automation is a local preview of the product described in [SPEC.md](../../SPEC.md). From the repository root, run `pnpm dev` and open `http://localhost:3110/automation/`. Vite serves the UI on port 3110 and proxies API requests to the Express server on port 3111. Both ports must be available.

The API reads authored BDD features from `e2e/tests/bdd/features` and creates or replaces their metadata in PostgreSQL at startup. The explorer reads `automation_scenario_catalog`; `pnpm db:sync-catalog` refreshes it without restarting the API. Scenario catalog files are not generated in Markdown. The static build includes a feature snapshot for use when the API is unavailable.

## Database setup

The local runner stores the latest results by environment and scenario in PostgreSQL through Drizzle. For a fresh setup, run these commands from the repository root:

```sh
docker compose up -d
pnpm db:migrate
pnpm db:sync-catalog
```

The development database uses `127.0.0.1:55432`, database and user `automation`, and the local-only password `automation`. Set `AUTOMATION_DATABASE_URL` in the API and migration process environments to use another database. Do not use the development credentials for a shared deployment. Migrations are in `drizzle/`; generate new ones with `pnpm db:generate`.

Existing results without an environment are not imported because their target is unknown. The static build snapshot does not include environment-specific results.

Each completed Automation run upserts its result in `automation_latest_results` for the selected environment and scenario. The row stores the outcome, execution time, duration, evidence URL, upload status, and outline example results. The explorer overlays these values on the feature sourced catalog; it does not replace the authored scenario metadata with run data. The local runner writes once after execution and again after evidence upload so the final upload status is retained.

Direct `pnpm --filter e2e test:bdd` runs refresh the scenario catalog when `AUTOMATION_DATABASE_URL` is set. They also write environment-specific results when both `AUTOMATION_ENVIRONMENT_ID` (the matching Automation environment ID) and `AUTOMATION_DATABASE_URL` are set. Without the environment ID, the existing unscoped BDD results workflow continues. Results waiting for a database write are kept in `.cache/automation-results-pending` and retried at the next Automation server start or BDD import against the same database. If a process crashes before Playwright writes its result file, rerun the test.

## Source layout

`src/main.tsx` starts React and loads shared styles and icons. `src/app` composes the explorer. Scenario, run, evidence, and agent logic and feature-specific UI live in `src/features`. Shared UI components are exported from `src/components/index.ts` (`Modal`, `CloseButton`, `CollapsibleRegion`, `FilterSelect`, `Spinner`, and `RetryButton`). Keep feature behavior in its feature folder. The controls have app-specific focus, loading, and close behavior.

Shared assets and the global stylesheet are in `src/assets` and `src/styles`. The stylesheet is global because selector order affects existing overrides. The local Express API, catalog and runner modules are in `server/`.

```text
server/
  app.mjs                   # Compose routers and HTTP middleware
  server.mjs                # Bind the development server to loopback
  middleware/               # Shared HTTP error and not-found handlers
  modules/
    catalog/                # Catalog routes, controller and parsing
    runs/                   # Run routes, selection, progress and execution
    evidence/               # Evidence routes, controller and Drive client
    agent/                  # Local agent routes, sessions and workspaces
  shared/                   # Request checks used by multiple features
```

The API runs on the machine that starts it. Hosted authentication, a persistent queue, worker deployment, and environment-specific hosted storage are not implemented.

The `/automation` home opens the QA Agent. The collapsible sidebar browses modules; feature pages use `/automation/features/<route-key>` URLs and can be bookmarked. Older feature paths and `module` or `submodule` query links redirect when a matching feature exists. Unknown paths return home. The agent widget stays available while browsing and keeps the same conversation when returning home.

## QA Agent preview

The widget connects to a locally installed, authenticated Codex app-server. Choose `ask-qa`, `write-e2e-scenarios`, or `write-e2e-code` from **Skills**. A selected skill applies to the next message; follow-up messages continue that skill, and a new chat defaults to `ask-qa`. Press Enter to send, Ctrl+Enter (Command+Enter on macOS) for a new line, or **Stop agent** to interrupt a turn.

Use the current explorer selection or **Add context** to attach a menu, category, or scenario. On the home page, only menus are available; within a menu, categories match explorer groups such as Create. Context stays in the composer until removed and is included with each message. The picker accepts up to eight items; the server limits resolved context to 64 KB.

**Attach file** accepts PNG, JPEG, GIF, WebP, PDF, DOCX, XLSX, and UTF-8 text files. Each file can be up to 4 MB; all files together can be up to 8 MB. Extracted text counts toward the 64 KB context limit. PDFs need selectable text; scanned PDFs require OCR. Convert legacy DOC/XLS files to DOCX/XLSX first. Images are sent as images; text is extracted from documents and spreadsheets. Attachments clear after sending. Do not attach credentials. Transcript labels show which context was attached; they do not prove the model followed every skill instruction.

New sessions use the destination repository's committed `HEAD` and create a detached worktree under `.cache/automation-agent/workspaces`. Uncommitted and ignored files are not included. Existing sessions keep their original base and branch. Dependencies are linked from the local checkout and remain outside the agent's writable worktree. Scenario and feature selections are resolved against the worktree; stale or ambiguous selections are rejected. Start a new chat from the commit that contains the intended source and catalog.

Use **Review changes** to inspect tracked and new files. The preview can commit the reviewed version to a local branch; review it again after any change. Binary changes appear as Git binary patches and need a local viewer. Pull request submission is disabled; the preview does not push branches or create PRs.

Changed feature files appear in the review panel with all scenarios in the file, including unchanged ones. If a draft contains E2E implementation changes, the panel blocks approval of its scenario changes. Remove or preserve those implementation changes separately, review the scenarios, then restore the implementation changes for their own review. Committing the agent worktree does not update the current checkout or redeploy Automation. Inspect `git worktree list` and use the team's normal Git workflow to integrate a branch.

Codex command and file approval requests are separate from QA review. For changed `.feature` or `.flows.md` files, **Approve reviewed scenario changes** records approval for the current file contents. The preview blocks an explicit `/write-e2e-code` turn or a commit if those contents differ from the approved snapshot. This does not enforce automatic specialist handoffs, flow-list review, historical scenario approval, or data-safety rules; those still depend on the agent and user.

Draft scenarios appear in the current preview user's explorer with new, changed, or deleted labels. Draft execution and **Finalize** are disabled while the workflow is being verified. The QA Agent does not run draft scenarios. The explorer runner can run scenarios in the current checkout, but its results do not verify unmerged agent changes. Report draft verification as not run unless there is actual runner evidence.

The conversation and worktree reference are stored in `.cache/automation-agent/session.json`; Codex also stores its thread state. Workspaces remain if Codex fails to start, and worktrees and branches remain after a new chat or restart. Pending tool requests do not survive an API restart. Credentials must not be sent through chat or a custom note. If Codex marks a question as secret, the widget sends a credential-withheld message instead.

For `write-e2e-scenarios`, Variables and the selected environment are sent to the local API to prepare a named authenticated `playwright-cli` session. The agent receives the session name and target, not credential values. Login state is transferred through a private temporary directory and removed afterwards. The authenticated browser remains sensitive and closes on a new chat or environment/account change. It may outlive the API after a crash until the CLI idle timeout. Set Variables in the same tab before sending the scenario request. If login fails, check Variables and target access, then retry without sending credentials in chat.

The frontend assigns a persistent dummy preview identity per browser profile. Tabs in one profile share the agent conversation; other dummy identities are isolated. This is not authentication or a security boundary, and other local API features still use shared state. The earlier unscoped conversation remains in its session file but is not opened automatically by the dummy-identity UI. Codex, Git, Git author identity, and model access must be configured on the local machine.

## Architecture and contribution rules

Follow the [repository AGENTS.md](../../AGENTS.md) as well as these app-specific rules:

- Keep `src/app` responsible for screen composition and navigation. Put scenario filtering and grouping in `features/scenarios/selectors.ts`, as pure functions independent of React and browser APIs.
- Keep network lifecycle and cancellation in feature hooks or services. `use-scenario-catalog.ts` owns catalog loading, static snapshot fallback, and refresh after a completed run.
- Keep shared UI in `src/components` and feature-specific UI and types in their feature. Preserve scenario keys and IDs; source IDs can be missing or duplicated.
- Validate selections on the server. Keep credentials and local paths out of public output. Do not enable hosted execution without the controls described in the specification.
- Follow Biome and TypeScript strict mode. Explain narrow suppressions where source data or an intentional browser fallback requires them. Preserve the global stylesheet cascade.
- For behavior changes, verify the affected workflow and add coverage using the repository's testing conventions. Never hand-edit generated scenario catalogs.

From the repository root, run `pnpm exec biome check src server vite.config.ts drizzle.config.ts`, `pnpm typecheck`, and `pnpm build`. These checks do not execute BDD scenarios.

## Local execution

Choose DEV, STT, STT1, or PP in the top bar before running; STT1 is selected initially. A configured `BASE_URL` remains available if it does not match a listed environment. The target stays fixed during a run.

Drive evidence is stored per run under `E2E Evidence/<environment>/<app>/<feature path>/<scenario ID>/<run ID>/`. The viewer shows only the latest uploaded run. Existing unscoped evidence remains in Drive but is not attributed to an environment. Automation reads environment-specific results from PostgreSQL; existing Markdown results remain unscoped.

Runner preparation is cached for the API process lifetime. After generation, unchanged BDD sources, configuration, lockfile, test-utils sources, and generated output reuse the prior generation. Playwright discovery is scoped to selected feature files and cached for up to 32 feature selections. Each request still validates IDs against collected tests. Changes to tracked runner inputs or generated files invalidate both caches. The first run after an API restart performs generation and collection; authentication, execution, and evidence upload run every time.

The local server can run one scenario, a whole feature, or a category within a feature. Set required environment variables in the top bar; values stay in the current browser tab session. Add any future runner variables to the runner controller's variable definitions. The selected target is shown before submission, and feature or category runs include the whole selected group regardless of search and filters.

The server resolves IDs from its catalogs, generates BDD tests, checks Playwright collection by exact scenario ID, then runs the matching projects. If a selection contains a missing, ambiguous, or unregistered ID, or if the feature and catalog disagree, the run stops instead of running only part of the selection.

The live panel shows periodic Chromium frames and Playwright step progress. It is view-only. Locally produced screenshots and videos appear per scenario; temporary authentication state is removed after the process ends. Artifacts remain in a temporary local directory. The server keeps only the most recent run in memory, so a restart clears it. Do not run another local or CI BDD generation at the same time; generated test files are shared.

Progress polling reads only newly appended reporter events. Browser preview polling runs independently, pauses downloads in hidden tabs, and checks frame validators before downloading another JPEG. Frames are decoded before display to reduce flicker. Preview frames are best effort.

The active run can be reopened from the floating run indicator. After it ends, the app does not offer run history. If the preview remained open, it shows final progress until closed. Cancelling stops the local process; on Windows, this forcibly stops its process tree and can interrupt scenario cleanup. This does not implement the graceful after-scenario cancellation described for the hosted runner.

The local preview does not require sign-in and executes one run at a time through the loopback server. It does not enforce scenario data-safety approvals, so maintain the suite and test data accordingly. Each run stores its latest results in PostgreSQL and uploads available screenshots and videos to the selected environment's Drive folder, using the optional credentials described in the root README. Run results and evidence metadata do not write scenario catalog files. Missing Drive configuration and upload failures are reported separately from test outcomes.

Do not expose or deploy this preview. It has no access control, durable queue, or hosted evidence access. The development API reads the PostgreSQL catalog synced from BDD features; a built app uses the generated feature snapshot and has no runner API.

Scenario details include source tags, steps, outline examples, and references. A reference opens a scenario only when exactly one matching ID exists in the catalog. External references, missing IDs, and duplicate IDs remain unresolved. Scenarios without a unique stable ID and outlines without examples are unavailable for selection. Other execution availability stays unknown until runner registration and bindings are verified; catalog metadata alone does not authorize execution.

Hosted execution needs a safe authenticated-session handoff, environment-isolated result and Drive storage, shared-data approval enforcement, and a durable cross-instance queue. The current `pnpm --filter e2e test:bdd` workflow uses configured credentials and shared output paths; do not expose it directly as a web endpoint.

The BDD configuration has opt-in integration points for a future trusted worker:

- `AUTOMATION_STORAGE_STATE` points to an absolute Playwright storage-state file and disables the normal setup dependency for authenticated projects.
- `AUTOMATION_OUTPUT_DIR` and `AUTOMATION_REPORT_DIR` isolate artifacts.
- An absolute `AUTOMATION_EVENTS_FILE` enables JSONL reporter events.
- An absolute `BDD_RESULTS_FILE` keeps the shared result reporter's JSON separate per run. The reporter preserves Playwright test IDs for outline examples.

These options do not provide session delegation, a queue, access control, or hosted evidence access. Storage-state files contain secrets and require secure, short-lived handling. Do not enable these options for untrusted requests.

`server/modules/runs/run-progress.mjs` reduces local reporter events to per-example and per-step progress and marks unfinished work interrupted if a worker exits unexpectedly. The local API exposes selected progress fields. Reporter events can contain local paths and failure messages; do not expose them to viewers without access controls and sanitization.
