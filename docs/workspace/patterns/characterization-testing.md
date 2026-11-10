---
type: reference
domain: testing
status: active
date: 2026-07-27
tags: [testing, vitest, refactor, characterization]
---

# Characterization Testing — Locking Pre-Refactor Behavior

> **For AI assistants: read this file BEFORE writing any test whose purpose is to lock down
> today's behavior of existing code ahead of a refactor** (as opposed to testing brand-new
> code). This is not optional guidance — it documents hard-won lessons from a real session,
> including a mocking mistake that twice crashed the test runner with an out-of-memory error.
> Follow the patterns here exactly; do not improvise a different mocking style for this kind
> of test.

---

## What this is, and when to use it

A refactor (renaming, restructuring, centralizing logic, moving state around) should change
**how** code works without changing **what the user experiences**. The only reliable way to
verify that after the fact is to have tests that pin down today's real behavior _before_ the
refactor starts, so the same behavioral questions can be asked again _after_ the refactor and
compared.

Use this pattern when:

- You're about to refactor a feature area and want a safety net that isn't hand-wavy.
- You've been asked to "lock" or "characterize" existing behavior on a pre-refactor branch.
- You're deciding whether a test failure after a refactor is a real regression or an
  intentional design change — characterization tests are what make that decision possible
  instead of a guess.

This produced real value already: writing these tests for `case-management`'s tab/action
refactor (PR #3559 / `feature/centralized-case-actions-flags`) caught a genuine silent
regression (tab-highlight-on-new-message completely stopped working — see
`apps/tenants/tests/unit-test/features/case-management/components/cases-header-tabs.test.tsx`)
that had shipped with zero test coverage catching it.

## The three outcomes this method is designed to distinguish

1. **Code changes, user-facing behavior stays the same.** The expected, healthy outcome of a
   good refactor. Only the test's _setup_ (mocks, how the component is rendered/wired) needs
   updating when re-pointed at the refactored code — the _assertions_ don't change, because
   they were written against behavior, not internals.
2. **Code changes, user-facing behavior changes.** Either a regression (bug to fix) or an
   intentional decision (test gets updated deliberately, with a note explaining why). Either
   way, a failing characterization test after a refactor is a real signal requiring a human
   decision — never silently "fix the test to match" without figuring out which case it is.
3. **No code change in the file under test, but user-facing behavior still changes.** This is
   possible and is a real limitation of this method: a mocked-away dependency (a shared UI
   component, a permission-guard's semantics, a library version) changing underneath an
   untouched file, a feature flag flipping, or a backend response shape changing. These tests
   mock those dependencies away specifically to isolate the file's own logic — which means
   they **cannot** catch drift originating from those dependencies. Don't oversell
   characterization tests as a complete safety net; they cover "does this file's own logic
   still do the right thing", not "has anything anywhere changed".

## The one non-negotiable principle: assert on behavior, not internals

Write assertions against what a user would actually see or what a caller would actually
observe — rendered text, a `disabled`/`data-*` attribute, a toast call, a `sessionStorage`
write, a dialog-open callback's arguments. **Never** assert against an internal hook's return
value, a specific internal variable name, or private (non-exported) module-scope state.

Why this matters concretely: the very first characterization test written this session
asserted on a Zustand store's internal `highlightedTabs` state. That store didn't exist yet on
the pre-refactor branch in the same shape it would after the refactor — the assertion had to
be reframed around an _externally observable_ contract (a dispatched window event) instead.
Every test since then was written test-first against DOM output or captured callback
arguments, and every one of those survived architecture changes without needing assertion
rewrites — only setup/mocking needed touching.

When the logic under test lives in a **private, non-exported function** (e.g.
`resolveCaseSourceSelection` in `case-details-right-bar-feeds.tsx`), you cannot test it
directly — characterize it indirectly through the props/DOM it produces (mock the child
component that receives those props, and assert on what it receives).

## Required reading before authoring the test file itself

This file covers the characterization-specific mindset and pitfalls. For the mechanical
authoring rules (the `scenario()` wrapper, ID scheme, tags, `TEST_WRITE=1` catalog
regeneration), read **`.github/instructions/testing.instructions.md`** — every scenario in a
characterization suite still follows those rules exactly like any other test.

## Pitfalls that will break your test file — read before writing mocks

These are drawn directly from real failures hit while building this suite. Skipping any of
these is not a style preference; it caused actual crashes and hangs.

### 1. Unstable mock function identities → infinite render loop → OOM crash

**This crashed the test runner (heap exhausted, ~4GB) twice in this session.** If a hook you
mock returns a function that the real component uses as a `useEffect` dependency, and your
mock factory creates that function fresh on every call (e.g. `vi.fn()` written inline inside
the returned object literal), the function's identity changes every render. If the effect's
cleanup calls `setState` (a very common pattern — "reset on unmount/dependency change"), you
get: render → new effect deps → effect refires → cleanup calls setState → re-render → new
effect deps → ... forever.

```ts
// ❌ WRONG — subscribe/unsubscribe get a new identity every time useWebSocketDefault() is called
vi.mock("@hooks/use-websocket/providers/websocket-provider", () => ({
  useWebSocketDefault: () => ({ instance: { subscribe: vi.fn(() => "sub-1"), unsubscribe: vi.fn() } }),
}));

// ✅ RIGHT — stable, module-level references reused across every render
const mockSubscribe = vi.fn(() => "sub-1");
const mockUnsubscribe = vi.fn();
vi.mock("@hooks/use-websocket/providers/websocket-provider", () => ({
  useWebSocketDefault: () => ({ instance: { subscribe: mockSubscribe, unsubscribe: mockUnsubscribe } }),
}));
```

**Rule: every function a mock factory returns must be a `vi.fn()` defined once, outside the
factory body, at module scope.** This applies even to mocks that don't _look_ like effect
dependencies — you often can't tell from the mock call site alone which of the real
component's hooks feed a `useEffect`/`useMemo` dependency array, so apply this rule
universally rather than case-by-case.

### 2. `vi.mock` factories referencing outer variables can silently break — use `vi.hoisted()`

Vitest hoists `vi.mock()` calls above the rest of the file. Referencing a `const mockX = ...`
declared elsewhere in the same file generally works (Vitest special-cases `mock`-prefixed
identifiers), but this broke once in this session when combined with `vi.stubGlobal()` in the
same file (`ReferenceError: Cannot access 'mockToastError' before initialization`). When you
hit this, don't chase the exact hoisting rule — switch to the explicit, version-proof form:

```ts
const { mockNavigate, mockHandleCloseTab, mockState } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockHandleCloseTab: vi.fn(),
  mockState: { searchParams: new URLSearchParams(), isOnCall: false },
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockState.searchParams, vi.fn()],
}));
```

Group mutable per-test state into a single `mockState` object (rather than several loose
`let` bindings) — it's easier to reset wholesale in a shared `resetSharedMockState()`/
`beforeEach()` helper as the mock surface grows.

### 3. State-updating clicks need `act()` / `fireEvent`, not native `.click()`

`someElement.click()` dispatches a real DOM event but does not wrap the resulting React state
update in `act()`, so assertions immediately after it can read stale output (an "update not
wrapped in act(...)" console warning is your signal). Use
`fireEvent.click(el)` from `@testing-library/react` for simple synchronous updates, or wrap
imperative calls (e.g. invoking a ref method directly) in `act(() => { ... })`:

```ts
fireEvent.click(screen.getByText("switch-internal"));

act(() => {
  ref.current?.addHighlight("CASE-1");
});
```

### 4. Real type guards check `instanceof`, not shape — build real instances in fixtures

`isHttpError` (from `@hyperscal/api`) is `(error: unknown): error is HttpError => error
instanceof HttpError`. A fixture like `{ status: 404 } as HttpError` passes TypeScript but
fails this check at runtime, silently taking the wrong branch in the component under test.
Construct the real class:

```ts
import { HttpError } from "@hyperscal/api";
error: new HttpError("Not found", 404);
```

This class of bug (a runtime type guard that a type-cast fixture defeats) is worth
double-checking any time a component branches on `isXxxError`/`instanceof` — grep the guard's
implementation before writing the fixture.

### 5. jsdom has no real layout — stub `ResizeObserver`; override `scrollHeight` at the prototype level, before mount

`ResizeObserver` doesn't exist in jsdom by default; if a component constructs one in a
callback ref, mounting will throw unless you stub it:

```ts
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
```

`scrollHeight` is a real problem, not just a missing stub: it's always `0` in jsdom (no layout
engine), and a component that reads it inside a mount-time effect (e.g. "scroll to bottom on
first message load") will have already run with `0` by the time you get a ref to the element
post-`render()` — overriding it on the specific element afterward is too late. Override it once
at the **prototype** level, before rendering, so it's already live when the effect runs:

```ts
let mockScrollHeight = 0;
Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
  configurable: true,
  get() {
    return mockScrollHeight;
  },
});
// in each test: mockScrollHeight = 1000; render(...); expect(el.scrollTop).toBe(1000);
```

Given this, prefer **not** testing pixel-threshold hysteresis logic (e.g. "compact mode
switches at exactly 1488px vs 1568px") via real `ResizeObserver` callbacks — simulating real
container-resize events in jsdom is fragile and low-value. Test everything reachable through
the initial/prop-driven state instead, and explicitly note the hysteresis pixels as a deferred
gap (see "What to defer" below) rather than faking a resize.

### 6. Debounced logic needs fake timers, always paired with cleanup

```ts
vi.useFakeTimers();
fireEvent.click(screen.getByText("select-template-1"));
act(() => {
  vi.advanceTimersByTime(500);
});
expect(screen.getByTestId("email-messenger")).toHaveAttribute("data-template-data-uuid", "template-1");
vi.useRealTimers(); // always restore before the next scenario, or later tests inherit fake timers
```

### 7. Don't render deeply-nested lazy content you don't need — check truthiness instead

If a component builds a list of tab items where each item's `content` is
`activeTab === value && <Suspense><SomeHeavyLazyComponent /></Suspense>`, and you only care
"does this tab exist / is it highlighted", **don't** render `item.content` as a real child —
just check its truthiness (`Boolean(item.content)`) in your mock. Setting `activeTab` to a
value that matches no real tab (e.g. `"none"`) makes every item's content evaluate to `false`,
so nothing behind it ever mounts — avoiding the need to mock a dozen lazy-loaded modules with
their own dependency trees. Only render `item.content` for real in the one scenario that
specifically needs to (e.g. characterizing a permission-denied fallback), and pick an active
tab whose content path is guaranteed not to reach a real heavy component (e.g. one gated by a
`PermissionGuard` you've mocked to always deny, so the real lazy component behind it is never
reached).

## Deciding what to cover: full vs. scoped vs. deferred

Not every file deserves the same depth. Signals used in this session:

- **Pure business rules with real branching** (permission/visibility rules, timer-visibility
  logic, template-resolution fallbacks, message-reconciliation matching) — high value, worth
  covering thoroughly regardless of mocking cost.
- **UI orchestration / wiring** (a component that mostly composes children and fetches data
  with little branching of its own) — lower value per unit of mocking effort; scope down or
  skip.
- **Real DOM-measurement-driven behavior** (resize hysteresis, real scroll positions without a
  prototype override) — defer explicitly, and say so in a comment, rather than silently
  omitting it. "No silent caps": if you bound coverage, say what was dropped and why.
- If a file turns out much heavier than expected once you actually read it (more service
  hooks, deeper trees), **stop and ask before diving in** — don't silently either overinvest or
  underinvest relative to what was actually agreed.

When you do find a genuine bug or a piece of dead code while characterizing (this happened
twice this session — see below), don't fix it and don't hide it. Write a scenario that
documents today's real, if buggy, behavior, and say clearly in the scenario's `expect` field
what the bug is and what the fix would look like:

```ts
scenario(
  {
    id: "TEN_FDM_UT_022",
    title:
      "KNOWN QUIRK: a zero-UUID last-used-template response (the API's empty-state placeholder) " +
      "still preloads as if it were a real template — the _isValidLastUsedTemplate zero-value " +
      "guard defined in this file is never actually called",
    expect:
      "Today's real behavior: the placeholder UUID is treated as a valid selection. If a refactor " +
      "makes _isValidLastUsedTemplate actually run, this scenario will need to flip to asserting an " +
      "EMPTY selection — that flip is the signal to check with the team whether it was an " +
      "intentional fix or an accidental behavior change.",
    type: "edge-case",
    category: "Feeds Messages",
    method: "unit",
  },
  /* ... */
);
```

## The "known-gap" pattern: locking desired-but-not-yet-implemented behavior

Separate from characterizing existing behavior, sometimes you want a scenario to assert the
**correct** behavior even though today's code doesn't do it yet — as a blocking reminder until
someone fixes it. Tag it `known-gap`, put the root cause and fix recipe in `expect`, and let it
fail on purpose:

```ts
scenario(
  {
    id: "TEN_CTAB_UT_005",
    title:
      "changeTab clears the highlight of the tab it activates, on its own, without needing a mounted CaseTabEffects",
    expect:
      "KNOWN GAP: currently FAILS. changeTab only dispatches a window event and relies on " +
      "CaseTabEffects being mounted to translate that into a clearHighlight() call — the store is " +
      "not self-contained. Fix: have changeTab call get().clearHighlight(...) directly.",
    type: "negative",
    tags: ["known-gap"],
    /* ...category/method... */
  },
  ({ expect }) => {
    /* assert the CORRECT behavior — this is expected to fail until fixed */
  },
);
```

This is a deliberate choice to **block CI** as pressure to fix the gap — confirm with whoever
asked for the test whether that's actually wanted. If the intent is "surface it, but never
block CI", use the repo's existing `quarantine` tag instead (see
`.github/instructions/testing.instructions.md`) — it runs and reports but never fails the
build. Default to normal (blocking) assertions for behavior you're confident is a true fact
today; reserve `quarantine` for scenarios you expect might legitimately drift on purpose during
the refactor you're protecting against.

## Where these tests live, as a working example

All of the following exist purely to characterize `apps/tenants/app/features/case-management`
code as it stood on `release/HYP_V.1.4.0`, ahead of the centralized-case-actions refactor
(`feature/centralized-case-actions-flags`, PR #3559) — read any of them as a template:

- `apps/tenants/tests/unit-test/features/case-management/components/case-action-kebab-menu.test.tsx`
  — permission/visibility rule matrix for case action buttons.
- `apps/tenants/tests/unit-test/features/case-management/components/workflow-dropdown.test.tsx`
  — enable/disable rules + click→dialog routing.
- `apps/tenants/tests/unit-test/features/case-management/components/cases-header-tabs.test.tsx`
  — the exact imperative-handle contract whose wiring later silently broke.
- `apps/tenants/tests/unit-test/features/case-management/cases-page-tab-management.test.tsx` and
  `case-list-subscriptions.test.tsx` — URL/window-event sync and two independent WebSocket
  subscriptions on the same page.
- `apps/tenants/tests/unit-test/features/case-management/components/case-details-tab-content.test.tsx`
  — scoped-down example (hysteresis pixels deliberately excluded, noted in the file header).
- `apps/tenants/tests/unit-test/features/case-management/components/case-details-vertical-tab-menu.test.tsx`
  — the `activeTab="none"` trick for avoiding lazy-loaded content.
- `apps/tenants/tests/unit-test/features/case-management/components/case-details-right-bar-feeds.test.tsx`
  and `feeds-messages.test.tsx` — full-coverage example on genuinely large, heavily-dependent
  components (the OOM crash pitfall above happened while building the second of these).

## Checklist before you consider a characterization suite done

- [ ] Every assertion targets rendered output, a captured callback argument, or a mock call —
      never an internal hook's return value or a private module-scope function.
- [ ] Every mock-returned function used anywhere near a `useEffect`/`useMemo` dependency is a
      stable, module-level `vi.fn()` — not created inline inside a factory.
- [ ] `resetSharedMockState()` (or equivalent) resets every mutable mock variable, including
      timers (`vi.useRealTimers()`) and scroll-height overrides, between scenarios.
- [ ] Ran the file standalone and watched it actually finish (not just "no error yet") — this
      session's OOM crashes did not show a normal test failure, they hung and then crashed the
      whole process. If a run takes far longer than its sibling files, stop and investigate
      before assuming it will finish.
- [ ] Any deliberately-out-of-scope behavior (deep pixel hysteresis, full submit-flow paths,
      etc.) is named in a comment, not silently dropped.
- [ ] Any discovered bug/dead-code quirk is captured as a "KNOWN QUIRK" scenario documenting
      today's real (possibly buggy) behavior — not silently fixed, not silently ignored.
- [ ] `TEST_WRITE=1 pnpm vitest run <file>` was run and the regenerated
      `testing-docs/components/<pkg>/<component>.md` catalog is committed alongside the test.

---

**Related documentation**:

- [`.github/instructions/testing.instructions.md`](../../../.github/instructions/testing.instructions.md)
  — `scenario()` authoring rules, ID scheme, tags (read this too, every time).
- [Patterns index](./README.md)
- [CLAUDE.md](../../../CLAUDE.md) — main AI assistant instructions
