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

## Source vs actual discrepancies

- <Affected requirement IDs; source behavior and source reference; actual behavior and evidence reference; provisional actual baseline; product confirmation pending.>

## Open issues

- <Affected requirement IDs or unexplored journey; unanswered decision or unverified boundary; evidence and what is needed to resolve it.>

## Sources and review

- S1: <Document name and section or user statement; date.>
- E1: <Environment, date, role, explored screen/journey and sanitized observation or actual artifact reference; evidence limitations.>
- Exploration record: <relative path to the menu's shared .exploration.md, with relevant evidence IDs>.
- <Review proposal/acceptance metadata: reviewer, date and review_method.>
```

## Writing requirements

- Cover available business journeys throughout the requested scope, including consequential functions, rules and outcomes found in the application but absent from supplied documents. Write those findings as evidenced `[observed]` requirements. Preserve stated requirements even when exploration cannot reach or verify them; mark the limitation as an open issue. Do not treat an inaccessible feature as absent or add unrelated roadmap material.
- Give each independently assessable business rule or outcome a stable ID. Describe the relevant role, state or input condition, action and observable outcome. Split consequential branches when they need different conditions or outcomes. Include supported main success journeys and consequential permission, lifecycle, validation, failure and integration behavior; include field details when they affect a business outcome, prevent completion, or are explicitly requested.
- Group requirements under journey goals, with shared prerequisites once. Record shared rules once with their own IDs and reference them from applicable journeys. These groups are candidate flows for scenario discovery, not approved flows or scenario IDs. Preserve established priority where relevant; scenario discovery applies smoke/regression policy.
- For mutations, describe the result on the identified record and where it can be observed. A success message alone does not establish saved data. For cross-menu/platform journeys, identify the participating areas, prerequisite, handoff and outcome owned by this menu; link supporting PRDs when useful.
- For a partially explored journey, state only what was observed and record each unverified outcome or branch in Open issues with its reason.
- Use exact UI text when it defines an assertion or distinguishes an outcome, and cite where it was stated or observed. Routine labels, field inventories, click sequences, locators, API details and execution logs do not belong in the PRD unless explicitly required. Use a short example or decision table only when it clarifies a rule.

Every behavioral statement has a stable `PRD_<CODE>_<NNN>` ID and one provenance tag: `[spec]` for a user or document statement, `[observed]` for live behavior, or `[assumed]` for a delegated assumption. Context and issues reference those IDs rather than hiding additional requirements. Preserve established codes and IDs. For a new menu select an unused three-letter uppercase code compatible with the scenario convention. Never renumber or reuse an ID; mark obsolete items retired with date and reason.

## Sources, review and handoff

Resolve each source/evidence reference in Sources and review; several requirements may share a reference. An observation is not product intent. Give each observation an actual safe artifact or a dated sanitized note with environment, role and explored scope; record evidence limits and unverified areas without duplicating the log. List candidate defects with expected/actual behavior, evidence and a real ticket if provided. Retain relevant unmapped source content as an open issue with a source reference. Never include secrets or personal/customer data.

Keep the detailed inventory, attempts, verified locators and supported request facts in the [shared exploration record](../../ask-qa/references/exploration-context.md). Cite its evidence IDs here so scenario discovery and implementation can recover PRD-phase knowledge without chat or repeated browser exploration. Retain original observation dates when reusing evidence.

When no source document or business explanation is supplied, create the PRD from explored consumer-visible behavior: give each consequential behavior an `[observed]` requirement ID and evidence reference, record the absence of a source and any unknown purpose, role or branch, and present the complete proposal through the normal review gate. Do not invent intended behavior or a source citation. The lack of a source alone does not prevent a reviewable PRD.

Only accepted items receive `[validated]`. Q-Rex proposes intended validations through native PRD approval; terminal hosts obtain explicit review of the exact content before adding them. Record reviewer, date and `review_method: manual` or `automatic` when validations are accepted. Automatic acceptance is not human confirmation. Keep unchanged validations on refresh, remove them from changed or conflicting items, and retain unresolved items unvalidated. Legacy `[needs-review]` remains unvalidated. Preserve historical review metadata, including an unknown method, without silently changing it.

For an active source-versus-actual discrepancy, use the evidenced actual behavior as the provisional requirement and scenario baseline unless the user has decided otherwise. Keep product confirmation unresolved, source behavior and evidence in the dedicated section, and do not imply the provisional baseline establishes product intent. Once resolved, remove the entry from that section after updating affected PRD/scenarios through their review gates; omit the section when empty. Preserve references or history so the decision remains traceable.

The scenario coverage baseline comprises active in-scope validated items according to their review method, attributed unvalidated `spec`, and evidenced `[observed]` behavior as a provisional actual baseline, including when no source is available. Relevant untagged legacy content remains usable context with unknown provenance; check it against available evidence and report uncertainty. Unvalidated observations and assumptions do not establish intent. The scenario review accounts for every baseline requirement and consequential branch, mapping assertions or identifying gaps. Keep scenario mappings and run status in the scenario review, not the PRD.
