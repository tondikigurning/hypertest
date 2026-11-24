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
- **Real, current usage confirms this is load-bearing**: `e2e`,
  `apps/admin`, `apps/crm/order-management`, and `apps/docs` (Storybook) all
  import `backoffice.css` directly.

## In scope

- **`backoffice.css`** — the one active stylesheet: theme tokens, `@source`
  scan list, and shared component CSS (`src/control.css`, `src/table.css`,
  `src/scrollbar-width.css`, `src/filter.css`).

## Removed legacy files

The unused Tailwind v3 stylesheet, disconnected safelist, PostCSS config and
unreachable JS entry point were removed. The active stylesheet is `backoffice.css`.

## Non-goals (what this package is explicitly not)

- **Not a reusable/publishable Tailwind preset** — it's one concrete
  stylesheet for this repo's apps, not a config designed for external reuse.
- **Not PostCSS-integrated in practice**: the local preview uses the Vite plugin.
- **Not a JS/TS module today** — `package.json` has no `main`/`exports`;
  consumers reach files by direct deep-import path (`@hyperscal/tailwind-config/backoffice.css`),
  which works only because there's no `exports` map restricting it (see
  [[tailwind-config-internals]]).

## Locked design decisions

| Decision                                                                                                          | Why                                                                                                                                                                                                                                             | Source / date                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backoffice.css` is the one active entry point; consumers import it by direct path, not via a bare package import | Confirmed by all four real consumers' import style.                                                                                                                                                                                             | `confirmed` — `e2e/app/root.tsx`, `apps/admin/app/root.tsx`, `apps/crm/order-management/src/main.tsx`, `apps/docs/.storybook/storybook.css` |
| No `package.json` `exports` map                                                                                   | Lets any file in the package (`backoffice.css` and its CSS partials) be deep-imported directly — a looser, unenforced contract compared to every sibling package's strict `exports` map.                                            | `inferred`                                                                                                                                           |
| Tailwind v4 CSS-first config (`@import "tailwindcss"`, `@theme`, `@source`), not a JS `tailwind.config.js`        | Matches Tailwind v4's own recommended approach; the former v3-style stylesheet has been removed.                                                                                                        | `inferred`                                                                                                                                           |
| Purple-tinted-slate is the active neutral palette                                                                 | `backoffice.css`'s `@theme` block has three neutral-palette options (gray / slate / purple-tinted slate) written inline as comment-toggled blocks; the purple-tinted slate block is the uncommented (active) one, per its own `[ACTIVE]` label. | `confirmed` — `backoffice.css` inline comments                                                                                                       |

## Links

- **API:** [[tailwind-config-api]]
- **Internals:** [[tailwind-config-internals]]
- **Guide:** [[tailwind-config-guide]]
- **Source:** `packages/tailwind-config/backoffice.css`
