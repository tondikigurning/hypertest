# Organize tests by module and submodule

The explorer mirrors the target application's menu: **module → submodule → optional test groups and files**.
Only real menus belong at the submodule level. A test group describes coverage inside its owning submodule;
it does not create another product menu.

## Feature sources

This illustrative layout uses paths relative to `e2e/tests/bdd/features/`; inspect the checkout for existing files:

```text
workforce-management/
  work-orders.feature                 # one file is enough for this submodule
case-management/
  cases/                              # one menu with several child files
    list-and-detail.feature
    assignment.feature
    lifecycle.feature
    editing.feature
    workbench.feature
    create.feature
    bulk.feature
  survey-template-manager.feature     # sibling product menu
```

Keep a small submodule in `<module>/<submodule>.feature`. When it needs several files, place them inside
`<module>/<submodule>/`. Split by coherent business journeys or coverage boundaries. Group names are open-ended:
`functional.feature`, `integration.feature`, `bulk.feature`, or deeper folders such as
`integration/work-orders.feature` and `integration/customer-platform.feature` are supported. Use kebab-case.
Choose file names from the actual reviewed scope; these integration paths are examples, not existing coverage.

For example, Knowledge Management's Article Management can have `article-management/functional.feature` and
`article-management/integration.feature` under its module folder. Both appear under **Article Management**.
For a module with one menu, keep that real menu as the submodule instead of promoting Integration to its sibling.

When splitting, move the original submodule file into its folder and distribute whole scenario/flow sections.
Preserve IDs, flow tags, references, backgrounds, inherited tags, examples, setup, assertions, safety comments and
scenario order within each flow. Keep shared steps and page objects reusable; a file split does not require copies
of their implementations. Register the new paths in `e2e/playwright.bdd.config.ts` only for implemented scenarios.

Existing flat paths remain supported. If a flat file temporarily coexists with a same-named folder, the submodule
appears once and its total includes both. Prefer the folder layout for new multi-file coverage.
`_components/` remains the separate inventory of reusable component master contracts.

## Integration ownership and identity

Keep an E2E journey crossing menus, modules or external platforms under the **submodule that owns its business
outcome**. Record entry points, participating menus/platforms, prerequisites, observable outcome, cleanup and
unverified boundaries in its reviewed PRD and scenario review. Link related scenario contracts with existing
`@ref:` tags where appropriate. Store one authored copy of a journey; additional participants do not require copies.
Resolve unclear ownership from the requirements and user context before authoring.

Here, Integration is an organizational group of Playwright BDD journeys. It does not change the runner/test tier,
`@type:` values, mock policy, or review and live-data rules. A mocked external response does not verify the real
platform integration. Separate-platform exploration/execution still needs supported access and scoped authorization;
the local Q-Rex browser remains restricted to the configured target origin.

IDs and flow tags belong to the owning submodule across **all** its files, not to an individual file or test group.
Search the complete submodule, catalog and known retired IDs before assigning an ID. Never restart an existing
ID sequence just because a file was split, moved or added. A flow can span files while retaining one flow ID;
review and implementation batches must identify their exact files and scenario IDs.

## Explorer, PRDs and execution

Click a submodule or folder to see all its scenarios; expand its disclosure button to navigate child groups/files.
Counts are scenario rows, including outlines as one authored row, not a claim of executable examples or unique IDs.
Flow groups retain their source file, so equal flow labels in different files remain separate. Search includes source
paths and spans all features. Filters narrow the displayed rows; Run uses the full selected group as stated in its
confirmation dialog.

For example, with the illustrative Cases files above, `/case-management/cases` selects all Cases scenarios and
`/case-management/cases/bulk` selects the Bulk file. Direct links, reload, browser history, scenario references and
search results retain the selected source. Old submodule links still open the submodule after a split.

Each real submodule has one PRD covering its own behavior and all child test groups/files:
`docs/prd/<module>/<submodule>.md`. In Q-Rex this is a database-backed virtual identifier. Select the submodule
in the sidebar to view or manage its PRD; child views contain no PRD button. Older child URLs with `?view=prd`
open the parent submodule PRD. Multiple versions remain versions of that same submodule document.

Keep requirements, candidate flows, integration dependencies and unresolved gaps for every known child scope in
the parent PRD. A scoped exploration or refresh records what remains unverified and preserves unrelated validated
requirements; it does not imply full coverage. If a child introduces missing requirements, refresh the same PRD
through its review workflow. Use other submodule PRDs as supporting context, and keep review ownership with the
submodule whose feature is being authored. The flow-confirmation tool validates that a flat or nested feature uses
its owning submodule PRD. Shared `_components` master contracts have no product owner in their path, so they use
the reviewed PRD of the consuming submodule; the workflow must resolve that owner from context.
The reusable `_components` navigation is not a product submodule and does not expose a PRD button.

Run can select a scenario, file, flow category within a file, or a submodule/folder. The server resolves every group
from current source and catalog entries, rejects stale or ambiguous selections, then checks Playwright collection.
An authored child file does not by itself establish execution availability. Q-Rex group context records the selected
scope without silently choosing a child file; its committed worktree may differ from the explorer checkout.

After moving feature sources, use `pnpm db:sync-catalog` (or restart the API) to regenerate the database catalog and
`pnpm build` to regenerate the static snapshot. Preserve generated catalogs and artifacts through their producers.
Source moves do not rerun tests, move uploaded evidence, or verify integration behavior. Evidence availability stays
separate from test outcomes, and older path-based evidence may require a fresh authorized run at the new path.
