# Q-Rex workflow in the local Automation preview

Q-Rex is a tool-calling QA collaborator. The API runs the model loop and gives it scoped file,
review, question and browser tools. It does not give the model a shell. The workflow
instructions are the repository skills in `.agents/skills`; the runtime adapter is
`server/modules/agent/agent-skills.mjs`.

The explorer follows module → submodule → optional test groups/files. Read [test organization](test-organization.md)
when adding integration journeys or splitting a large submodule. Each real submodule has one PRD covering its child
groups/files; manage it from the submodule view. Children share the parent PRD and scenario ID namespace; flow
confirmation and scenario review identify the exact files and scenario IDs in the batch.

## Start and prerequisites

Follow the root [README](../../README.md) for dependencies, PostgreSQL, migrations and local startup.
The agent automatically prepares one workspace using the default target branch (development when available). Configure a provider and choose a model that has passed the tool-calling check. Drafts use committed source in a separate worktree; uncommitted changes in
the explorer checkout do not appear there. The API runtime uses the running checkout's implementation.
Skill files and product/test sources are read from the selected draft's committed base and draft edits.
Preparing a workspace uses the locally cached target branch without contacting GitHub. Synchronizing a
draft fetches the target branch from origin and may require Git authentication.

The Q-Rex header lets you choose a model from the current provider and checks tool support before
switching, just like Provider settings. Configure a different provider in Provider settings.
The header offers reasoning effort only when the provider's model API explicitly returns supported
levels for the selected model. There is no hardcoded model table or fallback list. Without that
metadata (or if loading fails), the control is hidden and requests omit effort, using the provider's
default. OpenAI and Google model APIs currently do not expose effort levels, so their controls are
hidden even for reasoning models. Anthropic levels come from `capabilities.effort` in its model API.
Compatible endpoints may advertise `reasoning_efforts` (strings) or `supported_reasoning_efforts`
(strings or objects with `reasoning_effort`) on each `/models` entry. These are optional extensions,
not guaranteed by the OpenAI-compatible contract; `supported_parameters` alone is insufficient.
The server fetches metadata again before accepting an explicit effort and rejects stale model
selections or unavailable levels. Anthropic uses `output_config.effort`, with adaptive thinking when
advertised; compatible endpoints receive `reasoning_effort`. DeepSeek's `none` uses its thinking
toggle instead. The tool-calling check does not verify effort support. The choice is scoped to the
selected provider and model and is not saved across reloads.

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
   PRD approval. PRDs and their versions are stored in PostgreSQL; their `docs/prd/...` paths are
   virtual identifiers for the agent tools, not Git changes. Existing checkout PRDs remain separate
   baseline files. After approval Q-Rex reports and stops; scenario discovery resumes on another turn.
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

When Q-Rex finishes code without collection/type/execution tools, it reports an **implementation draft; checks pending** and retains the registry's `approved` state. This is a completed drafting handoff, not a verified batch. The handoff identifies branch/base, current source revision and full Changes snapshot/patch, exact files and scenario IDs, locator gaps and pending commands. External verification must identify that same source and complete selection, actual commands/results and intended environment before advancing `implemented` or `verified`. Changed source invalidates affected evidence. The next batch waits for the previous batch's required verification; another turn alone does not satisfy it. A later user turn may resume in the same persisted draft when its gates are complete.

The shared skill contract is [workflow-contract.md](../../.agents/skills/ask-qa/references/workflow-contract.md). PRD versions record `review_method: manual` or `automatic`; automatic acceptance is not human product confirmation. New documents use the appropriate reviewer label, while older review metadata remains historical. Questions resolve consequential item choices; the native PRD write review handles approval of the complete proposed version, without a competing blanket chat approval.

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

The managed browser exposes snapshots/find, locator generation, selected interactions, navigation, request listings and console. Terminal references may show full request inspection, DOM JavaScript, screenshots/traces, storage or mocking commands; those are not Q-Rex actions. Record dated sanitized observations and explicitly unavailable evidence instead of inventing an artifact or request schema.

Skill edits in the explorer checkout are not injected into existing committed-base worktrees. To use revised skills in Q-Rex, include them in the draft's selected committed base through the normal reviewed repository workflow, or explicitly review draft skill changes. Restart the API to load runtime-adapter changes after active agent work finishes. Do not reset unfinished drafts to propagate instructions.

## Verification

From the repository root (use `pnpm.cmd` if PowerShell blocks the `.ps1` shim):

```powershell
node --test server/modules/agent/*.test.mjs
node --import tsx --test src/features/scenarios/*.test.ts server/modules/runs/*.test.mjs
node --test server/modules/agent/exploration-browser.smoke.mjs
pnpm exec biome check src server vite.config.ts drizzle.config.ts
pnpm typecheck
pnpm build
```

The agent tests drive the real AI SDK streaming/tool loop with a deterministic local provider and
temporary Git repositories. They cover PRD review, skill handoffs, flow confirmation, scenario
approval, workspace selection, redaction, and the absence of workspace scenario execution.

For skill changes, the [decision exercise protocol and recorded comparison](agent-skills-evaluation.md) use the actual skill documents with independent agents and synthetic requests. These exercises supplement runtime enforcement tests; they do not establish production-provider or live-tenant reliability.

The scenario and run-selection tests cover nested menu grouping, parent PRD identity, source-path filtering,
and server rejection of stale, missing or ambiguous group selections. They use local fixtures and do not run tenant BDD.

The separate browser smoke test uses real Playwright, the installed CLI and the origin-restricted
proxy against a synthetic loopback login/dashboard. It needs no provider, database or tenant account.
It verifies authentication-state transfer, snapshots, locator generation, approval before interaction,
network visibility, relative navigation and target-only egress after authentication-state loading.
It does not verify tenant login/SSO or Docker execution.


Production-provider reliability, tenant business behavior and real draft BDD outcomes require a
scoped live acceptance pass with the chosen provider, reviewed target/batch, intended environment,
Variables and explicit data-safety decisions. Build success and deterministic fixture results do not
establish those outcomes.
