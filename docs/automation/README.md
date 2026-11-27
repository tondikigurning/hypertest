# Q-Rex workflow in the local Automation preview

Q-Rex is a tool-calling QA collaborator. The API runs the model loop and gives it scoped file,
review, question and browser tools. It does not give the model a shell. The workflow
instructions are the repository skills in `.agents/skills`; the runtime adapter is
`server/modules/agent/agent-skills.mjs`.

The explorer follows module → menu → optional test groups/files. Read [test organization](test-organization.md)
when adding integration journeys or splitting a large menu. Each real menu has one PRD covering its child
groups/files; manage it from the menu view. Children share the parent PRD and scenario ID namespace; flow
confirmation and scenario review identify the exact files and scenario IDs in the batch.

## Start and prerequisites

Follow the root [README](../../README.md) for dependencies, PostgreSQL, migrations and local startup.
The agent automatically prepares one workspace using the current local checkout branch. Configure a provider and choose a model that has passed the tool-calling check. Drafts use committed source in a separate worktree; uncommitted checkout changes do not appear in the draft. Q-Rex can inspect tracked and non-ignored local checkout files through separate read-only tools. The API runtime uses the running checkout's implementation.
Skill files and product/test sources are read from the selected draft's committed base and draft edits.
Before each chat turn, Q-Rex checks the current local checkout branch and its committed HEAD. A clean draft at its base updates automatically. If the source changes while the draft contains changes, Q-Rex keeps the existing draft base and can continue working; newer commits are not included in the draft until synchronization. Chat does not fetch from origin. Explicit synchronization and publication can contact GitHub.

The Q-Rex header opens a searchable model picker for connected providers, following the
[Hermes model-picker workflow](https://hermes-agent.nousresearch.com/docs/user-guide/desktop#choosing-a-model).
Choose a provider inside the picker to load its models. Selecting a model checks tool support before
switching; failed checks leave the current selection unchanged. Add or edit connections in Provider settings.
The effort selector offers low, medium, high and xhigh, defaults to medium, and remembers a choice
for each provider/model pair in this browser. Older saved values outside this list reset to medium.
The installed Google SDK does not support xhigh, so that option is disabled for Google.

The server sends the selected value without converting it: OpenAI uses its SDK's reasoning effort,
Anthropic uses output_config.effort, Google uses thinkingConfig.thinkingLevel, OpenRouter uses
reasoning.effort, and 9Router and other compatible endpoints use reasoning_effort. DeepSeek also
receives its thinking toggle. Providers and models may reject unsupported levels; Q-Rex reports
the failure instead of silently retrying without the selection. The tool-support check is independent
of effort. Tests cover outgoing SDK request shapes and provider errors, but a successful request does
not prove that a gateway or upstream model actually honors the selected value.

For tenant exploration, select the environment and enter `E2E_USERNAME` and `E2E_PASSWORD` in browser
Variables. All Variables share the same tab-scoped persistence and remain available after runs and
agent requests; the `hidden` setting only controls password masking in the input. Chat sends the credentials
separately to the local API, including when starting from `ask-qa`; the runtime uses them for browser
authentication and redacts their values from model messages and saved conversations. Do not paste
credentials into chat.

Exploration requires the installed `playwright-cli` and Playwright Chromium. Separate SSO, asset or API origins are blocked by the target-origin restriction.

## Terminal agent workflow

The same four skills and shared review/reuse contract also apply to an AI agent working directly in a local repository checkout. The terminal agent reads `.agents/skills` and the linked references from that checkout; it does not need Q-Rex or its `use_skill` tool. Local skill edits and uncommitted handoff files are available immediately in that checkout. An API restart or updating Q-Rex's committed-base worktree is needed only for Q-Rex to load its own runtime or skill changes.

When a workflow asks a question, it pauses all work until the user answers or explicitly skips it. A terminal agent without a blocking question tool ends its turn with the question and resumes on the next user message. A displayed choice, silence or a non-blocking tool returning does not count as an answer. This is an instruction to the agent; the terminal host must support turn control to enforce it.

For a new terminal conversation, recover the owning menu's active database PRD where available and the checkout's `e2e/tests/bdd/features/<module>/<menu>.exploration.md`, `<menu>.flows.md` and relevant feature files. Scenario discovery needs the active owning PRD; independently eligible technical implementation or repair can continue when the PRD is unavailable. Reuse applicable observations without another browser visit. A missing record or lost chat is a specific evidence gap, not proof that all prior exploration is invalid; recover available PRD notes and existing code first. Files saved in the same checkout remain available without a commit, while another worktree does not automatically contain them. Do not reset or copy another workspace implicitly.

Terminal agents use the [database PRD procedure](../../.agents/skills/ask-qa/references/prd-database-access.md) for the configured database, an owned `playwright-cli` session for needed exploration, and the terminal review procedures in the [shared contract](../../.agents/skills/ask-qa/references/workflow-contract.md). Record actual flow confirmation and scenario approval with their matching source references in the shared `.exploration.md` so a later terminal session can recover them. A recorded observation, hash or flow list is not a review decision or permission for a live mutation. The terminal can run appropriate repository checks against its own checkout; inspect selected setup and follow data safety before any live BDD execution.

## Workflow and review boundaries

The default workflow uses the review gates below. When an approval is pending, **Allow all agent approvals** can be enabled for the current draft session. It automatically allows PRD and flow requests and live browser approvals, and bypasses scenario approval gates. These are automatic decisions, not human reviews. The mode resets on chat reset or API restart. Scenario approval and automatically confirmed flows do not carry over as manual decisions. Questions and explicit PR submission still need user action. Workspace and origin restrictions and scenario identity validation still apply.

1. Start with a plain-language request or `/ask-qa`. Q-Rex resolves the scope using the repository,
   attachments and conversation. Its `use_skill` tool loads the appropriate specialist and updates
   the active instructions for following model steps and turns. The user can also select a skill
   explicitly. A missing skill in the draft is an error, not a successful handoff.
   Follow-up attachments from the explorer are validated against the immutable draft base before
   resolving their current draft source. Missing or ambiguous identities are rejected.
2. `write-prd` imports or explores one menu and records requirement provenance. Writing
   new validated content presents the complete proposed document for explicit
   PRD approval. Until that proposal is accepted and saved, the previously saved active version remains the reference; if none exists, no active PRD is available. PRDs and their versions are stored in PostgreSQL; their `docs/prd/...` paths are
   virtual identifiers for the agent tools, not Git changes. After approval Q-Rex reports and stops;
   scenario discovery resumes on another turn.
   Terminal agents use the same database via the [terminal access procedure](../../.agents/skills/ask-qa/references/prd-database-access.md): save a proposal for inspection, wait for explicit review, then record only accepted validations and review metadata. A create request is not review approval.
3. `write-e2e-scenarios` reads the active matching PRD and reuses applicable PRD-phase browser evidence, exploring only remaining or changed scope. The active document is usable as context even with unvalidated items, open questions or incomplete coverage; there is no document-level review status. The agent records gaps and follows the separate review rules for PRD changes. `confirm_flows`
   presents the described flow list for confirmation before scenario-intent changes. Confirmation
   is tied to the current PRD and feature contents and does not approve the scenarios.
   All discovered in-scope flows are presented for confirmation, including flows planned for later scenario batches.
   The menu's `.flows.md` contains only confirmed flows and gaps. Flow-confirmation provenance, requirement-to-scenario mappings and a sanitized handoff for each authored batch are saved in the shared `.exploration.md`.
   The handoff includes a comparable scenario contract or an exact snapshot identity where available. Its
   `pending` and `written` statuses describe scenario authoring, not review or execution.
   Resume by reading this file, the active database PRD and the relevant features; recheck changed or
   unverified scope and obtain any host-required flow confirmation. The file is available only in the
   workspace or committed source that contains it; a separate draft does not automatically inherit it.
   A full pass covers every confirmed in-scope flow and its supported, distinct smoke and regression
   branches. Up to 12 flows are handled together without batching; larger inventories are divided into balanced batches
   targeting 8–12 flows each. Flow count does not limit the number of scenarios per flow. The ordered
   batch plan and blocked or deferred branches are recorded in `.exploration.md`; PRD/actual
   discrepancies belong in `.flows.md` gaps.
4. Q-Rex writes one scenario batch and stops for review. Review the request in **Chat**, inspect the preview and diff in **Changes**, then use
   **Approve scenario changes** in either view. Chat answers, PRD review and flow confirmation do not replace
   this approval. A changed scenario snapshot invalidates approval for implementation and execution.
   **Reset draft changes** discards the reviewed draft diff, including commits created by synchronization,
   and returns the worktree to its current target baseline. It clears scenario and flow approvals;
   chat and PR history remain. The action requires a fresh review and confirmation. After a PR publication
   attempt, retry finalization to reconcile its history instead of resetting the draft.
5. On a subsequent turn, `write-e2e-code` inventories the requested scope and implements all eligible
   scenarios missing code, including across approved batches, while preserving their IDs and
   intent. It reuses applicable scenario-phase context, verified locators and observations, including the
   `.exploration.md` handoff when a new session lacks earlier chat. It compares that handoff with current scenario and
   PRD sources and explores only evidence gaps or changed scope. A registry edit does not invalidate Q-Rex's
   feature-only scenario approval; the agent must reconcile its contents separately.
   Snapshot element refs are temporary; fresh refs are needed for
   further browser interaction. Existing implemented scenarios may receive intent-preserving technical
   repairs without a new scenario-design gate. `generate-locator` supports locator verification;
   arbitrary browser JavaScript is unavailable.
6. After implementation, a draft scenario appears in the Explorer like other scenarios. Select it and use **Run draft scenario** in Scenario Details. This runs one uniquely identified scenario from the active Q-Rex worktree and requires an approved current scenario snapshot, E2E-owned data, browser Variables and a separate data-safety approval. The run uses an isolated Docker sandbox with egress limited to the selected environment; temporary evidence stays separate from official results and is never uploaded. Q-Rex can also start the same run with `run_draft_scenario` after activating `write-e2e-code`. Collection and standalone TypeScript checks remain unavailable. The regular explorer runner still uses the current checkout and cannot verify unmerged agent changes.

For terminal agents, the [scenario review record](../../.agents/skills/write-e2e-scenarios/references/flow-registry.md#terminal-scenario-review-record) preserves an explicit manual decision tied to the exact feature bytes and batch. The agent records an acceptance on the next turn, after the user actually approves; if the decision is lost before it is recorded, it must obtain a new review. A missing PRD comparison does not by itself invalidate independently applicable locator evidence.

When Q-Rex finishes code without collection or standalone type checks, it reports an **implementation draft; checks pending**. It can run an approved implemented draft scenario through the isolated runner, but that result does not replace collection/type checks. An approved changed batch retains `approved`; an eligible unchanged baseline scenario retains its actual historical review status, which can be unknown. The flow registry remains `written` where applicable. The handoff identifies branch/base, current source revision and full Changes snapshot/patch, exact files and scenario IDs, baseline or approval evidence, locator gaps and pending commands. External verification must identify that same source and complete selection, actual commands/results and intended environment before advancing `implemented` or `verified`. Changed source invalidates affected evidence.

After a scenario batch is approved, continue the planned scenario-only batches until all confirmed flows are accounted for, without waiting for implementation or verification. In manual mode, resume the conversation on a later turn after the required review; Q-Rex carries forward the full requested scope. Explicitly enabled **Allow all agent approvals** follows the automatic gates. Q-Rex reviews the cumulative changed feature snapshot, so each new scenario edit requires a fresh review of the current snapshot. Plan and review the scenario batches before adding implementation changes: the current Q-Rex review blocks approval of changed scenarios while implementation edits are present. Preserve any existing implementation changes and use a properly based scenario-only draft if more scenario review is needed; never reset another draft implicitly.

The shared skill contract is [workflow-contract.md](../../.agents/skills/ask-qa/references/workflow-contract.md). Its [exploration reuse contract](../../.agents/skills/ask-qa/references/exploration-context.md) applies before browser calls in all three authoring phases. PRD work starts one sanitized `e2e/tests/bdd/features/<module>/<menu>.exploration.md`, even before scenarios exist. It preserves the explored inventory, actual observation dates, target/role/state, verified locator expressions, supported request facts and precise remaining gaps. Scenario and code work consume and extend this record; PRDs and flow handoffs reference its evidence IDs. Save meaningful chunks before reviews, handoffs or stopping so a new conversation can resume from accessible files. Existing inline PRD/flow evidence remains usable.

In the same conversation, reuse known unchanged context without repeating file reads or browser exploration merely for a skill switch. A new session recovers the record and compares sources per item. Applicable prior live observations satisfy discovery requirements even if the browser is now unavailable; PRD text alone does not. Missing locators/branches, relevant UI/target changes and explicit re-verification requests receive targeted investigation. A closed browser or unknown build version alone does not invalidate all evidence. Evidence reuse grants no review, live-data permission or test pass. Records live in the workspace containing them; a new committed-base draft does not inherit another worktree's uncommitted files. Q-Rex closes its browser after a turn; fresh refs are needed for further interaction, without replaying already observed journeys.

PRD versions record `review_method: manual` or `automatic`; automatic acceptance is not human product confirmation. New documents use the appropriate reviewer label, while older review metadata remains historical. Questions resolve consequential item choices; the native PRD write review handles approval of the complete proposed version, without a competing blanket chat approval.

Live browser interactions request separate data-safety approval. Seed/shared data remains read-only
unless a specific browser operation receives scoped approval under the skill's data-safety rules.
File/command permissions, flow confirmation,
scenario approval and live-data approval are separate decisions.

Tools replace the shell examples in skills: `list_files`, `read_file`, `write_file`, `edit_file`,
`show_diff`, `ask_user`, `confirm_flows`, `playwright_cli`, `use_skill` and `read_baseline_feature`.
The baseline reader compares a feature's committed base with its current draft contents, including
inherited tags and examples; it does not establish historical approval. If the base file cannot be
read, eligibility remains unverified. A truncated `show_diff` is marked and the complete Changes
panel remains the review source.
Large source files can be read in pages with `startLine` and `lineCount`. References resolve relative
to the skill document but tool paths are relative to the worktree root. Turns have no fixed step count
or overall time limit. Q-Rex checkpoints completed model/tool steps and compacts conversation context
with the selected model when reported input usage approaches a provider-reported context window, or
after a recognizable context-window error. Not all providers report a window or usage; their errors must
identify a context overflow for automatic recovery. Compaction is a lossy model-generated summary and
incurs provider usage. Review decisions and workspace state remain authoritative on the server, not in
the summary. If compaction fails, Q-Rex reports the error and retains its last saved checkpoint. Providers
and individual tools may still impose their own timeouts; cancellation remains available.
There is no standalone draft TypeScript-check tool; Q-Rex must report that check as unperformed
unless it has separate execution evidence.

The managed browser exposes snapshots/find, locator generation, selected interactions, navigation, request listings and console. Terminal references may show full request inspection, DOM JavaScript, screenshots/traces, storage or mocking commands; those are not Q-Rex actions. Record dated sanitized observations and explicitly unavailable evidence instead of inventing an artifact or request schema.

Skill edits in the explorer checkout are not injected into existing committed-base worktrees. To use revised skills in Q-Rex, include them in the draft's selected committed base through the normal reviewed repository workflow, or explicitly review draft skill changes. Restart the API to load runtime-adapter changes after active agent work finishes. Do not reset unfinished drafts to propagate instructions.

## Verification

From the repository root (use `pnpm.cmd` if PowerShell blocks the `.ps1` shim):

```powershell
node --test server/modules/agent/*.test.mjs
node --import tsx --test src/features/agent/*.test.ts
node --import tsx --test src/features/scenarios/*.test.ts server/modules/runs/*.test.mjs
node --test server/modules/runs/failed-scenario.smoke.mjs
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

The failed-scenario smoke test needs the installed Playwright Chromium. It uses the real BDD fixture,
live preview and evidence settings with a locally fulfilled large response, checking prompt finalization,
complete trace ZIPs, screenshots, videos and continuation to the next scenario. It does not generate BDD,
access a tenant or upload evidence. Keep both Playwright dependencies and the test-utils peer version
aligned: 1.61.1 includes the [ZIP stream lifecycle fix](https://github.com/microsoft/playwright/pull/40747)
needed on newer Node versions. Older versions can
stall while retaining a failed test's trace until the 180-second teardown timeout.

The separate browser smoke test uses real Playwright, the installed CLI and the origin-restricted
proxy against a synthetic loopback login/dashboard. It needs no provider, database or tenant account.
It verifies authentication-state transfer, snapshots, locator generation, approval before interaction,
network visibility, relative navigation and target-only egress after authentication-state loading.
It does not verify tenant login/SSO or Docker execution.


Production-provider reliability, tenant business behavior and real draft BDD outcomes require a
scoped live acceptance pass with the chosen provider, reviewed target/batch, intended environment,
Variables and explicit data-safety decisions. Build success and deterministic fixture results do not
establish those outcomes.
