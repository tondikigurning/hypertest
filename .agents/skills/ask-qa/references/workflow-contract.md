# Shared QA workflow contract

Read this when applying a QA skill to scoped work. It owns shared scope, handoffs, review procedures and completion states; specialists own their authoring procedures. Follow the active host's tools and configured approval mode.

## Scope and questions

Resolve the requested outcome and module/menu from the conversation, attachments, PRD, feature contents and navigation. Preserve the target through handoffs; a sibling feature is a candidate only when its contents cover that target. Reuse prior answers. Ask a focused question only for a consequential gap that investigation cannot settle. Offer evidenced choices and free text when useful. Continue independent work while an answer is pending; wait before dependent work. An explanation or review request alone authorizes no implementation changes.

For PRD or scenario discovery, resolve these context topics before asking: business purpose and requirement sources; main journeys and release priorities; rules and exact messages; roles/accounts; prerequisite data and authorized mutations; known defects, tickets and exclusions. Treat them as a gap checklist, not six mandatory questions. Record delegated assumptions and unresolved intent. A scope answer, silence, a preselected option or a general instruction to continue does not approve another gate.

Use the selected Q-Rex environment and browser Variables. In a terminal host, establish the intended environment from the request and configuration; a fallback URL alone is insufficient. Explain missing configuration without requesting secrets in chat. When an **Entity options** input needs a default, select **Converge** unless the user specified another entity. Verify that the selection matches the authorized target; this default grants no mutation permission.

Apply the matching specialist yourself in the same conversation; in Q-Rex activate it with `use_skill`. Preserve scope and previous answers rather than asking the user to invoke another slash command. If a required specialist is missing, report that exact prerequisite and retain feasible work.

## Hosts and review gates

**Q-Rex** has scoped file tools and `playwright_cli`; it has no shell or draft test/typecheck execution. PRD identifiers refer to database documents, not Git files. Use [browser capabilities](../../write-e2e-scenarios/references/playwright-cli-exploration.md) before live work. **Terminal agents** use repository files, an owned CLI browser and commands actually supported by the checkout.

Prepare the concrete artifact before its review. Keep these decisions distinct:

| Gate | Q-Rex procedure | Terminal procedure |
| --- | --- | --- |
| PRD review | Propose the complete reviewed version through `write_file`/`edit_file`; that operation presents native approval and saves only after acceptance. Use `ask_user` for unresolved item choices, not an extra blanket approval. | Save the proposal at the repository path as `draft`, with changed items `needs-review`; show the file and diff and request explicit review of that exact content. Revise and repeat if requested. After acceptance, mark only agreed items `validated`, set `status: reviewed`, and record manual review metadata. Keep unresolved items `needs-review`. A create request or silence is not approval. |
| Flow confirmation | Call `confirm_flows` with the owning reviewed PRD, exact feature path and described flow IDs. Repeat for each affected file. | Present exact files, flow IDs/descriptions, exclusions and gaps; wait for explicit confirmation. |
| Scenario approval | Use `show_diff`, direct the user to **Changes > Approve scenarios**, and stop. Chat Yes does not replace the panel decision. | Present the exact feature changes and scenario IDs, ask explicit approval, and stop for the decision. |
| Live-data authorization | Follow [data safety](../../write-e2e-scenarios/references/data-safety.md) and native tool approvals, including approvals requested for read-only clicks/fills. | Follow the same business data-safety rules and the host's tool permissions. |

Use the host's actual decision and artifact snapshot. Changed scenario contents invalidate scenario approval. Flow confirmation is tied to its feature and PRD contents. Review approval is not execution evidence.

Q-Rex's explicitly enabled **Allow all agent approvals** mode automatically accepts native PRD, flow and live-browser requests and bypasses scenario approval gates. In that mode, continue through those gates without another approval question or a manual-only stop. Questions, explicit publication, source identity, workspace/origin restrictions and data-safety scope still apply. Record automatic acceptance as automatic, never as human review. When it is off, use the manual procedures above. A general request to proceed does not enable this mode. Record the decision mode actually used if it changes while a request is pending.

For a reviewed PRD, keep requirement provenance and record `review_method: manual` or `automatic`. In local Q-Rex use `reviewed_by: Local preview user` for manual acceptance and `reviewed_by: Q-Rex automatic approval` for automatic acceptance. Terminal hosts use explicit manual review and record the established reviewer identity without inventing one. `[validated]` means accepted through the applicable review gate; `review_method` distinguishes human confirmation from configured automatic acceptance. Unresolved conflicts remain `needs-review` in either mode.

Preserve older reviewed documents and their IDs. If historical review metadata lacks a method, its method is unknown; do not silently relabel it manual or automatic. Record the actual method for newly accepted versions and preserve prior metadata in the change log.

## Turns, batches and completion

A **turn** runs from a user request to the agent's response; a **draft session** may persist across many turns and restarts. A **batch** is the exact files/scenario IDs and journeys under review. In manual mode, PRD review and scenario authoring end their turn. Resume the next phase on a later user turn in the same draft when its gate is satisfied. An approved batch must be implemented and verified before the next batch starts; elapsed time or another turn does not satisfy that requirement.

Keep the registry in conversation and review output, with `.feature` tags as the catalog's category source. Do not create `.flows.md` files. Track evidence for the exact scenario scope, not an entire flow from a passing subset:

| State | Required evidence |
| --- | --- |
| `pending` | Confirmed flow, no scenarios authored yet |
| `written` | Current scenarios await their review gate |
| `approved` | Current scenario snapshot accepted under the host's approval mode |
| `implemented` | Steps/bindings exist and collection plus type validation succeeded |
| `verified` | Every required scenario in the reviewed batch passed in the intended environment |
| `fixme` | Product defect with a real `@fixme @ref:<ticket>`; report affected scenarios individually |
| `legacy` | Pre-existing scenario whose coverage still needs assessment |
| `obsolete` | Retired journey; keep its identity permanently reserved |

**Q-Rex implementation handoff:** write all feasible approved code and report it as an implementation draft when checks are unavailable. Keep registry state `approved` until collection/type evidence exists; an implementation draft is a progress note, not another catalog/test status. Record current branch/base, exact files and scenario IDs, the complete reviewed Changes snapshot or supplied revision/diff identity, locator gaps, and each pending check. Explain which commands a terminal reviewer must run against that exact draft source, after data-safety review for live checks. Do not run those commands through browser tools or treat explorer-checkout results as draft evidence.

Accept externally supplied validation only when it identifies the same source revision and complete patch, exact scenario selection, commands/results and intended environment. A bare “passed”, historical report, stale diff or successful subset does not advance the batch. Record the evidence source and invalidate affected evidence after source changes. If evidence is absent, finish the useful draft handoff and report the next-batch prerequisite; do not repeatedly request the same unavailable check or advance to another batch.

For every completion report, distinguish code written, bindings/collection, types and actual execution; list failures, skips, quarantine, mocks and unavailable checks. A generated catalog, successful generation, passing build or evidence upload is not a scenario pass. A verified batch does not establish complete business-flow coverage.
