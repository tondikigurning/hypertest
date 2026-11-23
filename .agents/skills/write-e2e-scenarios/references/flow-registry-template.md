# Menu flow registry template

Keep the menu `.flows.md` limited to the confirmed flow inventory and its gaps. Use exactly these two sections; store confirmation provenance and scenario handoffs in the menu's `.exploration.md` as described in [flow-registry.md](flow-registry.md).

```markdown
# <Menu> flows

## Flows

| Flow | Outcome | Feature | Status |
| --- | --- | --- | --- |
| `<flow ID>` | <observable business outcome> | `<feature path>` | pending / written |

## Gaps

- <PRD/actual mismatch: observed behavior missing from the PRD, or a PRD requirement not observed in actual; include evidence or access blocker and next action>
```

Use feature paths relative to `e2e/tests/bdd/features/`. Include every confirmed flow in scope, even when scenarios are planned for a later batch. In Gaps, record mismatches between the active PRD and actual behavior. A PRD requirement not observed in actual is one gap whether the feature is absent or access prevents verification; record which explanation is known, or that it is unresolved, and the next action. Omit Gaps when no mismatches remain. Replace placeholders and omit empty rows.
