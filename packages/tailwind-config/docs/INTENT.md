---
title: "@hyperscal/tailwind-config — Intent"
status: draft # draft | approved | superseded
package: packages/tailwind-config
owner: Ryan
updated: 2026-07-02
related:
  - "[[tailwind-config-api]]"
  - "[[tailwind-config-internals]]"
  - "[[tailwind-config-guide]]"
---

# @hyperscal/tailwind-config — Intent

> Why this package exists, what was decided, and what is still unknown.
> Audience: developers who consume this package or contribute to it.

**Status:** draft · **Package:** `packages/tailwind-config` · **Updated:** 2026-07-02

---

## North-star intent

`@hyperscal/tailwind-config` is the repo's **shared Tailwind CSS v4 entry
point** — one `backoffice.css` file that every consuming app imports once,
globally. It owns the design-token theme (`@theme` — colors, spacing,
typography), the `@source` scan list (which workspace packages' classes
Tailwind needs to see), and shared component-level CSS (Quill editor
theming, custom animations, control-size utilities).

**In practice, "the package" is one file: `backoffice.css`.** Despite its
name, this is not a reusable/composable Tailwind _config_ in the
conventional sense (no `tailwind.config.js`-style export, no
`postcss.config.js` actually wired into any consumer) — it's a single
concrete stylesheet, imported by reference, shared by every app.

## The developer problem it solves

Every app needs the same design tokens (brand colors, spacing scale,
typography), the same Tailwind v4 `@source` scanning across every package
that ships Tailwind classes (`@hyperscal/ui`, `@hyperscal/icons`,
`@hyperscal/form`, `dataview`, `filters`, apps themselves), and the same
shared component CSS (e.g. Quill toolbar styling used by any app rendering
`RichText`). Without a shared entry point, each app would define its own
theme (drifting colors/spacing across tenants vs. admin vs. crm) and would
need to independently remember every `@source` path — easy to silently miss
one and get unstyled components (see `@hyperscal/ui`'s own GUIDE.md gotcha
about this).

## Why a package (the forcing function)

- **One design system, one source of truth for tokens.** All apps (and
  Storybook) render the exact same `--color-primary-*`/`--color-neutral-*`/etc.
  custom properties.
- **One `@source` list to maintain**, not one per app — every workspace
  package that ships Tailwind-class-bearing source needs exactly one
  `@source` entry, here, rather than duplicated across every consumer's own
  Tailwind setup.
- **Real, current usage confirms this is load-bearing**: `apps/tenants`,
  `apps/admin`, `apps/crm/order-management`, and `apps/docs` (Storybook) all
  import `backoffice.css` directly.

## In scope

- **`backoffice.css`** — the one active stylesheet: theme tokens, `@source`
  scan list, and shared component CSS (`src/control.css`, `src/table.css`,
  `src/scrollbar-width.css`, `src/filter.css`).

## Out of scope — currently resident, dead weight

Found while documenting this package (2026-07-02) — three files with
**zero repo-wide consumers**, confirmed by grep across `apps/` and
`packages/`:

| Currently here                                             | What it is                                                                                                                                                                                                              | Evidence it's dead                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `global.css`                                               | A **Tailwind v3-syntax** stylesheet (`@tailwind base/components/utilities;`, HSL-triplet CSS custom properties used via `hsl(var(--x))`) — the project's _original_ stylesheet (git history: created at `project init`) | Zero importers anywhere in `apps/` or `packages/`. Superseded by `backoffice.css` (Tailwind v4 `@theme`/`@import "tailwindcss"` syntax) when the project migrated, but never deleted.                                                                                |
| `index.ts` (`import "./backoffice.css"`)                   | The only file that would make `@hyperscal/tailwind-config` importable as a bare JS module                                                                                                                               | Zero importers — every real consumer imports `@hyperscal/tailwind-config/backoffice.css` directly, not the bare package specifier. Also, `package.json` has no `main`/`exports` field pointing to it, so it isn't even reachable via standard Node resolution today. |
| `postcss.config.js`                                        | A PostCSS config wrapping `@tailwindcss/postcss`                                                                                                                                                                        | Zero consumers — all four real consuming apps use the `@tailwindcss/vite` Vite plugin, not PostCSS, for their Tailwind v4 build.                                                                                                                                     |
| `safelist.text` (10 lines: `grid-cols-1`...`line-clamp-6`) | A Tailwind safelist file                                                                                                                                                                                                | Referenced only by a **commented-out** `@source "safelist.text";` line in `backoffice.css`. Its content overlaps with the active `@source inline("line-clamp-{2..6}")` directive — looks superseded, not deleted.                                                    |

This isn't recorded as a full `DEBT.md` — the list is short enough to keep
here, but it's real: roughly 3 of this package's ~7 top-level files are
unused today.

## Non-goals (what this package is explicitly not)

- **Not a reusable/publishable Tailwind preset** — it's one concrete
  stylesheet for this repo's apps, not a config designed for external reuse.
- **Not PostCSS-integrated in practice** — despite shipping a
  `postcss.config.js`, no current consumer routes through PostCSS for
  Tailwind; all four use the Vite plugin.
- **Not a JS/TS module today** — `package.json` has no `main`/`exports`;
  consumers reach files by direct deep-import path (`@hyperscal/tailwind-config/backoffice.css`),
  which works only because there's no `exports` map restricting it (see
  [[tailwind-config-internals]]).

## Locked design decisions

| Decision                                                                                                          | Why                                                                                                                                                                                                                                             | Source / date                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backoffice.css` is the one active entry point; consumers import it by direct path, not via a bare package import | Confirmed by all four real consumers' import style.                                                                                                                                                                                             | `confirmed` — `apps/tenants/app/root.tsx`, `apps/admin/app/root.tsx`, `apps/crm/order-management/src/main.tsx`, `apps/docs/.storybook/storybook.css` |
| No `package.json` `exports` map                                                                                   | Lets any file in the package (`backoffice.css`, `postcss.config.js`, `index.ts`) be deep-imported directly — a looser, unenforced contract compared to every sibling package's strict `exports` map.                                            | `inferred`                                                                                                                                           |
| Tailwind v4 CSS-first config (`@import "tailwindcss"`, `@theme`, `@source`), not a JS `tailwind.config.js`        | Matches Tailwind v4's own recommended approach; `global.css`'s v3-style `@tailwind` directives are the pre-migration approach, now dead.                                                                                                        | `inferred`                                                                                                                                           |
| Purple-tinted-slate is the active neutral palette                                                                 | `backoffice.css`'s `@theme` block has three neutral-palette options (gray / slate / purple-tinted slate) written inline as comment-toggled blocks; the purple-tinted slate block is the uncommented (active) one, per its own `[ACTIVE]` label. | `confirmed` — `backoffice.css` inline comments                                                                                                       |

## Open questions

- Should `global.css`, `index.ts`, and `postcss.config.js` be deleted, or is
  there a reason to keep them (e.g. a planned PostCSS-based build target,
  or `global.css` retained for a reason not visible in this pass)? Not yet
  decided — flagged rather than silently removed.
- Is `safelist.text` fully superseded by the `@source inline(...)`
  directives, or does it cover cases those don't? Needs a check against
  actual dynamically-constructed class names (safelist files typically
  exist for classes Tailwind's static scanner can't see, e.g. built via
  string concatenation) before deleting.

---

## Links

- **API:** [[tailwind-config-api]]
- **Internals:** [[tailwind-config-internals]]
- **Guide:** [[tailwind-config-guide]]
- **Source:** `packages/tailwind-config/backoffice.css`
