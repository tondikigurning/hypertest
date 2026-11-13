# Q-Rex workflow in the local Automation preview

Q-Rex is a tool-calling QA collaborator. The API runs the model loop and gives it scoped file,
review, question and browser tools. It does not give the model a shell. The workflow
instructions are the repository skills in `.agents/skills`; the runtime adapter is
`server/modules/agent/agent-skills.mjs`.

## Start and prerequisites

Follow the root [README](../../README.md) for dependencies, PostgreSQL, migrations and local startup.
The agent automatically prepares one workspace using the default target branch (development when available). Configure a provider and choose a model that has passed the tool-calling check. Drafts use committed source in a separate worktree; uncommitted changes in
the explorer checkout do not appear there. The API runtime uses the running checkout's implementation.
Skill files and product/test sources are read from the selected draft's committed base and draft edits.

For tenant exploration, select the environment and enter `E2E_USERNAME` and `E2E_PASSWORD` in browser
Variables. Chat sends these variables separately to the local API, including when starting from
`ask-qa`; the runtime uses them for browser authentication and redacts their
values from model messages and saved conversations. Do not paste credentials into chat.

Exploration requires the installed `playwright-cli` and Playwright Chromium. Separate SSO, asset or API origins are blocked by the target-origin restriction.

## Workflow and review boundaries

The default workflow uses the review gates below. When an approval is pending, **Allow all agent approvals** can be enabled for the current draft session. It automatically allows PRD and flow requests and live browser approvals, and bypasses scenario approval gates. These are automatic decisions, not human reviews. The mode resets on chat reset or API restart. Scenario approval and automatically confirmed flows do not carry over as manual decisions. Questions and explicit PR submission still need user action. Workspace and origin restrictions and scenario identity validation still apply.

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
6. Agent workspace scenarios cannot be executed in this preview. The explorer runner runs the current checkout only and does not verify unmerged agent changes.

Live browser interactions request separate data-safety approval. Seed/shared data remains read-only
unless a specific browser operation receives scoped approval under the skill's data-safety rules.
File/command permissions, flow confirmation,
scenario approval and live-data approval are separate decisions.

Tools replace the shell examples in skills: `list_files`, `read_file`, `write_file`, `edit_file`,
`show_diff`, `ask_user`, `confirm_flows`, `playwright_cli` and `use_skill`.
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
pnpm exec biome check src server vite.config.ts drizzle.config.ts
pnpm typecheck
pnpm build
```

The agent tests drive the real AI SDK streaming/tool loop with a deterministic local provider and
temporary Git repositories. They cover PRD review, skill handoffs, flow confirmation, scenario
approval, workspace selection, redaction, and the absence of workspace scenario execution.

The separate browser smoke test uses real Playwright, the installed CLI and the origin-restricted
proxy against a synthetic loopback login/dashboard. It needs no provider, database or tenant account.
It verifies authentication-state transfer, snapshots, locator generation, approval before interaction,
network visibility, relative navigation and target-only egress after authentication-state loading.
It does not verify tenant login/SSO or Docker execution.


Production-provider reliability, tenant business behavior and real draft BDD outcomes require a
scoped live acceptance pass with the chosen provider, reviewed target/batch, intended environment,
Variables and explicit data-safety decisions. Build success and deterministic fixture results do not
establish those outcomes.
