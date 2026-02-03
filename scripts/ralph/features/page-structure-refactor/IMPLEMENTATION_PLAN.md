# Page Structure Refactor - Implementation Plan

## Overview

Refactor three pages (DataApps, YourData, BrowserLogin) to align with `ui-page-structure` conventions. Each page moves from a single file to a directory structure with separated concerns. RickRollApp is explicitly deferred.
Apply `ui-page-structure` (includes README + tests once structure is settled).

Reference implementation: `src/pages/settings/` demonstrates the target pattern.

---

## Phase 1: DataApps (LOW complexity)

### Status

- [ ] Create directory structure
  - `src/pages/data-apps/index.tsx`
  - `src/pages/data-apps/types.ts`
  - `src/pages/data-apps/fixtures.ts`
  - `src/pages/data-apps/components/app-card.tsx`

- [ ] Extract types to `src/pages/data-apps/types.ts`
  - `AppStatus` type (`"live" | "coming-soon"`)
  - `MockApp` interface

- [ ] Extract fixtures to `src/pages/data-apps/fixtures.ts`
  - `mockApps` array (7 apps)

- [ ] Extract component to `src/pages/data-apps/components/app-card.tsx`
  - `AppCard` component (~87 lines)

- [ ] Create `src/pages/data-apps/index.tsx`
  - Import types, fixtures, and AppCard
  - Export `DataApps` component
  - Note: No custom hook needed (only 2 simple filter operations)

- [ ] Update `src/App.tsx` import
  - Change: `import("./pages/DataApps")` to `import("./pages/data-apps")`

- [ ] Delete original `src/pages/DataApps.tsx`

- [ ] Verify app builds and DataApps route works

- [ ] Add README + tests per `ui-page-structure` (once settled)
  - Cover route wiring in `index.test.tsx`
  - Add hook/component tests where behavior is non-trivial

---

## Phase 2: YourData (MEDIUM complexity)

### Status

- [ ] Create directory structure
  - `src/pages/your-data/index.tsx`
  - `src/pages/your-data/types.ts`
  - `src/pages/your-data/utils.ts`
  - `src/pages/your-data/use-your-data-page.ts`
  - `src/pages/your-data/components/your-data-header.tsx`
  - `src/pages/your-data/components/your-data-tabs.tsx`
  - `src/pages/your-data/components/connected-sources-section.tsx`
  - `src/pages/your-data/components/available-sources-section.tsx`
  - `src/pages/your-data/components/connected-apps-section.tsx`

- [ ] Extract types to `src/pages/your-data/types.ts`
  - `TabKey` type (`"sources" | "apps"`)
  - `PlatformDisplay` type

- [ ] Extract utils to `src/pages/your-data/utils.ts`
  - `PLATFORM_DISPLAY` constant (10 platforms)
  - `getPlatformDisplay` function

- [ ] Create hook `src/pages/your-data/use-your-data-page.ts`
  - State: `activeTab`
  - Derived: `connectedSources`, `availableSources`
  - Handlers: `handleConnectSource`, `setActiveTab`
  - Dependencies: `usePlatforms`, `useSelector`, `useNavigate`

- [ ] Extract header component to `src/pages/your-data/components/your-data-header.tsx`
  - Page title and description

- [ ] Extract tabs component to `src/pages/your-data/components/your-data-tabs.tsx`
  - Tab switcher UI
  - Props: `activeTab`, `onTabChange`

- [ ] Extract connected sources section to `src/pages/your-data/components/connected-sources-section.tsx`
  - Grid of connected platform cards
  - Props: `connectedSources`, `onViewRuns`

- [ ] Extract available sources section to `src/pages/your-data/components/available-sources-section.tsx`
  - Grid of available platforms with connect buttons
  - Props: `availableSources`, `connectedSourcesCount`, `onConnect`

- [ ] Extract connected apps section to `src/pages/your-data/components/connected-apps-section.tsx`
  - Empty state for apps tab

- [ ] Create `src/pages/your-data/index.tsx`
  - Import hook and all components
  - Wire up container/presenter pattern per settings example
  - Export `YourData` component

- [ ] Determine YourData routing
  - Note: Not currently in App.tsx routes - verify if page is used or orphaned
  - If used elsewhere, update that import

- [ ] Delete original `src/pages/YourData.tsx`

- [ ] Verify app builds and YourData functionality works

- [ ] Add README + tests per `ui-page-structure` (once settled)
  - Cover route wiring in `index.test.tsx`
  - Add hook/component tests where behavior is non-trivial

---

## Phase 3: BrowserLogin (HIGH complexity)

### Status

- [ ] Create directory structure
  - `src/pages/browser-login/index.tsx`
  - `src/pages/browser-login/types.ts`
  - `src/pages/browser-login/utils.ts`
  - `src/pages/browser-login/use-browser-login.ts`
  - `src/pages/browser-login/components/browser-login-form.tsx`
  - `src/pages/browser-login/components/invalid-request-view.tsx`
  - `src/pages/browser-login/components/loading-view.tsx`
  - `src/pages/browser-login/components/success-view.tsx`
  - `src/pages/browser-login/components/wallet-creating-view.tsx`

- [ ] Extract types to `src/pages/browser-login/types.ts`
  - `BrowserLoginState` interface (email, code, isCodeSent, error, isCreatingWallet, authSent)
  - `AuthCallbackPayload` interface

- [ ] Extract utils to `src/pages/browser-login/utils.ts`
  - `inputClassName` constant (shared input styles)

- [ ] Create hook `src/pages/browser-login/use-browser-login.ts`
  - State management: email, code, isCodeSent, error, isCreatingWallet, authSent
  - Privy hooks integration: usePrivy, useLoginWithOAuth, useLoginWithEmail, useCreateWallet, useWallets
  - Callbacks: handleGoogleLogin, handleSendCode, handleLoginWithCode, ensureEmbeddedWallet
  - Effect: auth callback port communication
  - Derived: isLoading, callbackPort from URL params
  - Return: all state + handlers + view state flags

- [ ] Extract view components
  - `invalid-request-view.tsx` - No callbackPort error state
  - `loading-view.tsx` - Privy not ready state
  - `success-view.tsx` - authSent success state
  - `wallet-creating-view.tsx` - Wallet creation in progress state

- [ ] Extract main form component to `src/pages/browser-login/components/browser-login-form.tsx`
  - Google OAuth button
  - Email code flow (send code / verify code states)
  - Error display
  - Props: All handlers and state from hook

- [ ] Create `src/pages/browser-login/index.tsx`
  - Import hook and view components
  - Conditional rendering based on view state
  - Export `BrowserLogin` component

- [ ] Update `src/App.tsx` imports (2 locations)
  - Line 11: Change direct import `from "./pages/BrowserLogin"` to `from "./pages/browser-login"`
  - Routes use same component reference - verify both `/browser-login` route locations work

- [ ] Delete original `src/pages/BrowserLogin.tsx`

- [ ] Verify app builds and browser login flow works
  - Test: Missing callbackPort shows InvalidRequest
  - Test: Auth flow initiates correctly
  - Test: Success state displays after auth

- [ ] Add README + tests per `ui-page-structure` (once settled)
  - Cover route wiring in `index.test.tsx`
  - Add hook/component tests where behavior is non-trivial

---

## Cross-Cutting Concerns

- [ ] Ensure consistent import style across all new files
  - Use `@/` path alias for shared components
  - Use relative imports for page-local files

- [ ] Verify no circular dependencies introduced

- [ ] Run full build after each phase completion

---

## Validation Commands

```bash
npx tsc -b          # Typecheck
npm run build       # Build
npm run lint        # Lint
npm run test        # Test (if applicable)
```

---

## Completed

_(Move completed items here)_

---

## Notes

- **Hook placement**: Route-level hooks go in `src/pages/<route>/use-<route>-page.ts`
- **README/tests**: Tracked as explicit tasks per phase once settled
- **Settings reference**: `src/pages/settings/` is the canonical example of target structure
- **YourData routing**: Page exists but may not be actively routed - investigate during Phase 2
