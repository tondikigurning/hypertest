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

Set `DATABASE_URL` in the API and migration process environments to use a non-default database. Optional Cloudflare R2 evidence configuration uses `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, and `CLOUDFLARE_R2_BUCKET`; an optional `CLOUDFLARE_R2_ENDPOINT` overrides the standard account endpoint. Use a private bucket and an access key scoped to list, read, write, and delete the latest evidence objects. The runner reads these values from the repository-root `.env.local` or process environment. Evidence uploads are skipped when R2 is not configured. Set `ENV` in `e2e/.env.local` (for example, `ENV=stt1`); the target is `https://converge.${ENV}.hyperscal.com/`. The UI defaults to that environment and can select another listed environment. Terminal agents read tenant variables from that file. For runs in the Automation UI, enter `E2E_USERNAME` and `E2E_PASSWORD` under **Variables**. Optional `E2E_CASE_CUSTOMER_ID` is prefilled there from `e2e/.env.local` for case scenarios. The password stays in memory and is sent only to a run or an agent request that can start exploration. It is cleared after use and logout. Direct `pnpm --filter e2e test:bdd` reads BDD credentials from `e2e/.env.local`. Keep these files ignored, and never put credentials in agent chat or committed files. `.env.example` lists supported variable names; it is not loaded automatically.

The local QA Agent automatically prepares one workspace per signed-in Engineer using the current local checkout branch. Before each chat turn it checks that branch's committed HEAD, without fetching from origin. Q-Rex can also read tracked and non-ignored files, including uncommitted changes, from the local checkout through separate read-only tools. Its draft worktree under `.cache/automation-agent/workspaces` starts from committed source; draft changes and checkout changes are separate. Conversations and worktrees survive API restarts. Existing unfinished workspaces are retained. Review changes before submitting a pull request using the signed-in Engineer GitHub authorization. The optional session-scoped **Allow all agent approvals** mode can automatically permit agent review and live browser decisions; see the workflow guide for its scope. This remains a loopback development preview, not a hosted service; repository collaborators may see pushed branches.

The QA Agent uses Vercel AI SDK with OpenAI, Anthropic, Google, OpenRouter, Groq, DeepSeek, xAI, Mistral, 9Router, Ollama, and other OpenAI-compatible providers. Apply database migrations, open **Provider settings**, select **Set up encryption**, and save the provider endpoint and API key first. Available models load automatically from the saved provider; choose one from the list to use it for the chat. Tool calling is checked automatically before the model is selected. A local endpoint can be saved without a key if that server permits it; 9Router normally uses a key from its dashboard. The local preview accepts HTTP or HTTPS endpoints on localhost, 127.0.0.1, or ::1; other endpoints require HTTPS and public addresses. Provider APIs must support the OpenAI-compatible chat-completions and tool-calling contract for the compatible option. The generic compatible option stores one custom endpoint per local identity; native OAuth and provider-specific protocols beyond the listed SDK adapters are not implemented.

The setup button saves a randomly generated encryption key in `.cache/automation-agent/encryption.key`. Preserve this file across restarts and backups: saved provider keys cannot be decrypted without it. Alternatively, configure a 32-byte key in the ignored repository-root `.env.local` before setup:

```powershell
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64url'))"
```

The API encrypts provider keys before storing them in PostgreSQL. Saved keys are visible in the local provider settings and are not added to the agent prompt. An explicitly configured environment key takes precedence over the generated key: do not switch keys while retaining encrypted credentials. Provider keys and token totals are partitioned by the signed-in Engineer. Previous browser-partitioned data remains separate.

Q-Rex draft scenarios appear in Explorer. Select one and use **Run scenario** in Scenario Details; approved draft scenarios run through an isolated Docker runner after separate data-safety approval. The live run view shows browser frames and scenario progress while the draft runs. Automation UI runs retain screenshots and video but disable Playwright traces and HTML reports because they can contain credentials. The runner removes its temporary browser authentication state after the run. Draft results and evidence remain temporary and separate from official explorer results. The regular explorer runner executes scenarios from the current checkout and cannot verify unmerged agent changes. Browser exploration uses an origin-restricted proxy and may not work when the target depends on separate SSO, API, or asset origins. While Q-Rex explores, a draggable browser preview appears in Hypertest and closes when exploration ends. Chromium runs headlessly so no desktop browser window opens; the preview shows the managed CLI session.

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

Select a menu to use **View PRD**. Its one document covers the menu and all child test groups/files; child views do not have separate PRDs. Q-Rex stores PRDs and their versions in the configured PostgreSQL database, shared across browser identities; `docs/prd/<module>/<menu>.md` is their virtual identifier in agent tools, not a repository file. Manage versions in the PRD view; edit any version manually, or use **Edit with Q-Rex** on the active version. Attach a PDF, DOCX, Markdown, or text file in chat when importing. The agent explores the selected environment and requests review before marking observations validated. Documents have no draft or reviewed status. PRD edits do not become Git changes.

Terminal agents access the same PRDs using the same configured database and the [database access procedure](.agents/skills/ask-qa/references/prd-database-access.md), including reading, writing and explicitly requested version deletion.

The shared PRD migration stops if different browser identities have records for the same module and menu. Preserve and reconcile those records before retrying the migration. Non-conflicting legacy rows are retained in `automation_agent_prds_legacy_backup` when the migration succeeds.

The [terminal agent workflow](docs/automation/README.md#terminal-agent-workflow) uses the same local skills and reusable exploration records directly from the checkout. It can resume saved, uncommitted work in that checkout without a Q-Rex session or API restart.

## Workspace sign-in

The preview requires a workspace session. Engineers sign in with GitHub; only Engineers create Viewer accounts. Viewers must change their temporary password on first sign-in and after reset. Both roles can browse and run supported local scenarios; Q-Rex authoring and account management are Engineer-only. GitHub synchronization and PR operations use the active Engineer authorization. The loopback preview is not safe for public access. Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_CALLBACK_URL` in the repository-root `.env.local` or API process environment; process environment values take precedence. Configure the GitHub App with repository Contents write and Pull requests write permissions, install it on the configured repository, and register `http://localhost:3110/api/auth/github/callback` as the GitHub App callback and use that same URL in the environment; use the same loopback hostname in the browser. Set `AGENT_ENCRYPTION_KEY` to a stable random 32-byte base64url key before saving OAuth credentials. Preserve the key for existing encrypted provider credentials. Viewer passwords use salted scrypt and sessions expire after eight hours. Real GitHub OAuth requires the configured GitHub App and has not been exercised by the local mock tests. The current OAuth adapter accepts only loopback HTTP callbacks; a future hosted deployment needs separately designed callback and security configuration and is not provided here.

Draft-run evidence saved in the browser is separated by workspace account. Evidence saved before account isolation remains in the old browser database and is not automatically assigned to an account or deleted. Keep it if it is needed for a deliberate recovery; it is not shown as evidence for the newly signed-in account.
