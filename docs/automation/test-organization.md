# Organize tests by module and menu

The explorer mirrors the target application's navigation: **module → menu → optional test groups and files**.
Only real product menus belong directly under a module. A test group describes coverage within its owning menu;
it does not create another product navigation item.

## Feature sources

This illustrative layout uses paths relative to `e2e/tests/bdd/features/`; inspect the checkout for existing files:

```text
workforce-management/
  work-orders.feature                 # one file is enough for this menu
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

Keep a small menu in `<module>/<menu>.feature`. When it needs several files, place them inside
`<module>/<menu>/`. Split by coherent business journeys or coverage boundaries. Group names are open-ended:
`functional.feature`, `integration.feature`, `bulk.feature`, or deeper folders such as
`integration/work-orders.feature` and `integration/customer-platform.feature` are supported. Use kebab-case.
Choose file names from the actual reviewed scope; these integration paths are examples, not existing coverage.

For example, Knowledge Management's Article Management can have `article-management/functional.feature` and
`article-management/integration.feature` under its module folder. Both appear under **Article Management**.
For a module with one product menu, keep that menu as the owner; do not promote Integration to its sibling.

When splitting, move the original menu file into its folder and distribute whole scenario/flow sections.
Preserve IDs, flow tags, references, backgrounds, inherited tags, examples, setup, assertions, safety comments and
scenario order within each flow. Keep shared steps and page objects reusable; a file split does not require copies
of their implementations. Register the new paths in `e2e/playwright.bdd.config.ts` only for implemented scenarios.

Existing flat paths remain supported. If a flat file temporarily coexists with a same-named folder, the menu
appears once and its total includes both. Prefer the folder layout for new multi-file coverage.
`_components/` remains the separate inventory of reusable component master contracts.

Keep one confirmed-flow registry beside each menu's flat feature or folder at
`<module>/<menu>.flows.md`. The registry records scenario authoring progress and discovery gaps;
its format and resume rules are in the [flow registry reference](../../.agents/skills/write-e2e-scenarios/references/flow-registry.md).
The explorer continues to derive flows from feature tags.

Keep one shared exploration record at `<module>/<menu>.exploration.md` beside the same menu file or
folder, starting during PRD work even when no feature exists yet. All child groups and all three authoring
phases reuse it. It stores sanitized browser observations, the explored inventory, verified locators and
remaining evidence gaps; see [exploration context](../../.agents/skills/ask-qa/references/exploration-context.md).
Its five fixed sections cover scope and sources, inventory, evidence, flow confirmation and scenario handoffs.
Update affected entries in place; a new prompt or skill invocation alone does not add a record.
The PRD and flow registry reference it rather than duplicating the browser log. Neither Markdown file is a
scenario catalog input, an approval decision or an execution result.

## Integration ownership and identity

Keep an E2E journey crossing menus, modules or external platforms under the **menu that owns its business
outcome**. Record entry points, participating menus/platforms, prerequisites, observable outcome, cleanup and
unverified boundaries in its PRD and scenario review. Link related scenario contracts with existing
`@ref:` tags where appropriate. Store one authored copy of a journey; additional participants do not require copies.
Resolve unclear ownership from the requirements and user context before authoring.

Here, Integration is an organizational group of Playwright BDD journeys. It does not change the runner/test tier,
`@type:` values, mock policy, or review and live-data rules. A mocked external response does not verify the real
platform integration. Separate-platform exploration/execution still needs supported access and scoped authorization;
the local Q-Rex browser remains restricted to the configured target origin.

IDs and flow tags belong to the owning menu across **all** its files, not to an individual file or test group.
Search the complete menu, catalog and known retired IDs before assigning an ID. Never restart an existing
ID sequence just because a file was split, moved or added. A flow can span files while retaining one flow ID;
review and implementation batches must identify their exact files and scenario IDs.

## Explorer, PRDs and execution

Click a menu or folder to see all its scenarios; expand its disclosure button to navigate child groups/files.
Counts are scenario rows, including outlines as one authored row, not a claim of executable examples or unique IDs.
Flow groups retain their source file, so equal flow labels in different files remain separate. Search includes source
paths and spans all features. Filters narrow the displayed rows; Run uses the full selected group as stated in its
confirmation dialog.

For example, with the illustrative Cases files above, `/case-management/cases` selects all Cases scenarios and
`/case-management/cases/bulk` selects the Bulk file. Direct links, reload, browser history, scenario references and
search results retain the selected source. Old menu links still open the menu after a split.

Each real menu has one PRD covering its own behavior and all child test groups/files:
`docs/prd/<module>/<menu>.md`. This is a database-backed virtual identifier for both Q-Rex and terminal agents. Select the menu
in the sidebar to view or manage its PRD; child views contain no PRD button. Older child URLs with `?view=prd`
open the parent menu PRD. Multiple versions remain versions of that same menu document.

Keep requirements, candidate flows, integration dependencies and unresolved gaps for every known child scope in
the parent PRD. A scoped exploration or refresh records what remains unverified and preserves unrelated validated
requirements; it does not imply full coverage. If a child introduces missing requirements, refresh the same PRD
through its review workflow. Use other menu PRDs as supporting context, and keep review ownership with the
menu whose feature is being authored. The flow-confirmation tool validates that a flat or nested feature uses
its owning menu PRD. Shared `_components` master contracts have no product owner in their path, so they use
the PRD of the consuming menu; the workflow must resolve that owner from context.
The reusable `_components` navigation is not a product menu and does not expose a PRD button.

Run can select a scenario, file, flow within a file, or a menu/folder. The server resolves every group
from current source and catalog entries, rejects stale or ambiguous selections, then checks Playwright collection.
An authored child file does not by itself establish execution availability. Q-Rex group context records the selected
scope without silently choosing a child file; its committed worktree may differ from the explorer checkout.

After moving feature sources, use `pnpm db:sync-catalog` (or restart the API) to regenerate the database catalog and
`pnpm build` to regenerate the static snapshot. Preserve generated catalogs and artifacts through their producers.
Source moves do not rerun tests, move uploaded evidence, or verify integration behavior. Evidence availability stays
separate from test outcomes, and older path-based evidence may require a fresh authorized run at the new path.
