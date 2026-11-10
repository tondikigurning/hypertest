---
title: "@hyperscal/icons — Intent"
status: draft # draft | approved | superseded
package: packages/internal/icons
owner: Ryan
updated: 2026-07-02
related:
  - "[[icons-api]]"
  - "[[icons-internals]]"
  - "[[icons-guide]]"
---

# @hyperscal/icons — Intent

> Why this package exists, what was decided, and what is still unknown.
> Audience: developers who consume this package or contribute to it.

**Status:** draft · **Package:** `packages/internal/icons` · **Updated:** 2026-07-02

---

## North-star intent

`@hyperscal/icons` is the repo's **sanctioned icon system** — a curated
subset of the Tabler icon set (via Iconify), delivered as generated CSS
classes (`.i-{name}`) plus a typed `<Icon name="..." />` React component. It
is the one way new code should render an icon; it is not a general-purpose
SVG/asset package.

## The developer problem it solves

Before this package (and still, in the `legacy-icons` residue inside
`@hyperscal/ui`), icons were pulled in ad hoc — mostly individual
`lucide-react` component imports scattered across apps and components. That
means every icon bundles its own SVG markup as JS, there's no single
curated set (any of Tabler's, Lucide's, or another library's icons could
show up in the same screen), and there's no shared build step to keep icon
usage lean. `@hyperscal/icons` centralizes this: pick from one curated,
generated set; ship as CSS (cheaper than per-icon JS/SVG); one place to add
a new icon.

## Why a package (the forcing function)

- **523 importing files repo-wide** — the icon component itself is used
  almost everywhere; a single generated CSS file is far cheaper to ship
  than 523 files' worth of individually-bundled SVG components.
- **Explicit migration target.** `@hyperscal/ui`'s `legacy-icons` atom
  (deprecated, zero consumers) carries the comment _"this file will be
  deprecated in favor of the new icon system"_ — this package is that
  system. **Confirmed (owner, 2026-07-02): `@hyperscal/icons` is the
  sanctioned replacement for ad-hoc `lucide-react` usage** — new code
  should use `Icon` from this package, not import `lucide-react` icons
  directly. Remaining direct `lucide-react` usage elsewhere in the
  workspace is a migration target, not an accepted parallel pattern.
- **Curated, not exhaustive.** Only icons explicitly opted into (uncommented
  in `icon.mjs`) are generated — keeps the CSS output bounded rather than
  shipping all of Tabler's ~5,900 icons.

## In scope

- **`Icon`** — the React component (`<Icon name="user" />`), typed against
  the generated `IconName` union so only opted-in icons are usable.
- **The codegen pipeline** — `icon.mjs` (the opt-in allowlist,
  hand-maintained by uncommenting entries) → `scripts/generator.ts` (reads
  `@iconify-json/tabler`'s data, emits `src/gen/icon.css` +
  `src/gen/types.ts`) → consumed at build/dev time.
- **`icon.css`** — the generated stylesheet exposing `.i-{name}` classes;
  consuming apps import it once, globally.

## Non-goals (what this package is explicitly not)

- **Not a general SVG/asset package** — no illustrations, logos, or
  non-icon graphics.
- **Not every icon in Tabler** — deliberately curated via `icon.mjs`; if an
  icon isn't there, it isn't available, by design (keeps output bounded).
- **Not the only icon-_rendering_ mechanism forever** — `lucide-react` may
  still appear for icons genuinely outside the curated set, but new
  systematic usage should extend `icon.mjs` rather than reach for a
  different library (see Locked design decisions).

## Locked design decisions

| Decision                                                                          | Why                                                                                                                                                                                                                                                          | Source / date                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| CSS-class icons (Iconify → generated `.i-{name}` CSS), not per-icon JS components | Cheaper to ship at 523-consumer scale than individually bundled SVG/JS icon components.                                                                                                                                                                      | `inferred`                                                               |
| Sanctioned replacement for ad-hoc `lucide-react` usage                            | See "Why a package" — confirmed by the `legacy-icons` deprecation comment plus owner confirmation.                                                                                                                                                           | Owner, 2026-07-02                                                        |
| Curated opt-in set via `icon.mjs`, not the full Tabler catalogue                  | Bounds the generated CSS size; the workflow (uncomment → run `gen`) is documented in the package's own `README.md`.                                                                                                                                          | `confirmed` — `README.md`                                                |
| `icon.css` must resolve to the **built** `dist/icon.css`, not source, in dev      | `src/gen/` is git-ignored — `apps/tenants`/`apps/admin` both alias `@hyperscal/icons/icon.css` to `dist/icon.css` explicitly in `vite.config.ts`, with a comment explaining the JS/CSS resolution split.                                                     | `confirmed` — `apps/tenants/vite.config.ts`, `apps/admin/vite.config.ts` |
| SVG sprite generation exists in the generator but is unused                       | `generateSprite()` is fully implemented and called, but its result (`_sprite`) is never written to disk — the `writer(...)` call for it is commented out. CSS-class delivery won out; sprite output is dead code, not a second supported delivery mechanism. | `confirmed` — `scripts/generator.ts`                                     |

## Open questions

- Is the unused `generateSprite()` function worth deleting, or kept as a
  documented fallback in case CSS-class delivery ever needs to change?
  Not yet decided — flagged here rather than silently removed.
- Should `@hyperscal/icons` eventually vendor the full Tabler set (or add a
  fallback path) so consumers don't need a PR + `gen` run just to add one
  icon? Not raised as a problem yet at current usage volume.

---

## Links

- **API:** [[icons-api]]
- **Internals:** [[icons-internals]]
- **Guide:** [[icons-guide]]
- **Source:** `packages/internal/icons/src/index.ts`
