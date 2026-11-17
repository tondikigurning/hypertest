# Agent skill decision exercises

Date: 2026-11-17. Purpose: evaluate actual skill instructions against realistic requests before and after the changes in the [audit resolution](agent-skills-audit.md#resolution--2026-11-17).

Two independent agents each read an immutable skill snapshot and the same eight synthetic requests. They had no parent conversation, audit conclusions, proposed fixes, expected answers or access to each other's output. Both were instructed to read the matching skills/references, use only supplied host capabilities, and report next actions, attainable states and user-facing responses. They could read the exercise files and write their responses, but could not access the live repository, network or tenant, execute tests, publish or invent missing artifacts.

This exercises model decisions using actual skill text. It does not execute those decisions through Q-Rex or measure production-provider reliability. Each case was tried once per version; the results are not a statistical estimate or a guarantee across models. The agents inherited the active session model; the collaboration interface did not expose its exact model/provider identifier, so none is inferred here. The main agent reviewed and scored the outputs against the supplied facts and current workflow policy.

## Inputs and reproducibility

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
