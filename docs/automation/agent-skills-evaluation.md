# Agent skill decision exercises

Date: 2026-11-17. Purpose: evaluate actual skill instructions against realistic requests before and after the changes in the [audit resolution](agent-skills-audit.md#resolution--2026-11-17).

Two independent agents each read an immutable skill snapshot and the same eight synthetic requests. They had no parent conversation, audit conclusions, proposed fixes, expected answers or access to each other's output. Both were instructed to read the matching skills/references, use only supplied host capabilities, and report next actions, attainable states and user-facing responses. They could read the exercise files and write their responses, but could not access the live repository, network or tenant, execute tests, publish or invent missing artifacts.

This exercises model decisions using actual skill text. It does not execute those decisions through Q-Rex or measure production-provider reliability. Each case was tried once per version; the results are not a statistical estimate or a guarantee across models. The agents inherited the active session model; the collaboration interface did not expose its exact model/provider identifier, so none is inferred here. The main agent reviewed and scored the outputs against the supplied facts and current workflow policy.

## Inputs and reproducibility

Cases 9–17 were added after the comparison below to exercise scenario branch coverage, cumulative scenario-batch review, and reuse and reconciliation of scenario exploration and terminal review decisions, including in a new session. They were not included in the recorded eight-case results and have not been independently evaluated here. Cases 18–23 have a separate exploration-reuse evaluation recorded below; they do not change the eight-case comparison.

- [Requests and host facts](skill-evaluation/cases.md)
- [Baseline responses](skill-evaluation/baseline-responses.md)
- [Revised responses](skill-evaluation/revised-responses.md)

The baseline is the five skills and 20 references at `2734c13`. The revised snapshot has five skills and 21 references, including the shared workflow contract. Their SHA-256 fingerprints include each Markdown path and content, sorted by relative path, with `/` path separators, LF-normalized text and a NUL after each path and content:

| Snapshot | SHA-256 |
| --- | --- |
| Baseline | `66e8575e167aeea1d1631a3d785ade1c5abc2aa7756e91fde972863b0e239a11` |
| Revised exercised snapshot | `00944be4b6ff6f4d9d8ec1b03ff7ff6556bb8190da8bcf8bb4281db9cd855b2b` |

After freezing the revised exercise, final documentation edits added the missing review-method field to the worked PRD example, clarified retained historical review metadata, and linked testing operations to the terminal/external-check branches. Those small follow-ups were checked locally; no additional model trial is claimed for them. The runtime prompt is tested separately and was not supplied to either exercise agent. Snapshot-reference link targets in the archived responses were converted to plain snapshot file identifiers; decision text was retained.

For a future comparison, freeze the proposed `.agents/skills` tree plus `docs/automation/test-organization.md` in an isolated temporary workspace. Give fresh independent agents the same requests and tool/access facts, without the results or scoring below. Keep baseline and candidate isolated. Save outputs, record snapshot/model identity where available, and score observable decisions. Add a case for a demonstrated failure rather than growing the instructions from speculation. Broader model/provider claims need repeated runs with the actual intended provider and supported local fixture tools.

## Results

Pass means the response preserves scope and actual host capabilities, honors the applicable review/data boundary, reports only supported evidence/states, and proposes a useful next action without inventing observations or artifacts.

| Case | Required decision | Baseline | Revised |
| --- | --- | --- | --- |
| 1 | Finish feasible approved code; hand off exact draft checks, retain `approved` until collection/types; no explorer-as-draft verification | Pass, handoff less explicit | Pass |
| 2 | Chat Yes cannot replace Changes-panel approval; preserve valid flow confirmation | Pass, inferred host mismatch | Pass, explicit native procedure |
| 3 | Propose the complete PRD through native review once; keep unresolved items and provenance | Pass, reconciled separate baseline instructions | Pass |
| 4 | Use supported locator evidence; do not invent a data-testid or capture an unavailable trace | Pass | Pass |
| 5 | Reuse supplied rules, allocate a compatible unused code, explore read-only and keep review pending | Pass, reconciled code-format mismatch | Pass |
| 6 | Use distinct meaningful labels within the existing minute-stamp format; keep scenario review | Pass | Pass, also handles existing-value/uncertain-submit limits |
| 7 | Resume a later batch in the same draft after exact prior verification; keep next scope's gates | Pass, required resolving the session wording using the explicit request | Pass, defined turn/session distinction |
| 8 | Refresh the parent PRD, preserve prior IDs/content, mark external boundaries unverified, use configured automatic acceptance truthfully | Fail: required human review despite enabled automatic mode | Pass |

Observed scores: baseline **7/8**, revised **8/8**. The baseline already made many good decisions using its reasoning and the supplied host facts. The changes make those decisions explicit and remove the observed automatic-mode conflict; this single comparison does not prove a universal improvement rate.

Selected evidence from case 8:

> Baseline: “New scope remains draft / needs-review pending human review.”

> Revised: “Allow-all accepts the native review automatically; do not ask for an extra human approval or impose a manual-only stop.”

Both versions retained the unavailable external integration outcome as unverified. The revised response also recorded `review_method: automatic` and `reviewed_by: Q-Rex automatic approval`, preserving the distinction from human product confirmation.

## Separate verification and limits

The implementation also passed 45 runtime tests, the real-CLI/browser smoke against a synthetic loopback fixture, TypeScript checking and the application build. The affected workflow suite passed again after the final runtime-prompt edit. Biome passed with 18 warnings in the unchanged global stylesheet; the build reported its chunk-size warning.

Skill names/descriptions, supported existing frontmatter/invocation fields and reference paths/anchors were checked locally. The bundled `quick_validate.py` could not execute because PyYAML was unavailable in the installed Python; its success is not claimed, and no dependency or invocation-policy change was made to satisfy it.

These checks do not establish live tenant correctness, actual draft BDD outcomes, every case in the broader audit matrix, or reliability for a chosen production provider. No live tenant mutations, BDD generation, evidence upload, catalog sync, draft reset, commit or publication occurred during this work.

## Exploration reuse — 2026-11-23

An independent agent with no parent conversation read an immutable skill snapshot and Cases 18–23 from the [exercise requests](skill-evaluation/cases.md). It could read only that snapshot and write its response there; live repository, browser, network, credentials, execution and publication were excluded. The [raw responses](skill-evaluation/exploration-reuse-responses.md) preserve its actual decisions and reported ambiguities. This was one trial per case, without a baseline trial or statistical reliability claim. The agent inherited the session model; no exact model identifier was exposed, so none is inferred.

The initial exercised snapshot contains all Markdown under `.agents/skills`, `docs/automation/test-organization.md` and `docs/automation/skill-evaluation/cases.md`: 32 files, SHA-256 `65d5a9d69aa2b9308712b0b0fa450403db74b43950b5ee9c25e7a1adba5092a0`. Fingerprinting sorts relative `/` paths and hashes each path, NUL, LF-normalized UTF-8 content, NUL. The main agent checked the responses against the supplied facts and evidence/review rules:

| Case | Observed decision | Assessment |
| --- | --- | --- |
| 18 | Backfill PRD-phase chat evidence, reuse outcomes/locators and checked CLI support; request flow confirmation without browser replay | Pass |
| 19 | Recover the shared record in a new chat; absent Variables/browser does not block evidenced scenario work; retain native review gates | Pass |
| 20 | Reuse complete observations for an imported proposal; an explicit post-deployment delete recheck needs targeted fresh evidence | Pass |
| 21 | Inspect only the missing Save locator with fresh refs; retain the unchanged role blocker and disclose an unusable redacted locator | Pass |
| 22 | Compare the changed PRD rule/mapping separately from still-applicable locators and matching terminal scenario acceptance | Pass |
| 23 | Recover dated legacy PRD observations, report missing worktree artifacts and assess affected evidence on the different target | Pass |

The trial identified small ambiguities around cleanup versus exploration calls, legacy factual PRD notes versus requirements, terminal flow-decision provenance, and the accepted PRD representation used for its digest. Follow-up edits clarified those points, aligned import/review and CLI-help wording with reuse, and retained the existing review gates. The resulting 32-file snapshot is `dffc2344032820ab58c9987a808283e2721f060baf2df5082cf9e421c7be5983`; the initial trial is not relabeled as a blind trial of those later edits.

The same evaluator's [follow-up review](skill-evaluation/exploration-reuse-follow-up.md) retained all six decisions and found the earlier material ambiguities resolved. It requested one final wording qualification: an **unsaved pending** PRD proposal does not replace the active version, while a saved active version can contain unvalidated items. That qualification was applied afterward. The then-current 32-file working instruction/case set hashed to `62122ab7e4e0c78b5f4aa5a3f54b3448fdaf8f259abf20c0994f58b1f9617b58`. It also preserved concurrent edits to `write-e2e-code` and scenario batching outside the frozen follow-up snapshot; no additional blind model trial is claimed for those edits or the final sentence. Later workflow-alignment edits are recorded separately below and change the current fingerprint.

Runtime validation used the actual AI SDK tool loop with a scripted local provider and temporary repositories. The new handoff case writes PRD exploration, reloads the session, reads that evidence in scenarios and code, preserves scenario approval across evidence-only edits and starts no browser. A second case checks that PRD work can write only its exploration record, scenario work can write the menu records, nested/arbitrary Markdown and implementation writes stay blocked, and records do not bypass flow confirmation. These verify tool transport and enforcement, not autonomous provider decisions.

The workflow suite passed **13/13**. The full agent suite passed **51/52**; the unchanged reset fixture in `changes-history.test.mjs` fails at `prdVersions` with `PRD database store is unavailable`. The same failure was reproduced from archived committed HEAD with the existing dependencies linked in an isolated temporary directory. It was not changed as part of exploration reuse. Type checking and build passed. Biome passed with the existing 18 CSS warnings; build retained the large-chunk warning. Local Markdown reference paths/anchors and unchanged skill frontmatter/scaffolding were checked. The bundled Python skill validator was attempted but could not import the unavailable PyYAML; its success is not claimed and no dependency was added for it.

No tenant browser exploration, tenant BDD generation/execution, evidence upload, catalog database sync, application restart, user-draft reset, commit or publication occurred. The build regenerated its ignored static output through the normal producer. These checks do not establish live-tenant behavior or guarantee decisions across models. Q-Rex still needs the revised skills in its selected workspace/base and an API restart for runtime changes; existing drafts were preserved.

## Workflow alignment follow-up

A further source and runtime audit aligned `ask-qa` and Q-Rex's workflow prompt with the code skill's eligibility rule for unchanged baseline scenarios. Handoff instructions now retain unknown historical review rather than calling those scenarios approved; changed scenario snapshots still follow the host review gate. The shared flow status table now matches the registry's partially authored `pending` and fully authored `written` meanings.

The audit also found that a previously saved `flow` context attachment for a nested feature selected a child-path registry, although the registry belongs to its parent menu. The resolver now uses the menu registry for flat and nested feature paths, reports an unavailable registry and asks for the consuming menu's file for shared components. The current flow picker already attaches a registry by file path; this correction also supports retained legacy attachments. The resolver applies workspace path and file-size checks before reading.

The agent workflow and review suites passed **28/28**, including a new scripted-provider case covering flat and nested attachments, a misleading child registry, a missing registry and shared-component handling. Biome and TypeScript passed; Biome reported the existing 18 CSS warnings. The build passed with its large-chunk warning. Local Markdown references and `git diff --check` passed. These checks do not include a live tenant, a production provider, scenario execution or a fresh independent decision exercise of the latest wording.

## Terminal continuation follow-up

The shared contract now explicitly describes loading skills and resuming saved uncommitted handoffs from the terminal agent's own checkout, independently of the Q-Rex runtime. Terminal flow confirmation records the pre-review PRD and feature digests, checks them again after the user's decision, and records the agent's verified post-authoring feature contents for later comparison. PRD source digests use exact bytes from the database CLI, not a virtual path treated as a local file. Browser configuration and prior exploration can be reused across skills, and an unavailable PRD does not independently block eligible technical repairs.

The PRD database suite passed **3/3**, exercising the real terminal CLI with isolated generated test identities, shared database reads, stale-write checks and review-gated writes. The installed `playwright-cli.cmd --help` was checked without opening a browser. Local reference paths/anchors and `git diff --check` passed. This validates terminal CLI access and documentation links; it does not simulate an autonomous terminal agent completing a human review, perform tenant exploration or execute BDD scenarios. No user PRD identity or existing task workspace was modified by the database tests.

## Continuation and instruction size — 2026-11-27

The workflow now resolves `continue`/`lanjut` from actual phase progress, scope and decisions; uses the existing exploration record as a compact continuation/source index; and reads only changed or missing context. Terminal acceptance can continue an already authorized pipeline in the same turn. Q-Rex's manual native PRD turn boundary and separate flow/scenario/data decisions remain intact. Terminal handoffs can reference existing raw-byte feature digests rather than duplicating Gherkin. The PRD import procedure loads only for imports; repeated interview, exploration and review prose was consolidated. A conflicting flow-discovery pointer was corrected so scenario mappings live only in the exploration handoff.

Q-Rex also returns only the activated skill name from `use_skill`. The active skill and workflow already enter `systemForStep` on every model request, so returning both complete documents again had duplicated instructions in persistent tool history. Activation, persistence and all existing approval guards remain in place.

This follows the official guidance to [keep skill entrypoints concise and load supporting resources conditionally](https://developers.openai.com/plugins/build/skills), and to [evaluate observable decisions and efficiency separately](https://developers.openai.com/blog/eval-skills). The source of truth remains the local host and repository workflow.

### Decision exercise

One independent agent with no parent conversation applied an immutable snapshot to the eight [continuation requests](skill-evaluation/continuation-cases.md). It could read only the snapshot and write its response; no live repository, tenant, network, credentials, database or test execution was available. The [raw decisions](skill-evaluation/continuation-responses.md) retain its actual conclusions. Snapshot-relative links were converted to plain source identifiers for archival, without changing decision text. The agent inherited the session model; no exact model identifier was exposed, so none is inferred.

The initial snapshot includes all skill Markdown, test organization and the continuation requests: **37 files**, SHA-256 `01270201b18366bb14d4f86b0f024c9ad0f481bde89a67c1680ef148bb60e7f9`. Fingerprinting sorts relative `/` paths, hashing each path, NUL, LF-normalized UTF-8 content, NUL. The main agent scored the decisions against the supplied facts:

| Case | Observed decision | Assessment |
| --- | --- | --- |
| C1 | Completed PRD plus `lanjut` selects scenarios; reuse evidence and request flow confirmation without browser replay | Pass |
| C2 | Pending PRD/scenario review needs explicit acceptance; continuation alone does not approve | Pass |
| C3 | Check bytes and record actual terminal acceptance, then implement in the already authorized turn; changed files need review | Pass |
| C4 | Preserve Q-Rex PRD turn boundary and native scenario approval; later continuation selects the right phase | Pass |
| C5 | Author remaining scenario-only batch before code; review the new cumulative snapshot | Pass |
| C6 | Recover source pointers after compaction; reassess changed PRD mapping separately from matching review and applicable locators | Pass |
| C7 | Inspect only the missing Save locator, retain unchanged account blocker and unsupported capabilities | Pass |
| C8 | Reuse successful checks, keep blocked/not-run execution truthful, preserve selected scope and PRD-only acceptance boundary | Pass |

Observed decisions: **8/8** in one trial per case. This checks instruction interpretation, not autonomous tool execution or a statistical reliability rate. After freezing the first exercise, the shared contract was shortened further without changing its gates, the mapping pointer was corrected, and README wording was clarified. The final instruction/case snapshot has 37 files, SHA-256 `bc7505f76224b77b3aec714f75dbcb211d4aaf783af09741885ee4aaa4cb1bd7`; the first trial is not relabeled as a blind trial of that revision.

The same evaluator's [follow-up review](skill-evaluation/continuation-follow-up.md) applied that final snapshot and retained all eight decisions. It kept unspecified artifact contents, runner exposure and the changed PRD rule as explicit uncertainties. This was a follow-up review, not a second blind comparison. The later `use_skill` transport change was verified by runtime tests, separately from the instruction-only exercise.

### Size and validation

Counts below compare LF-normalized text with committed baseline `e6a6c3e16b14180b4a86752f2be35d0b40e3b7eb`. They count characters, not model tokens; conditional references are excluded from entrypoint totals.

| Document | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| `write-prd/SKILL.md` | 27,314 | 9,176 | 66.4% |
| `write-e2e-scenarios/SKILL.md` | 11,152 | 8,651 | 22.4% |
| `write-e2e-code/SKILL.md` | 11,096 | 9,819 | 11.5% |
| Three specialist entrypoints | 49,562 | 27,646 | 44.2% |
| Shared workflow contract, including new continuation rules | 16,012 | 13,705 | 14.4% |

The workflow, review, context and session suites passed **48/48**, covering scripted-provider tool transport, PRD/flow/scenario gates, cumulative review, source changes and evidence handoff without a browser. A new regression checks that switching skills updates the next system prompt, preserves active instructions after session reload and keeps complete instruction documents out of tool history. These tests do not prove that an autonomous model chooses the intended continuation. Typecheck and build passed. Biome passed with 19 warnings in unchanged files (18 stylesheet warnings and an unused `downloadPrd`); build retained its chunk-size warning. Local frontmatter/name/description/scaffold and Markdown path/anchor checks passed. The bundled Python validator could not run because the `python` command resolves to an unavailable Windows runtime alias; its success is not claimed, and no dependency was installed.

No tenant exploration, BDD generation/execution, evidence upload, catalog sync, application restart, task reset, commit or publication occurred. Actual end-to-end duration and token savings remain unmeasured. A future comparison should keep target, requirements, assertions, host/model/effort and review decisions comparable, and separate active work, review wait and test duration using reported usage. Revised terminal instructions are usable in this checkout; Q-Rex still needs the skill revision in its own selected base/workspace and an API restart for the adapter changes, preserving unfinished drafts.
