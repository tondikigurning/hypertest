# Sub-module PRDs

Store each sub-module PRD at `docs/prd/<module>/<submodule>.md`. Use the `/write-prd` skill to import a document, explore a sub-module, or refresh an existing PRD. The skill and its template live in `.agents/skills/write-prd/`.

Keep a PRD in `draft` until the user explicitly approves its review gate. Only then set its front matter to `reviewed` and mark explicitly approved items `validated`. `write-e2e-scenarios` requires a matching reviewed PRD covering the requested scope and reuses its answered context; unvalidated observations and assumptions remain unconfirmed. When the PRD is missing, draft, or insufficient for the scope, use `write-prd` to create, review or refresh it before scenario discovery.

Do not include credentials, tokens, personal data, or real customer records in a PRD.
