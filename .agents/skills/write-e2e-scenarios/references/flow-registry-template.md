# Menu flow registry template

Keep the menu `.flows.md` limited to the confirmed flow inventory and its gaps. Use exactly these two sections; store confirmation provenance and scenario handoffs in the menu's `.exploration.md` as described in [flow-registry.md](flow-registry.md).

```markdown
# <Menu> flows

## Flows

| Flow | Outcome | Feature | Status |
| --- | --- | --- | --- |
| `<flow ID>` | <observable business outcome> | `<feature path>` | pending / written |

## Gaps

- <candidate, unrepresented requirement, deferred or blocked branch, or limitation; include reason and next action>
```

Use feature paths relative to `e2e/tests/bdd/features/`. Include every confirmed flow in scope, even when scenarios are planned for a later batch. Omit Gaps when none remain. Replace placeholders and omit empty rows.
