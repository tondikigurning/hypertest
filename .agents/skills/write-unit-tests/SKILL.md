---
name: write-unit-tests
description: Write, extend, convert or maintain Vitest unit and integration tests using the repo's scenario() wrapper, stable scenario IDs and generated catalogs. Use for unit, integration, regression or characterization tests and scenario() conversions.
---

# Write Unit & Integration Tests

Authoring workflow for Vitest tests in this monorepo. Every test is a `scenario()` so the reporter can generate the committed catalog. Strategy and rationale: `docs/workspace/testing/automated-testing-strategy.md`.

When deciding the test tier, unit and integration tests are appropriate for isolated component behavior, field validation and detailed branches that do not need an end-to-end business journey. E2E concentrates on business goals and consequential cross-component outcomes. Check existing coverage rather than assuming either tier already covers a behavior, and avoid duplicating tests without a reason.

## Step 0 — Interview (required before writing anything)

For questions and confirmations throughout this skill, follow the question-presentation and response-handling instructions in [write-e2e-scenarios Step 0](../write-e2e-scenarios/SKILL.md#step-0--interview-for-scope-required). Apply only those interaction instructions, not its scope or scenario workflow. Ask one focused question at a time and adapt to the answer.

Before every question, apply the shared reuse-answers rule: use clear applicable answers from the request or earlier conversation, including across skill handoffs; ask only for missing or genuinely ambiguous parts. Preserve distinct explicit approval gates.

For every question, apply the mandatory question-format decision in that section: offer meaningful alternatives and a free-text fallback when possible, and always recommend one option with its reasoning and any uncertainty; use open-ended text only under the stated conditions and include the delegation sentence.

After asking any question or confirmation, pause all task work until the user answers, including independent investigation and tool calls; follow the shared async and plain-text waiting rules.

**Mandatory interview completeness gate:** Before dependent test authoring, account for every scope topic and every applicable decision in each context topic below. Track each as answered, explicitly delegated/skipped with assumptions, not applicable with a concrete reason, or pending. Ask every pending applicable context decision one at a time and wait for the answer; a partial answer covers only the part answered. Do not infer an answer or inapplicability from code or silence. Keep the checklist across turns and interruptions, revisit it when scope changes, and report assumptions and material gaps. Scope and narrowing questions remain conditional as stated below. Follow the detailed gate and interaction rules in [write-e2e-scenarios Step 0](../write-e2e-scenarios/SKILL.md#step-0--interview-for-scope-required).

Determine the scope from the request and repository. Ask only if it remains ambiguous after inspection:

1. **Scope:** locate the named file, folder, component or feature. Confirm only if multiple plausible targets remain.
2. **Mode (required if unclear):** new unit tests / integration tests / convert existing `it()`/`test()` to `scenario()` / regression guard for a specific bug.
3. **Narrowing (optional):** only one exported function? only one prop? Skip unless the user volunteers it or the scope is large.

Then work out these yourself (do not ask unless truly ambiguous):

- the package and its vitest config,
- the existing test file next to the source (or under the package `tests/` dir),
- the existing catalog `testing-docs/components/<pkg>/<component>.md`,
- the package code and component code (see [references/id-scheme.md](references/id-scheme.md)). If the package or component has no code yet, choose a noncolliding code following the existing conventions and report it.

For a whole folder, inventory exported behavior and prioritize the requested scope. Ask for direction only if the scope or expected behavior cannot be inferred.

## Step 0b — Context interview (required)

Reading the code shows what the code does, not what it should do. Before starting dependent work, interview the user about applicable unanswered topics below one focused question at a time, adapting follow-ups to the answers. Do not treat repository evidence as a substitute for the interview. Skip questions already answered in the conversation or clearly inapplicable. Wait for a response; silence is not an answer. If the user explicitly skips or delegates the interview, proceed and report assumptions. Existing approval and data-safety gates still apply.

1. **Expected behavior:** what this unit must do for its consumers, including the error behavior (throw, fallback, or error state) and any exact labels or messages the output must show.
2. **Must-never-break and history:** behaviors that become `smoke` or `regression`, bugs to guard against (ticket IDs go in `refs`), and existing flaky tests to tag `quarantine`.
3. **Mocking boundaries:** what to mock (heavy dependencies, network, context) and what must stay real. For integration mode, which modules must work together.
4. **Hard setup and scope:** timers, dates, or browser APIs happy-dom lacks that need stubbing, and anything to leave out (styling, already-covered paths). Human-judgement checks become `scenario.manual()`.

Rules:

- Never re-ask a question the user has already answered, in this message or earlier in the conversation. Reuse the answer. Ask only for what is still missing.
- If the user answers "skip" or "you decide", continue and record every assumption in the summary.
- Answers guide which scenarios to write. If they conflict with the code, say so and ask which is right.

## Step 1 — Preconditions

1. Read the source under test completely, plus any existing tests and the catalog. Do not write tests for code you have not read.
2. Inspect the package's actual Vitest configuration and reporter wiring; add the scenario reporter when needed for the requested tests. Do not assume a package already has it.
3. Find the next free ID for the actual tier using source, catalogs and relevant history as described in [references/id-scheme.md](references/id-scheme.md). IDs are permanent.

## Step 2 — Write scenarios

Never use bare `it()` or `test()`: CI runs with `TEST_STRICT=1` and fails the run.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect } from "vitest";
import { scenario } from "@hyperscal/test-utils/vitest";
import { BooleanInput } from "./boolean-input";

describe("BooleanInput", () => {
  scenario(
    {
      id: "FLT_BLN_UT_001", // permanent, never renumber
      title: "renders True and False options", // the test name
      type: "positive", // positive | negative | ui-interaction | edge-case
      category: "BooleanInput", // stable grouping in the catalog
      method: "unit", // unit | integration | e2e | manual
      tags: ["smoke"], // optional: smoke | regression | quarantine
    },
    () => {
      render(<BooleanInput />);
      expect(screen.getByRole("option", { name: "True" })).toBeInTheDocument();
    },
  );
});
```

Metadata rules (enforced at runtime by `validateMeta` in `packages/internal/test-utils/src/schema/validate.ts`):

- Required: `id` (matches `^[A-Z]{2,4}_[A-Z0-9_]+_(UT|IT|E2E|MAN)_\d{3,4}$`), `title`, `type`, `category`, `method`.
- Optional for unit tests: `expect` (non-empty string when given; required only for `method: "e2e"`), `tags`, `refs` (e.g. `["JIRA-123"]`). Adding a short `expect` is encouraged for readability.
- `reason` is **required** when `method: "manual"`.
- `status`, `durationMs`, `runner`, `file`, `line` are derived, never authored.

| `type`           | Use when                                            |
| ---------------- | --------------------------------------------------- |
| `positive`       | Happy path: expected input produces expected output |
| `negative`       | Invalid input, missing data, error states           |
| `ui-interaction` | Click, keyboard, focus events                       |
| `edge-case`      | Boundary values, null paths, off-by-one             |

Human-only checks use `scenario.manual({ ..., method: "manual", reason: "<why automation is not viable>" })` (no body, appears as "Manual" in the catalog).

### Coverage and quality rules

1. Cover all four types where they apply: positive, negative, ui-interaction (only if interactive), edge-case.
2. Mock heavy dependencies with `vi.mock()`. Never mock the unit under test.
3. Do not add scenarios for animation, visual styling, or paths already covered (check the catalog). Use `scenario.manual()` for anything that needs human judgement and explain why.
4. Assert behavior a user or consumer can observe, not implementation details.
5. Tags: `smoke` identifies release-critical checks; `regression` identifies a bug guard; `quarantine` identifies an unreliable test. The strategy intends quarantine to be non-blocking, but the current Vitest wrapper only applies `TEST_TAGS` matching and its reporter does not make failures non-blocking. Verify the actual runner and CI behavior; do not promise quarantine suppresses failures. `@fixme` is an e2e-only concept for real product bugs; do not use `quarantine` to hide one.

Common patterns:

| Pattern             | When                         | Example                                                                                      |
| ------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Pure function       | Exported logic, no DOM       | `partitionPipelines` in `packages/dataview/src/pipeline-renderer/pipeline-renderer.test.tsx` |
| Component render    | Default visual state         | `packages/filters/tests/components/boolean-input.test.tsx`                                   |
| User interaction    | Click, keyboard              | `packages/internal/ui/src/atoms/calendar/test/calendar.test.tsx`                             |
| Context + hook mock | Component depends on context | `vi.mock("@/context", () => ...)`                                                            |
| Slow interaction    | Date pickers, drag           | `vi.setConfig({ testTimeout: 15000 })`                                                       |

## Mode: narrow scope

When the user restricts scope, write only that and say what you skipped:

- one exported function (`only-function`),
- one prop's behavior (`only-prop`),
- a regression guard for a described bug (tag it `regression`, put the bug in `refs` if there is a ticket),
- also include integration scenarios (see below).

## Mode: integration tests

Use when hooks, services and components must work together (`method: "integration"`, IDs `<PKG>_<COMP>_IT_NNN`).

1. Read the source files under test and the existing unit tests for the area first, so you do not duplicate unit-level scenarios.
2. Keep the modules and interactions under test real. Mock external dependencies only when appropriate to the requested boundary; router, auth and network can remain real when their integration is the behavior under test.
3. Cover relevant observable outcomes and failure paths. Loading, filtering, errors and empty states apply only when the integration actually exposes them.

## Mode: convert `it()`/`test()` to `scenario()`

1. Replace every `it()` / `test()` with `scenario()`. Do not change any test logic, only add the wrapper.
2. Assign new IDs using the tier-specific procedure in the ID reference; preserve any existing scenario IDs and never reuse retired ones.
3. Derive `type` from the test's intent.
4. Investigate no-op or comment-only tests. Implement an assertion if the intended behavior is known; otherwise report the gap. Use `scenario.manual()` only for a real human-performed check with a reason, not merely because a test is empty.

## Step 3 — Run and regenerate the catalog

Always run **from inside the package directory**: the reporter derives the package slug from the Vitest project name, so running from the repo root can skip the package context.

```bash
cd packages/<pkg>
pnpm vitest run path/to/my-component.test.tsx          # local run, output goes to temp/ (gitignored)
TEST_WRITE=1 pnpm vitest run path/to/my-component.test.tsx   # writes the committed catalog
```

The catalog is normally `testing-docs/components/<pkg>/<component>.md`; confirm the reporter's printed path and inspect its diff. Keep the generated catalog with the test changes so catalog checks can assess freshness. Do not commit unless requested. **Never hand-edit generated catalogs or reports**; the reporter overwrites them.

Before finishing, report: the files changed, the IDs added (range), tests passing, and the catalog file that was regenerated. If a test fails because of an application bug, tell the user instead of bending the assertion.

## Related

- Locking down existing behavior before a refactor: read `docs/workspace/patterns/characterization-testing.md` first (it documents a mocking mistake that crashed the runner with an out-of-memory error).
- IDs, package and tier codes: [references/id-scheme.md](references/id-scheme.md)
- Env flags, commands, troubleshooting: [references/commands-and-troubleshooting.md](references/commands-and-troubleshooting.md)
- Browser tests: use the `write-e2e-scenarios` and `write-e2e-code` skills.
- Not sure which workflow applies: use `ask-qa`.
