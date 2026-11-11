---
title: "@hyperscal/tailwind-config — API Reference"
status: draft # draft | approved | superseded
package: packages/tailwind-config
owner: Ryan
updated: 2026-07-02
related:
  - "[[tailwind-config-intent]]"
---

# @hyperscal/tailwind-config — API Reference

> The public contract between this package and its consumers.
> This package has no JS/TS exports — its "API" is the CSS contract:
> design tokens, custom utility/component classes, and the `@source` list.
> ⚠️ **`global.css`, `index.ts`, and `postcss.config.js` are dead — zero
> consumers repo-wide.** Don't build on them; see [[tailwind-config-intent]].

**Status:** draft · **Package:** `packages/tailwind-config` · **Updated:** 2026-07-02

## Entry point

```css
/* app root / entry file, once, globally */
@import "@hyperscal/tailwind-config/backoffice.css";
```

or, in a `.tsx`/`.ts` entry file:

```ts
import "@hyperscal/tailwind-config/backoffice.css";
```

`backoffice.css` itself:

1. `@import "tailwindcss"` — pulls in Tailwind v4 core.
2. Imports `src/control.css`, `src/scrollbar-width.css`, `src/table.css`,
   `src/filter.css` — shared component/utility CSS (see below).
3. Declares the `@source` list — every workspace path Tailwind needs to
   scan for class usage (see "The `@source` contract").
4. Declares the `@theme` block — every design token (see "Design tokens").
5. A `@layer base` block — global element defaults (`body`, `html`,
   responsive font-size breakpoints) and CSS custom properties for spacing
   ratios, sidebar dimensions, and layout heights.
6. A `@layer components` block — animation keyframes and Quill
   editor/toolbar theming (see "Shared component CSS").

---

## Design tokens (`@theme`)

Every token below is a CSS custom property, consumable either via Tailwind
utility classes (`bg-primary-500`, `text-neutral-700`) or directly
(`var(--color-primary-500)`).

| Token group                                                                                                                                                 | Scale                        | Notes                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--color-primary-*`                                                                                                                                         | `20`–`1000` + bare `primary` | Brand purple.                                                                                                                                                                                                      |
| `--color-secondary-*`                                                                                                                                       | `20`–`1000` + bare           | Blue.                                                                                                                                                                                                              |
| `--color-success-*`                                                                                                                                         | `20`–`1000` + bare           | Teal/green.                                                                                                                                                                                                        |
| `--color-neutral-*`                                                                                                                                         | `20`–`1000` + bare           | **Currently the "purple-tinted slate" variant** — two alternate palettes (true gray, plain slate) exist as commented-out blocks in the source; only one is ever active at a time (see [[tailwind-config-intent]]). |
| `--color-black-*`                                                                                                                                           | `20`–`1000` + bare           |                                                                                                                                                                                                                    |
| `--color-negative-*`, `--color-warning-*`, `--color-orange-*`                                                                                               | `20`–`1000` + bare           | Status/semantic colors.                                                                                                                                                                                            |
| `--color-background`, `--color-foreground`, `--color-accent`, `--color-accent-foreground`, `--color-white`, `--color-popover`, `--color-popover-foreground` | —                            | Semantic aliases built from the above.                                                                                                                                                                             |
| `--color-sidebar*` (8 tokens)                                                                                                                               | —                            | Sidebar-specific semantic aliases, resolved from `@layer base`'s `:root` custom properties (`--sidebar`, `--sidebar-foreground`, etc.).                                                                            |
| `--color-border`                                                                                                                                            | —                            | Alias for `--color-neutral-70`.                                                                                                                                                                                    |
| `--font-family`                                                                                                                                             | `"Rubik"`                    | Loaded via Google Fonts `@import` (currently commented out in `backoffice.css` — the font import itself may not be firing; see Gotchas in [[tailwind-config-guide]]).                                              |
| `--padding-ratio`                                                                                                                                           | `1.618` (golden ratio)       | Drives the `--spacing-{sm,md,lg}-ratio` custom properties in `@layer base`, which in turn drive the `control-*`/`button-*` sizing classes (see below).                                                             |

**Non-color tokens set in `@layer base` `:root`** (not part of `@theme`,
but load-bearing for the sizing system): `--control-{sm,md,lg}-spacing`,
`--button-{sm,md,lg}-spacing[-relaxed]`, `--control-{sm,md,lg}-line-height`,
`--text-{xs,sm,base,lg,xl}` (responsive — overridden at `max-width: 640px`
and `min-width: 1440px`), `--sidebar-width`, `--topbar-height`,
`--breadcrumb-height`, `--tabbar-height`, and three derived
`--content-*` heights (`with-tab`, `standard`, `bare`) for viewport-height
layout calculations.

---

## Shared component/utility CSS

### Sizing system (`src/control.css`)

A systematic naming pattern, not an enumerated list — for each size
(`sm`/`md`/`lg`) there is: `.control-{size}`, `.button-{size}`,
`.icon-{size}`, `.dropdown-image-{size}`, plus per-side padding/margin
variants (`.control-{size}-{x,y,l,r,t,b}-padding`, same for `-margin`).
Sizes derive from the golden-ratio spacing tokens above, not hardcoded
pixel values. Also: `.button-fill`, `.control-fill` (fill-mode variants).

### Other component/utility classes

| Class                                                                                                          | File                                                | Purpose                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.hide-scroll`                                                                                                 | `backoffice.css`                                    | Hides scrollbars via `scrollbar-width: none` (Firefox only — see `scrollbar-width.css` for the fuller cross-browser set below).                                                                      |
| `.scrollbar-none`/`.scrollbar-thin`/`.scrollbar-auto`                                                          | `src/scrollbar-width.css`                           | Cross-browser (Firefox `scrollbar-width` + WebKit `::-webkit-scrollbar`) scrollbar styling utilities.                                                                                                |
| `.filter-popover-min-w`                                                                                        | `src/filter.css`                                    | `min-width: 16rem` for filter popovers.                                                                                                                                                              |
| `tr.active-row` (+ `> td:first-child:before`, `> td.pinned`)                                                   | `src/table.css`                                     | Active-table-row highlighting with a left accent bar.                                                                                                                                                |
| `.merge-tag`                                                                                                   | `backoffice.css`                                    | Styled inline tag for merge-field tokens (used by `@hyperscal/ui`'s merge-tag/rich-text components).                                                                                                 |
| `.selected-h-{sm,md,lg,fill}` (in `backoffice.css`) and `.selected-h-{xs,sm,md,lg,xl}` (in `global.css`, dead) | both                                                | ⚠️ Two overlapping-but-not-identical sets of the same-named utility exist in the active and dead stylesheets — don't assume `global.css`'s variants are available; only `backoffice.css`'s are live. |
| `.codemirror-readonly`                                                                                         | both `backoffice.css` and `global.css` (duplicated) | Read-only CodeMirror styling — defined identically in both files; only the `backoffice.css` copy is live.                                                                                            |
| `.animate-member-row-in`/`.animate-member-row-out`                                                             | `backoffice.css`                                    | Row insert/remove transition (used by `@hyperscal/ui`'s membership components).                                                                                                                      |
| `.animate-wave`, `.animate-wave-2`, `.animate-wave-3`                                                          | `backoffice.css`                                    | Staggered wave animation (3 delay variants).                                                                                                                                                         |
| `.ql-toolbar button`/`.ql-toolbar select`/`.ql-active`                                                         | `backoffice.css`                                    | Quill rich-text editor toolbar theming — appears **twice, verbatim**, in the same file (see [[tailwind-config-internals]]).                                                                          |

---

## The `@source` contract

Tailwind v4 only generates utility classes for files it's told to scan.
Current list (relative to `packages/tailwind-config/`):

```
../../src/**/*.{ts,tsx}
../../e2e/**/*.{ts,tsx}
../internal/icons/src/icon.tsx
```

Plus explicit inline safelisting: `line-clamp-{2..6}`, `row-start-{1..100}`,
`min-w-{xs,sm,md,lg,xl}` (for dynamically-constructed class names Tailwind's
static scanner can't otherwise detect).

The `apps/` glob covers the surviving applications, while `src/` and `e2e/`
cover the root Automation and E2E workspaces. The package paths include
shared components whose classes are used by those applications. Add a source
path when a new app or package contains Tailwind classes not covered here.

---

## Versioning contract

No `package.json` `main`/`exports`/`types` — not a semver-versioned JS
package in the conventional sense. "Breaking" here means visually breaking
every consumer simultaneously (all four apps share one stylesheet).

**Breaking:**

- Removing/renaming a `--color-*`/other `@theme` token, or changing its
  value in a way that shifts brand colors — affects every app at once.
- Removing a `@source` line for a package that's still actively shipping
  Tailwind classes — silently unstyles every consumer of that package.
- Removing/renaming a class documented above without confirming zero
  consumers first (unlike a typed JS API, nothing here typechecks — a
  removed class silently stops applying, with no build error).

**Non-breaking:**

- Adding new tokens, new `@source` entries, or new utility/component
  classes.
- Deleting the confirmed-dead files (`global.css`, `index.ts`,
  `postcss.config.js`) — see
  [[tailwind-config-intent]]'s Open questions before doing so.

---

## Links

- **Intent:** [[tailwind-config-intent]]
- **Internals:** [[tailwind-config-internals]]
- **Guide:** [[tailwind-config-guide]]
- **Source:** `packages/tailwind-config/backoffice.css`
