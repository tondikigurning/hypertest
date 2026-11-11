# Automation app: instructions for contributors and coding agents

These instructions apply to the Automation app at the repository root. Before editing, read
`README.md`, `docs/automation/README.md`, the relevant source and its callers, and the affected tests. `SPEC.md`
describes a draft hosted product; use the README and implementation to understand what the local preview supports.

## Architecture

- `src/app` composes the explorer and coordinates navigation. Keep domain logic and network lifecycle in the
  appropriate feature under `src/features/{scenarios,runs,evidence,agent}`.
- Keep scenario filtering and grouping in `features/scenarios/selectors.ts` as pure functions. Keep catalog loading,
  snapshot fallback and post-run refresh in `use-scenario-catalog.ts`. Preserve cancellation and prevent stale
  responses from replacing newer data when modifying asynchronous behavior.
- Put UI used across features in `src/components` and export it through `src/components/index.ts`. Keep feature-only
  components in their feature. Reuse the existing local controls for the same interactions; consult the README before
  replacing them with shared UI components because their behavior and markup differ.
- Keep server-side catalog parsing, run selection, process execution, progress and evidence in `server`. Feature
  modules live under `server/modules/`, with shared middleware and request checks at the server level. Trace the
  full producer-to-consumer path when changing API data, and update the corresponding TypeScript declarations and
  consumers together. Avoid exposing server-only data or implementation details in the UI.
- Preserve the order-dependent global stylesheet unless a change includes verification of affected layouts and
  responsive states. Use the existing visual language and accessible native controls.

## Data and execution invariants

- Preserve scenario identity and source information. IDs can be missing or duplicated; do not assume an ID uniquely
  identifies a row, silently choose an ambiguous match, or represent unknown execution availability as runnable.
- Catalogs are generated data. Change their producers or inputs and regenerate through the documented workflow; do
  not hand-edit generated catalogs. Distinguish catalog results, actual run outcomes and evidence upload status.
- The local runner is a loopback development preview, not a hosted service. Preserve server-side selection validation,
  access boundaries and secret handling. Do not expose it or claim hosted readiness; read the README and specification
  before changing execution, sessions, artifacts or evidence.
- Before running BDD scenarios, inspect the selected setup and steps and follow the repository's E2E data-safety
  workflow. Do not run BDD generation concurrently with the local runner; generated files are shared.
- The QA agent's local worktree is based on committed HEAD and is separate from the explorer's checkout and generated
  catalog. Preserve the selected scenario's source identity and treat draft previews, Git diffs, catalog entries and
  actual test outcomes as distinct. It excludes uncommitted changes, ignored files and credentials. Local dependency
  directories are linked from the checkout for execution and remain outside the agent's writable workspace.
- Keep the agent's command/file permission requests separate from business-flow review, scenario approval and live-data
  approval. Draft scenario execution is currently omitted from the QA Agent; the explorer runner only verifies scenarios
  in the current checkout. Do not claim that its result verifies unmerged agent changes. If draft execution is restored,
  use a dedicated bridge with validated worktree selection, browser-supplied credentials outside chat, explicit scoped
  data-safety handling, isolated artifacts, and truthful result reporting. Do not enable arbitrary shell BDD execution or
  unrestricted live browser mutation through the agent.
- Agent worktrees, branches and local conversation state can outlive the API process. Preserve user changes and do not
  delete, reset, commit or push another task's workspace implicitly. Treat persisted conversations, local paths, logs,
  environment values and Codex thread state as potentially sensitive.

## Code and verification

- Follow the root Biome configuration and TypeScript strict mode. Use descriptive names, kebab-case filenames,
  explicit button types, and type-only imports where applicable. Do not weaken rules to make a change pass. If a
  narrow suppression is necessary, explain the concrete reason at the affected code.
- Use existing patterns and dependencies unless the task justifies a change. Keep effects and polling cancellable;
  account for loading, empty, failure and unavailable states as relevant. Do not add dependencies solely to enforce a
  preference.
- For Vitest changes follow `.agents/skills/write-unit-tests/SKILL.md`; for E2E changes follow the relevant
  `write-e2e-scenarios` or `write-e2e-code` workflow. Preserve stable scenario IDs and generated artifacts.
- From the repository root, run the checks appropriate to the change:

  ```sh
  pnpm exec biome check src server vite.config.ts drizzle.config.ts
  pnpm typecheck
  pnpm build
  node --test 'server/**/*.test.mjs'
  ```

  The server tests do not execute BDD scenarios. Add focused behavior coverage or browser verification when the
  change warrants it; these commands alone do not prove UI behavior. Report checks actually run and any remaining
  warnings or limitations.
