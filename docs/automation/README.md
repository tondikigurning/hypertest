# Q-Rex workflow in the local Automation preview

Q-Rex is a tool-calling QA collaborator. The API runs the model loop and gives it scoped file,
review, question, browser and draft-run tools. It does not give the model a shell. The workflow
instructions are the repository skills in `.agents/skills`; the runtime adapter is
`server/modules/agent/agent-skills.mjs`.

## Start and prerequisites

Follow the root [README](../../README.md) for dependencies, PostgreSQL, migrations and local startup.
Create an active draft with a target branch, configure a provider, and choose a model that has passed
the tool-calling check. Drafts use committed source in a separate worktree; uncommitted changes in
the explorer checkout do not appear there. The API runtime uses the running checkout's implementation.
Skill files and product/test sources are read from the selected draft's committed base and draft edits.

For tenant exploration, select the environment and enter `E2E_USERNAME` and `E2E_PASSWORD` in browser
Variables. Chat sends these variables separately to the local API, including when starting from
`ask-qa`; the runtime uses them for browser authentication and draft execution and redacts their
values from model messages and saved conversations. Do not paste credentials into chat.

Exploration requires the installed `playwright-cli` and Playwright Chromium. Draft execution also
requires Docker, package-registry access for its first image build, and an environment compatible
with the target-origin restriction. Separate SSO, asset or API origins are blocked by that restriction.

## Workflow and review boundaries

1. Start with a plain-language request or `/ask-qa`. Q-Rex resolves the scope using the repository,
   attachments and conversation. Its `use_skill` tool loads the appropriate specialist and updates
   the active instructions for following model steps and turns. The user can also select a skill
   explicitly. A missing skill in the draft is an error, not a successful handoff.
   Follow-up attachments from the explorer are validated against the immutable draft base before
   resolving their current draft source. Missing or ambiguous identities are rejected.
2. `write-prd` imports or explores one sub-module and records requirement provenance. Writing
   `status: reviewed` or new validated content presents the complete proposed document for explicit
   PRD approval. After approval Q-Rex reports and stops; scenario discovery resumes on another turn.
3. `write-e2e-scenarios` reads the matching reviewed PRD and explores the tenant. `confirm_flows`
   presents the described flow list for confirmation before scenario-intent changes. Confirmation
   is tied to the current PRD and feature contents and does not approve the scenarios.
4. Q-Rex writes one scenario batch and stops for review. Open **Changes**, inspect its preview and
   diff, then **Approve scenarios**. Chat answers, PRD review and flow confirmation do not replace
   this approval. A changed scenario snapshot invalidates approval for implementation and execution.
   **Reset draft changes** discards the reviewed draft diff, including commits created by synchronization,
   and returns the worktree to its current target baseline. It clears scenario and flow approvals;
   chat and PR history remain. The action requires a fresh review and confirmation. After a PR publication
   attempt, retry finalization to reconcile its history instead of resetting the draft.
5. On a subsequent turn, `write-e2e-code` implements the approved batch and preserves its IDs and
   intent. Existing implemented scenarios may receive intent-preserving technical repairs without
   creating a new scenario-design gate. Browser snapshots and `generate-locator` support locator
   verification; arbitrary browser JavaScript is unavailable.
6. `run_draft_scenario` can select a new scenario directly from draft source using its ID and file;
   it does not require an existing explorer selection. The server rejects missing, unavailable,
   ambiguous or moved identities. Each run needs browser Variables and a separate scoped data-safety
   approval. A draft changed while that decision is pending must be reviewed again before execution.
7. The Docker runner validates collection and runs the single selected scenario with restricted
   egress and isolated artifacts. Q-Rex reports the actual draft result. Inspect and clear draft
   evidence before continuing chat or starting another run. One passing scenario does not verify
   the rest of a batch. Draft outcomes do not update official explorer results or upload evidence.

Live browser interactions request separate data-safety approval. Seed/shared data remains read-only
unless a specific browser operation receives scoped approval under the skill's data-safety rules.
Draft scenario execution accepts E2E-owned data only. File/command permissions, flow confirmation,
scenario approval and live-data approval are separate decisions.

Tools replace the shell examples in skills: `list_files`, `read_file`, `write_file`, `edit_file`,
`show_diff`, `ask_user`, `confirm_flows`, `playwright_cli`, `use_skill` and `run_draft_scenario`.
Large source files can be read in pages with `startLine` and `lineCount`. References resolve relative
to the skill document but tool paths are relative to the worktree root. The model has a bounded
80-step turn; reaching that limit saves context and asks for a follow-up without claiming completion.
There is no standalone draft TypeScript-check tool; Q-Rex must report that check as unperformed
unless it has separate execution evidence.

## Verification

From the repository root (use `pnpm.cmd` if PowerShell blocks the `.ps1` shim):

```powershell
node --test server/modules/agent/*.test.mjs
node --test server/modules/agent/exploration-browser.smoke.mjs
node --test server/modules/agent/draft-run.smoke.mjs
pnpm exec biome check src server vite.config.ts drizzle.config.ts
pnpm typecheck
pnpm build
```

The agent tests drive the real AI SDK streaming/tool loop with a deterministic local provider and
temporary Git repositories. They cover PRD review, skill handoffs, flow confirmation, scenario
approval, new draft selection, redaction, and declined/stale execution approval. The isolated-runner
boundary is replaced with a test double; its reported pass is a fixture result, not a real BDD run.

The separate browser smoke test uses real Playwright, the installed CLI and the origin-restricted
proxy against a synthetic loopback login/dashboard. It needs no provider, database or tenant account.
It verifies authentication-state transfer, snapshots, locator generation, approval before interaction,
network visibility, relative navigation and target-only egress after authentication-state loading.
It does not verify tenant login/SSO or Docker execution.

The Docker smoke test creates its own temporary detached worktree, adds one synthetic BDD scenario
and a configuration that includes only that fixture, and runs it through the production sandbox.
It checks generation, collection, execution and isolated screenshot access without tenant auth,
official-result writes or uploads. It requires Docker Desktop with Linux containers and
`host.docker.internal` access to the loopback fixture; the first build downloads dependencies and
Chromium. Only the smoke test's own worktree, containers, network and temporary artifacts are removed.
Docker needs free disk space on its data drive. A read-only Docker data filesystem prevents image
builds and sandbox-network creation even when `docker info` succeeds; that is an infrastructure
blocker, not an executed or failed BDD scenario. Free space or relocate Docker data using Docker
Desktop before retrying the smoke test.

Production-provider reliability, tenant business behavior and real draft BDD outcomes require a
scoped live acceptance pass with the chosen provider, reviewed target/batch, intended environment,
Variables and explicit data-safety decisions. Build success and deterministic fixture results do not
establish those outcomes.
