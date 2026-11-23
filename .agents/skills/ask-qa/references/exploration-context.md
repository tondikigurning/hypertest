# Reusable exploration context

Use this contract throughout `write-prd` → `write-e2e-scenarios` → `write-e2e-code`, before deciding whether to open a browser. Each phase consumes the evidence already available and produces only the missing evidence. A skill, turn, review gate, context compaction or new session is not a reason to repeat exploration.

## Recover before browsing

1. Resolve the owning menu and authorized target from the shared workflow contract. Recover its active database PRD and relevant features when available, and these workspace files beside the menu's flat feature or folder when present. Scenario discovery requires the owning active PRD under its specialist workflow; an unavailable PRD does not by itself block independently eligible, intent-preserving code work:
   - `e2e/tests/bdd/features/<module>/<menu>.exploration.md`: the shared exploration record, starting in PRD work, even before any feature exists.
   - `e2e/tests/bdd/features/<module>/<menu>.flows.md`: confirmed flow inventory, scenario mappings and batch/review handoffs. This remains owned by scenario authoring.
2. Reuse relevant conversation/tool evidence already in context. In the same session, use the known record and observations without rereading unchanged material solely for a skill switch. Re-read sources that changed or whose contents are no longer available. In a new session, read the saved records and compare their source references with current artifacts. Also recover applicable legacy PRD notes, flow handoffs and verified implementation evidence; absence of the new record does not erase usable earlier exploration.
3. Assess evidence per journey, branch, locator or request contract against the current scope, environment, safe tenant/entity description, role, prerequisites and known UI changes. Compare PRD references for requirement mappings and scenario contracts for implementation/review scope separately from browser facts. A changed PRD or scenario can require remapping without invalidating a still-applicable locator. A missing source comparison is unverified, not an exact match.
4. Before any exploration/setup browser call, identify the specific unanswered question or affected item and why existing evidence cannot answer it. Apply the table below. If nothing needs live evidence, continue the phase without exploration calls, login or a routine freshness visit; preserve the browser cleanup rules below. Report reused evidence and its observation dates truthfully.

| Available evidence | Next action |
| --- | --- |
| Applicable live observation establishes the required condition, action and outcome | Reuse it. A live-exploration prerequisite is satisfied by this prior observation; replay is unnecessary. |
| Outcome is known, but a locator or alternate branch is missing | Investigate only that locator/branch. Navigate through known prerequisites as needed; retain their prior findings. |
| Only a requirement statement without a factual live observation, an assumption, screenshot-derived locator or bare `eNN` ref exists | Keep the claim unverified; obtain the missing supported browser evidence. Dated factual observations in legacy PRD notes remain eligible for reuse. |
| Relevant UI/deployment change, different target/role/state, conflicting evidence, or explicit user request to re-verify | Check the affected facts and dependencies; retain unrelated evidence. A different environment's observation is a lead until its applicability is established. |
| A prior blocker is unchanged | Reuse the blocker and next action; retry when its prerequisite changes or the user requests another attempt. |
| Browser is unavailable, but applicable evidence covers the phase's needs | Continue authoring or implementation under the existing review gates; report any remaining gaps. Block only work that needs missing live evidence. |

Observation age, an unknown UI build, a closed browser, or a changed session alone does not invalidate evidence. State relevant uncertainty; recheck when it affects a concrete decision rather than treating all old evidence as stale. An explicit refresh/re-verification request does require targeted fresh evidence. Never relabel a reused observation as newly checked.

## Persist while exploring

Create or update the menu's `.exploration.md` after each meaningful exploration chunk and before review, a skill handoff or stopping. This includes a blocked/partial PRD pass and locator/request findings obtained during code work. Persist enough sanitized context to resume after chat loss or compaction; do not wait for scenario authoring to save PRD discoveries. Update affected entries in place, preserve stable evidence IDs and unaffected entries, and distinguish new observations from reused ones. If interrupted before saving, recover available tool/chat evidence first and report any unrecoverable gap.

Keep this record concise and searchable by journey, requirement and evidence ID. Use these fields, omitting unavailable values explicitly rather than inventing them:

```markdown
# <Menu> exploration

## Scope and sources

- Owner: <module/menu>; scope: <included journeys/children and exclusions>.
- Target: <safe environment and tenant/entity alias>; role: <non-personal role>.
- References: <active PRD identifier and version or relevant exact safe content reference;
  source sections; relevant feature paths/contracts when present>.
- Context: <answered business questions, priorities, restrictions, decisions and unresolved intent>.
- UI/build: <known change indicator, or unknown>; observation dates are per evidence item.

## Exploration inventory

| Item / branch | Source / PRD IDs | Evidence | Remaining gap / next action |
| --- | --- | --- | --- |
| <entry, condition, action and expected/observed outcome> | <reference> | <E1 or not attempted> | <none, exact blocker, deferred branch or exclusion and reason> |

## Evidence

### E1 — <journey / branch>

- Observed: <actual date, phase, host and supported evidence source>.
- Context: <target alias, page/navigation, role, relevant record state and prerequisites>.
- Attempt and result: <what was actually exercised, exact safe assertion text and observable outcome;
  distinguish opening a form from submitting and observing saved data>.
- Verified locators: <actual reusable expressions, their element scope and interaction/outcome;
  identify unverified controls explicitly>.
- Requests: <only supported sanitized contract facts needed downstream, or unavailable>.
- Limits / next action: <unobserved branches, unavailable evidence, data provisioning/cleanup
  recipe and remaining dependencies; no claim that a prior record still exists>.
```

While already viewing relevant UI, capture supported reusable locator expressions for controls/outcomes likely needed downstream, using snapshots, supported inspection or `generate-locator`. Save the expression, scope and what verified it; a label alone does not prove a unique locator. Do not revisit already covered journeys solely to fill optional locator fields or speculate about future selectors. Request details are collected only where useful and supported by the host. Live data existence, ownership and state must still be checked before a new mutation; retain a safe provisioning recipe rather than relying on an old record identity.

The record is the canonical home for detailed browser knowledge shared by all phases. The PRD keeps consumer-visible requirements, provenance, evidence references and consequential gaps, with a link to this record in Sources and review. The flow registry keeps scenario mappings/review contracts and references relevant evidence IDs here instead of copying the log. Preserve usable legacy evidence where it already lives; link or consolidate affected entries when needed, without a wholesale migration. An unsaved pending proposal does not replace the saved active PRD. Use the host-reported active version, which may contain unvalidated items; review status does not determine activation.

Store only safe minimal facts: no credentials, cookies, authentication/session state, customer or personal data, sensitive record IDs/URLs, raw snapshots, request bodies/headers, absolute local paths or large binaries. Use relative paths only for actual safe artifacts that exist; factual sanitized notes are sufficient where the host cannot capture artifacts. A redacted locator or contract is unverified if sanitization prevents reuse or exact comparison. Keep permission and review evidence in their existing host-specific mechanisms; this record grants no PRD/flow/scenario approval, live-data authorization or test pass.

## Handoff and browser lifetime

At each phase boundary, save the record and report its path, the scope already observed, reused/new evidence IDs and remaining questions for the next phase. PRD work creates no flow/scenario IDs or flow registry. Scenario work preserves mappings and its review handoff; code work saves newly verified browser facts here as well.

A new session can reuse only artifacts accessible in its workspace and database identity. A terminal agent continuing in the same local checkout can read its saved uncommitted records directly, even with no prior chat or Q-Rex session; compare current files and the database PRD before reuse. If another worktree contains unsaved context, report that boundary; do not silently copy private state, reset, commit or switch worktrees. Reconstruct accessible evidence before scheduling missing exploration. Saving a file does not automatically commit it or transfer it to another draft.

Reuse the current task-owned terminal session while live work is needed and its target/authentication remain applicable; a skill switch needs no new browser or login. Check installed CLI capabilities once per available installation/context, repeating only for changed support or an error. A fresh snapshot is needed when interacting with temporary refs after navigation, rerender or session change; this is interaction preparation, not rediscovery. Q-Rex owns browser lifetime and closes it after a turn. Keep that cleanup; reopening for a genuine evidence gap does not require replaying previously established outcomes. Close only the terminal session owned by this task when browser work is finished, preserving all other sessions.
