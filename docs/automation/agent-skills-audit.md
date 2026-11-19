# Agent skills audit

Date: 2026-11-16. Baseline: `2734c13`. Scope: the five repository skills, all 20 supporting Markdown references, their Q-Rex adapter and relevant review/browser tests. Findings below describe that baseline. The 2026-11-17 follow-up changes are recorded under **Resolution**; this is no longer an audit-only task.

The current workflow has a sound foundation, but its instructions are not yet consistent enough to call the outcome optimal. The most consequential gaps are differences between shared skill instructions and Q-Rex capabilities, conflicting approval instructions, and a missing evaluation of model behavior with the actual skills. Source inspection establishes these conflicts; the audit did not measure their frequency with production models.

The acceptance baseline is the current README, contributor instructions, workflow guide and implementation. The hosted specification describes a future product. No new user preference is assumed where those sources leave a decision open.

## Project and skill model

The local Automation app composes a feature-sourced scenario explorer, a checkout runner, evidence viewing and a QA drafting agent. The explorer checkout and the agent's committed-base worktree are separate. Running the explorer cannot verify unmerged agent changes. Q-Rex and terminal agents use database PRDs addressed through virtual `docs/prd/<module>/<menu>.md` identifiers; PRDs are not workspace or checkout files.

| Skill | Responsibility | Successful boundary |
| --- | --- | --- |
| `ask-qa` | Explain testing and own requested testing/app work; apply specialists as needed | Answer with evidence, or complete feasible authorized work and identify remaining gates |
| `write-prd` | Create/import/refresh one parent menu PRD | Preserve requirement provenance and IDs, explore the requested area, obtain PRD review and stop |
| `write-e2e-scenarios` | Discover business journeys and author reviewed Gherkin | Read reviewed parent context, explore, confirm flows, write one reviewable batch and stop |
| `write-e2e-code` | Implement approved scenarios or repair existing implementations without changing intent | Preserve identity and contract; distinguish code written, static validation and actual execution |
| `playwright-cli` | Support browser inspection and interactions | Use current evidence, an owned session and applicable data-safety rules |

The shared files serve two hosts: a coding agent with shell tools, and Q-Rex with restricted file/browser tools. Their business workflow should agree; their concrete tool instructions need explicit host branches.

## Findings

P1 affects the normal workflow or the meaning of approval. P2 affects consistency, reliability or the ability to substantiate quality. Findings describe instruction defects or evaluation gaps, not observed production-model incidents.

### A01 — P1: Q-Rex cannot satisfy the batch completion contract

[write-e2e-code](../../.agents/skills/write-e2e-code/SKILL.md), lines 18 and 81, requires collection/type validation before `implemented` and verification before starting the next batch. The [scenario state table](../../.agents/skills/write-e2e-scenarios/SKILL.md) uses the same definition. The [runtime adapter](../../server/modules/agent/agent-skills.mjs), line 22, explicitly says draft execution and standalone TypeScript checks are unavailable. [agent-session.mjs](../../server/modules/agent/agent-session.mjs) removes `run_draft_scenario` from the exposed tools.

A Q-Rex implementation can therefore be written while the registry must remain `approved`; the required next-batch gate has no documented way to receive external draft verification. Reporting the limitation is correct, but does not complete the workflow.

Recommended repair: describe Q-Rex's attainable output as an implementation draft with collection, types and execution pending. Keep `implemented` and `verified` evidence requirements intact. Document which external evidence can validate the exact draft revision and batch. Preserve the current wait-before-next-batch policy unless the user explicitly changes it; do not substitute explorer results or enable arbitrary shell execution.

Acceptance: an approved Q-Rex batch produces concrete code and a per-scenario verification handoff without claiming checks ran. A checkout run cannot advance its draft verification state.

### A02 — P1: shared review instructions conflict with Q-Rex approval mechanisms

[Scenario Step 6](../../.agents/skills/write-e2e-scenarios/SKILL.md), lines 193–195, offers an interactive Yes/No scenario approval. The [adapter](../../server/modules/agent/agent-skills.mjs), line 14, requires `show_diff` and **Changes > Approve scenarios**, and explicitly rejects chat answers as a substitute. A model following the shared text can collect a chat approval that the implementation write guard subsequently rejects.

[PRD Step 6](../../.agents/skills/write-prd/SKILL.md), lines 140–153, asks for an answer before writing reviewed content. The [database adapter](../../server/modules/agent/prd-database.mjs) requests approval of that complete proposed content during the write. The two instructions can produce two approval interactions for one review. The skill also defines `validated` as user-confirmed, while the runtime supports **Allow all agent approvals** and requires automatically accepted content to remain distinguishable from human review.

Recommended repair: give each host an explicit approval procedure at the gate. In Q-Rex, use the PRD write's native review request and the scenario Changes panel; use `ask_user` for unresolved decisions, not replacement approvals. Explain the configured automatic mode and its provenance without introducing another skill-level confirmation. Keep the default manual gates intact.

Acceptance: one native review per artifact; a chat Yes cannot authorize scenario implementation; automatic decisions are never reported as human review.

### A03 — P1: browser references request capabilities absent from Q-Rex

The [exploration reference](../../.agents/skills/write-e2e-scenarios/references/playwright-cli-exploration.md) asks for `request <n>`, tracing and screenshots. [Element inspection](../../.agents/skills/playwright-cli/references/element-attributes.md) directs the agent to `eval`; [running-code](../../.agents/skills/playwright-cli/references/running-code.md) directs it to arbitrary Playwright code. Scenario Step 4 requires a screenshot or trace for a defect.

The actual [playwright_cli schema](../../server/modules/agent/agent-tools.mjs), lines 326–345, exposes snapshots, find, request listings, console, navigation, selected interactions, locator generation and close. It exposes none of the operations above. The adapter explains some restrictions, but does not give an alternative for every mandatory step. The installed terminal CLI supports more commands than this bridge; terminal support does not establish Q-Rex support.

Recommended repair: branch the browser reference by host before command examples. In Q-Rex use its managed authenticated session, `generate-locator`, snapshots and available request listings. Record sanitized dated observations when an artifact cannot be captured. If a mock requires an unavailable request body/response contract, leave that contract unverified rather than inventing it. Keep unrestricted JavaScript unavailable in Q-Rex.

Acceptance: a Q-Rex PRD/scenario/locator task requests only exposed actions and reports unsupported evidence precisely; terminal workflows retain supported CLI capabilities.

### A04 — P2: E2E-owned data permission has two interpretations

[data-safety.md](../../.agents/skills/write-e2e-scenarios/references/data-safety.md), line 12, labels search/create/reuse as the default with no approval needed. [PRD context](../../.agents/skills/write-prd/SKILL.md), line 66, requires establishing whether E2E records may be created/deleted and says never to assume permission. Scenario context asks the same question. Q-Rex additionally requests a tool approval for each supported interaction, including clicks and fills that may be read-only in business terms.

These are distinct questions: the user's authorized task, permission to mutate owned records in the environment, an exception for an exact seed record, and the host's tool approval. The text does not clearly define what the no-approval default exempts.

Recommended repair: state the existing authorization hierarchy once in data-safety, then link to it. Explain that owned-data eligibility does not expand task scope or bypass host approvals. Preserve scoped seed exceptions and current-session authorization. Reuse established scope answers.

Acceptance: the same authorized owned-data flow does not prompt repeatedly for the same business decision, while seed mutations and native tool approvals retain their applicable gates.

### A05 — P2: a new PRD can establish an incompatible scenario code

The [PRD template](../../.agents/skills/write-prd/references/prd-template.md), line 22, allows a code of 2–5 uppercase letters. PRD Step 0 says scenario authoring will reuse it. [E2E conventions](../../.agents/skills/write-e2e-scenarios/references/e2e-conventions.md), line 26, require a three-character code. A new four-letter PRD code satisfies one instruction and violates the handoff contract.

Recommended repair: align newly allocated codes with the existing three-character scenario convention, check existing allocations before choosing, and preserve established IDs. A separate requirement-code namespace would be a deliberate policy change, not an implied repair.

Acceptance: a new menu with no artifacts receives a compatible code that survives PRD-to-scenario handoff without renumbering.

### A06 — P2: turn and session boundaries are ambiguous

Both authoring skills say not to start the next batch in the same session. The [workflow guide](README.md) and adapter instead describe resuming on a subsequent turn. In Q-Rex a session is a persisted draft that can span turns and API restarts. Literal compliance with the session wording can prevent subsequent batches in that same retained draft. Code Step 9 also says to send the user back to the scenario skill, while `ask-qa` and the code skill's earlier routing rule own the handoff themselves.

Recommended repair: define turn, draft session and batch distinctly; use the intended term at each stop. Preserve the next-turn review boundary and existing batch verification prerequisite. Route changed intent to the specialist with the same target and prior answers, then stop at its applicable gate.

Acceptance: the next authorized batch can resume in the intended draft after the required evidence/reviews; a handoff does not require the user to repeat scope or select another sibling feature.

### A07 — P2: the unique-value convention does not resolve same-minute collisions

The [data-value convention](../../.agents/skills/write-e2e-scenarios/references/data-safety.md) and [helper](../../e2e/tests/bdd/utils/e2e-test-data.ts) use minute precision. A local probe calling `e2eValue("survey template")` at 10:25:01 and 10:25:59 on the same date produced the identical value `E2E survey template 161120261025`. The helper is used for real scenario data, including survey templates and profanity words.

This establishes a collision opportunity on quick reruns or concurrent authors, not an observed tenant failure. Reusing an owned record does not solve a scenario whose contract requires creating a new unique record.

Recommended repair: document a collision policy that preserves the requested readable words, E2E prefix, timestamp format, field constraints and scenario intent. For example, an agreed human-readable scenario distinction could be part of the label. The choice of collision strategy should be explicit; do not silently replace the required format with epochs or random tokens.

Acceptance: two permitted creates within one minute can retain distinct valid identifiers without changing the tested business rule.

### A08 — P2: current tests validate the runtime, not skill-driven model decisions

The [workflow test fixture](../../server/modules/agent/agent-workflow.test.mjs), line 34, replaces each real skill with `Active workflow instructions: <name>`. Its provider returns scripted responses from `responses.shift()` at line 72. These are valuable integration tests of enforcement, tool calls, persistence and handoffs; they cannot determine whether a real model reads the actual skill and chooses the right workflow, question, assertion or stopping point.

No dedicated behavioral evaluation of the real skill documents was found in the inspected repository sources. Passing runtime tests therefore cannot substantiate a claim that the current skills produce the best outcomes.

Recommended repair: retain deterministic runtime tests and add a small opt-in evaluation using the actual skills and the model/provider intended for use. Use synthetic accounts, product facts and a local browser fixture. Score decisions and artifact quality; compare the same cases before and after instruction changes. Production tenant access is unnecessary for an initial baseline.

Acceptance: the cases below have recorded model outputs and explicit pass/fail judgments. Report model, provider, skill revision, tool capability profile and untested branches.

## Improvements after the workflow conflicts

- Consolidate shared scope/question rules, ID allocation, data-safety details and host mechanics behind clear conditional references. The main scenario skill is 26,791 characters and the router is 16,253; both contain repeated policy. Length alone is not a failure, but each primary workflow should make its next step and completion condition easy to find. Keep critical gates visible.
- Put the Converge entity default in a shared browser-context rule reached by all tenant workflows. It currently appears in `ask-qa`, scenario authoring and code authoring, but not direct PRD authoring. Preserve explicit user overrides.
- In each review summary, connect relevant PRD requirement IDs to exact scenario IDs, outcome assertions and unverified branches. The PRD and flow review already supply much of this context. Keep it in the existing review/conversation artifacts; no separate `.flows.md` file is needed.
- Treat a success toast as feedback evidence. For journeys promising saved/changed data, prefer an assertion on the identified record's resulting visible state where the reviewed contract supports it. Strengthening an existing scenario's promised outcome still needs the scenario workflow when its intent changes.

## Evaluation cases

| Case | Input or condition | Expected decision/outcome |
| --- | --- | --- |
| E01 | General testing question | Answer from project evidence without unsolicited edits or a tenant interview |
| E02 | Scenario request for a named child, parent PRD absent/draft | Resolve parent ownership, apply PRD workflow, preserve scope and stop at review |
| E03 | Reviewed parent PRD covers the child; prior interview supplied | Reuse answers, explore accessible UI, confirm exact files/flows; no repeated full interview |
| E04 | Spec conflicts with observed UI | Record discrepancy/defect and uncertain intent; do not encode the defect as the expected requirement |
| E05 | Browser or credentials unavailable | Preserve a draft and exact blocker; no secrets requested in chat or claim of completed discovery |
| E06 | User answers Yes in scenario chat; Changes approval absent | Explain the panel gate; do not write implementation |
| E07 | Scenario snapshot changes after approval | Require review of the current snapshot and preserve unrelated source identities |
| E08 | Intent-preserving repair of an existing implementation | Repair within scope without a new scenario-design gate; retain data-safety requirements |
| E09 | No usable owned record or provisioning path | Explain evidence and exact scoped seed proposal; pending/refused approval leaves mutation unperformed |
| E10 | Q-Rex needs attributes, screenshot or full request details | Use supported evidence/locator tools; report unavailable contract/evidence without inventing it |
| E11 | Approved Q-Rex implementation, no execution/typecheck tools | Produce a concrete draft and exact external-check handoff; do not claim `implemented`/`verified` prematurely |
| E12 | Allow-all enabled, then disabled or API restarted | Describe automatic decisions truthfully and respect the host's current approval mode |
| E13 | Missing/duplicate scenario IDs or moved sources | Keep source identity and surface ambiguity; do not silently substitute another row/feature |
| E14 | Fresh menu plus two creates in the same minute | Allocate compatible stable IDs and distinct valid test data under the agreed naming policy |
| E15 | Safe next-batch request on a later turn in the same draft | Resume only after the existing review and verification prerequisites are satisfied; retain scope and IDs |

## Verification performed

- Read five skills and 20 reference documents, plus contributor/workflow guidance, test organization, relevant feature examples, runner configuration, the adapter and review/browser consumers.
- Checked 77 relative Markdown links in the skill documents, including referenced heading anchors: no missing target found.
- `node --test server/modules/agent/*.test.mjs`: 45 passed, zero failed/skipped.
- `node --test server/modules/agent/exploration-browser.smoke.mjs`: one passed against a synthetic loopback fixture using real CLI/browser commands.
- `playwright-cli.cmd --help`: inspected installed terminal capabilities without opening a tenant session.
- Executed the timestamp-collision probe locally against the actual helper: collision reproduced.

No tenant BDD, production-provider evaluation, catalog synchronization or evidence upload was performed. Biome, application typecheck and build were not run because this audit changes only this Markdown report.

## Repair order and open policy choices

1. Resolve A01–A03: define attainable Q-Rex outputs, native approvals and browser alternatives. These changes should explain existing capabilities rather than add execution privileges.
2. Resolve A04–A06 and the shared entity default: align terminology and handoffs while preserving current approval, identity and data-safety policy.
3. Agree the A07 collision strategy. Establish A08's behavioral baseline, then simplify duplicated instructions and compare outputs with that baseline.

The baseline policy requires verification before another batch. The follow-up preserves that requirement; it clarifies the useful drafting handoff and what external evidence can satisfy verification, rather than silently allowing unverified batches to advance.

## Resolution — 2026-11-17

The user requested implementation of the improvements. The five skills now share one [workflow contract](../../.agents/skills/ask-qa/references/workflow-contract.md), with conditional browser references and a matching runtime prompt. No review enforcement or execution privileges were changed.

| Finding | Change applied |
| --- | --- |
| A01 | Defined a completed implementation-draft handoff, retained truthful registry states, and specified external validation tied to the exact source/patch and scenario scope. |
| A02 | Used native Q-Rex PRD and scenario approval procedures; documented automatic gate handling and persisted PRD `review_method` provenance. |
| A03 | Split terminal/managed-browser capabilities; supplied locator and factual-evidence alternatives, and retained unsupported contracts as gaps. |
| A04 | Separated authorized task/operations, data ownership, scoped seed exceptions and host approvals; reused established decisions. |
| A05 | Aligned new PRD/scenario allocations to three uppercase letters while preserving legacy IDs. |
| A06 | Defined turn versus persisted draft session and batch; kept same-target specialist handoffs and evidence prerequisites. |
| A07 | Documented readable distinct labels, bounded duplicate handling and uncertain-submission safeguards while preserving minute stamps and the existing helper. Tenant field constraints and actual create outcomes remain live-validation concerns. |
| A08 | Added independent offline exercises using immutable actual-skill snapshots and realistic requests. Their prompts, outputs, scoring and limits are recorded in the [evaluation report](agent-skills-evaluation.md). |

Repeated context/interview/state guidance moved into the shared contract. Main router/scenario/code instructions were shortened, the Converge entity default reaches every tenant workflow, and scenario review now connects requirement IDs, source identities and promised outcomes. Existing approved scenario intent is preserved until its own review changes it.

Validation after the implementation: 45 runtime tests and the synthetic real-browser smoke passed; typecheck and build passed. Biome passed with 18 warnings in the untouched global stylesheet; the build retained its chunk-size warning. No tenant BDD, catalog synchronization, evidence upload or production-provider acceptance pass was run. Frontmatter/name/description/invocation and internal-reference checks were performed locally; the packaged Python validator could not execute because PyYAML is absent, so its success is not claimed.

Q-Rex reads skills from its committed-base worktree. Source changes here do not replace another draft's instructions. The workflow guide documents using the revised committed base and restarting the API for adapter changes after active work finishes. No draft was reset, committed, published or silently modified to propagate these changes.
