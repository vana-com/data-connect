---
title: React Audit + Storage Review (Vercel Patterns)
date: 2026-01-30
scope: DataBridge React frontend
---

# React Audit + Storage Review (Vercel Patterns)

This doc captures the research findings on React usage, data storage, and data calling/flow, with Vercel React best‑practice patterns applied. No code changes are proposed here; this is a pure audit and recommendations list.

## Scope

- Files reviewed in React frontend, hooks, storage helpers, and key flows.
- Focus: render purity, effect correctness, storage/migrations, async waterfalls, and data validation.
- Vercel rules referenced from `vercel-react-best-practices` skill (see rule IDs inline).

## Storage scenario: current behavior and risks

### Current behavior

- `localStorage` with versioned per‑app keys: `v1_connected_app_<id>`.
- Legacy unversioned keys are migrated on read.
- `getAllConnectedApps()` scans all keys and migrates legacy values while iterating.

### Risks

- O(n) full scan on each read; can block main thread for large storage.
- Mutation during iteration (`setItem`/`removeItem`) can cause missed keys or inconsistent iteration.
- No runtime validation of `ConnectedApp` shape; corrupt data becomes `null`.
- No cross‑window sync; reads are stale unless reloaded.
- No quota failure handling on write.

### Best practical path (summary)

- **Single versioned blob**: `connected_apps_v2` with `{ version, apps: Record<id, ConnectedApp> }`.
- **Explicit migrations + runtime validation** (Zod or io‑ts).
- **React store wrapper** (`useSyncExternalStore` for external subscriptions). **Critical**: useState + useEffect subscription is an antipattern—causes extra renders, breaks under concurrent rendering. See `docs/260130-react-external-store-subscriptions.md`.
- **If per‑key storage is required**: maintain an index key `connected_app_ids_v1` to avoid scanning.

## Findings: high‑impact

- **Non‑deterministic render output (React purity)**  
  `useRickRollData()` computes random/time‑based facts on every render; this violates render purity and leads to flicker or inconsistent UI.  
  File: `src/apps/rickroll/index.tsx`  
  Vercel rules: `rerender-memo`, `js-cache-function-results`

- **Storage mutation while iterating**  
  `getAllConnectedApps()` migrates legacy keys during `localStorage` iteration.  
  File: `src/lib/storage.ts`  
  Vercel rules: `client-localstorage-schema`, `js-cache-storage`

- **Uncaught JSON.parse on deep links**  
  `JSON.parse(scopesParam)` without try/catch; malformed URLs break deep‑link flow silently.  
  File: `src/hooks/useDeepLink.ts`

- **Interval/listener leak on unmount**  
  `BrowserSetup` creates an interval and event listener but only clears them on success/error; unmount mid‑download leaks.  
  File: `src/components/BrowserSetup.tsx`

## Findings: medium‑impact

- **Derived state stored in state + effect**  
  `recentlyCompleted` is derived from `runs` but computed in an effect and stored in state.  
  File: `src/pages/Home.tsx`  
  Vercel rule: `rerender-derived-state-no-effect`

- **Async waterfall in platform loading**  
  `get_platforms` and `check_connected_platforms` are sequential; can be parallel.  
  File: `src/hooks/usePlatforms.ts`  
  Vercel rule: `async-parallel`

- **Async waterfall in Settings**  
  `get_user_data_path` and `getVersion` are independent but invoked sequentially.  
  File: `src/pages/Settings.tsx`  
  Vercel rule: `async-parallel`

- **Runtime data validation missing**  
  Data from storage and exported files is asserted by TypeScript types only.  
  Files: `src/lib/storage.ts`, `src/apps/rickroll/index.tsx`, `src/pages/Runs.tsx`

- **Potential render inefficiencies**  
  Multiple `useMemo` passes over the same array in `Runs` can be combined.  
  File: `src/pages/Runs.tsx`  
  Vercel rule: `js-combine-iterations`

## Findings: low‑impact / watchlist

- **Potential list growth without virtualization**  
  Runs list and platform lists may scale; consider `content-visibility` or virtualization.  
  Files: `src/pages/Runs.tsx`, `src/pages/Home.tsx`  
  Vercel rule: `rendering-content-visibility`

- **Cross‑window sync not handled**  
  Connected apps list is read once; no `storage` or `BroadcastChannel` handling.  
  Files: `src/pages/Settings.tsx`, `src/lib/storage.ts`

- **Async cleanup race (listen + unlisten)**  
  Cleanup waits on a promise; if unmounted before resolution, may leak.  
  File: `src/components/auth/InlineLogin.tsx`

## Recommended priorities (no code changes)

1. **Render purity fixes**: stabilize non‑deterministic render (rickroll fun facts).  
2. **Storage correctness**: replace scan/migrate‑on‑read with a versioned blob or indexed keys.  
3. **Async parallelization**: use `Promise.all()` in `usePlatforms` + `Settings`.  
4. **Deep link parsing safety**: guard JSON parse; validate scopes.  
5. **Derived state cleanup**: derive `recentlyCompleted` via `useMemo`.

## Rule mapping summary

- `async-parallel`: `src/hooks/usePlatforms.ts`, `src/pages/Settings.tsx`
- `client-localstorage-schema`, `js-cache-storage`: `src/lib/storage.ts`
- `rerender-derived-state-no-effect`: `src/pages/Home.tsx`
- `rerender-memo`, `js-cache-function-results`: `src/apps/rickroll/index.tsx`
- `js-combine-iterations`: `src/pages/Runs.tsx`
- `rendering-content-visibility`: `src/pages/Runs.tsx`, `src/pages/Home.tsx`

## Appendix: files reviewed

- `src/lib/storage.ts`
- `src/pages/Settings.tsx`
- `src/pages/GrantFlow.tsx`
- `src/hooks/useDeepLink.ts`
- `src/apps/rickroll/index.tsx`
- `src/components/BrowserSetup.tsx`
- `src/components/auth/InlineLogin.tsx`
- `src/hooks/usePlatforms.ts`
- `src/hooks/useInitialize.ts`
- `src/hooks/useConnectorUpdates.ts`
- `src/pages/Runs.tsx`
- `src/pages/Home.tsx`
- `src/pages/YourData.tsx`
- `src/hooks/useAuth.ts`
- `src/hooks/useEvents.ts`
