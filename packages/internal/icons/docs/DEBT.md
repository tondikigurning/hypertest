---
title: "@hyperscal/icons — Debt & Roadmap"
status: draft # draft | approved | superseded
package: packages/internal/icons
owner: Ryan
updated: 2026-07-03
related:
  - "[[icons-intent]]"
  - "[[icons-internals]]"
---

# @hyperscal/icons — Debt & Roadmap

> Created by the 2026-07-03 bug hunt (fan-out reviewers + adversarial
> verification against code and library source). Formalizes the items
> previously listed loose in [[icons-internals]]'s "Known technical debt"
> and adds the generator-pipeline findings. 4 candidate findings were
> refuted and dropped (Tailwind does generate `text-[1.6em]` for apps;
> turbo wires `gen` before `build` so fresh clones build; `customIcons`
> is not a tsc error; no CVE exposure in pinned deps per
> `.github/known-cves.md`).

**Status:** draft · **Package:** `packages/internal/icons` · **Updated:** 2026-07-03

---

## Generator pipeline

| ID      | Sev    | File                         | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------- | ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SMELL-2 | Low    | `scripts/generator.ts:89-98` | The only mechanism to refresh the `icon.mjs` catalogue after a `@iconify-json/tabler` bump is a commented-out code block, and README documents no refresh workflow. After a Tabler bump, new icons are invisible to devs browsing `icon.mjs` and renamed/removed icons linger as valid-looking commented entries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Icon component

| ID     | Sev | File              | Problem                                                                                                                                                                                                                                                                                                       |
| ------ | --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-1  | Low | `src/icon.tsx:19` | `enlarged` is not destructured out, so it drives the `text-[1.6em]` class **and** leaks onto the DOM element as a non-standard attribute (`<i enlarged="" …>`) — React unknown-prop warning in dev, invalid HTML in prod. 5+ live usages (tenants case-management, dataview). Fix: add it to the destructure. |
| TYPE-1 | Low | `src/icon.tsx:19` | `customIcons` is destructured and silently discarded — not declared in `IconProps`, never read (generic `Omit` keeps tsc from flagging it). A caller passing `customIcons` gets a silent no-op. Remove it (or implement the registry it was a vestige of).                                                    |
| ERR-2  | Low | `src/icon.tsx:26` | No runtime guard for an icon name with no CSS rule (reachable via `as`-cast or untyped data) — renders an invisible empty element, no warning, no fallback glyph. Compile-time `IconName` union is the only protection.                                                                                       |

## Package contract

| ID     | Sev | File              | Problem                                                                                                                                                                                                                                              |
| ------ | --- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TYPE-2 | Low | `package.json:31` | React peer range `>=15.6.1` is a false contract: `ComponentPropsWithoutRef` requires `@types/react` ≥16.3 and the build targets the automatic JSX runtime (React ≥17). Harmless inside this single-version workspace; tighten to `>=17` (or `>=19`). |

## Suggested order

1. Address SMELL-2 by documenting or removing the catalogue-refresh block.
2. **Mechanical component fixes, one small PR**: BUG-1 (destructure
   `enlarged`), TYPE-1 (drop `customIcons`), TYPE-2 (peer range
   `>=17`).
3. **ERR-2 needs an owner ruling** — a dev-only `console.warn`-style
   guard conflicts with Biome's `noConsole`; options are a dev-mode
   check behind `process.env.NODE_ENV`, or accepting compile-time-only
   safety and closing this as won't-fix.

## Links

- **Intent:** [[icons-intent]] · **API:** [[icons-api]]
- **Internals:** [[icons-internals]] · **Guide:** [[icons-guide]]
