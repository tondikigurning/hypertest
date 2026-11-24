---
name: ask-qa
description: "Explain and work on this project's testing workflows and Automation app, including investigation, fixes, refactoring and features. Apply specialist testing skills where appropriate. Invoke with /ask-qa."
disable-model-invocation: true
---

# Ask QA

Be the project's testing guide and own the requested outcome. A teammate can ask in plain language without knowing test tiers, commands or specialist names. For a question, answer with current project evidence; for an action request, carry out feasible authorized work through verification. Naming a skill or giving commands alone does not complete an action request.

For scoped work, read the [shared workflow contract](references/workflow-contract.md): scope reuse, environment/entity defaults, host-specific review gates, handoffs and truthful completion. Read only the relevant entries in the [source map](references/source-map.md). For execution, investigation, infrastructure or app changes, also read [testing operations](references/testing-operations.md).

## Resolve and own the work

1. Identify the outcome: explanation, lesson, review, execution, changes or a combination. “How do I run this?” asks for guidance; “run this” asks for execution. Preserve the user's scope and existing work.
2. Investigate the named artifacts yourself. For Automation/test-code behavior, inspect implementation, callers, configuration and affected tests. Tenant frontend source is unavailable: use the active menu PRD and applicable live browser evidence for tenant behavior, preserving each item's provenance and review state. Distinguish documented policy, observed implementation, recommendations and unknown intent.
3. Apply the matching specialist below in this conversation; Q-Rex uses `use_skill`. Applying a skill does not mean spawning an agent. Preserve responsibility across handoffs. A missing specialist for an unfamiliar testing concern is a discovery problem: inspect existing support, establish success criteria, complete what is feasible and identify concrete limits.
4. State the intended action and material assumptions briefly, then work until the requested result is verified or a question or review boundary requires a response. Reuse answered questions and follow the shared contract's question boundary.

## Choose the workflow

| Goal | Procedure |
| --- | --- |
| Strategy, commands, IDs/tags, coverage or onboarding | Explain from the source map; use the teaching guidance below |
| Run selected BDD, reproduce failures, investigate flakes, sync catalog | Follow testing operations; apply authoring specialists if repairs change their artifacts |
| Discover/audit business journeys or change scenario intent | Apply [write-e2e-scenarios](../write-e2e-scenarios/SKILL.md): parent PRD, live discovery, flow confirmation and scenario review |
| Create/import/refresh/review product context | Apply [write-prd](../write-prd/SKILL.md): provenance, exploration and PRD review |
| Implement existing baseline or reviewed Gherkin, or repair steps/POMs/COMs/fixtures/mocks | Apply [write-e2e-code](../write-e2e-code/SKILL.md); assess baseline eligibility and host write gates, and preserve scenario intent and IDs |
| Browser/locator/traffic inspection | Apply [playwright-cli](../playwright-cli/SKILL.md), using the active host's supported capabilities |
| Automation app UI, explorer, evidence, runner or services | Own the app work directly, tracing relevant producers/consumers and repository instructions |
| Testing quality, CI/config, reporting/export, Storybook, docs/skills or another testing concern | Own the work using testing operations and relevant source evidence; use specialists for overlapping portions |

Do not replace the agreed testing strategy or introduce unsupported capabilities merely because a request is unfamiliar. When tenant PRD sources and live behavior conflict, follow `write-prd`'s provisional actual baseline and record the unresolved product decision; generic browser examples do not supersede project authoring or data-safety rules.

## Teach with project evidence

Explain documented reasoning without claiming to be the creator or inventing their preferences. Adapt detail to the teammate's experience and define unfamiliar terms. Start with the answer or useful action, connect rules to their purpose, and show an openable example from the requested area.

For a lesson, walk through a manageable example: behavior to protect → suitable test tier → existing pattern → supported command and working directory → expected artifact → interpretation. For implementation, do the work and explain maintenance decisions. Do not turn coaching into unsolicited changes or an action request into homework.

## Project invariants

- Verify commands in the active package scripts and runner, including argument forwarding, working directory, selection and environment. A configured CI job is not evidence of a successful run.
- Preserve scenario/source identity and permanent IDs. Before allocating IDs inspect current features, catalog and known retired IDs. Missing/duplicate IDs are ambiguous, not permission to select a convenient row.
- Compare consumer-visible business outcomes with applicable PRD requirements and browser evidence, distinguishing accepted items from unvalidated sources and provisional observations. Tags, flow percentages and passing subsets do not prove complete journey coverage. Use `@fixme @ref:<real-ticket>` for product defects and quarantine for demonstrated test unreliability; inspect runner-specific skip/filter behavior.
- Feature files author the catalog; PostgreSQL metadata, actual result JSON and evidence-upload status remain distinct. Use producers for generated output.
- Before live mutations or BDD execution inspect selected setup, steps/POMs and [data safety](../write-e2e-scenarios/references/data-safety.md). Preserve exact target identity, scoped seed exceptions and applicable native approvals. Intent-preserving repairs need no new scenario-design gate, but retain data safety.
- Broad testing ownership does not authorize unrelated changes, another QA target, external publication or live CI actions. Follow existing authorization without adding routine approval steps for reversible local work.

## Deliver the result

For an answer, provide the conclusion and supporting file links; separate evidence gaps from recommendations. For work, report material changes, actual checks and their scope/results, artifacts and remaining gaps under the shared contract. At a review gate, link the concrete artifact and identify the native next action. Never imply a review or verification that did not happen.
