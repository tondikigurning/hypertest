# Menu flow registry

Keep one `e2e/tests/bdd/features/<module>/<menu>.flows.md` beside the menu's flat feature or folder. The registry is a Git workspace file; the menu PRD remains in the database. Use paths relative to `e2e/tests/bdd/features/` in the Feature column. Use one row per confirmed flow; list all feature paths if a flow spans files.

```markdown
# Users flows

| Flow | Outcome | Feature | Status |
| --- | --- | --- | --- |
| `TEN_USR_CREATE_FLOW` | User is created and invitation is sent | `user-management/users/create.feature` | pending |
| `TEN_USR_EDIT_FLOW` | User details are updated and saved | `user-management/users/edit.feature` | written |

## Gaps

- Supervisor access unavailable; role-specific permissions remain unverified.
```

`pending` means the confirmed scope is not fully written, including partially written flows. `written` means scenarios for the confirmed scope have been authored, including any `@fixme` scenarios; it does not mean approved, implemented or passed. Reconcile pre-existing scenarios before marking them written. Preserve unrelated rows. If confirmed scope expands or scenarios are removed, return the affected flow to `pending` until its scope is written. Remove rejected or retired flows from the table; preserve existing scenario intent until its own review changes it, and reserve retired IDs in the applicable feature history or review record.

Use Gaps for unrepresented requirements, unconfirmed candidates, important scenarios or branches deferred to later batches, inaccessible roles/data and material limitations; identify the affected flow or requirement, specific remaining branch and next action where known. Remove resolved gaps; omit the section when none remain. Do not put credentials, customer data or sensitive browser evidence in the registry.

On resume, read the registry, active menu PRD and relevant feature files; reconcile their current contents, gaps and available prior confirmation and exploration evidence. Reuse still-applicable discovery, and re-explore only changed or unverified areas and the selected journey's missing detailed evidence. Reuse a still-valid host confirmation when available. If its snapshot or decision is unavailable, the minimal registry alone cannot establish whether the PRD or feature changed or restore a host approval: report the missing evidence and request the required confirmation for affected files, without repeating unrelated discovery. Reconfirm affected flows if their scope or supporting PRD/feature contents materially changed. The file itself does not grant flow, scenario or live-data approval. Preserve review and batch gates in the shared contract. If the registry is absent from the current workspace, do not assume another worktree's draft is available; inspect the accessible features and context and report the missing handoff.
