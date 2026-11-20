# Hypertest Automation

This repository contains the local Automation preview and the BDD feature files and runner dependencies it uses. The app is available at `/` and runs selected scenarios against a configured environment.

## Start

Use Node.js 22 or later and pnpm 11.1.3. From the repository root:

```powershell
pnpm install
pnpm --filter @hyperscal/icons gen
pnpm --filter @hyperscal/icons build
docker compose up -d
pnpm db:migrate
pnpm dev
```

PostgreSQL is required for API startup because the API syncs the scenario catalog and stores app data. Start Docker Desktop with Linux containers before running `docker compose up -d`. Open `http://localhost:3110/`. Vite and the API bind to loopback on ports 3110 and 3111. Keep the preview local.

The API does not restart automatically when server files change, so edits do not interrupt an active QA Agent turn. Restart `pnpm dev` manually to load server changes after the agent finishes. For API development, `pnpm dev:api:watch` opts into automatic restarts; those restarts interrupt active turns.

Set `AUTOMATION_DATABASE_URL` in the API and migration process environments to use a non-default database. Optional Cloudflare R2 evidence configuration uses `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, and `CLOUDFLARE_R2_BUCKET`; an optional `CLOUDFLARE_R2_ENDPOINT` overrides the standard account endpoint. Use a private bucket and an access key scoped to list, read, write, and delete the latest evidence objects. The runner reads these values from the repository-root `.env.local` or process environment and prefers R2 when it is fully configured. Without R2 configuration, the optional Drive uploader remains available through `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_FILE`, plus `GOOGLE_DRIVE_FOLDER_ID`. Set an optional `BASE_URL` in `e2e/.env.local`. For runs in the Automation UI, enter `E2E_USERNAME` and `E2E_PASSWORD` under **Variables**. The password stays in the browser tab and is sent only with the run request. Direct `pnpm --filter e2e test:bdd` reads BDD credentials from `e2e/.env.local`. Keep these files ignored, and never put credentials in agent chat or committed files. `.env.example` lists supported variable names; it is not loaded automatically.

The local QA Agent automatically prepares one workspace per browser identity using the current local checkout branch. Before each chat turn it checks that branch's committed HEAD, without fetching from origin. Its separate worktree under `.cache/automation-agent/workspaces` starts from committed source; conversations and worktrees survive API restarts. Existing unfinished workspaces are retained. Review changes before submitting a pull request through the locally configured GitHub CLI. The optional session-scoped **Allow all agent approvals** mode can automatically permit agent review and live browser decisions; see the workflow guide for its scope. This is a loopback preview, not sign-in or hosted user privacy; repository collaborators may see pushed branches.

The QA Agent uses Vercel AI SDK with OpenAI, Anthropic, Google, OpenRouter, Groq, DeepSeek, xAI, Mistral, 9Router, Ollama, and other OpenAI-compatible providers. Apply database migrations, open **Provider settings**, select **Set up encryption**, and save the provider endpoint and API key first. Available models load automatically from the saved provider; choose one from the list to use it for the chat. Tool calling is checked automatically before the model is selected. A local endpoint can be saved without a key if that server permits it; 9Router normally uses a key from its dashboard. The local preview accepts HTTP or HTTPS endpoints on localhost, 127.0.0.1, or ::1; other endpoints require HTTPS and public addresses. Provider APIs must support the OpenAI-compatible chat-completions and tool-calling contract for the compatible option. The generic compatible option stores one custom endpoint per local identity; native OAuth and provider-specific protocols beyond the listed SDK adapters are not implemented.

The setup button saves a randomly generated encryption key in `.cache/automation-agent/encryption.key`. Preserve this file across restarts and backups: saved provider keys cannot be decrypted without it. Alternatively, configure a 32-byte key in the ignored repository-root `.env.local` before setup:

```powershell
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64url'))"
```

The API encrypts provider keys before storing them in PostgreSQL. Saved keys are visible in the local provider settings and are not added to the agent prompt. An explicitly configured environment key takes precedence over the generated key: do not switch keys while retaining encrypted credentials. Provider keys and token totals are partitioned by this browser's local preview identity, which is an identifier and does not authenticate a user.

The QA Agent does not execute scenarios from its workspace. The explorer runner executes scenarios from the current checkout and cannot verify unmerged agent changes. Browser exploration uses an origin-restricted proxy and may not work when the target depends on separate SSO, API, or asset origins. While Q-Rex explores, a draggable browser preview appears in Hypertest and closes when exploration ends. Chromium runs headlessly so no desktop browser window opens; the preview shows the managed CLI session.

## Scenario safety

See the [Q-Rex workflow guide](docs/automation/README.md) for skill handoffs, review gates, available tools and agent verification commands.

BDD feature files under `e2e/tests/bdd/features` are the authored scenario source. The Automation API creates or replaces the PostgreSQL scenario catalog at startup. Run `pnpm db:sync-catalog` to refresh it without restarting the API. BDD reporters write run results only; scenario catalog files are not generated in Markdown.

The sidebar follows module → menu → optional child test groups/files. Large menus and integration journeys stay inside their owning menu; see [test organization](docs/automation/test-organization.md) for paths, PRD ownership, IDs and migration rules. Selecting a parent shows and can run all its descendant scenarios.

Scenario execution can change live data. Before running a feature, review its setup, steps, tags, and the E2E data-safety guidance in `.agents/skills/write-e2e-scenarios/references/data-safety.md`. Repository checks do not run BDD scenarios or upload external evidence.

The runner requires Chromium and the local BDD workspace. Install Chromium with `pnpm --filter e2e exec playwright install chromium`. The runner is available only through the loopback API, validates each selected scenario against Playwright collection, and reports test outcomes separately from evidence uploads. See the [Automation specification](docs/SPEC.md) for the app layout, runner behavior, and local-preview limits.

## Checks

```powershell
pnpm exec biome check src server vite.config.ts drizzle.config.ts
pnpm typecheck
pnpm build
```

Select a menu to use **View PRD**. Its one document covers the menu and all child test groups/files; child views do not have separate PRDs. Q-Rex stores PRDs and their versions in PostgreSQL for the local preview identity; `docs/prd/<module>/<menu>.md` is their virtual identifier in agent tools, not a repository file. Manage versions in the PRD view; use **Edit with Q-Rex** for reviewed or validated requirements. Attach a PDF, DOCX, Markdown, or text file in chat when importing. The agent explores the selected environment and requests review before marking observations validated. PRD edits do not become Git changes.

Terminal agents access the same PRDs using the selected browser's local preview identity and the [database access procedure](.agents/skills/ask-qa/references/prd-database-access.md). This identity partitions local data and is not a login.
