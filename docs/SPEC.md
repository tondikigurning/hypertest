# Automation Workspace — Product Specification

Status: product draft, reconciled with docs/PRD.md v0.1 on 11 November 2026. Hosted product requirements are described below; the current loopback preview is documented separately in “Local preview boundary.”

## Purpose

Automation Workspace is an internal web product for FE Test Engineers and QA Engineers to create, run, and maintain Playwright BDD automation with an AI agent. It supports the workflow from product context (PRD) through reviewed scenarios, implementation, execution, and a GitHub pull request.

The first Project targets Converge at converge.<env>.hyperscal.com. Its initial environments are dev, stt, stt1, and pp. The test repository is separate from the Converge frontend repository, so the agent cannot inspect frontend source. Product context comes from per-sub-module PRDs and direct UI exploration with playwright-cli.

The product name is a working name. This specification describes the hosted target, not a claim that the local preview already provides these capabilities. docs/PRD.md is the source for product goals and unresolved assumptions.

## Product scope and Project model

A Project connects one test repository, one target application, its environments, members, and schedules. The MVP supports one Project, Converge; the data model should allow additional Projects, while multi-Project management in the UI is deferred.

Environments are configured per Project, not fixed by the deployment. Each environment has a name, base URL, variables, and secrets. Users select one or more environments when starting a run. The selected environment or environments must be visible before submission.

The product is hosted on the existing Hyperscal domain. The current local preview is available at /automation; hosted routing and deployment details remain subject to implementation design.

## Success measures

Measure the time from a sub-module PRD to a test pull request ready for review; the share of registered flows marked verified in each sub-module’s .flows.md (not as proof of complete business coverage); and pass and flaky rates per environment over time. Set numeric targets after the first four-week baseline.

## Users, authentication, and access

Authentication uses GitHub App OAuth. GitHub identity is used for repository actions and pull requests.

Project members have one of two roles:

- Engineer: manage Project settings, repository connection, environments and secrets, members, schedules, and notifications; create drafts; use the agent; upload or create PRDs; run tests; and finalize drafts as pull requests.
- Viewer: view the catalog, flow registry, PRDs, run history, evidence, and pull requests; run scenarios against the target branch. Viewers cannot use the agent, create drafts, manage settings, or create pull requests.
- Scheduler: a system identity that starts scheduled runs and updates official results.

All Project members may use all configured environments in the MVP. An environment marked protected is visibly identified and audited but does not impose a separate access block. Repository write access remains governed by the user’s GitHub permissions.

Converge test credentials are configured as environment secrets and injected into the execution worker or exploration browser. Encrypt them at rest, make them write-only, never show saved values again, and redact them from logs and traces. They are distinct from the user’s GitHub sign-in. The product must not expose credentials or session tokens to other users, the model, or evidence. The exact test-account model for role-specific scenarios remains an open decision.

## Scenario discovery and catalog

The test repository is the source of truth. The database catalog is derived from feature files and adjacent flow registries; it can be rebuilt from the repository. Generated catalog data must not be hand-edited.

Connect the test repository through GitHub App and choose a target branch, defaulting to development. On initial connection, import its feature files and .flows.md registries without run history. A new repository can be scaffolded with the default skills and BDD structure. The official catalog follows the target branch, can be refreshed manually, and is parsed again when a pull request is merged. A draft catalog is parsed from that draft’s workspace and revision and is visible only to its owner.

Browse the first Project’s scenarios by module, feature, flow, and scenario. Include authored scenarios even when they are not executable. Show available IDs, type, category or flow, tags, title, expected outcome, Gherkin steps, priority, source references, latest result per environment, last-run time, duration, and evidence.

Search, filter, and sort by available IDs, titles, type, priority, flow, tags (including @smoke, @regression, and @priority), status, and environment. Support exporting the catalog to Markdown or CSV on request.

Show each feature’s .flows.md registry and its statuses: pending, written, approved, implemented, verified, fixme, legacy, and obsolete. Preserve scenario and flow identity and source references. Missing or duplicate IDs and incomplete metadata remain visibly ambiguous; the UI must not silently choose a row or infer that it is runnable.

Distinguish catalog metadata from actual execution outcomes. An authored feature is not proof that it is registered in the runner or has executable step bindings. Show unavailable or unknown execution status, and its known reason, separately from not run and test outcomes. Represent scenario outlines and examples without attributing one example’s outcome or evidence to another.

## Runs and execution

A Project member can select a scenario, flow, tag, or sub-module to run in one or more environments. Show the selected scope and environments before submission. Exclude unavailable scenarios from executable selections and disclose them; an empty selection is not a successful run. Viewers can run only against the target branch. Engineers can run against the target branch or a private draft. Draft results do not update the official catalog.

Run each selection in an isolated Playwright worker container through a durable job queue. Show queue position, live run and scenario progress, completed outcomes, and useful failure details. Apply a configurable concurrency limit per environment across app instances; runs in different environments may proceed independently.

Use zero retries for manual and draft runs and one retry for scheduled runs. A scenario that passes only after retry is flaky. Store a shared per-scenario result contract with status, duration, error, evidence references, environment, commit SHA, and trigger (manual, draft, or schedule).

Report passed, failed, flaky, skipped, blocked, and not-run outcomes truthfully. Cancellation is a run state: queued work can be cancelled; an active run stops after the current scenario and its cleanup finish, and remaining scenarios are marked cancelled or not run. If a worker terminates unexpectedly, report interruption and possible incomplete cleanup. Preserve the suite’s actual skip, @fixme, quarantine, and mock behavior; “mocked” describes execution mode and does not imply a passed result.

Execution, setup, and evidence-upload failures are separate states. An upload failure must not turn a passed test into a failed test. Do not report a pass without a successful test result. E2E-owned records are used for mutations. Follow the existing data-safety workflow and require specific approval before a scenario mutates shared seed data; approval scope must include the applicable environment and scenario. This is a workflow gate, not a per-environment role restriction. The existing profanity-filter approval applies only to its recorded scenario and environment and cannot be reused elsewhere. Record and audit approvals as required by the workflow.

Every run records its environment, repository ref, commit SHA, trigger, and per-scenario results. Keep run history in the database permanently. The latest official result for each scenario and environment updates only when that scenario executes; unselected scenarios retain their previous latest result and evidence.

## Evidence and results

Store hosted evidence in a private Cloudflare R2 bucket through an S3-compatible abstraction. Use signed URLs for access and provide an in-app trace viewer. Show screenshots and playable videos when available, with useful loading, unavailable, and error states. Evidence includes trace, screenshot, video, or run log where produced. Evidence availability is separate from the test outcome.

Associate evidence with its run, scenario, and environment. Show the latest result and evidence per scenario and environment, identify its execution time, and never present an older file as evidence of a newer run. If older evidence is shown, label the run it belongs to. Clearly show when no evidence was produced, an upload is pending, or an upload failed.

The PRD’s default evidence retention is 30 days, extended to 90 days for failed runs; run history remains in the database permanently. Retention values are assumptions to confirm before rollout. Isolate object paths and latest results by environment. Exporting evidence to Google Drive is outside the MVP and deferred to phase 2.

## PRD authoring and AI agent

The intended agent is a persistent chat widget in Automation. A user may ask in natural language about a selected scenario or a broader module or sub-module; selecting a scenario is optional, and the active context is visible. Normal QA requests enter the ask-qa workflow and use the relevant specialist skill as work progresses. Users may explicitly invoke /ask-qa, /write-prd, /write-e2e-scenarios, or /write-e2e-code. Show discoverable command suggestions and report clearly when a required skill is unavailable.

Use the maintained skills and their references from the draft’s .agents/skills directory. The agent can read, write, and edit files in its isolated workspace; use Git and playwright-cli; run approved tests; ask interactive questions; and display diffs. Skill guidance does not by itself prove that a consequential boundary was followed.

Support the workflows’ interviews, flow-list confirmation, scenario review, approved-batch handoff, and data-safety gates. Present review gates in chat and alongside the relevant diff. Wait for an answer at each gate; silence or a generic request to continue is not approval. Keep scenario approval separate from command permission, file access, and live-data approval. An approval applies only to its reviewed scope and is invalidated when the relevant artifact changes.

The write-prd workflow supports PDF, DOCX, Markdown, and text uploads that are converted to a Markdown template for user review. It can also interview and explore a sub-module with playwright-cli. Mark each statement as spec, observed, or assumed; an observed behavior becomes validated only after Engineer review. Keep the PRD in draft until that review gate passes. Do not infer business intent from UI behavior alone. Store PRDs at docs/prd/<module>/<submodule>.md with module, sub-module, status, sources, environment, and last-explored date in front matter. The template records purpose and requirements, business flows and smoke candidates, validation rules and exact messages, roles, data and mutations, known issues, and out-of-scope flows so the scenario workflow can reuse those answers. Present skill questions one at a time with numbered options, one recommendation and its reason, and a free-text fallback.

Adapt the other workflows for a repository without frontend source: write-e2e-scenarios discovers routes and flows from the PRD and UI, reuses its interview answers, and uses a Project-configured ID prefix; write-e2e-code verifies locators through playwright-cli snapshots and returns the shared result contract instead of generated catalog or unit-test reports; ask-qa covers the PRD-to-PR E2E workflow. Keep the maintained skills and their required references in the test repository. Skill changes follow the same draft and pull-request workflow.

Run the agent loop in a worker on Vercel AI SDK with a multi-provider abstraction. Engineers provide their own provider API keys (BYOK) for OpenAI, Anthropic, Google, or an OpenAI-compatible endpoint such as OpenRouter. Encrypt keys at rest. The backend uses them to contact providers; keys must never enter the sandbox, model context, logs, or evidence. Allow model selection per session from models tested for tool calling. Show token use per session and user. Keep authentication behind an adapter so another login plan can be considered later.

Create an isolated container workspace per draft session from its draft branch, with playwright-cli and network access limited to the target environments, GitHub, and required provider endpoints. Apply CPU, memory, time, and agent-step limits and stop idle sessions. Persist conversations and decisions per draft and recover them after interruptions where possible. Never present an interrupted or stale approval as current.

## Drafts, repository integration, and pull requests

An Engineer may have multiple drafts. A draft is a private-to-owner branch based on the target branch, named draft/<user>/<slug>-<id>, with an associated session and workspace. Drafts are not shown to other Project members in the app. GitHub repository collaborators may still see the branch according to repository permissions.

Before finalizing, synchronize the draft with the latest target branch and surface conflicts for resolution by the agent or through GitHub. Present the draft content, changed files, diff, verification status, and remaining gaps for review. A reviewed result may be committed or submitted through the authorized Git workflow. Do not treat agent output, a branch, or a pull request as approval to merge or deploy.

Finalization creates a pull request from the draft branch to the target branch on behalf of the user, subject to their GitHub permissions. Derive the title and description from the changes, including scenario IDs, flows, and registry status. After finalization, remove the draft from the active draft list and add the pull request to History PR. Keep its open, merged, or closed status synchronized by GitHub webhook and link to GitHub. Archive inactive drafts after 30 days; keep their GitHub branch.

After a pull request is merged, refresh the official catalog. A branch or pull request does not mean the application or tests have been deployed.

## Schedules and notifications

Engineers can configure cron schedules per Project with an environment, target (tag, flow, or sub-module), and target branch. Scheduled runs use the system identity, follow the scheduled retry policy, and update the official catalog. Send email when a scheduled run fails or a scenario is flaky; configure recipients per schedule. Email provider, timezone behavior, recipients, and exact triggering policy remain open decisions.

## Interface and accessibility

Use the Hyperscal theme, shared @hyperscal/ui components, icons, typography, and @hyperscal/tailwind-config styles. Keep the layout responsive and keyboard accessible, with clear status feedback.

The scenario explorer is the primary experience. Scenario detail brings steps, metadata, latest result, run action, and evidence together. A run view shows queue position and live progress without requiring raw runner logs. Provide dedicated views for flow registries, PRDs, draft review, schedules, and pull-request history.

## Architecture and non-functional requirements

The intended stack is TypeScript end to end: Next.js for UI and API, PostgreSQL, Redis with BullMQ, a Node worker, and Playwright in containers. Keep web and worker applications separate from the beginning. Use GitHub App for login and repository operations behind a Git provider abstraction. Persist Project-scoped records for members, environments, encrypted variables, AI credentials and usage, drafts and sessions, PRDs, flows and scenarios, runs and results, evidence, schedules and notifications, pull requests, and audit history.

For bootstrap, the PRD proposes Vercel for the web app, managed PostgreSQL and Redis, and container workers/sandboxes in AWS, with static egress IPs when target environments require allowlisting. The long-term hosting target is AWS, but remains undecided. Validate provider limits, SDK versions, and service policies at implementation time.

Security requirements include encrypted environment secrets and AI keys, no secrets in logs/traces/prompts, isolation between agent sessions, restricted sandbox egress, private evidence storage, automatic evidence expiry, and audit records for actions involving environments, runs, secrets, and pull requests. Audit records identify who, when, which environment, and what action. Jobs are idempotent, queues survive worker restarts, and run/session interruption is reported honestly. Keep the catalog responsive with thousands of scenarios and expose run, agent, token-use, and queue-capacity metrics.

## MVP scope and later phases

The MVP is one Converge Project with GitHub connection, environments and secrets, Engineer and Viewer members, a repository-derived catalog, multi-environment runs, R2 evidence, flaky status, cron schedules and email notifications, the agent workflows, BYOK, private drafts, target-branch synchronization, pull requests, and History PR.

MVP non-goals are Vitest and other unit/integration testing, CI, managing multiple Projects through the UI, subscription-plan login, Slack notifications, Google Drive evidence export, replacing human GitHub review, and automatically deploying test changes. Phase 2 may add multi-Project UI, subscription-plan login, Slack, Google Drive export, cross-Project skill updates, runs automatically after merge, and technical enforcement for protected environments.

## Local preview boundary

The current repository contains a loopback development preview at /automation, not the hosted service described above. Keep it bound to loopback. Its Vite UI and API run locally; the explorer executes scenarios from the current checkout through the local Playwright workspace. It does not provide the hosted container worker, durable cross-instance job queue, scheduled runs, Project membership, GitHub App sign-in, or BYOK runtime specified above.

The preview has a local catalog and optional PostgreSQL result store. Its catalog is derived from BDD feature files. Its current result view stores latest results per scenario and environment, not the hosted permanent run history. Local target environments are configured by the runner; the preview defaults to stt1 and accepts a configured BASE_URL. For UI runs, users supply E2E_USERNAME and E2E_PASSWORD in Variables. Keep credentials in ignored local environment files or browser-held variables; never put them in chat or committed files.

The local QA Agent is a partial implementation based on a committed HEAD and a detached worktree. Its conversation and worktree can survive API restarts. It supports selected scenario, feature, menu, and file context, uses the local Codex runtime, and can prepare an authenticated playwright-cli session from Variables. Draft scenario execution is currently omitted; the explorer runner runs only scenarios in the current checkout and cannot verify unmerged agent changes. Local publishing to GitHub, push, and pull-request creation are not supported. The preview’s approvals and snapshot checks do not cover every automatic skill handoff or enforce every hosted data-safety gate.

Local evidence uses the existing optional Google Drive uploader, not R2. The runner can show locally generated screenshot and video attachments during a run. The uploader exports image and video attachments, not traces; uploads can be skipped without Drive credentials. Results and evidence are latest per scenario and environment in the preview. A stable Drive folder link may briefly refer to older evidence, so the preview must identify upload state and avoid claiming that an older file came from the current run. These local details do not change the hosted R2 requirement above.

## Existing workflow and integration constraints

BDD source files live under e2e/tests/bdd/features, with adjacent flow registries. Steps, fixtures, page objects, and components implement the automation. Scenario discovery and review precede changes to scenario intent. Work on source files rather than generated catalog output, and preserve scenario and flow identities.

The existing Playwright BDD configuration uses one worker, captures screenshots and video, retains traces on failure, and separates authentication from authenticated projects. The BDD command generates tests before invoking Playwright. The current evidence script runs generation, Playwright, then upload using shared local output and report paths; it does not provide a hosted queue, immediate hosted artifact delivery, or live events.

The current reporter builds the shared result contract during execution but writes its results file at run end. Hosted live progress requires an event channel or equivalent. The current Drive uploader writes image/video attachments under E2E Evidence/<app>/<feature path>/<scenario ID>, uploads current attachments before moving recognized older files to Drive trash, and writes evidence links into the run results after selected uploads succeed. It may skip automatic upload when Drive credentials are absent. Preserve these local semantics unless the local preview is intentionally changed; hosted R2 storage needs its own environment-isolated mapping.

Hosted execution requires test sources, Playwright and browser dependencies, worker-side artifact access, and server-side validation. Map user selections to validated scenario identities and runner arguments. Never accept arbitrary shell commands or user-controlled filesystem paths. Coordinate any local or CI process that shares generated files, reports, or evidence destinations.

## Acceptance criteria

1. A Project member can browse all Converge scenarios, including unimplemented ones, and inspect their steps and metadata. Unknown or unavailable execution status is distinct from runnable.
2. An Engineer and Viewer see only the actions allowed by their Project roles. Both can run supported scenarios on the target branch; only Engineers can use the authoring agent and create drafts or pull requests.
3. A user can submit a scenario, flow, tag, or sub-module selection to one or more environments and see the scope, environment, queue position, live progress, and truthful final outcomes.
4. Runs for the same environment respect its configured concurrency limit across app instances. Queued and active cancellation follow the specified behavior, and unselected scenarios keep their prior latest result.
5. Results and evidence are isolated by environment. The database retains run history; the latest result updates only for executed scenarios. Evidence is associated with its actual run and follows the configured retention policy.
6. Screenshots, videos, and traces are viewable when available. Missing, pending, expired, and failed evidence have distinct states and cannot make a failed test appear passed or a passed test appear failed.
7. Shared seed-data mutations require the specific applicable data-safety approval. Setup failures, skips, @fixme, mocked execution, blocked work, interruption, and evidence-upload failure are reported accurately.
8. The product uses the shared theme and remains usable with keyboard navigation and on smaller screens.
9. Users can create or import a sub-module PRD and use it as context for scenario work. Observed behavior is not treated as validated until reviewed.
10. A normal QA request enters the ask-qa workflow, and supported slash commands invoke the corresponding maintained skill. The agent asks for missing input and stops at applicable review gates.
11. An Engineer can review draft scenarios and code, see actual verification and remaining gaps, synchronize with the target branch, and submit an authorized pull request. Changed artifacts invalidate their relevant approval.
12. Merged pull requests refresh the official catalog. Draft content is not presented as official, and a catalog entry is not presented as a fresh run.
13. Scheduled runs use the system identity, selected environment and target, update the official catalog, and send configured email for failed or flaky results.
14. Secrets, AI keys, conversations, approvals, workspaces, logs, and audit records remain protected and recoverable across worker or API interruptions. Concurrent agent tasks use isolated workspaces.
15. The local preview remains a loopback development tool and is described separately from hosted capabilities; no hosted requirement is claimed as implemented merely because the preview has a related feature.

## Open technical and product decisions

- Final product name, numeric metric targets after the first four-week baseline, and final test-repository scaffold.
- Whether role-specific scenarios need multiple test accounts and how those accounts are selected per environment.
- Email provider, schedule timezone handling, recipient rules, and exact notification triggers.
- Hyperscal policy for evidence in third-party object storage and for draft branches visible to repository collaborators.
- Evidence-retention defaults and migration or compatibility for existing Drive evidence when hosted R2 is introduced.
- Default per-environment concurrency, queue behavior across environments, persistent result schema, worker recovery, and graceful cancellation.
- How scenario runnable status and data-safety approval scope are derived for partially implemented features, scenario outlines, reused steps, and environment-specific approvals.
- How local/CI runs interact with hosted result history and evidence, and how catalog refresh behaves without redeploying the web app.
- Hosted agent authorization for editing source, approving scenario changes, accessing environments, committing, pushing, and creating pull requests.
- Provider, worker platform, agent/runtime identity, model allowlist, quotas, workspace cleanup and retention, durable conversation/approval storage, and final web/worker deployment topology.
- Public access, routing, GitHub OAuth details, and how test-account authentication works for flows that intentionally begin logged out.
