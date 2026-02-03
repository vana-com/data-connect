---
name: ui-page-structure
description: Standardize DataBridge route/page layout, logic/JSX separation, tests, and README expectations. Use when organizing pages/routes, refactoring page structure, or discussing file structure conventions.
---

# UI Page Structure

## Purpose

Keep route-level code predictable: entry files, page-only components (and hooks), tests, and helpers live together. Enforce logic/JSX separation, require tests, and document with a README when the structure settles. Shared UI stays in `src/components`.

## Rules (short)

- **Route entry**: `src/pages/<route>/index.tsx` exports the page component.
- **Page-only UI + hooks**: `src/pages/<route>/components/*` (hooks live with related components; no standalone `hooks/` dir).
- **Types + utils**: colocate in the route folder (`types.ts`, `utils.ts`, etc.).
- **Logic vs JSX**: keep logic in hooks/logic files, JSX in components (details below).
- **Tests**: add enough to give confidence the page works; keep scope tight (no over-engineering).
- **Shared UI**: only in `src/components` (cross-page only).
- **Avoid “sections” folders**: page sections are just components.
- **README required**: when structure is settled, add page README per `ui-page-readme` (can be after-the-fact).
- **Composition + React patterns**: follow `vercel-composition-patterns` and `vercel-react-best-practices` when shaping component APIs and hook usage.

## Recommended layout

```
src/pages/settings/
  index.tsx
  README.md
  types.ts
  utils.ts
  components/
    settings-account.tsx
    settings-apps.tsx
    settings-storage.tsx
    settings-about.tsx
  index.test.tsx
```

```
src/pages/runs/
  index.tsx
  README.md
  components/
    run-item.tsx
    use-run-item.ts
  utils.ts
  index.test.tsx
```

## Logic vs JSX (practical split)

- **Components render; hooks compute.**
- **Components** should be mostly JSX + light glue (props, callbacks, formatting).
- **Components must not** fetch, mutate, or read storage/network directly.
- **Logic-only files** (`use-*.ts`, `*logic.ts`, `*utils.ts`) should not contain JSX or create `ReactNode`s.
- **Container/presenter split**: page entry/containers call hooks, pass data to presentational components.
- **Hooks live with components** when tightly coupled; keep pure logic separate to avoid merge conflicts.
- **Prefer composition** over boolean prop modes; make explicit variants when behavior diverges.
- **State in providers/hooks**; UI reads from hooks and renders.

## Hook placement heuristic

- **Route-level hooks**: routing, store, auth, network, or multi-component orchestration live at the
  route root (`src/pages/<route>/`).
- **Component-level hooks**: logic only used by a single component lives next to that component
  (use `components/<component>/` when a component grows).
- **Root hook cap**: keep 1-3 hooks at the route root; if you need more, split by component folder.

## Tests (minimum bar)

- `index.test.tsx` covering critical wiring and one or two key UI states.
- Hook/logic tests only where behavior is non-trivial or risk-prone.
- Avoid snapshots; assert behavior and side effects.

## Notes

- Hooks that are tightly coupled to a component should live next to it in `components/`.
- If a hook is truly route-level (not tied to a single component), place it in the route folder, not a `hooks/` directory.
- Keep imports direct (avoid barrel files).
- Prefer `@/` path alias over long relative imports.
