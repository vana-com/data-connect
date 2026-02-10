## Browser Login page

### What this is

- Authentication page for the embedded browser during connector runs.
- Supports Google OAuth and email code verification via Privy.
- Communicates authentication result back to the Tauri app via callback port.
- For the full rationale and flow tradeoffs, see `docs/_archive/spike-privy-auth-architecture.md`.

### Files

- `index.tsx`: page shell, view-state conditional rendering.
- `types.ts`: `BrowserLoginState`, `AuthCallbackPayload` interfaces.
- `utils.ts`: `inputClassName` constant (shared input styles).
- `use-browser-login.ts`: route-level state, Privy hooks, auth callback effect.
- `components/browser-login-form.tsx`: main form with Google OAuth and email code flow.
- `components/invalid-request-view.tsx`: error state when callbackPort is missing.
- `components/loading-view.tsx`: loading state while Privy initializes.
- `components/success-view.tsx`: success state after auth is sent.
- `components/wallet-creating-view.tsx`: loading state during wallet creation.

### Data flow

- `use-browser-login.ts` provides:
  - `callbackPort` from URL search params.
  - Privy state: `ready`, `authenticated`, `user`, `wallets`.
  - Form state: `email`, `code`, `isCodeSent`, `error`, `isCreatingWallet`, `authSent`.
  - Loading state: derived `isLoading` from OAuth/email/wallet states.
  - Handlers: `handleGoogleLogin`, `handleSendCode`, `handleLoginWithCode`, `handleResetEmail`.
- Effect sends auth callback to `localhost:{callbackPort}/auth-callback` on successful login.
- Automatically creates embedded wallet if user doesn't have one.

### App integration

- Route: `/browser-login` is lazy-loaded in `src/App.tsx`.
- URL params: `callbackPort` (required) - port for Tauri IPC callback.
- Dependencies: Privy SDK (`usePrivy`, `useLoginWithOAuth`, `useLoginWithEmail`, `useCreateWallet`, `useWallets`).

### Behavior

1. If `callbackPort` is missing, show invalid request error.
2. If Privy not ready, show loading spinner.
3. If authenticated and wallet created, send auth callback and show success.
4. If creating wallet, show wallet creation loading state.
5. Otherwise, show login form with Google OAuth and email code options.

### Notes

- Direct imports only (no barrels) per Vercel React rule `bundle-barrel-imports`.
- Critical for connector flow - authentication enables data extraction.
- Embedded wallet is required for protocol participation.
- Error handling shows user-friendly messages for all failure states.
