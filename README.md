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

Set `AUTOMATION_DATABASE_URL` in the API and migration process environments to use a non-default database. Optional Cloudflare R2 evidence configuration uses `CLOUDFLARE_R2_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, and `CLOUDFLARE_R2_BUCKET`; an optional `CLOUDFLARE_R2_ENDPOINT` overrides the standard account endpoint. Use a private bucket and an access key scoped to list, read, write, and delete the latest evidence objects. The runner reads these values from the repository-root `.env.local` or process environment and prefers R2 when it is fully configured. Without R2 configuration, the optional Drive uploader remains available through `GOOGLE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_FILE`, plus `GOOGLE_DRIVE_FOLDER_ID`. Set an optional `BASE_URL` in `e2e/.env.local`. For runs in the Automation UI, enter `E2E_USERNAME` and `E2E_PASSWORD` under **Variables**. The password stays in the browser tab and is sent only with the run request. Direct `pnpm --filter e2e test:bdd` reads BDD credentials from `e2e/.env.local`. Keep these files ignored, and never put credentials in agent chat or committed files. `.env.example` lists supported variable names; it is not loaded automatically.

The local QA Agent allows one unfinished draft per browser identity at a time. Each draft starts from a selected target branch in its own worktree under `.cache/automation-agent/workspaces`; conversations and worktrees survive API restarts. Reviewed draft scenarios can run through the isolated local runner after an explicit data-safety confirmation. Results and evidence stay in this browser and do not update official run records. Drafts can be synchronized with the target branch and submitted through the locally configured GitHub CLI. PR history loads when its tab is opened. This is a loopback preview, not sign-in or hosted user privacy; repository collaborators may see pushed branches.

The QA Agent uses Vercel AI SDK with OpenAI, Anthropic, Google, OpenRouter, Groq, DeepSeek, xAI, Mistral, 9Router, Ollama, and other OpenAI-compatible providers. Apply database migrations, open **Provider settings**, select **Set up encryption**, and save the provider endpoint and API key first. Available models load automatically from the saved provider; choose one from the list to use it for the chat. Tool calling is checked automatically before the model is selected. A local endpoint can be saved without a key if that server permits it; 9Router normally uses a key from its dashboard. The local preview accepts HTTP or HTTPS endpoints on localhost, 127.0.0.1, or ::1; other endpoints require HTTPS and public addresses. Provider APIs must support the OpenAI-compatible chat-completions and tool-calling contract for the compatible option. The generic compatible option stores one custom endpoint per local identity; native OAuth and provider-specific protocols beyond the listed SDK adapters are not implemented.

The setup button saves a randomly generated encryption key in `.cache/automation-agent/encryption.key`. Preserve this file across restarts and backups: saved provider keys cannot be decrypted without it. Alternatively, configure a 32-byte key in the ignored repository-root `.env.local` before setup:

```powershell
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64url'))"
```

The API encrypts provider keys before storing them in PostgreSQL. Saved keys are visible in the local provider settings and are not added to the agent prompt. An explicitly configured environment key takes precedence over the generated key: do not switch keys while retaining encrypted credentials. Provider keys and token totals are partitioned by this browser's local preview identity, which is an identifier and does not authenticate a user.

Draft test execution requires Docker. It builds a runner image from the draft's committed base, runs only the selected uniquely identified scenario with CPU, memory, process, and time limits, and permits network access only to the selected environment origin. The E2E username and password are passed to the isolated runner through standard input, not command arguments; provider API keys are not passed to it. Draft results stay separate from official run records, and draft evidence is not uploaded. Sandbox image builds need access to the package registry but receive no provider or E2E credentials. Browser exploration also uses an origin-restricted proxy; it may not work when the target depends on separate SSO, API, or asset origins. The agent model loop still runs in the local API process rather than in a per-draft container.

## Scenario safety

See the [Q-Rex workflow guide](docs/automation/README.md) for skill handoffs, review gates, available tools, draft execution and agent verification commands.

BDD feature files under `e2e/tests/bdd/features` are the authored scenario source. The Automation API creates or replaces the PostgreSQL scenario catalog at startup. Run `pnpm db:sync-catalog` to refresh it without restarting the API. BDD reporters write run results only; scenario catalog files are not generated in Markdown.

Scenario execution can change live data. Before running a feature, review its setup, steps, tags, and the E2E data-safety guidance in `.agents/skills/write-e2e-scenarios/references/data-safety.md`. Repository checks do not run BDD scenarios or upload external evidence.

The runner requires Chromium and the local BDD workspace. Install Chromium with `pnpm --filter e2e exec playwright install chromium`. The runner is available only through the loopback API, validates each selected scenario against Playwright collection, and reports test outcomes separately from evidence uploads. See the [Automation specification](docs/SPEC.md) for the app layout, runner behavior, and local-preview limits.

## Checks

```powershell
pnpm exec biome check src server vite.config.ts drizzle.config.ts
pnpm typecheck
pnpm build
```

The **View PRD** button in the scenario list header opens the submodule document on each module and submodule page (`/<module>/<submodule>`). It displays Markdown documents from `docs/prd/<module>/<submodule>.md` in the current checkout or selected QA Agent draft workspace. In a draft, manage PRD versions from a list: create, read, rename, edit, activate, or delete a version. An active version must be replaced before it can be deleted when other versions exist. The active version remains at the canonical `docs/prd/<module>/<submodule>.md` path so the agent skills continue to use it. Draft content can be edited in the PRD view; use **Edit with Q-Rex** for versions with reviewed or validated requirements. Attach a PDF, DOCX, Markdown, or text file in chat when importing. The agent explores the selected environment and requests review before marking observations validated. Draft documents remain in the draft worktree until submitted through its review and pull-request workflow; checkout documents are local files, not a hosted catalog.
