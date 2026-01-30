# React Audit Storage - Implementation Plan

> Status: Planning complete. Ready for implementation.
> Last updated: 2026-01-30

## Priority 1: High-Impact Correctness Issues

### P1.1 - Rickroll Render Purity Violation
**File:** `src/apps/rickroll/index.tsx`
**Status:** ✅ Completed
**Issue:** `getFunFacts()` computes random/time-based values on every render (lines 76-81, 109)
- `Math.random()` called during render (line 76)
- `Date.now()` called during render (line 87)
- No memoization - facts recalculated every render
- Word-count loop runs on every render (lines 92-100)

**Fix:**
- Wrap `getFunFacts()` result in `useMemo` with proper dependencies
- Seed random selection once per session using `useRef` or state
- Move time-based computations to initialization, not render
- Avoid re-counting words on every render (compute once when data loads)
- Now uses useMemo with proper dependencies, random seeded once via useRef, time-based computations use captured load time

---

### P1.2 - Storage O(n) Scan + Mutation During Iteration
**File:** `src/lib/storage.ts`
**Status:** ✅ Completed
**Issues:**
- `getAllConnectedApps()` scans ALL localStorage keys (line 75)
- Mutates storage during iteration (lines 106-107) — keys are snapshotted, but still messy
- No runtime validation on parsed data (lines 26, 37, 85, 101)

**Fix:**
- Add index key `v1_connected_apps_index` to avoid full scans
- Separate migration into explicit function (not during iteration)
- Add Zod schema validation for `ConnectedApp` type
- Update `setConnectedApp`/`removeConnectedApp` to maintain index
- Migration function `migrateConnectedAppsStorage()` called once in useInitialize.ts
- getAllConnectedApps() now O(k) where k = number of connected apps, not O(n) over all localStorage

---

### P1.3 - BrowserSetup Memory Leak on Unmount
**File:** `src/components/BrowserSetup.tsx`
**Status:** ✅ Completed
**Issues:**
- Interval created at line 47 not cleaned on unmount
- Event listener at line 55 not cleaned on unmount
- setTimeout at line 64 not cleaned on unmount
- Cleanup only happens on success/error, not unmount

**Fix:**
- Store interval/listener refs and clean in useEffect return
- Add AbortController for async operations
- Guard state updates with mounted ref
- Now uses refs to track interval/listener/timeout, cleanup function on unmount, mounted ref guards state updates

---

### P1.4 - Deep Link Scopes Validation
**File:** `src/hooks/useDeepLink.ts`
**Status:** ✅ Completed
**Issues:**
- No validation that scopes is `string[]`
- `scopesParam` can be invalid JSON or unexpected format
- Deep link should still succeed for `sessionId`/`appId` even if scopes are invalid

**Fix:**
- Add type guard validating scopes is array of strings
- Accept JSON array and/or comma-delimited fallback
- On invalid scopes, ignore scopes but still navigate with `sessionId`/`appId`
- Now has type guard validating scopes is array of strings, accepts JSON array and comma-delimited fallback, invalid scopes ignored without blocking navigation

---

## Priority 2: Medium-Impact Performance Issues

### P2.1 - Home.tsx Derived State Anti-Pattern
**File:** `src/pages/Home.tsx`
**Status:** ✅ Completed
**Issue:** `recentlyCompleted` computed in useEffect and stored in state (lines 56, 71-79)

**Fix:**
- Replace useState + useEffect with single `useMemo`:
```typescript
const recentlyCompleted = useMemo(() => {
  return new Set(
    runs
      .filter((r) => r.status === 'success')
      .sort((a, b) => new Date(b.endDate || b.startDate).getTime() - new Date(a.endDate || a.startDate).getTime())
      .map((r) => r.platformId)
  );
}, [runs]);
```
- Replaced useState + useEffect with single useMemo

---

### P2.2 - usePlatforms Async Waterfall
**File:** `src/hooks/usePlatforms.ts`
**Status:** ❌ Not implemented
**Issue:** `get_platforms` and `check_connected_platforms` called sequentially (lines 17-26)

**Fix:**
- If platform IDs can be cached/known, parallelize with `Promise.all()`
- Otherwise, document the dependency and keep sequential

---

### P2.3 - Settings.tsx Error Handling
**File:** `src/pages/Settings.tsx`
**Status:** ⚠️ Partial (calls are parallel but pattern is verbose)
**Issue:** Missing `.catch()` handlers on promise chains (lines 42-47)

**Fix:**
- Add error handling to initial data fetch
- Consider using `Promise.all()` for cleaner pattern

---

### P2.4 - Runs.tsx Multiple Array Iterations
**File:** `src/pages/Runs.tsx`
**Status:** ✅ Completed
**Issues:**
- Three separate useMemo passes over runs array (lines 356-372)
- Unsafe type assertions without runtime validation (lines 40-58)

**Fix:**
- Combine into single useMemo returning `{ activeRuns, completedRuns }`
- Single pass: sort then partition into active/completed arrays
- Reduces from 3 iterations to 1 (sort + partition in single loop)

---

### P2.5 - Runs.tsx Timestamp Fallback Bug
**File:** `src/pages/Runs.tsx`
**Status:** ✅ Completed
**Issue:** When `data.timestamp` exists but is non-number, `new Date(0)` is used (line 45), producing 1970 dates.

**Fix:**
- If `data.timestamp` is number, use it
- If string, parse to date or fall back to `run.startDate`
- Otherwise fall back to `run.startDate`
- Now handles number, string (via Date.parse), and graceful fallback

---

## Priority 3: Runtime Validation (Cross-Cutting)

### P3.1 - Add Zod Schema for ConnectedApp
**File:** `src/lib/storage.ts`
**Status:** ✅ Completed (as part of P1.2)
**Action:** Create and apply Zod schema:
```typescript
const ConnectedAppSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().optional(),
  permissions: z.array(z.string()),
  connectedAt: z.string(),
});
```
- Schema added and used in getConnectedApp(), setConnectedApp(), and migration

### P3.2 - Add Validation for Export Data
**File:** `src/pages/Runs.tsx`
**Status:** ❌ Not implemented
**Action:** Validate `data.data` structure before transforming in `handleToggleExpanded`

### P3.3 - Add Validation for Deep Link Scopes
**File:** `src/hooks/useDeepLink.ts`
**Status:** ❌ Not implemented
**Action:** Type guard to validate scopes is `string[]`

---

## Implementation Order (Recommended)

1. **P1.1** - Rickroll render purity (isolated, high visibility)
2. **P1.4** - Deep link JSON safety (quick win, prevents crashes)
3. **P1.3** - BrowserSetup cleanup (prevents memory leaks)
4. **P2.1** - Home.tsx derived state (simple refactor)
5. **P1.2** - Storage correctness (larger change, affects multiple files)
6. **P2.4** - Runs.tsx iterations + validation
7. **P2.5** - Runs.tsx timestamp fallback
8. **P2.2** - usePlatforms async (may require dependency analysis)
9. **P2.3** - Settings error handling
10. **P3.x** - Cross-cutting validation (can be done incrementally)

---

## Files Changed Summary

| File | Issues | Priority |
|------|--------|----------|
| `src/apps/rickroll/index.tsx` | Render purity violation | P1 |
| `src/lib/storage.ts` | O(n) scan, mutation, no validation | P1 |
| `src/components/BrowserSetup.tsx` | Memory leak on unmount | P1 |
| `src/hooks/useDeepLink.ts` | Unsafe JSON.parse | P1 |
| `src/pages/Home.tsx` | Derived state anti-pattern | P2 |
| `src/hooks/usePlatforms.ts` | Async waterfall | P2 |
| `src/pages/Settings.tsx` | Missing error handling | P2 |
| `src/pages/Runs.tsx` | Multiple iterations, no validation | P2 |
| `src/pages/Runs.tsx` | Timestamp fallback bug | P2 |

---

## Out of Scope (Noted but not in this feature)

The following were found during analysis but are demo/mock implementations intentionally in place:
- `src/pages/GrantFlow.tsx` - Mock signature generation (demo mode)
- `src/pages/DataApps.tsx` - Hardcoded mock apps list
- `src/apps/rickroll/App.tsx` - Demo session ID, hardcoded `hasAccess`
- `src/components/auth/InlineLogin.tsx` - Demo wallet address

These are expected for the current demo state of the app.

---

## Acceptance Criteria (from spec)

- [x] Rickroll data is deterministic per session/render
- [x] Connected apps storage avoids full key scans
- [x] Deep-link JSON parsing is guarded with try/catch and validates scopes
- [x] BrowserSetup cleanup is robust on component unmount
- [x] `recentlyCompleted` is memoized via `useMemo`, not stored in state
- [ ] Platform and Settings fetches are parallelized where independent
- [x] Deep link accepts valid scopes and ignores invalid scopes without blocking navigation
