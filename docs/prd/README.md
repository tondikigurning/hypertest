# Menu PRDs

Store each menu PRD at `docs/prd/<module>/<menu>.md`. Use the `/write-prd` skill to import a document, explore a menu, or refresh an existing PRD. The skill and its template live in `.agents/skills/write-prd/`.

The one PRD covers all child test files/groups of a menu, including integration journeys. View and manage it
from the menu level. Record incomplete child coverage as unverified and refresh this document when requirements
are missing. Follow
[test organization](../automation/test-organization.md) for ownership and cross-menu/platform dependencies.

Keep a PRD in `draft` until its review gate accepts the complete proposed version. Manual review is the default; Q-Rex's explicitly configured automatic mode records automatic acceptance rather than human confirmation. Record `review_method` and the actual reviewer/mode, and validate only accepted items; unresolved conflicts stay `needs-review`. `write-e2e-scenarios` requires a matching reviewed PRD covering the requested scope and reuses its answered context. When the PRD is missing, draft, or insufficient, use `write-prd` to create, review or refresh it before scenario discovery. See the [shared review contract](../../.agents/skills/ask-qa/references/workflow-contract.md#hosts-and-review-gates).

Terminal agents follow the same PRD skill and review criteria. They save the proposed document as a repository draft so it can be inspected, then mark it reviewed and validate only accepted items after explicit user review. This document is a local Git change; Q-Rex PRDs remain database-backed and separate from checkout files.

Do not include credentials, tokens, personal data, or real customer records in a PRD.
