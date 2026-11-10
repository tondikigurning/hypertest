# Hypertest Automation

This repo contains the local Automation preview at `/automation`, the BDD feature and generated catalog inputs it reads, and the runner dependencies needed to validate selected scenarios against a configured environment.

## Start

Use Node.js 22 or later and pnpm 11.1.3. From this directory:

```powershell
pnpm install
pnpm --filter @hyperscal/icons gen
pnpm --filter @hyperscal/icons build
pnpm --filter automation dev
```

Open `http://localhost:3110/automation`. Vite and the API bind to loopback on ports 3110 and 3111. Keep the preview local.

For environment-specific run results, start the local PostgreSQL service and migrate it:

```powershell
docker compose -f apps/automation/compose.yaml up -d
pnpm --filter automation db:migrate
```

Set `AUTOMATION_DATABASE_URL` in the shell used to start the API and run Drizzle migrations when using a non-default database. Optional Drive configuration uses `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_FILE`, plus `GOOGLE_DRIVE_FOLDER_ID`; the local Drive client reads these from the repo-root `.env.local` or process environment. Set an optional `BASE_URL` in `apps/tenants/.env.local`. For runs in the Automation UI, enter `E2E_USERNAME` and `E2E_PASSWORD` in **Variables**; the password stays in the browser tab and is sent only with the run request. Direct `pnpm --filter tenants test:bdd` reads the BDD credentials from `apps/tenants/.env.local`. Keep these files ignored and never put credentials in agent chat or committed files. `.env.example` lists supported variable names and is not loaded automatically.

The first agent session needs a committed `HEAD` in this repository. New sessions use that actual commit as their base and create a detached worktree under `.cache/automation-agent/workspaces`. The QA Agent retains its local conversation and worktree across API restarts. It does not run draft scenarios, push branches, or create pull requests.

## Scenario safety

The feature files and Markdown catalog rows under `apps/tenants/tests/bdd/features` and `testing-docs/e2e/tenants` were copied from their source repository. The Markdown files are generated inputs and must be refreshed through the BDD reporter, not edited manually. Scenario execution can mutate live data. Before running a feature, review its setup, steps, tags, and E2E data-safety guidance in `.agents/skills/write-e2e-scenarios/references/data-safety.md`. No BDD scenarios or Drive operations are run by the repository checks.

The app runner requires Chromium and the local BDD workspace. Install the browser with `pnpm --filter tenants exec playwright install chromium`. The live runner is available only through the loopback API, validates every selected scenario against Playwright collection, and distinguishes test outcomes from evidence uploads. The current environment targets and local-preview limitations are documented in [apps/automation/README.md](apps/automation/README.md).

## Checks

```powershell
pnpm exec biome check apps/automation
pnpm --filter automation typecheck
pnpm --filter automation build
node --test 'apps/automation/server/**/*.test.mjs'
```
