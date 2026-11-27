---
name: write-prd
description: Create, import, refresh or review the owning menu's database PRD using product sources and browser evidence.
---

# Write PRD

Produce one database PRD per real menu and a reusable exploration handoff. Children and cross-menu/platform journeys share their owning menu's PRD. This phase writes only that PRD and `<menu>.exploration.md`; flow/scenario IDs, registries, Gherkin and implementation belong to later skills.

Apply the [shared workflow contract](../ask-qa/references/workflow-contract.md), especially **Continue and resume** and **Read only what the next action needs**, and [exploration reuse](../ask-qa/references/exploration-context.md). Read missing instructions once, reuse those already in context, and load conditional references only for the operation at hand.

## 1. Recover scope and choose the mode

Resolve module/menu, requested endpoint, child scope, sources and prior answers from the conversation and artifacts. Use [test organization](../../../docs/automation/test-organization.md) for ownership. Recover the active `docs/prd/<module>/<menu>.md`, menu `.exploration.md` and relevant feature contracts. This PRD identifier is virtual, not a repository file: Q-Rex uses file tools; terminals follow [database access](../ask-qa/references/prd-database-access.md).

Reuse purpose, journeys/priorities, roles, defects/tickets, exclusions and production restrictions under the shared question rules. Ask only consequential gaps investigation cannot settle; a missing source document or business explanation does not block observed discovery. Read current host target configuration before selecting a browser target; never print credentials or request them in chat. Preserve the established menu code and IDs; for a new menu allocate an unused three-letter code using the [ID convention](../write-e2e-scenarios/references/e2e-conventions.md#scenario-ids) and existing allocations.

| Mode | Work needed |
| --- | --- |
| Create | Build from available sources and observed behavior; record when no source was supplied. |
| Import | Apply [document import](references/document-import.md), then reconcile the entire requested scope, including observed actions absent from the source. Honor explicit scope limits. |
| Review | Compare the concrete proposal with its sources, applicable evidence and unresolved differences. Reuse prior observations. |
| Refresh | Update affected requirements in place. Freshly observe explicitly requested re-verification scope; reuse unaffected evidence. Remove validation from changed/conflicting items and affected shared dependencies, preserve unchanged validations and IDs, and review the changes. |

Completion: owning menu, mode, available artifacts and precise evidence gaps are known. Recover missing notes from accessible chat/code before reopening a browser.

## 2. Fill evidence gaps

Every mode needs live-observation evidence for its requested scope; applicable prior observations satisfy this without another visit. Before live work, apply [data safety](../write-e2e-scenarios/references/data-safety.md), the active host's [browser capabilities](../write-e2e-scenarios/references/playwright-cli-exploration.md) and the [exploration checklist](references/exploration-checklist.md). Use the checklist against recovered evidence first. With complete applicable evidence, skip browser setup, login and routine freshness visits.

Reconcile every in-scope source item and every discovered action/journey, including tabs, conditional controls, lifecycle and cross-menu dependencies, in the shared exploration inventory. Investigate only missing outcomes/branches and affected changes. Continue until each item has an evidenced attempt or a specific blocker, pending answer or established exclusion with a next action. A source's coverage does not bound menu discovery unless the user says so; inaccessible behavior remains unverified rather than absent.

Explore E2E-owned data within authorized scope and host approvals. Seed/shared records and settings stay read-only without the data-safety exception; restoration does not grant permission. If suitable data cannot be found or safely provisioned, or a source item remains unreachable after available navigation/roles/data checks, follow the checklist's focused question procedure. Missing browser access blocks only missing live facts; preserve supported draft work and identify the exact gap.

While already inspecting relevant UI, capture reusable supported locator expressions, scope, transitions/readiness, observed outcomes and useful request facts once in `.exploration.md`. Use fresh temporary refs after rerenders; `eNN` refs and screenshots do not verify reusable locators. Persist meaningful chunks, original observation dates and precise blockers. Save only sanitized facts or actual safe artifacts; report unavailable host capabilities truthfully.

## 3. Reconcile and write requirements

Use the [PRD template and requirement rules](references/prd-template.md) for new documents; preserve existing structure during scoped work. Write in English. Each checkable behavior has a stable `PRD_<CODE>_<NNN>` ID, condition/action/outcome and source or evidence reference. Retire obsolete IDs instead of deleting/reusing them. Group by business journey and reference shared rules once. Keep consumer-visible behavior in the PRD and browser mechanics in the exploration record.

- `spec`: user/document statement; `observed`: factual live behavior; `assumed`: explicitly delegated assumption. Preserve provenance after review. Only accepted items receive `[validated]`; legacy `[needs-review]` remains unvalidated.
- Agreement retains the strongest source and evidence. Additional observed behavior becomes an evidenced requirement, including when no source exists. Unobserved source requirements remain with a specific gap.
- For conflicts, use evidenced actual behavior as the provisional baseline unless the user has decided otherwise. Keep the affected ID, remove affected validation, and preserve source wording/meaning and citation, actual behavior, evidence and pending product decision in **Source vs actual discrepancies**. This is not confirmation of intended behavior.
- Resolve discrepancies through product decisions and the applicable PRD/scenario review gates; remove resolved active entries while preserving references/history. Confirmed defects need expected/actual evidence and a real ticket; ask for a missing ticket rather than inventing one.

Completion: every scoped source item/discovered action is represented by a consequential requirement or an explicit gap/exclusion. Requirements include actor/state/prerequisites and observable outcomes, exact assertion-relevant messages and evidence limits. A toast alone does not prove saved data. Cross-menu boundaries and inaccessible roles/states remain explicit. Keep credentials, personal/customer data, routine control inventories and unverifiable implementation claims out of the PRD.

## 4. Review and hand off

Check stable IDs/provenance, evidence references, checkable outcomes, shared dependencies, source reconciliation and inventory coverage using the template and checklist already loaded. Preserve unrelated accepted content; new/changed items remain unvalidated until accepted. Save affected exploration entries and the compact continuation entry before review or stopping, including partial/blocked work. Reference evidence IDs instead of copying browser logs.

Present an area/count summary by provenance, discrepancies/defects and open issues, plus the complete exact proposal for review. Identify active saved content separately from an unsaved proposal. Apply the shared contract's **PRD review** gate:

- **Q-Rex:** propose the complete intended accepted version through `write_file`/`edit_file`, including proposed validations and truthful reviewer/date/method. Native review saves only after acceptance; use `ask_user` for item decisions, not a second blanket approval. A pending/rejected unsaved proposal does not replace the active PRD. In manual mode report acceptance and stop as required by the host; automatic mode follows its gates.
- **Terminal:** use the database procedure to save an unvalidated proposal where permitted and show the complete intended accepted representation in the same review request. Changing an already validated line needs acceptance before even an unvalidated replacement is saved. Stop for explicit review; on acceptance compare the exact proposal, save only agreed validations with truthful metadata and the accepted-content digest, then follow **Continue and resume**. General permission to continue is not review acceptance.

Keep unresolved items unvalidated and preserve historical reviewer/method uncertainty. The active PRD is usable scenario context even with unvalidated items, gaps or incomplete coverage; it has no document-level review status. Report its virtual identifier, exploration path, reused/new evidence and remaining gaps once. Set the next action to `write-e2e-scenarios` for the same scope; a later `lanjut` selects it without another slash command, interview or discovery replay.
