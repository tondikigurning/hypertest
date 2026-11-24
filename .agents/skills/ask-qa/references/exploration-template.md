# Menu exploration template

Use this template when creating `e2e/tests/bdd/features/<module>/<menu>.exploration.md`. Replace placeholders with known, sanitized facts; state unknown values as unknown. Keep each of the five sections in order, using `None yet` where there is no content. Add evidence, confirmation scopes and batches only when they exist. Follow [exploration context](exploration-context.md) for reuse, maintenance and data safety, and [flow registry](../../write-e2e-scenarios/references/flow-registry.md) for confirmation and handoff requirements.

```markdown
# <Menu> exploration

## Scope and sources

- Owner: <module/menu>; scope: <included journeys/children and exclusions>.
- Target: <safe environment and tenant/entity alias>; role: <non-personal role or unknown>.
- References: <active PRD identifier and version or safe content reference; relevant source sections and feature paths>.
- Context: <answered business questions, priorities, restrictions, decisions and unresolved intent>.
- UI/build: <known change indicator or unknown>; observation dates are per evidence item.

## Exploration inventory

| Item / branch | Source / PRD IDs | Evidence | Remaining gap / next action |
| --- | --- | --- | --- |
| <condition, action and expected/observed outcome> | <reference> | <evidence IDs or not attempted> | <none, blocker, deferred branch or exclusion and reason> |

## Evidence

### E1 — <journey / branch>

- Observed: <actual date, phase, host and supported evidence source>.
- Context: <target alias, page/navigation, role, relevant state and prerequisites>.
- Attempt and result: <what was exercised, exact safe assertion text and observable outcome; distinguish opening a form from submitting and observing saved data>.
- Verified locators: <reusable expressions, element scope and verified interaction/outcome; identify unverified controls>.
- Requests: <supported sanitized contract facts needed downstream, or unavailable>.
- Limits / next action: <unobserved branches, unavailable evidence, safe provisioning/cleanup recipe and remaining dependencies>.

## Flow confirmation provenance

### <scope>

- Inventory, source comparisons and decision: <proposed or confirmed scope, PRD and feature comparisons, actual decision and post-authoring comparisons when applicable>.

## Scenario handoffs

### <batch>

- Scope and status: <exact feature paths and scenario identities; PRD and exact snapshot references>.
- Coverage: <requirement/branch to scenario mapping, evidence IDs, gaps and next actions>.

#### Terminal scenario review

<Pending or actual decision and matching source digests when applicable.>
```

The table row, evidence entry, scope and batch above illustrate their fields; replace or omit them until applicable. Do not create an evidence ID or a review decision for an unobserved or undecided item. For a Q-Rex review, the host's decision remains authoritative; include a terminal scenario review entry only for terminal review.
