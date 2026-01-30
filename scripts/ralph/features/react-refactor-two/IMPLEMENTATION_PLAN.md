# React Refactor Two - Implementation Plan

Date: 2026-01-30
Source: `docs/260130-react-refactor-implementation-gap.md`
Spec: `scripts/ralph/features/react-refactor-two/specs/react-refactor-two.md`

## Status Summary

| Acceptance Criteria | Status | Priority |
|---------------------|--------|----------|
| Shared platform icon helper | DONE | P1 |
| `useEvents` HMR/duplicate guard | DONE | P1 |
| InlineLogin sync-safe cleanup | DONE | P1 |
| `useConnectorUpdates` decoupling + memoization | DONE | P1 |
| `GrantFlow` session fetch decoupled from auth | DONE | P2 |
| Home split into subcomponents | DONE | P3 |
| GrantFlow split into subcomponents | NOT DONE | P3 |
| Home, DataApps, RickRollApp lazy loaded | DONE | P3 |

---

## Priority 1 — Risk & Correctness

### 1.1 Shared Platform Icon Helper
**Files:** `src/pages/Home.tsx`, `src/components/ConnectorUpdates.tsx`
**Target:** `src/lib/platformIcons.ts`

- [x] Create `src/lib/platformIcons.ts` with:
  - [x] `PLATFORM_ICONS` constant (URLs for chatgpt, instagram, linkedin)
  - [x] `getPlatformIcon(name: string): string | null` function
  - [x] `PlatformIcon` component (renders img or first-letter fallback)
- [x] Update `src/pages/Home.tsx`:
  - [x] Remove `PLATFORM_ICONS` (lines 24-28)
  - [x] Remove `getPlatformIcon` (lines 31-37)
  - [x] Remove `PlatformIcon` component (lines 40-62)
  - [x] Import from `src/lib/platformIcons`
- [x] Update `src/components/ConnectorUpdates.tsx`:
  - [x] Remove `PLATFORM_ICONS` (lines 6-10)
  - [x] Remove `getPlatformIcon` (lines 12-18)
  - [x] Import from `src/lib/platformIcons`
- [x] Export from `src/lib/index.ts` (if barrel exists)

**Evidence:** 45 lines duplicated between Home.tsx and ConnectorUpdates.tsx. COMPLETED: Created `src/lib/platformIcons.tsx` with shared exports. Removed 39 lines from Home.tsx and 13 lines from ConnectorUpdates.tsx. Fixed pre-existing TypeScript errors in `src/lib/storage.test.ts` with `this: Storage` type annotations.

---

### 1.2 useEvents HMR/Duplicate Listener Guard (Module-Level)
**File:** `src/hooks/useEvents.ts`

- [x] Add module-level `listenersRegistered` flag (top of file)
- [x] Guard listener registration with module-level check (blocks StrictMode/HMR double-mount)
- [x] Reset module flag on cleanup (allows re-registration after true unmount)
- [ ] Pattern:
  ```typescript
  useEffect(() => {
    if (listenersRegistered) return;
    listenersRegistered = true;
    // ... register listeners
    return () => {
      listenersRegistered = false;
      // ... cleanup
    };
  }, [dispatch]);
  ```

**Evidence:** `useEvents` registers listeners inside `useEffect` without singleton guard; React.StrictMode and HMR cause double registration

---

### 1.3 InlineLogin Synchronous-Safe Listener Cleanup
**File:** `src/components/auth/InlineLogin.tsx`

- [x] Store unlisten promise result in a ref
- [x] Call unlisten synchronously from ref in cleanup
- [ ] Pattern:
  ```typescript
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    listen<AuthResult>('auth-complete', handler).then((fn) => {
      unlistenRef.current = fn;
    });

    return () => {
      unlistenRef.current?.();
    };
  }, [dispatch, navigate]);
  ```

**Evidence:** Current cleanup `unlisten.then((fn) => fn())` is async; React cleanup expects synchronous execution; risks memory leak if unmount before promise resolves

---

### 1.4 useConnectorUpdates Decoupling + Memoization
**File:** `src/hooks/useConnectorUpdates.ts`

#### 1.4a Decouple from usePlatforms auto-load
- [x] Remove `usePlatforms` import and `loadPlatforms` usage from hook
- [x] Update `downloadConnector` to NOT call `loadPlatforms` internally
- [x] Move platform reload to caller after successful download
- [x] Preferred: `ConnectorUpdates` invokes `loadPlatforms()` after `downloadConnector(id)` resolves true

#### 1.4b Memoize update counts
- [x] Wrap count calculations in `useMemo`:
  ```typescript
  const { updateCount, newConnectorCount, updateableCount } = useMemo(() => ({
    updateCount: updates.length,
    newConnectorCount: updates.filter((u) => u.isNew).length,
    updateableCount: updates.filter((u) => u.hasUpdate).length,
  }), [updates]);
  ```
- [x] Keep `hasUpdates` inline (simple boolean, no benefit from memo)

**Evidence:**
- Hook imports `usePlatforms` which auto-loads on mount
- Counts computed inline on every render (lines 85-88)

---

## Priority 2 — Performance

### 2.1 GrantFlow Session Fetch Decoupled from Auth State
**File:** `src/pages/GrantFlow.tsx`

- [x] Split session loading effect from auth-gating effect
- [x] Session effect depends only on `params` (route parameter)
- [x] Auth-gating effect handles transition from auth-required → consent
- [ ] Pattern:
  ```typescript
  // Effect 1: Load session (run once per sessionId)
  useEffect(() => {
    if (!params?.sessionId) { setError(...); return; }
    loadSession(params.sessionId);
  }, [params?.sessionId, params?.appId]);

  // Effect 2: Gate on auth state (separate from fetch)
  useEffect(() => {
    if (authLoading || !flowState.session) return;
    if (!isAuthenticated || !walletAddress) {
      setFlowState(prev => ({ ...prev, status: 'auth-required' }));
    } else if (flowState.status === 'auth-required') {
      setFlowState(prev => ({ ...prev, status: 'consent' }));
    }
  }, [isAuthenticated, walletAddress, authLoading, flowState.session, flowState.status]);
  ```

**Evidence:** Current effect (line 99) depends on `[params, isAuthenticated, walletAddress, authLoading]`; session refetched every time auth state changes

---

## Priority 3 — Structure & Bundle

### 3.1 Split Home into Subcomponents
**File:** `src/pages/Home.tsx` (504 lines)

- [x] Create `src/pages/home-sections/` directory
- [x] Extract `BrowserSetupSection` (browser check/download UI)
- [x] Extract `ConnectedSourcesList` (connected sources display)
- [x] Extract `AvailableSourcesList` (available sources grid)
- [x] Keep `Home.tsx` as container orchestrating sections

**Evidence:** Home.tsx reduced from 504 lines to ~195 lines (orchestrating container). Created `src/pages/home-sections/` directory with:
- `BrowserSetupSection.tsx` - Browser check/download UI
- `ConnectedSourcesList.tsx` - Connected sources display
- `AvailableSourcesList.tsx` - Available sources grid

---

### 3.2 Split GrantFlow into Subcomponents
**File:** `src/pages/GrantFlow.tsx` (623 lines)

- [ ] Create `src/pages/grant-flow-sections/` directory
- [ ] Extract state-based renders:
  - `GrantLoadingState`
  - `GrantAuthRequiredState`
  - `GrantErrorState`
  - `GrantSuccessState`
  - `GrantConsentState`
- [ ] Keep `GrantFlow.tsx` as state machine container

**Evidence:** GrantFlow.tsx is 623 lines with 5 distinct state renders; largest page component

---

### 3.3 Lazy Load Home, DataApps, RickRollApp
**File:** `src/App.tsx`

- [x] Convert eager imports to lazy:
  ```typescript
  // Before
  import { Home } from './pages/Home';
  import { DataApps } from './pages/DataApps';
  import { RickRollAppPage } from './pages/RickRollApp';

  // After
  const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
  const DataApps = lazy(() => import('./pages/DataApps').then((m) => ({ default: m.DataApps })));
  const RickRollAppPage = lazy(() => import('./pages/RickRollApp').then((m) => ({ default: m.RickRollAppPage })));
  ```
- [x] Suspense boundary already in place (line 59)

**Evidence:** Home, DataApps, and RickRollAppPage converted to lazy imports in App.tsx. Suspense boundary already in place.

---

## Out of Scope (per spec)

- Phase 4 Tailwind vs inline styling decision — NOT STARTED, not in acceptance criteria
- window.location usage in RickRoll — external deep-link/reload behavior, not internal routing

---

## Validation Commands

```bash
npx tsc -b          # Typecheck
npm run build       # Build
npm run lint        # Lint
npm run test        # Test (if applicable)
```

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `src/lib/platformIcons.ts` | NEW: shared icon helper |
| `src/pages/Home.tsx` | Remove icon duplication, import shared helper |
| `src/components/ConnectorUpdates.tsx` | Remove icon duplication, import shared helper |
| `src/hooks/useEvents.ts` | Add HMR/duplicate guard |
| `src/components/auth/InlineLogin.tsx` | Sync-safe listener cleanup |
| `src/hooks/useConnectorUpdates.ts` | Decouple usePlatforms, memoize counts |
| `src/pages/GrantFlow.tsx` | Split session fetch from auth gating |
| `src/pages/home-sections/*` | NEW: extracted subcomponents |
| `src/pages/grant-flow-sections/*` | NEW: extracted subcomponents |
| `src/App.tsx` | Lazy load Home, DataApps, RickRollApp |
