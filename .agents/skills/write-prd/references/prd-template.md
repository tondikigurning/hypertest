# Menu PRD template

Use this template for new menu PRDs. Keep content that defines scope, prerequisites, rules, observable outcomes, provenance or unresolved gaps. Omit optional or empty sections and placeholders. The UI already identifies the module and menu; no repeated title or document status is required. Preserve an existing PRD's structure and IDs during scoped updates.

```markdown
## Purpose and scope

<Brief user goal, intended users, included journeys/child groups and agreed exclusions.>

## Journeys and requirements

### Shared rules

- **PRD_<CODE>_001** [spec] <A rule used by multiple journeys, its relevant conditions and observable outcome>. _Source:_ S1.

### <Business journey / user goal>

<Actor, entry point or shared prerequisite only where needed. Reference shared rule IDs here where applicable.>

- **PRD_<CODE>_002** [spec] <Under a relevant condition, an action produces an observable outcome>. _Source:_ S1.
- **PRD_<CODE>_003** [observed] <A consequential alternate condition and observed outcome>. _Evidence:_ E1.

## Open issues

- <Affected requirement IDs or unexplored journey; unanswered decision, unverified boundary or expected-versus-actual discrepancy; evidence and what is needed to resolve it.>

## Sources and review

- S1: <Document name and section or user statement; date.>
- E1: <Environment, date, role, explored screen/journey and sanitized observation or actual artifact reference; evidence limitations.>
- <Review proposal/acceptance metadata: reviewer, date and review_method.>
```

## Writing requirements

- Focus on available business journeys and explicitly requested changes. Preserve stated requirements even when exploration cannot reach or verify them; mark the limitation as an open issue. Do not treat an inaccessible feature as absent or add unrelated roadmap material.
- Give each independently assessable business rule or outcome a stable ID. Describe the relevant role, state or input condition, action and observable outcome. Split consequential branches when they need different conditions or outcomes. Include supported main success journeys and consequential permission, lifecycle, validation, failure and integration behavior; include field details when they affect a business outcome, prevent completion, or are explicitly requested.
- Group requirements under journey goals, with shared prerequisites once. Record shared rules once with their own IDs and reference them from applicable journeys. These groups are candidate flows for scenario discovery, not approved flows or scenario IDs. Preserve established priority where relevant; scenario discovery applies smoke/regression policy.
- For mutations, describe the result on the identified record and where it can be observed. A success message alone does not establish saved data. For cross-menu/platform journeys, identify the participating areas, prerequisite, handoff and outcome owned by this menu; link supporting PRDs when useful.
- Use exact UI text when it defines an assertion or distinguishes an outcome, and cite where it was stated or observed. Routine labels, field inventories, click sequences, locators, API details and execution logs do not belong in the PRD unless explicitly required. Use a short example or decision table only when it clarifies a rule.

Every behavioral statement has a stable `PRD_<CODE>_<NNN>` ID and one provenance tag: `[spec]` for a user or document statement, `[observed]` for live behavior, or `[assumed]` for a delegated assumption. Context and issues reference those IDs rather than hiding additional requirements. Preserve established codes and IDs. For a new menu select an unused three-letter uppercase code compatible with the scenario convention. Never renumber or reuse an ID; mark obsolete items retired with date and reason.

## Sources, review and handoff

Resolve each source/evidence reference in Sources and review; several requirements may share a reference. An observation is not product intent. Give each observation an actual safe artifact or a dated sanitized note with environment, role and explored scope; record evidence limits and unverified areas without duplicating the log. List candidate defects with expected/actual behavior, evidence and a real ticket if provided. Retain relevant unmapped source content as an open issue with a source reference. Never include secrets or personal/customer data.

Only accepted items receive `[validated]`. Q-Rex proposes intended validations through native PRD approval; terminal hosts obtain explicit review of the exact content before adding them. Record reviewer, date and `review_method: manual` or `automatic` when validations are accepted. Automatic acceptance is not human confirmation. Keep unchanged validations on refresh, remove them from changed or conflicting items, and retain unresolved items unvalidated. Legacy `[needs-review]` remains unvalidated. Preserve historical review metadata, including an unknown method, without silently changing it.

The scenario coverage baseline comprises active in-scope validated items according to their review method and attributed unvalidated `spec`; unresolved conflicts, unvalidated observations and assumptions remain visible but do not establish intent. The scenario review accounts for every baseline requirement and consequential branch, mapping assertions or identifying gaps. Keep scenario mappings and run status in the scenario review, not the PRD.
