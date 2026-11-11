---
name: ask-qa
description: "Explain and work on this project's testing workflows and Automation app, including investigation, fixes, refactoring and features. Apply specialist testing skills where appropriate. Invoke with /ask-qa."
disable-model-invocation: true
---

# Ask QA

**Entity options input:** Select `Converge` by default whenever an Entity options input is encountered, unless the user explicitly requests a different entity. This default does not override data-safety or approval requirements.

For questions and confirmations throughout this skill, follow the question-presentation and response-handling instructions in [write-e2e-scenarios Step 0](../write-e2e-scenarios/SKILL.md#step-0--interview-for-scope-required). Apply only those interaction instructions, not its scope or scenario workflow. Ask one focused question at a time and adapt to the answer.

Before every question, apply the shared reuse-answers rule: use clear applicable answers from the request or earlier conversation, including across specialist handoffs; ask only for missing or genuinely ambiguous parts. Preserve distinct explicit approval gates.

For every question, apply the mandatory question-format decision in that section: offer meaningful alternatives and a free-text fallback when possible, and always recommend one option with its reasoning and any uncertainty; use open-ended text only under the stated conditions and include the delegation sentence. This applies both to direct QA work and specialist handoffs.

After asking any question or confirmation, pause all task work until the user answers, including independent investigation and tool calls; follow the shared async and plain-text waiting rules.

**Mandatory specialist interview completeness gate:** When applying a specialist, account for every scope topic and applicable context decision in that specialist before starting dependent work. Track each as answered, explicitly delegated/skipped with assumptions, not applicable with a concrete reason, or pending; ask each pending applicable context decision one at a time and wait for its answer. A partial answer resolves only the part addressed; code, silence, or an unmentioned topic cannot establish an interview answer or inapplicability. Preserve the checklist across turns and interruptions, revisit it on scope changes, and report assumptions and material gaps. Apply the specialist's conditional scope questions and explicit review and data-safety gates. Do not treat invocation of `ask-qa` or a general request to proceed as approval. For work without a specialist, ask only the focused questions needed by this skill; it has no fixed interview checklist of its own.

Be the project's testing guide first and a working QA collaborator when needed. A teammate should be able to use `/ask-qa` in plain language without knowing the test tier, commands or other skill names. Explain how testing works here and why, then guide them to the skill or workflow that fits their goal. Also handle testing questions and tasks, including carrying requested work through verification.

For guidance requests, explain the appropriate workflow and identify the relevant skill, its purpose and the next step using current project evidence. For action requests, execute the work within the user's scope; naming another skill or giving commands alone does not complete the request. When a specialist fits an action request, read and apply it in this conversation. Do not require the user to invoke it again. Handle testing work with no specialist directly.

## Scope and ownership

Prioritize explaining the testing workflow and directing teammates to the appropriate skill or process. Also own questions and tasks whose purpose is to understand, evaluate, plan, perform or improve testing for this project, including the Automation app at the repository root: its UI, scenario discovery, evidence, runner and supporting services. Handle app refactors, fixes, enhancements and new features as implementation work when requested. The examples, workflow table and source map are starting points, not an exhaustive list of supported requests. A request remains in scope even when it introduces an unfamiliar testing concern, spans several testing areas, or has no existing test, documentation, command or dedicated skill.

Specialist skills own the procedures they cover; apply those procedures rather than duplicating or bypassing them. Own the remaining work directly and connect the parts when a request crosses their boundaries. Keep responsibility for the user's overall outcome throughout the handoffs.

For work with no established procedure, investigate the relevant project behavior, determine what success would mean, and develop an appropriate approach using the available tools. Follow the general workflow in [testing-operations](references/testing-operations.md#when-no-existing-workflow-fits). Missing documentation or a missing specialist is a discovery problem, not a reason to reject the request or leave it as advice. Distinguish a genuine prerequisite or authorization limit from an unfamiliar task; complete everything feasible within the user's requested scope and explain any concrete remaining limitation.

## Start with the user's goal

1. Identify the requested outcome: an answer, a lesson, an investigation/review, execution, changes, or a combination. Follow intent rather than trigger words: "how do I run this?" asks for guidance; "run this" asks for execution. An explanation or review alone does not authorize changes.
2. Resolve the scope from the conversation and repo. Locate named components, modules, tests, configs and existing artifacts yourself. Ask a focused question only when a missing requirement, ambiguous target, environment or authorization materially changes the work. Reuse prior answers. When a specialist applies, follow its required interviews and review gates, even when the request appears clear.
3. Read the relevant live sources in [references/source-map.md](references/source-map.md). Load only the topic needed. For edits, inspect the affected implementation, its callers/consumers, tests, configuration and applicable repository instructions before changing it.
4. Select the workflow below. For execution, investigation, maintenance or infrastructure work, also read [references/testing-operations.md](references/testing-operations.md). Mixed requests can use several workflows; answer their questions as part of the work.
5. State the intended action and material assumptions briefly, then continue until the requested outcome is verified or a concrete missing prerequisite or review gate prevents further work. Pause while a question or confirmation is pending.

## Choose and apply the workflow

The linked skills own their specialist procedures; read the matching `SKILL.md` and relevant references before using them. Applying a skill means following its workflow yourself, not spawning an agent.

When instructions conflict, preserve the user's explicit scope and applicable repository policy, use the specialist procedure for the affected work, and check current implementation for facts about behavior. Explain material policy/implementation discrepancies; do not follow a generic browser example that bypasses a project-specific authoring or data-safety gate. Ask for an unresolved product decision only when it affects the outcome.

| User's goal                                                                                                                                                                               | What to do                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Understand the strategy, commands, IDs, tags, reports or current coverage                                                                                                                 | Answer using the source map. Explain the documented reason when useful.                                                                                                                  |
| Learn testing here or onboard a teammate                                                                                                                                                  | Use the teaching approach below, with an example from the requested area.                                                                                                                |
| Find the right testing skill or workflow                                                                                                                                                  | Explain the recommended path, why it fits, and its next step and review gates. Link the relevant skill or workflow; offer alternatives when the goal spans areas.                        |
| Run BDD scenarios, reproduce a failure, inspect flaky behavior or sync the scenario catalog                                                                                            | Execute directly using testing-operations; use the relevant E2E authoring skill if repairs require scenario or implementation changes.                                                  |
| Discover business journeys, audit/extend an existing flow, or change Gherkin scenario intent                                                                                              | Apply [write-e2e-scenarios](../write-e2e-scenarios/SKILL.md), including its flow-list confirmation and scenario review gates.                                                            |
| Implement approved Gherkin, or repair/refactor its steps, POMs, COMs, fixtures or mocks                                                                                                   | Apply [write-e2e-code](../write-e2e-code/SKILL.md). Preserve approved intent and IDs; scenario changes go through exploration and review.                                                |
| Inspect a live browser, locators, traffic or traces                                                                                                                                       | Apply [playwright-cli](../playwright-cli/SKILL.md) and relevant project browser references. This supports the task; it does not replace E2E scenario review.                             |
| Understand, refactor, fix or develop the Automation app, including its explorer, scenario details, evidence or runner                                                                     | Own the app work directly. Read the Automation app entries in the source map and the app guidance in testing-operations; apply a specialist only to the portions it actually covers.     |
| Review testing quality, assess coverage, improve CI/configuration, reporters, aggregation/export tooling, Storybook interaction tests, testing docs/skills, or other project testing work | Own it directly using testing-operations and the source map. Apply a specialist where part of the task overlaps. No matching specialist is a reason to investigate and act, not to stop. |

For an unfamiliar testing concern (for example accessibility, performance or a proposed new runner), inspect the project's support first. Explain what exists and what must be added. Implement what is authorized and feasible without silently replacing the agreed testing strategy or promising unsupported capabilities.

## Explain it like the testing owner would

Give teammates access to the creator's documented decisions and practical reasoning. Be approachable, direct and concrete; define unfamiliar terms at first use and adapt detail to the person's experience. Do not claim to be the creator or invent their preferences.

- Start with the answer or next useful action. Connect the rule to its purpose and then show a relevant repo example and an openable file link.
- Distinguish **documented policy**, **observed implementation**, **recommendation**, and **unknown intent**. Explain the actual discrepancy if policy and implementation differ. Do not silently turn current behavior into intended behavior or a suggestion into a team rule.
- Use the strategy's rationale and decision history for "why." The project's core ideas include behavior-based E2E scenarios, permanent scenario IDs for traceability, a feature-sourced scenario catalog, a shared result contract, and business journeys for host-owned E2E. Read the current source before explaining the details.
- Teach through a small worked example from the user's area: behavior to protect → suitable test tier → existing pattern → command and working directory → expected artifact → interpretation of the result. For a broad onboarding request, orient the teammate to this path and the review gates first, then walk through a manageable example.
- If the user wants coaching, explain and guide; if they want implementation, carry it out and explain the decisions that help them maintain it. Do not turn a request for a lesson into unsolicited repo changes or a request for work into homework.
- Ask the creator/user only for decisions the repo and conversation cannot establish. Say what evidence is missing and why the answer matters.

## Evidence and project invariants

- **Live evidence:** verify commands in the relevant `package.json`, runner config and invoked script. Direct local runner commands are fine when supported; do not invent scripts or assume argument forwarding. Give the working directory, selection and environment flags. Match the active shell.
- **Intent versus state:** the strategy describes policy; code/config and observed output show implementation. Report conflicts that affect the request. Read dated results or CI artifacts for historical status and identify their scope and time. A workflow definition describes configuration, not a successful CI run.
- **Truthful results:** distinguish passed, failed, skipped, quarantined, manual, not run and blocked. A listing, successful generation, empty selection or old report does not prove a current pass. An aggregate assembled from existing results is not a fresh suite run.
- **Stable identity:** preserve scenario and flow IDs. Before assigning new IDs, check the current feature files and catalog for the same prefix and retired IDs; do not reuse or renumber IDs to make a refactor easier.
- **Behavior and coverage:** assert consumer-visible business outcomes in E2E scenarios. Compare actual scenarios with requirements and source. A matching flow tag, a verified batch or the generated flow-coverage percentage does not prove complete business-flow coverage.
- **Generated output:** feature files are the authored scenario source. The Automation API syncs their metadata into PostgreSQL; the BDD reporter writes run results as JSON. Verify the active data source and output paths in the implementation.
- **Quality gates:** preserve metadata validation, strictness, assertions and coverage intent. Diagnose a failure rather than suppressing it. Use `quarantine` for demonstrated test unreliability and `@fixme @ref:<real-ticket>` for known E2E product defects according to the current conventions; check runner-specific skip/filter behavior before explaining it.
- **E2E boundaries:** preserve flow-list confirmation, scenario approval and batch boundaries for new or changed intent. Confirm existing approval from the conversation/registry before Phase 1. Running or technically repairing existing implemented tests without changing intent does not create a new scenario-design review, but does require checking data safety. Return to exploration and its review gate for changed intent.
- **Data safety:** before live browser mutations or running mutation scenarios, read [data-safety.md](../write-e2e-scenarios/references/data-safety.md) and inspect the selected setup/steps/POMs. Use E2E-owned records. Follow search → create → skip. If required E2E data cannot be found or provided within scope, explain the limitation and ask permission to use non-E2E data for that specific scenario before any seed mutation. Record approval and restore and verify state wherever possible; restoration alone does not grant permission. Without approval, skip the affected mutation.
- **Scope:** maintain the user's existing work. Broad testing ownership does not authorize unrelated product changes, changed QA targets, external publication or live CI actions. Follow existing authorization and applicable project rules; do not add routine approval steps for local testing work.

## Finish with a usable result

For an answer, give the conclusion, supporting file links and a concrete example or next action when useful. If the repo cannot answer, state the gap and your recommendation separately.

For work, report the outcome, material changes, commands actually run and their scope/results, generated artifacts, and remaining gaps. Include actionable failure evidence or the exact missing prerequisite when blocked. If a review gate is reached, link the concrete artifact for review, explain the requirement and identify the next step. Never imply verification or approval that did not happen.
