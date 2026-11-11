# Hypertest Automation

This repository contains the local Automation preview and the BDD feature files and runner dependencies it uses. The app is available at `/automation` and runs selected scenarios against a configured environment.

## Start

Use Node.js 22 or later and pnpm 11.1.3. From the repository root:

```powershell
pnpm install
pnpm --filter @hyperscal/icons gen
pnpm --filter @hyperscal/icons build
pnpm dev
```

Open `http://localhost:3110/automation`. Vite and the API bind to loopback on ports 3110 and 3111. Keep the preview local.

For environment-specific run results, start the local PostgreSQL service and apply its migrations:

```powershell
docker compose up -d
pnpm db:migrate
pnpm db:sync-catalog
```

Set `AUTOMATION_DATABASE_URL` in the API and migration process environments to use a non-default database. Optional Drive configuration uses `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_FILE`, plus `GOOGLE_DRIVE_FOLDER_ID`; the local Drive client reads these from the repository-root `.env.local` or process environment. Set an optional `BASE_URL` in `e2e/.env.local`. For runs in the Automation UI, enter `E2E_USERNAME` and `E2E_PASSWORD` under **Variables**. The password stays in the browser tab and is sent only with the run request. Direct `pnpm --filter e2e test:bdd` reads BDD credentials from `e2e/.env.local`. Keep these files ignored, and never put credentials in agent chat or committed files. `.env.example` lists supported variable names; it is not loaded automatically.

The first QA Agent session needs a committed `HEAD` in this repository. New sessions use that commit as their base and create a detached worktree under `.cache/automation-agent/workspaces`. The agent retains its local conversation and worktree across API restarts. It does not run draft scenarios, push branches, or create pull requests.

## Scenario safety

BDD feature files under `e2e/tests/bdd/features` are the authored scenario source. The Automation API creates or replaces the PostgreSQL scenario catalog at startup. Run `pnpm db:sync-catalog` to refresh it without restarting the API. BDD reporters write run results only; scenario catalog files are not generated in Markdown.

Scenario execution can change live data. Before running a feature, review its setup, steps, tags, and the E2E data-safety guidance in `.agents/skills/write-e2e-scenarios/references/data-safety.md`. Repository checks do not run BDD scenarios or Drive operations.

The runner requires Chromium and the local BDD workspace. Install Chromium with `pnpm --filter e2e exec playwright install chromium`. The runner is available only through the loopback API, validates each selected scenario against Playwright collection, and reports test outcomes separately from evidence uploads. See the [Automation documentation](docs/automation/README.md) for the app layout, runner behavior, and local-preview limits.

## Checks

```powershell
pnpm exec biome check src server vite.config.ts drizzle.config.ts
pnpm typecheck
pnpm build
```
