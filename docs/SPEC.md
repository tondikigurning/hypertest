# Automation Workspace — Product Specification

Status: product draft, reconciled with docs/PRD.md v0.1 on 11 November 2026. Hosted product requirements are described below; the current loopback preview is documented separately in “Local preview boundary.”

## Purpose

Automation Workspace is an internal web product for FE Test Engineers and QA Engineers to create, run, and maintain Playwright BDD automation with an AI agent. It supports the workflow from product context (PRD) through reviewed scenarios, implementation, execution, and a GitHub pull request.

The first Project targets Converge at converge.<env>.hyperscal.com. Its initial environments are dev, stt, stt1, and pp. The test repository is separate from the Converge frontend repository, so the agent cannot inspect frontend source. Product context comes from per-sub-module PRDs and direct UI exploration with playwright-cli.

The product name is a working name. This specification describes the hosted target, not a claim that the local preview already provides these capabilities. docs/PRD.md is the source for product goals and unresolved assumptions.

## Product scope and Project model

A Project connects one test repository, one target application, its environments, members, and schedules. The MVP supports one Project, Converge; the data model should allow additional Projects, while multi-Project management in the UI is deferred.

Environments are configured per Project, not fixed by the deployment. Each environment has a name, base URL, variables, and secrets. Users select one environment per run, and that environment is visible before submission. Multi-environment submission is deferred.

The product is hosted on the existing Hyperscal domain. The current local preview is available at /; hosted routing and deployment details remain subject to implementation design.

## Success measures

Measure the time from a sub-module PRD to a test pull request ready for review; the share of `@flow:` categories with at least one scenario whose latest result is `passed` in each environment (not as proof of complete business coverage); and the proportion of scenarios with a latest `passed` result for each environment. Set numeric targets after the first four-week baseline.

## Users, authentication, and access

Authentication uses GitHub App OAuth. GitHub identity is used for repository actions and pull requests.

Project members have one of two roles:

- Engineer: manage Project settings, repository connection, environments and secrets, and members; create drafts; use the agent; upload or create PRDs; run tests; and finalize drafts as pull requests. Schedule management is deferred.
- Viewer: view the catalog, PRDs, latest results, evidence, and pull requests; run scenarios against the target branch. Viewers cannot use the agent, create drafts, manage settings, or create pull requests.
- Scheduler (deferred): a system identity for scheduled runs if scheduling is added in a later phase.

All Project members may use all configured environments in the MVP. An environment marked protected is visibly identified and audited but does not impose a separate access block. Repository write access remains governed by the user’s GitHub permissions.

Converge test credentials are configured as environment secrets and injected into the execution worker or exploration browser. Encrypt them at rest, make them write-only, never show saved values again, and redact them from logs and traces. They are distinct from the user’s GitHub sign-in. The product must not expose credentials or session tokens to other users, the model, or evidence. The exact test-account model for role-specific scenarios remains an open decision.

## Scenario discovery and catalog

The test repository is the source of truth. The database catalog is derived from feature files; `@flow:` tags provide the categories used to group scenarios. The catalog can be rebuilt from the repository. Generated catalog data must not be hand-edited.

Connect the test repository through GitHub App and choose a target branch, defaulting to development. On initial connection, import its feature files without run history. A new repository can be scaffolded with the default skills and BDD structure. The hosted catalog follows the target branch and can be refreshed manually. When a merge adds a scenario or changes its `.feature` definition, set its status to `not run` in every environment and clear its current evidence reference; it must run in hosted before it has a current hosted result. Match by stable scenario/source identity, not ID alone; if the match is ambiguous, do not reuse an old result. Do not import the local preview's result as a hosted result. Scenarios whose definitions did not change retain their latest hosted result. A draft catalog is parsed from that draft’s workspace and revision and is visible only to its owner.

Browse scenarios through module and feature navigation, a scenario list, and a separate detail panel for the selected scenario. Within the list, group scenarios by collapsible `@flow:` category. Keep authored scenarios visible even when they are not executable. Each row shows its title, ID or an unavailable-ID label, compact metadata (type, priority, and tags), execution availability, and the latest status for the selected environment. The detail panel shows category, type, latest status and run time, duration, Gherkin steps, example outcomes for scenario outlines, available evidence and run actions, and an expected outcome when it adds information beyond the steps. Do not require all detail fields to appear as columns in the list.

Search across features by available IDs, titles, feature and module names, flow category, and tags. Filter by tag, flow category, priority, type, and status. Sort by source order, ID, flow, tag, title, type, priority, status, or last-run time. Environment is selected as a global context and determines the displayed result status; it is not a catalog filter. Support exporting the catalog to Markdown or CSV on request.

Group scenarios by the `@flow:` category authored in their feature file. Show each category as a collapsible group within the scenario explorer; do not require or display a separate flow registry. Preserve scenario identity, flow tags, and source references. Missing or duplicate IDs and incomplete metadata remain visibly ambiguous; the UI must not silently choose a row or infer that it is runnable.

Distinguish catalog executability from actual test results. An authored feature is not proof that it is registered in the runner or has executable step bindings. Show unavailable or unknown executability, and its known reason, separately from the latest result. If a scenario has no hosted result for its current definition, show the catalog state `not run`; do not treat it as a test outcome. Represent scenario outlines and examples without attributing one example’s outcome or evidence to another.

## Runs and execution (current scope)

A user can select one scenario, one feature, or one `@flow:` category within a feature, then choose one environment for that run. Tag filters narrow the catalog but are not run targets. Exclude unavailable scenarios from executable selections and disclose them; an empty selection is not a successful run. A local run uses the current checkout. After merge, a hosted run is required to give a new or changed scenario a current hosted result. Local results do not populate hosted results.

Keep the current progress view: show the run stage, live scenario and step status, browser preview, and useful failure details. A run can be cancelled during execution, before evidence upload; the UI then shows `cancelled`. Cancellation stops the run process, so the current scenario may be interrupted. Do not save any results from a cancelled run, including results for scenarios that finished earlier in that same run. Keep the previous latest results unchanged. Use the same cancellation and result behavior for local and hosted runs. Queue position, worker containers, a durable queue, multi-environment submission, and configurable concurrency across instances are deferred.

Do not retry scenarios automatically in the current MVP. Store only the latest result for each scenario and environment, with status (`passed`, `failed`, or `skipped`), duration, execution time, run ID, evidence reference, and environment. A scenario with no current hosted result is shown as `not run`; this is a catalog state, not a test result. Do not persist earlier run records or local results as hosted results. Commit SHA, trigger, and error details are outside the result contract for this phase.

Per-scenario results use only `passed`, `failed`, and `skipped`. Keep cancellation, setup errors, and worker interruption at run level; do not add more scenario result statuses for them. Preserve the suite’s actual skip, @fixme, quarantine, and mock behavior; “mocked” describes execution mode and does not imply a passed result.

Execution, setup, and evidence-upload failures are separate states. An upload failure must not turn a passed test into a failed test. Do not report a pass without a successful test result. E2E-owned records are used for mutations. Follow the existing data-safety workflow and require specific approval before a scenario mutates shared seed data; approval scope must include the applicable environment and scenario. This is a workflow gate, not a per-environment role restriction. The existing profanity-filter approval applies only to its recorded scenario and environment and cannot be reused elsewhere. Record and audit approvals as required by the workflow.

Keep one latest-result record per scenario and environment. Update it only when that scenario executes; unselected scenarios retain their previous result and evidence. Do not persist run history in the MVP.

## Evidence and results

Store evidence in a private Cloudflare R2 bucket through an S3-compatible abstraction. Use signed URLs for access. Show screenshots and playable videos when available, and provide downloads for other uploaded evidence files; an in-app Playwright trace viewer is not required. Evidence availability is separate from the test outcome.

Associate evidence with the latest result, scenario, and environment. Keep one latest evidence set per scenario and environment; when new evidence uploads successfully, overwrite the previous latest files. Do not configure time-based evidence expiry in the MVP. Clearly show when no evidence was produced, an upload is pending, or an upload failed.

Isolate R2 object paths and latest results by environment and scenario. Do not retain historical run results or configure automatic evidence expiry in the MVP. Exporting evidence to Google Drive is outside the hosted MVP and deferred to phase 2.

## PRD authoring and AI agent

The intended agent is a persistent chat widget in Automation. A user may ask in natural language about a selected scenario or a broader module or sub-module; selecting a scenario is optional, and the active context is visible. Normal QA requests enter the ask-qa workflow and use the relevant specialist skill as work progresses. Users may explicitly invoke /ask-qa, /write-prd, /write-e2e-scenarios, or /write-e2e-code. Show discoverable command suggestions and report clearly when a required skill is unavailable.

Use the maintained skills and their references from the draft’s .agents/skills directory. The agent can read, write, and edit files in its isolated workspace; use Git and playwright-cli; run approved tests; ask interactive questions; and display diffs. Skill guidance does not by itself prove that a consequential boundary was followed.

Support the workflows’ interviews, flow-list confirmation, scenario review, approved-batch handoff, and data-safety gates. Review flow lists and batch scope in the conversation; `.feature` files hold scenario IDs and `@flow:` tags. Present review gates in chat and alongside the relevant diff. Wait for an answer at each gate; silence or a generic request to continue is not approval. Keep scenario approval separate from command permission, file access, and live-data approval. An approval applies only to its reviewed scope and is invalidated when the relevant artifact changes.

The write-prd workflow supports PDF, DOCX, Markdown, and text uploads that are converted to a Markdown template for user review. It can also interview and explore a sub-module with playwright-cli. Mark each statement as spec, observed, or assumed; an observed behavior becomes validated only after Engineer review. Keep the PRD in draft until that review gate passes. Do not infer business intent from UI behavior alone. Store PRDs at docs/prd/<module>/<submodule>.md with module, sub-module, status, sources, environment, and last-explored date in front matter. The template records purpose and requirements, business flows and smoke candidates, validation rules and exact messages, roles, data and mutations, known issues, and out-of-scope flows so the scenario workflow can reuse those answers. Present skill questions one at a time with numbered options, one recommendation and its reason, and a free-text fallback.

Adapt the other workflows for a repository without frontend source: write-e2e-scenarios discovers routes and flows from the PRD and UI, reuses its interview answers, and uses a Project-configured ID prefix; write-e2e-code verifies locators through playwright-cli snapshots and returns the shared result contract instead of generated catalog or unit-test reports; ask-qa covers the PRD-to-PR E2E workflow. Keep the maintained skills and their required references in the test repository. Skill changes follow the same draft and pull-request workflow.

Run the agent loop in a worker on Vercel AI SDK with a multi-provider abstraction. Engineers provide their own provider API keys (BYOK) for OpenAI, Anthropic, Google, or an OpenAI-compatible endpoint such as OpenRouter. Encrypt keys at rest. The backend uses them to contact providers; keys must never enter the sandbox, model context, logs, or evidence. Allow model selection per session from models tested for tool calling. Show token use per session and user. Keep authentication behind an adapter so another login plan can be considered later.

Create an isolated container workspace per draft session from its draft branch, with playwright-cli and network access limited to the target environments, GitHub, and required provider endpoints. Apply CPU, memory, time, and agent-step limits and stop idle sessions. Persist conversations and decisions per draft and recover them after interruptions where possible. Never present an interrupted or stale approval as current.

## Drafts, repository integration, and pull requests

An Engineer may have at most one unfinished draft at a time. After finalizing the active draft, they can create another. A draft is a private-to-owner branch based on the target branch, named draft/<user>/<slug>-<id>, with an associated session and workspace. Drafts are not shown to other Project members in the app. GitHub repository collaborators may still see the branch according to repository permissions.

Before finalizing, synchronize the draft with the latest target branch and surface conflicts for resolution by the agent or through GitHub. Present the draft content, changed files, diff, verification status, and remaining gaps for review. A reviewed result may be committed or submitted through the authorized Git workflow. Do not treat agent output, a branch, or a pull request as approval to merge or deploy.

Finalization creates a pull request from the draft branch to the target branch on behalf of the user, subject to their GitHub permissions. Derive the title and description from the changes, including scenario IDs and flow categories. After finalization, remove the draft from the active draft list and add the pull request to History PR. Keep its open, merged, or closed status synchronized by GitHub webhook and link to GitHub. Archive inactive drafts after 30 days; keep their GitHub branch.

After a pull request is merged, refresh the official catalog. A branch or pull request does not mean the application or tests have been deployed.

## Schedules and notifications (deferred)

Schedules, scheduled runs, and email notifications are deferred beyond the current MVP. The local preview does not create cron jobs or start scheduled runs. If this work resumes later, schedules can select an environment, target (tag, flow, or sub-module), and target branch; retry behavior and notification details remain open decisions.

## Interface and accessibility

Use the Hyperscal theme, shared @hyperscal/ui components, icons, typography, and @hyperscal/tailwind-config styles. Keep the layout responsive and keyboard accessible, with clear status feedback.

The scenario explorer is the primary experience. Use module and feature navigation beside a searchable, filterable scenario list grouped into collapsible flow categories. Selecting a scenario opens its detail panel with steps, metadata, latest result, run action, and evidence. The list remains a compact overview instead of a wide table of every detail field. A run view shows live progress without requiring raw runner logs. Queue position and a dedicated schedules view are deferred with those capabilities.

## Architecture and non-functional requirements

The future hosted architecture may use TypeScript end to end: Next.js for UI and API, PostgreSQL, Redis with BullMQ, a Node worker, and Playwright in containers. Container workers and a durable queue are deferred from the current MVP. Keep web and worker applications separate if that architecture is adopted. Use GitHub App for login and repository operations behind a Git provider abstraction. Persist Project-scoped records for members, environments, encrypted variables, AI credentials and usage, drafts and sessions, PRDs, flows and scenarios, latest results and evidence, pull requests, and audit history.

If the hosted container-worker architecture is adopted in a later phase, the PRD proposes Vercel for the web app, managed PostgreSQL and Redis, and container workers/sandboxes in AWS, with static egress IPs when target environments require allowlisting. The long-term hosting target is AWS, but remains undecided. Validate provider limits, SDK versions, and service policies at implementation time.

Security requirements include encrypted environment secrets and AI keys, no secrets in logs/traces/prompts, isolation between agent sessions, restricted sandbox egress, private evidence storage with signed access, and audit records for actions involving environments, runs, secrets, and pull requests. Audit records identify who, when, which environment, and what action. Report run/session interruption honestly. Queue idempotency, restart recovery, and queue-capacity metrics apply only if a durable queue is added in a later phase.

## MVP scope and later phases

The current run scope is one environment per run, selection by scenario, feature, or category, latest-only results with `passed`/`failed`/`skipped` status, progress matching the local preview, and cancellation that discards results from the cancelled run. New or changed scenarios become `not run` after merge and require a hosted run. Multi-environment submission, tag-based run selection, worker containers, durable queues, cross-instance concurrency, schedules, scheduled retry, and email notifications are deferred. The loopback preview implements only the local behavior described below; this specification does not claim that hosted deployment is available.

MVP non-goals are Vitest and other unit/integration testing, CI, tag-based run selection, multi-environment submission, container workers, durable queues, configurable cross-instance concurrency, scheduled runs and retry, managing multiple Projects through the UI, subscription-plan login, Slack notifications, Google Drive evidence export, replacing human GitHub review, and automatically deploying test changes. Later phases may add those run capabilities along with multi-Project UI, subscription-plan login, Slack, Google Drive export, cross-Project skill updates, runs automatically after merge, and technical enforcement for protected environments.

## Local preview boundary

The current repository contains a loopback development preview at /, not the hosted service described above. Keep it bound to loopback. Its Vite UI and API run locally; the explorer executes scenarios from the current checkout through a local Playwright process. A run selects one scenario, one feature, or one `@flow:` category within a feature, and one environment. Tag filters narrow the catalog but do not select a run. Only one run can be active per API process across all environments. The preview does not provide the hosted container worker, durable cross-instance job queue, multi-environment submission, configurable per-environment concurrency, scheduled runs, Project membership, or GitHub App sign-in. It now includes a local BYOK runtime, but its browser-partitioned identity is not authentication and does not provide hosted per-user privacy.

The preview has a local catalog and optional PostgreSQL result store. Its catalog is derived from BDD feature files. The current explorer uses module and feature navigation, collapsible flow groups, compact scenario rows, and a selected-scenario detail panel. It supports cross-feature search, tag/flow/priority/type/status filters, and source/ID/flow/tag/title/type/priority/status/last-run sorting. Environment is selected globally and controls the result status shown in the catalog. Its current result view stores only the latest result per scenario and environment, not run history. A displayed local result means the latest result written by this preview for that environment; it is not a hosted result for the target branch because the runner uses the current checkout. Put simply: “latest” says when the scenario last ran locally; “hosted” says it ran after the current scenario definition was merged to the target branch. When a new or changed definition is merged, the hosted catalog shows `not run` until a hosted run completes. Local results are not copied over. Local target environments are configured by the runner; the preview defaults to stt1 and accepts a configured BASE_URL. For UI runs, users supply E2E_USERNAME and E2E_PASSWORD in Variables. Keep credentials in ignored local environment files or browser-held variables; never put them in chat or committed files.

The live run view shows the current stage, scenario and step progress, and a browser preview. These updates come from the local runner while that process is active; there is no queue position or durable hosted event stream. A user can cancel during execution, before evidence upload; the UI then shows `cancelled` and terminates the local Playwright process. The current scenario may be interrupted. A cancelled run does not save any results from that run, so previous latest results remain unchanged. Use the same cancellation behavior for hosted runs. The local Playwright configuration uses zero automatic retries.

The local QA Agent allows one unfinished browser-partitioned draft at a time, with a target branch, local branch, worktree, and persisted conversation. After finalizing it, the user can create another draft. The browser identity partitions local files but does not authenticate a person or provide hosted privacy. Provider keys are encrypted in the local database, model calls run in the API process, and token totals are partitioned by that browser identity. Agent writes that mark a PRD reviewed or add validated items require an explicit review of the proposed document; an intervening file change invalidates that decision. Before changing scenario intent, the agent requests confirmation of the affected flow IDs and descriptions against a reviewed PRD; changes to the PRD or external changes to the feature invalidate the applicable confirmation. Changes to scenario files require review before agent writes to BDD implementation files, and later scenario changes invalidate that approval. Draft scenario runs use the selected draft worktree, an explicit data-safety confirmation, and credentials from Variables; each run uses a quota-limited Docker container whose network proxy permits only the selected target origin. Their results and evidence stay in this browser and do not update official run records. Browser exploration starts on demand and uses a target-origin-only proxy, so applications that depend on separate SSO, API, or asset origins may not fully load. The whole agent session is not isolated in a per-draft container, and container workers, hosted authentication, and durable cross-instance job handling remain unimplemented. Before finalizing, the preview fetches and merges the target branch, surfaces conflicts for resolution in the agent workspace, and requires a fresh review when synchronization changes the draft. Submission uses the GitHub CLI configured on this computer. History PR status is refreshed manually through that CLI; webhooks are not available in the loopback preview. Drafts inactive for 30 days are archived while local branches and worktrees are retained. Pushed branches remain visible to repository collaborators according to GitHub permissions. The preview’s approvals and snapshot checks do not cover every automatic skill handoff or enforce every hosted data-safety gate.

The local preview can upload evidence to R2 when configured, using the same private bucket and signed-access model as the hosted design. R2 paths are latest-only per environment and scenario; a successful new upload overwrites the current files. If R2 is not configured, the existing optional Google Drive uploader remains available as a local fallback. The preview shows screenshots and videos and can link to downloads for other uploaded files; it has no trace viewer and no time-based evidence expiry. Local evidence credentials stay in ignored environment configuration. These capabilities do not make the loopback preview a hosted service.

## Existing workflow and integration constraints

BDD source files live under e2e/tests/bdd/features. Scenario IDs and `@flow:` tags in those feature files provide catalog identity and collapsible flow categories. Steps, fixtures, page objects, and components implement the automation. Scenario discovery and review precede changes to scenario intent. Work on source files rather than generated catalog output, and preserve scenario and flow identities.

The existing Playwright BDD configuration uses one worker and zero automatic retries, captures screenshots and video, retains traces on failure, and separates authentication from authenticated projects. The BDD command generates tests before invoking Playwright. The local Automation runner uses a temporary append-only event file and browser frames for its live view; the BDD result file is written at run end. These local mechanisms do not provide a hosted queue, queue position, durable progress events, or worker recovery.

The current reporter builds scenario results during execution but writes its results file at run end. Hosted live progress requires an event channel or equivalent. The local uploader stores file attachments under an environment-, app-, feature-, and scenario-specific path. R2 uses stable latest keys and replaces files no longer produced after the current upload succeeds; Drive uses one scenario folder and moves recognized older files to trash. Both write the latest evidence reference into the result only after the selected uploads succeed. Automatic upload may be skipped when neither provider is configured. Hosted R2 storage uses the same environment and scenario isolation.

Hosted execution requires test sources, Playwright and browser dependencies, worker-side artifact access, and server-side validation. Map user selections to validated scenario identities and runner arguments. Never accept arbitrary shell commands or user-controlled filesystem paths. Coordinate any local or CI process that shares generated files, reports, or evidence destinations.

## Acceptance criteria

1. A Project member can browse all Converge scenarios, including unimplemented ones, and inspect their steps and metadata. Unknown or unavailable execution status is distinct from runnable.
2. An Engineer and Viewer see only the actions allowed by their Project roles. Both can run supported scenarios on the target branch; only Engineers can use the authoring agent and create drafts or pull requests.
3. A user can run a scenario, feature, or category in one environment and see the selected scope, live stage, scenario/step progress, and truthful outcome.
4. Only one run is active per local API process. Cancelling a run stores no results from that run; the previous latest results remain unchanged.
5. Results and evidence are isolated by environment. The database stores only the latest result per scenario and environment; unexecuted scenarios retain their prior latest result. A successful upload replaces that scenario’s latest evidence files in R2. After merge, new or changed scenarios reset to `not run` and lose their current evidence reference until a hosted run completes; unchanged scenarios retain their latest hosted result.
6. Screenshots and videos can be previewed; other uploaded evidence can be downloaded. Missing and failed uploads have clear states. Evidence availability cannot make a failed test appear passed or a passed test appear failed.
7. Shared seed-data mutations require the specific applicable data-safety approval. Setup failures, skips, @fixme, mocked execution, interruption, and evidence-upload failure are reported accurately without expanding the scenario status set beyond passed, failed, and skipped.
8. The product uses the shared theme and remains usable with keyboard navigation and on smaller screens.
9. Users can create or import a sub-module PRD and use it as context for scenario work. Observed behavior is not treated as validated until reviewed.
10. A normal QA request enters the ask-qa workflow, and supported slash commands invoke the corresponding maintained skill. The agent asks for missing input and stops at applicable review gates.
11. An Engineer can review draft scenarios and code, see actual verification and remaining gaps, synchronize with the target branch, and submit an authorized pull request. Changed artifacts invalidate their relevant approval.
12. Merged pull requests refresh the hosted catalog. New or changed scenarios show `not run` until a hosted run completes; local results are never presented as hosted results. Draft content is not presented as official, and catalog metadata is not presented as a fresh run.
13. Deferred beyond the current MVP: scheduled runs, system identity, and scheduled-run email notifications.
14. Secrets, AI keys, conversations, approvals, workspaces, logs, and audit records remain protected and recoverable across API interruptions. Concurrent agent tasks use isolated workspaces. Run-worker recovery is deferred with container workers and durable queues.
15. The local preview remains a loopback development tool and is described separately from hosted capabilities; no hosted requirement is claimed as implemented merely because the preview has a related feature.

## Open technical and product decisions

- Final product name, numeric metric targets after the first four-week baseline, and final test-repository scaffold.
- Whether role-specific scenarios need multiple test accounts and how those accounts are selected per environment.
- Email provider, schedule timezone handling, recipient rules, and exact notification triggers.
- Hyperscal policy for evidence in third-party object storage and for draft branches visible to repository collaborators.
- R2 credential provisioning and access policy, and compatibility for existing Drive evidence when R2 is introduced.
- If deferred run features are added later: default per-environment concurrency, queue behavior, worker recovery, and queue cancellation behavior.
- Whether changes to shared steps, fixtures, or POMs should also reset results when the `.feature` definition is unchanged.
- How scenario runnable status and data-safety approval scope are derived for partially implemented features, scenario outlines, reused steps, and environment-specific approvals.
- How catalog refresh detects changed scenario definitions when IDs are missing or duplicated, and how stale evidence objects are cleaned up after their current catalog reference is cleared.
- Hosted agent authorization for editing source, approving scenario changes, accessing environments, committing, pushing, and creating pull requests.
- Provider, worker platform, agent/runtime identity, model allowlist, quotas, workspace cleanup and retention, durable conversation/approval storage, and final web/worker deployment topology.
- Public access, routing, GitHub OAuth details, and how test-account authentication works for flows that intentionally begin logged out.
