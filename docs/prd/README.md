# Sub-module PRDs

Store each sub-module PRD at `docs/prd/<module>/<submodule>.md`. Use the `/write-prd` skill to import a document, explore a sub-module, or refresh an existing PRD. The skill and its template live in `.agents/skills/write-prd/`.

The one PRD covers all child test files/groups of a submodule, including integration journeys. View and manage it
from the submodule level. Record incomplete child coverage as unverified and refresh this document when requirements
are missing. Follow
[test organization](../automation/test-organization.md) for ownership and cross-menu/platform dependencies.

Keep a PRD in `draft` until its review gate accepts the complete proposed version. Manual review is the default; Q-Rex's explicitly configured automatic mode records automatic acceptance rather than human confirmation. Record `review_method` and the actual reviewer/mode, and validate only accepted items; unresolved conflicts stay `needs-review`. `write-e2e-scenarios` requires a matching reviewed PRD covering the requested scope and reuses its answered context. When the PRD is missing, draft, or insufficient, use `write-prd` to create, review or refresh it before scenario discovery. See the [shared review contract](../../.agents/skills/ask-qa/references/workflow-contract.md#hosts-and-review-gates).

Do not include credentials, tokens, personal data, or real customer records in a PRD.
