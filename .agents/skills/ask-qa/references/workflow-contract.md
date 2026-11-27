# Shared QA workflow contract

Apply this to scoped QA work. It owns scope, continuation, host review gates and completion evidence; specialists own authoring. User and higher-priority host instructions take precedence.

## Scope and questions

Resolve the outcome and owning module/menu from the conversation, attachments, PRD, feature contents and navigation. Preserve scope/answers across handoffs; a sibling file is relevant only if its contents cover the target. Investigation should settle discoverable facts; ask only consequential gaps that remain. An explanation/review request alone authorizes no implementation.

For discovery, reuse purpose/sources, journeys/priorities, roles, defects/tickets and exclusions. Discover rules/messages/data rather than repeating interviews. Ask once per scope about forbidden production mutations unless answered; record an unanswered restriction as unresolved eligibility. Record delegated assumptions and unknown intent. Scope answers and general permission to continue do not approve another gate.

### Question boundary

Prepare the concrete material before asking. Once any question or review is presented, pause all work, including independent exploration, edits and tool calls, until an actual answer or explicit skip. Silence, elapsed time, a displayed default or a tool returning without an answer grants nothing. A skipped question remains unresolved.

Use a blocking tool when available (Q-Rex: `ask_user`). A terminal without one asks in its final response and ends the turn. A non-blocking/asynchronous question also requires ending the turn until an answer arrives. Batch related short questions. Higher-priority host instructions still apply.

### Target configuration

Terminal: read the current `ENV` in `e2e/.env.local` when selecting a tenant target and derive `https://converge.${ENV}.hyperscal.com/`; credentials come from that file, never chat or printed output. Its valid value overrides historical notes. Ask only if configuration is missing/invalid or the user explicitly changes the target. Q-Rex uses its selected environment and browser Variables. Default **Entity options** to **Converge** unless specified otherwise; verify the authorized target. Configuration/defaults grant no mutation permission.

## Continue and resume

`Continue`/`lanjut` resumes the last unambiguous scope without requiring a skill name. A completed single-phase request stops there; a later continuation authorizes its next phase. A full-pipeline request authorizes transitions as soon as the host gates permit. Preserve explicit narrower scope/stopping points; ask one scope question only if several targets remain equally plausible.

| Current position | Next action |
| --- | --- |
| Question/review pending | Resolve the actual decision; `continue` alone is not an answer or approval. Identify the outstanding decision/artifact briefly, without restarting discovery. An explicit request to defer PRD validation and use an existing active version may proceed with its uncertainty retained. |
| Feasible current-phase work remains | Resume its first unfinished item using the inventory/batch plan. Retain unchanged blockers; finish independent supported work. |
| PRD complete | Apply `write-e2e-scenarios` to the same menu using its active PRD, answers and observations. Flow confirmation still applies. |
| Flows confirmed | Author scenarios under `write-e2e-scenarios`; flow confirmation does not approve them. |
| Scenario batch approved | Check/record the actual decision against current sources. Finish planned scenario-only batches, then apply `write-e2e-code` to eligible scope under the host restrictions below. |
| Implementation/checks incomplete | Continue supported authorized work or evidence-based diagnosis. Retain unavailable checks as pending; unchanged successful checks need no repeat without a new reason. |
| Scope and feasible checks complete | Report completion/external blockers; do not restart phases, choose another target or publish. |

Apply specialists in this conversation (Q-Rex: `use_skill`); a missing skill is a precise prerequisite to report. Manual review requests end the turn. On terminal acceptance, verify/record the decision first, then continue already authorized work in that same turn; acceptance alone does not expand a single-phase request. Q-Rex manual native PRD acceptance still requires reporting and stopping; the next `continue` selects scenarios. Automatic mode follows its gates below.

Keep a compact continuation index under `.exploration.md` **Scope and sources**: requested endpoint, completed/current phase, next skill/action, pending gates/blockers and pointers to source comparisons/batches. Update only changed facts. Reconcile it against current sources and actual host decisions; the index is not approval or a test result.

## Read only what the next action needs

- Reuse instructions, answers, source contents, evidence and implementation paths available in the same conversation. Load the next `SKILL.md` once; follow conditional reference links only for the current operation. Applying a skill is not spawning an agent.
- On a later turn, use scoped source diffs/version/content indicators to identify changes. Recover changed/missing portions and affected callers. If changes cannot be ruled out, read the relevant source; memory alone is insufficient. Exact comparisons at review, database-write and execution boundaries remain required. Git diff alone cannot establish active database content or unchanged uncommitted bytes.
- After compaction/new chat, recover the continuation index, active PRD and relevant batch/source records first, then follow their pointers. Use scoped file/symbol/range searches and batch independent reads when supported. Decisions, writes and dependent browser operations stay sequential. Retain the complete menu identity/ID inventory for allocation; inspect implementation bodies only for affected contracts.
- Keep facts once in their owning artifact. Combine review tables with all required fields intact and present the complete required review scope once. Routine updates describe changes/gaps/next action; a skill switch alone needs neither another full report nor an unchanged record rewrite.

## Exploration reuse across phases

Apply [exploration reuse](exploration-context.md) before browser work or handoff. PRD work starts the menu `.exploration.md`; every phase persists new facts/gaps there. Applicable prior observations satisfy live-evidence prerequisites even in another session or with no browser now available. Explore only missing/affected facts or explicit re-verification. Keep evidence applicability separate from product/scenario review, current data ownership/permissions and execution.

Use the current checkout's files, including uncommitted changes. Terminal work needs no Q-Rex session/runtime; a new chat recovers its accessible database and menu records. A separate worktree does not inherit uncommitted records. Identify the intended workspace/database; never implicitly copy private state, reset or overwrite another task.

## Hosts and review gates

Q-Rex has scoped file/browser tools and an isolated single-scenario draft runner; no shell or standalone collection/types. Its runner requires approved implemented unique scenarios, E2E-owned data, browser Variables and separate data-safety approval; temporary results never become official/uploads. Terminals use an owned CLI browser and [database PRD access](prd-database-access.md). PRD paths are virtual identifiers on both hosts. Apply the active host's [browser capabilities](../../write-e2e-scenarios/references/playwright-cli-exploration.md) before live work.

The active owning PRD is discovery context even with unvalidated items, open issues or incomplete coverage. PRDs have no document review status; preserve item provenance/uncertainty. An unsaved pending proposal is not active. Missing active PRD invokes `write-prd`; independently eligible technical work follows the code skill's rules.

| Gate | Q-Rex | Terminal |
| --- | --- | --- |
| PRD review | Propose the complete intended accepted content through `write_file`/`edit_file`; native review saves after acceptance. `ask_user` is for item decisions, not a second blanket approval. | Follow [database access](prd-database-access.md): save an unvalidated proposal where permitted, show the exact intended accepted representation, stop for explicit review and save only agreed validations/metadata. Changes to already validated lines need approval before saving even an unvalidated replacement. |
| Flow confirmation | `confirm_flows` with owning PRD and described IDs, for each exact affected feature. | Present full inventory/files/IDs/exclusions/gaps; record/check the [source comparisons and actual decision](../../write-e2e-scenarios/references/flow-registry.md#flow-confirmation-provenance). |
| Scenario approval | `show_diff`, direct to Chat/Changes and stop. Only the native scenario control accepts the current snapshot; chat Yes is insufficient. | Present exact changes/batch, prepare the [pending review record](../../write-e2e-scenarios/references/flow-registry.md#terminal-scenario-review-record) and stop. On explicit acceptance verify unchanged bytes and record before other work; reuse matching actual decisions. |
| Live-data authorization | Apply [data safety](../../write-e2e-scenarios/references/data-safety.md) and native tool decisions, even when requested for read-only interaction. | Apply the same business data rules and host tool permissions. |

A pending request, hash or artifact is not acceptance. Recover a missing decision or request review of current concrete content; reuse unaffected valid decisions. Flow confirmation depends on feature/PRD sources; changed scenario contents invalidate scenario approval. Review never proves execution or grants live-data permission.

Q-Rex's explicitly enabled **Allow all agent approvals** automatically accepts PRD/flow/live-browser requests and bypasses scenario gates. Continue without manual-only stops, labeling decisions automatic. A general request to proceed does not enable it. Questions, explicit publication, identity, workspace/origin and data-safety scope still apply. Record the mode actually used, including changes while a request is pending.

Accepted requirements retain provenance and `review_method: manual` or `automatic`. Q-Rex uses `reviewed_by: Local preview user` or `Q-Rex automatic approval`; terminals record an established identity without inventing one. `[validated]` means accepted through the applicable gate; unresolved/untagged or legacy `[needs-review]` items remain unvalidated. Preserve old IDs and historical metadata, including unknown methods; automatic acceptance is not human confirmation.

## Turns, batches and completion

A turn is one user request/response; a draft session spans turns/restarts. A batch is exact files/scenario instances/journeys under review. Remaining scenario-only batches may proceed after the required decision without waiting for implementation/execution. Track their scope and outstanding work separately from flow authoring status.

Q-Rex reviews cumulative changed `.feature` contents. Each new edit invalidates snapshot approval; any unapproved changed-feature snapshot blocks code-skill activation and implementation writes workspace-wide, even for baseline cases. Implementation edits also block further scenario review. Prefer completing planned scenario-only reviews first. If implementation edits already exist, preserve them and finish permitted scope or use the supported separately based draft workflow; never reset/move work implicitly. Terminal whole-file digest changes require a new decision for the affected current batch, retaining valid unaffected decisions.

Keep confirmed inventory and PRD/actual gaps in [.flows.md](../../write-e2e-scenarios/references/flow-registry.md); `.feature` tags feed catalog categories. Keep batch mappings/evidence in `.exploration.md` and review output:

| State | Required evidence |
| --- | --- |
| `pending` | Confirmed flow not fully authored, including partial/blocked scope |
| `written` | Confirmed scope authored; no review or execution implied |
| `approved` | Current scenario snapshot accepted under actual host mode |
| `implemented` | Steps/bindings plus successful collection and types |
| `verified` | Every required scenario passed in the intended environment |
| `fixme` | Product defect with real `@fixme @ref:<ticket>`, reported individually |
| `legacy` | Pre-existing scenario awaiting coverage assessment |
| `obsolete` | Retired journey with permanently reserved identity |

Q-Rex completes feasible code and the code skill's [exact draft handoff](../../write-e2e-code/SKILL.md#5-save-evidence-and-report) when checks are unavailable. Retain `approved` for an accepted changed batch until collection/types exist; eligible unchanged baseline work retains unknown historical review unless evidenced. Registry authoring status remains independent.

External results advance only matching current revision/complete patch, exact scenario selection, commands/results and intended environment. Bare “passed”, historical/stale reports or passing subsets are insufficient. Record their source and invalidate affected results after source changes. Finish useful work with pending checks rather than claiming verification.

Completion reports distinguish code, bindings/collection, types, actual execution and upload; retain failures, skips, quarantine, mocks and unavailable checks. Generation/catalog/build success is not a scenario pass; verified batches do not prove full business coverage.
