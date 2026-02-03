# Page Structure Refactor - Implementation Plan

## Overview

Refactor three pages (DataApps, YourData, BrowserLogin) to align with `ui-page-structure` conventions. Each page moves from a single file to a directory structure with separated concerns. RickRollApp is explicitly deferred.
Apply `ui-page-structure` (includes README + tests once structure is settled).

Reference implementation: `src/pages/settings/` demonstrates the target pattern.

---

## Phase 1: DataApps (LOW complexity) ✅ COMPLETED

### Status

- [x] Create directory structure
  - `src/pages/data-apps/index.tsx`
  - `src/pages/data-apps/types.ts`
  - `src/pages/data-apps/fixtures.ts`
  - `src/pages/data-apps/components/AppCard.tsx`

- [x] Extract types to `src/pages/data-apps/types.ts`
  - `MockApp` interface (status is union type in interface)

- [x] Extract fixtures to `src/pages/data-apps/fixtures.ts`
  - `mockApps` array (7 apps)

- [x] Extract component to `src/pages/data-apps/components/AppCard.tsx`
  - `AppCard` component

- [x] Create `src/pages/data-apps/index.tsx`
  - Import types, fixtures, and AppCard
  - Export `DataApps` component
  - Note: No custom hook needed (only 2 simple filter operations)

- [x] Update `src/App.tsx` import
  - Changed: `import("./pages/DataApps")` to `import("./pages/data-apps")`

- [x] Delete original `src/pages/DataApps.tsx`

- [x] Verify app builds and DataApps route works

- [ ] Add README + tests per `ui-page-structure` (deferred until structure settled)

---

## Phase 2: YourData (MEDIUM complexity) ✅ COMPLETED

**Note:** YourData is an **orphaned page** - it's defined but never imported anywhere in the app.
The refactor preserves this for future use or cleanup.

### Status

- [x] Create directory structure
  - `src/pages/your-data/index.tsx`
  - `src/pages/your-data/types.ts`
  - `src/pages/your-data/utils.ts`
  - `src/pages/your-data/use-your-data-page.ts`
  - `src/pages/your-data/components/your-data-header.tsx`
  - `src/pages/your-data/components/your-data-tabs.tsx`
  - `src/pages/your-data/components/connected-sources-section.tsx`
  - `src/pages/your-data/components/available-sources-section.tsx`
  - `src/pages/your-data/components/connected-apps-section.tsx`

- [x] Extract types to `src/pages/your-data/types.ts`
  - `TabKey` type (`"sources" | "apps"`)
  - `PlatformDisplay` type

- [x] Extract utils to `src/pages/your-data/utils.ts`
  - `PLATFORM_DISPLAY` constant (10 platforms)
  - `getPlatformDisplay` function

- [x] Create hook `src/pages/your-data/use-your-data-page.ts`
  - State: `activeTab`
  - Derived: `connectedSources`, `availableSources`
  - Handlers: `handleConnectSource`, `handleViewRuns`, `setActiveTab`
  - Dependencies: `usePlatforms`, `useSelector`, `useNavigate`

- [x] Extract header component to `src/pages/your-data/components/your-data-header.tsx`
  - Page title and description

- [x] Extract tabs component to `src/pages/your-data/components/your-data-tabs.tsx`
  - Tab switcher UI
  - Props: `activeTab`, `onTabChange`

- [x] Extract connected sources section to `src/pages/your-data/components/connected-sources-section.tsx`
  - Grid of connected platform cards
  - Props: `connectedSources`, `onViewRuns`

- [x] Extract available sources section to `src/pages/your-data/components/available-sources-section.tsx`
  - Grid of available platforms with connect buttons
  - Props: `availableSources`, `hasConnectedSources`, `onConnect`

- [x] Extract connected apps section to `src/pages/your-data/components/connected-apps-section.tsx`
  - Empty state for apps tab

- [x] Create `src/pages/your-data/index.tsx`
  - Import hook and all components
  - Wire up container/presenter pattern per settings example
  - Export `YourData` component

- [x] Determine YourData routing
  - **Finding:** Orphaned page - not imported anywhere in App.tsx or other files

- [x] Delete original `src/pages/YourData.tsx`

- [x] Verify app builds

- [ ] Add README + tests per `ui-page-structure` (deferred until structure settled)

---

## Phase 3: BrowserLogin (HIGH complexity) ✅ COMPLETED

### Status

- [x] Create directory structure
  - `src/pages/browser-login/index.tsx`
  - `src/pages/browser-login/types.ts`
  - `src/pages/browser-login/utils.ts`
  - `src/pages/browser-login/use-browser-login.ts`
  - `src/pages/browser-login/components/browser-login-form.tsx`
  - `src/pages/browser-login/components/invalid-request-view.tsx`
  - `src/pages/browser-login/components/loading-view.tsx`
  - `src/pages/browser-login/components/success-view.tsx`
  - `src/pages/browser-login/components/wallet-creating-view.tsx`

- [x] Extract types to `src/pages/browser-login/types.ts`
  - `BrowserLoginState` interface
  - `AuthCallbackPayload` interface

- [x] Extract utils to `src/pages/browser-login/utils.ts`
  - `inputClassName` constant (shared input styles)

- [x] Create hook `src/pages/browser-login/use-browser-login.ts`
  - State management: email, code, isCodeSent, error, isCreatingWallet, authSent
  - Privy hooks integration: usePrivy, useLoginWithOAuth, useLoginWithEmail, useCreateWallet, useWallets
  - Callbacks: handleGoogleLogin, handleSendCode, handleLoginWithCode, handleResetEmail, ensureEmbeddedWallet
  - Effect: auth callback port communication
  - Derived: isLoading, callbackPort from URL params

- [x] Extract view components
  - `invalid-request-view.tsx` - No callbackPort error state
  - `loading-view.tsx` - Privy not ready state
  - `success-view.tsx` - authSent success state
  - `wallet-creating-view.tsx` - Wallet creation in progress state

- [x] Extract main form component to `src/pages/browser-login/components/browser-login-form.tsx`
  - Google OAuth button
  - Email code flow (send code / verify code states)
  - Error display

- [x] Create `src/pages/browser-login/index.tsx`
  - Import hook and view components
  - Conditional rendering based on view state
  - Export `BrowserLogin` component

- [x] Update `src/App.tsx` import
  - Changed `from "./pages/BrowserLogin"` to `from "./pages/browser-login"`

- [x] Delete original `src/pages/BrowserLogin.tsx`

- [x] Verify app builds

- [ ] Add README + tests per `ui-page-structure` (deferred until structure settled)

---

## Cross-Cutting Concerns ✅ COMPLETED

- [x] Ensure consistent import style across all new files
  - `@/` path alias for shared components
  - Relative imports for page-local files

- [x] Verify no circular dependencies introduced

- [x] Run full build after each phase completion

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
- **ESLint**: `npm run lint` has a pre-existing config issue (flat config migration needed) - unrelated to refactor

## Pre-existing Type Errors Fixed (during Phase 1)

Fixed 5 pre-existing TypeScript errors to get build passing:

1. `src/components/elements/spinner.tsx` - Fixed import path (`@vana/ui/lib/classes` → `@/lib/classes`)
2. `src/components/ui/combobox.tsx` - Fixed invalid button size (`icon-xs` → `xs`)
3. `src/pages/grant/components/consent/grant-consent-state.tsx` - Removed unused `Text` import
4. `src/pages/grant/use-grant-flow.test.tsx` - Fixed spread argument type in vi.mock
5. `src/pages/home/components/available-sources-list.tsx` - Added proper type for `state` prop (exported `ConnectSourceCardVariant` from connect-source-card)
