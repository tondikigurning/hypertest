# Automation — product specification

Status: interview draft · 29 October 2026; QA agent requirements added 3 November 2026

## Purpose

Build a shared web app for discovering, running, and viewing evidence for the tenants end-to-end (E2E) automation. Someone unfamiliar with the test code should be able to find a business scenario, understand its steps, run it when supported, follow the outcome, and view its screenshots and video. Provide a QA agent in the app to help users discover, create, review, update, remove and maintain E2E scenarios and their implementation through the project's existing QA workflows.

The application is named **Automation**, lives under `apps/automation`, and is accessible at `/automation` on the existing Hyperscal domain. Each deployment targets its own environment: STT runs against STT, dev against dev, and PP against PP. The target must be explicit in the UI and configured by the deployment, not chosen freely for a run.

## Users and access

- Access requires the existing Hyperscal sign-in. Any signed-in user can view scenarios, results, and available evidence and start runs, without additional module role or permission checks. Module selector and shared shell integration are deferred; Automation remains a separate application for now.
- A run uses the identity and access of the user who requested it. Do not silently substitute a shared E2E account. If their access or required data is insufficient, show the actual failure or skip and available explanation.
- When shell integration is resumed, follow CRM, Product Catalog, and Serviceability for the navbar and sidebar. Establish how the signed-in session can safely be used by a separate browser execution. The current setup logs in with configured E2E credentials; reusing the requesting user's identity is new work and must be validated before implementation is committed to a particular mechanism. Do not expose credentials or session tokens to other users or store them in evidence or logs.

## Scenario discovery

- Include all tenants BDD scenarios, including authored scenarios that are not yet executable. Browse module → feature → flow → scenario; offer search and filters using available IDs, titles, tags, priority, type, and execution status.
- Show each scenario's stable ID, title, Gherkin steps, available metadata and references, latest outcome, and evidence. Preserve existing IDs and source information; do not infer an actual pass from a catalog entry or a prior run.
- Distinguish not run, unavailable/not implemented, skipped, passed and failed. Show why execution is unavailable when known. Registration in the runner, actual step bindings and other prerequisites must be checked; a feature file alone is not proof it can run. Keep missing or ambiguous information visibly unknown.
- Support scenario outlines and examples accurately. Represent any separately executed examples without misattributing their outcome or evidence to another example; resolve how existing IDs and reporter aggregation represent them during technical design.

## Running automation

- Signed-in users may run a single executable scenario, a flow, a feature, or a filtered selection. Show the selected scope and target environment before submission. Exclude unavailable scenarios from an executable selection and clearly disclose them; an empty selection is not a successful run.
- Queue requests and execute one run at a time per environment, including across app instances. Display queue position and live run/scenario progress, completed outcomes and useful failure details. Separate setup, execution, and evidence-upload failures so an upload failure does not make a passed test appear failed.
- Allow cancellation of queued requests. For an active request, stop after the current scenario and its cleanup finish; mark remaining work cancelled or not run. If a process terminates unexpectedly, clearly report interruption and possible incomplete cleanup.
- Honor the existing E2E data-safety workflow. Block scenarios that mutate shared seed data unless the required specific, environment-scoped approval is recorded and applicable; explain the reason. Respect existing scenario-specific limits, use E2E-owned records for mutations, and do not treat cleanup as authorization. The recorded profanity filter approval is scoped to STT and that scenario; it must not automatically authorize dev or PP. A way to record and verify applicable approvals must be designed before enabling these runs.
- Preserve the suite's real skip, `@fixme`, quarantine and mock behavior. Status must reflect what actually happened, including failed setup, skipped tests and incomplete runs.

## Evidence and latest results

- Keep the latest result and evidence **per scenario and per environment**, not a historical evidence archive. A run updates only the scenarios it executes; other scenarios retain their prior latest evidence. Identify the environment and execution time.
- Immediately after a scenario finishes, show its available locally generated screenshot and video in the app without waiting for Drive upload. Track execution outcome and evidence upload independently. Clearly indicate absent evidence for skips, setup failures, or other runs that produce no attachment.
- After refresh or a new API fetch, resolve evidence from Drive. If the new file is not yet available while upload is in progress, show an intuitive message asking the user to wait. A stable folder link may still contain older files: never present those as evidence of the new execution. If upload fails, show that state and do not claim the new evidence is available in Drive. If older evidence is offered, label its execution clearly.
- Show screenshots and playable videos in the app when available, with a useful loading, unavailable, and error state. A Drive link can supplement the viewer. Trace availability is separate: the existing config retains traces on failure, but the current uploader only exports image and video attachments.
- Isolate Drive evidence and latest results by environment. The current Drive layout does not include environment, so adapt the storage mapping or use isolated environment-specific roots while retaining the existing per-scenario semantics. Define migration and compatibility with existing evidence before rollout.

## Interface

Use the existing Hyperscal visual language, shared `@hyperscal/ui` components, icons, typography, and `@hyperscal/tailwind-config` styles. The design should be minimalist, clean, simple, and visually balanced. Use a clear hierarchy and consistent spacing; support usable responsive layouts and accessible keyboard and status feedback.

The primary experience is the scenario explorer. Scenario detail brings steps, metadata, latest result, run action and evidence together. A run view exposes the queue and live progress without requiring users to read raw runner logs.

## QA agent and authoring

The intended experience is a persistent chatbot widget in Automation. Users can ask in natural language about a selected scenario or a broader module or submodule; selecting a scenario is optional, and the active context must be visible. Users may explicitly invoke `/ask-qa`, `/write-e2e-scenarios`, or `/write-e2e-code`, with discoverable command suggestions. A normal QA request should enter the `ask-qa` workflow and use the appropriate specialist skill as the task progresses, without requiring the user to know its name.

- Use the project's maintained [ask-qa](../../.agents/skills/ask-qa/SKILL.md), [write-e2e-scenarios](../../.agents/skills/write-e2e-scenarios/SKILL.md), and [write-e2e-code](../../.agents/skills/write-e2e-code/SKILL.md) skills and their references. Make skill availability and explicit invocation observable; fail clearly if a required skill is unavailable. Treat model instructions as guidance rather than proof of compliance, and enforce consequential workflow boundaries outside the model where feasible.
- Support the skills' interactive questions, flow-list confirmation, scenario review, and approved-batch handoff. Do not implement new or changed scenario intent before the relevant review; a technical repair of existing implementation follows the exception in `write-e2e-code`. User answers and approvals must remain tied to their actual scope. Scenario review is distinct from authorizing a command, file access, or a live-data mutation.
- Work on BDD source files, flow registries, steps, page/component objects and fixtures as appropriate, rather than editing generated scenario catalogs. Preserve scenario and flow identities, references and intended behavior. User requests may include additions, changes and removals; show the effects for review.
- Give each task a repository workspace based on an identified commit. Display the draft feature content, file changes, diff and truthful verification status before the changes are integrated. Clearly distinguish workspace drafts from the official explorer and its generated catalog. A preview may show all scenarios in a changed feature, not just changed scenarios.
- Allow a reviewed result to be saved to a branch and submitted through the team's Git review process. A hosted worker's filesystem is not the deployed application's source of truth: make repository integration and official catalog refresh explicit. A branch or PR is not itself a completed deployment. Do not assume that creating a PR, pushing a branch or deploying is authorized merely because the agent produced a draft.
- Retain or recover the task, conversation, workspace, approvals and progress across interruptions. Preserve pending questions and their answers where the runtime supports it; if a request cannot be resumed, clearly report interruption and ask the user to resolve it again. Do not present an old or changed artifact's approval as current.
- Separate AI authoring from running tests. Live exploration and E2E verification need a reachable environment, authenticated access, dependencies and the existing data-safety workflow. Enforce scope-specific mutation approval and coordinate BDD generation with other runners. Show passed, failed, skipped, blocked, mocked and not-run outcomes based on actual evidence.

The local QA agent is a partial implementation, not the hosted service described here. See [README.md](./README.md#qa-agent-preview) for its current capabilities and limitations. Its composer supports attached menu, category, and scenario context (only menus are offered on the home page); secret questions are withheld from Codex and runtime credentials are supplied to the local runner or the exploration browser handoff. Draft execution through the QA Agent is currently omitted; the explorer runner executes only scenarios in the current checkout. Its scenario snapshot check covers explicit `/write-e2e-code` turns and commits through the app, not every automatic handoff or data-safety gate. The local preview prepares an authenticated playwright-cli session for scenario exploration using Variables; hosted execution remains unimplemented.

## Existing workflow and integration constraints

- Sources of scenario intent are `apps/tenants/tests/bdd/features/**/*.feature` and any adjacent flow registries. Steps, fixtures, page objects and components under `apps/tenants/tests/bdd` implement the automation. Discovery and scenario review precede implementation; the app must not bypass or change that authoring workflow.
- `apps/tenants/playwright.bdd.config.ts` registers BDD projects and executable feature paths, uses one worker, captures screenshots and video, retains traces on failure, and separates authentication and authenticated projects. `pnpm test:bdd` generates tests before invoking Playwright.
- `apps/tenants/scripts/test-bdd-with-evidence.mjs` runs generation, Playwright, and then the evidence uploader. Its current synchronous sequence and shared output/report paths do not provide a hosted queue, immediate UI preview, or live events. Those require an execution service and integration changes; simply launching the current command is insufficient.
- `packages/internal/test-utils/src/playwright/reporter.ts` emits the shared scenario result contract and updates generated catalogs. It currently collects results during execution but writes its results file at run end; live progress needs an event channel or equivalent extension. Do not hand-edit generated catalogs.
- `packages/internal/test-utils/src/export/evidence-cli.ts` uploads image/video attachments to `E2E Evidence/<app>/<feature path>/<scenario ID>/` under a configured Drive parent. It uploads current attachments before moving recognized older files to Drive trash, retains unrelated scenario links, and writes catalog links after the selected uploads succeed. Automatic upload may be skipped if Drive credentials are missing. Evidence is latest per scenario, not latest per whole suite; stable links can temporarily point to previous evidence. Consult `docs/workspace/testing/e2e-evidence.md` for permissions and operational details.
- Hosted execution needs Playwright, browser dependencies, test sources and a server-side worker; a frontend alone cannot run tests or access local runner artifacts. Ensure selections are mapped to validated scenario IDs and runner arguments, with no arbitrary shell command or filesystem access from users. Coordinate app-initiated runs with any other processes sharing runner outputs or Drive destinations.

## Acceptance criteria

1. A viewer can open `/automation`, browse all tenants BDD scenarios and inspect their steps and metadata; unimplemented or unknown scenarios are visibly distinct from runnable scenarios.
2. A signed-in user can submit an executable scenario or supported group, see its environment and queue position, and follow per-scenario progress through a truthful final outcome. The test runs under that user's identity.
3. Two requests in the same environment execute serially; queued cancellation and graceful active cancellation behave as specified. Unselected scenarios retain their latest results.
4. A newly completed scenario's available image and video are viewable immediately from local artifacts. On refresh, Drive-backed evidence is shown only for the correct execution; pending and failed uploads are clearly communicated.
5. STT, dev and PP results and evidence remain isolated. A shared-data mutation without applicable environment-specific approval is blocked with an explanation.
6. Authentication/setup failure, skipped scenarios, missing artifacts and upload failure have distinct, understandable states. No result is presented as passed without an actual successful execution.
7. The app uses the project's shared theme and components and remains usable with keyboard navigation and on smaller screens.
8. A user can ask the QA agent to create or maintain E2E coverage without naming a skill, or select a supported skill with a slash command. The agent uses the relevant workflow, asks for missing input, and stops at applicable review gates.
9. A user can review draft scenarios and code, approve the intended scope, and see actual verification and remaining gaps. A changed artifact invalidates the applicable approval. The official explorer does not present an unmerged draft as an official scenario or a generated catalog as a fresh run.
10. In a hosted implementation, concurrent tasks have isolated repository workspaces and access controls. A reviewed result can enter the authorized Git workflow; task recovery, cleanup, secrets and audit records do not depend on the lifetime of a web-server process.

## Open technical decisions

- Confirm the host routing and public-read implementation, session delegation to isolated Playwright contexts, token lifetime, and behavior for auth/login scenarios that deliberately start without storage state.
- Define the persistent queue and latest-result store, worker deployment, cross-instance coordination, live event transport, crash recovery and graceful cancellation mechanism.
- Define authoritative runnable and safety-approval metadata, especially for partially implemented features, scenario outlines, reused steps and approvals that apply only to a particular environment.
- Define an environment-isolated Drive mapping and migration, how the API verifies file freshness and streams private Drive media to viewers, and how local artifacts survive until upload completes without being overwritten by another run.
- Confirm how CI or local runs interact with hosted latest results and evidence, and how current catalog generation and upload behavior are preserved or adapted. The existing uploader's minute-granularity filenames and same-extension collision check need consideration.
- Define hosted QA-agent authorization separately from scenario viewing and running, including who may edit source, approve scenario changes, access environments, commit, push or create PRs. The general signed-in access above does not decide source-write access.
- Choose the hosted worker platform, agent/runtime identity and model access, repository provider and Git handoff, task/workspace retention and cleanup, quotas, durable conversation/approval store, and how drafts and official catalogs are refreshed without redeploying Automation. Design deterministic controls for skill review gates and live-data operations; the local prototype's sandbox and prompt alone are not sufficient evidence of enforcement.
