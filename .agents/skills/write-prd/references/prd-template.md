# Menu PRD template

Keep new PRDs concise. Include sections only when relevant; do not fill empty sections with placeholders. The menu and module are already shown by the UI, so do not repeat them as a document title. Existing PRDs retain their structure and IDs during scoped updates. No document status is required.

```markdown
## Overview and scope

<Purpose, users, covered child groups and meaningful exclusions.>

## Requirements

- **PRD_<CODE>_001** [spec] <one observable behavior>. _Source:_ <document or interview>.
- **PRD_<CODE>_002** [observed] <one observed behavior>. _Seen:_ <screen, environment, date>. _Evidence:_ <safe artifact or exploration note>.

## Business flows

| Flow | Outcome | Priority | Smoke candidate | Source |
| --- | --- | --- | --- | --- |
| <name> | <outcome> | high / medium / low | yes / no | spec / observed / assumed |

## Gaps and questions

- <Unverified scope, discrepancies, candidate defects or unresolved decisions, with reasons and evidence.>

## Sources and exploration

- <Source, date, environment and role; covered and unverified areas. Never include secrets or personal data.>
```

Record roles, prerequisites, business rules and exact UI messages within the relevant requirements where they matter. List candidate defects with expected and actual behavior, evidence and a real ticket if provided. Do not imply unexplored areas were verified. Keep uploaded content that cannot be mapped as a concise source note rather than dropping it.

Every behavioral statement has a stable `PRD_<CODE>_<NNN>` ID and one provenance tag: `[spec]` for a user or document statement, `[observed]` for live behavior, or `[assumed]` for a delegated assumption. Preserve established codes and IDs. For a new menu select an unused three-letter uppercase code compatible with the scenario convention. Never renumber or reuse an ID; mark obsolete items retired with date and reason.

An observed behavior is not product intent. Record exact UI messages and where they were seen. Give each observation a safe artifact reference or a dated sanitized exploration note and state any evidence limitations.

Only accepted items receive `[validated]`. Q-Rex proposes intended validations through native PRD approval; terminal hosts obtain explicit review of the exact content before adding them. Record reviewer, date and `review_method: manual` or `automatic` when validations are accepted. Automatic acceptance is not human confirmation. Keep unchanged validations on refresh, remove them from changed or conflicting items, and retain unresolved items unvalidated. Legacy `[needs-review]` remains unvalidated. Preserve historical review metadata, including an unknown method, without silently changing it.
