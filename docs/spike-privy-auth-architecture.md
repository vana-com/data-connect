# OAuth/Auth Callback Architecture for DataBridge

## The Problem

DataBridge is a Tauri desktop app. For user authentication we use Privy, which supports Google OAuth. Two constraints make this hard:

1. **Google blocks OAuth in webviews/iframes** — their policy explicitly forbids it
2. **Privy's React web SDK (`@privy-io/react-auth`) only supports HTTPS redirect URLs** — no custom protocol schemes

This means authentication must happen in the user's real browser, and we need a way to get the auth result back into the desktop app.

## Spike Question

> Can Privy redirect to custom protocols like `vana://`? If so, we shouldn't need a hosted UI.

## Answer

**No — not with the React web SDK.**

Privy's **native mobile SDKs** (Expo, Swift, Android, Flutter) do support custom URL schemes. You register them in the Privy dashboard under Settings > Clients > Allowed URL schemes. This is what Privy's docs AI was likely referencing.

However, the **React web SDK** (which DataBridge uses):
- Routes OAuth through Privy's servers, which redirect back to an HTTPS web URL
- Does not expose a `redirectUrl` parameter for custom protocols in `initOAuth()`
- Dashboard-configured allowed OAuth redirect URLs require HTTPS — no wildcards, no custom schemes

Privy also has no REST API endpoint to initiate OAuth flows — their REST API is server-side only (token verification, wallet management).

**Sources:**
- [Privy OAuth docs](https://docs.privy.io/authentication/user-authentication/login-methods/oauth)
- [Privy Expo OAuth (supports custom schemes)](https://docs.privy.io/guide/expo/authentication/oauth)
- [Privy allowed OAuth redirect URLs](https://docs.privy.io/recipes/react/allowed-oauth-redirects)
- [Privy dashboard URL scheme config](https://docs.privy.io/guide/expo/dashboard)

---

## Viable Approaches

### Option A: Localhost Callback Server (current implementation)

**How it works:**
1. Rust backend starts a temporary HTTP server on a random localhost port
2. Opens browser to `http://localhost:5173/browser-login?callbackPort=PORT`
3. Browser page uses Privy React SDK for auth
4. After auth, JS posts result to `http://localhost:PORT/auth-callback`
5. Rust receives result, emits event to frontend, closes server

**Risks:**
| Risk | Severity | Mitigation |
|------|----------|------------|
| Firewall/antivirus may block localhost server | Medium | Use well-known port range, document in troubleshooting |
| Port conflicts | Low | Already using port 0 (OS picks available port) |
| Requires Vite dev server running (dev) or hosted page (prod) | Medium | For prod, need to host the auth page somewhere |
| User confusion (browser opens, then back to app) | Low | Standard pattern — Slack, VS Code, Discord all do this |
| CORS/security of localhost callback | Low | Server only accepts POST from localhost, shuts down after one request |

**Pros:** No hosted infrastructure needed for dev. Standard OAuth pattern for desktop apps.
**Cons:** For production, still need the auth page hosted somewhere (unless bundled).

---

### Option B: Minimal Hosted Page + `vana://` Deep Link

**How it works:**
1. Open browser to `https://auth.vana.com/login` (tiny hosted page)
2. Page loads Privy SDK, shows login modal
3. After auth, page redirects to `vana://auth-callback?data=<base64-encoded-json>`
4. Tauri catches deep link via `tauri-plugin-deep-link`, extracts auth data
5. No localhost server needed

**Risks:**
| Risk | Severity | Mitigation |
|------|----------|------------|
| Deep link handler not registered (first launch, OS issues) | Medium | Fallback: show "copy this code" manual flow |
| Auth data in URL (visible in browser history) | Medium | Use one-time code exchange: page stores auth server-side, passes only code via deep link, app exchanges code for data via HTTPS |
| `vana://` scheme conflicts with other apps | Low | Use unique scheme like `com.vana.databridge://` |
| Hosted page is a new piece of infrastructure | Medium | Very minimal — single HTML file with Privy SDK |
| Browser may prompt "Open DataBridge?" confirmation | Low | Expected UX, users are accustomed to this |
| Deep link may not bring app to foreground on all OS | Low | macOS/Windows handle this well, Linux varies |

**Pros:** Cleaner UX (deep link brings app to foreground). No localhost server. Industry standard (Slack, Discord, VS Code, Figma, Spotify all use this).
**Cons:** Requires hosting a page. Requires `tauri-plugin-deep-link` integration. Auth data security needs care.

---

### Option C: Full Hosted Auth App (Next.js)

**How it works:**
1. Build the entire auth flow as a Next.js web app (like the vault reference)
2. Embed it in Tauri via iframe or open in browser
3. After auth, communicate back to Tauri via postMessage or deep link

**Risks:**
| Risk | Severity | Mitigation |
|------|----------|------------|
| Google blocks OAuth in iframes | **High** | Must open in real browser, defeating the purpose |
| Two separate apps to maintain | High | Shared component library, monorepo |
| Deployment complexity | Medium | Need CI/CD for the web app |
| Branding/design divergence | Medium | Shared design system |

**Pros:** Full control over auth UX and branding.
**Cons:** Most engineering effort. Google OAuth still won't work in iframe. Ends up being Option B with extra steps.

---

## Recommendation

**Option B (Minimal Hosted Page + `vana://` Deep Link)** is the best path forward.

**Why:**
- It's the industry standard for desktop app OAuth — proven by Slack, VS Code, Discord, Figma, GitHub Desktop, Spotify, Zoom, and others
- Eliminates the localhost server (removes firewall/port risks)
- The hosted page is trivial (~50 lines: load Privy SDK, show login, redirect to `vana://`)
- `tauri-plugin-deep-link` is a maintained Tauri plugin designed for exactly this
- Can be enhanced later with one-time code exchange for security

**Implementation effort:**
1. Register `vana://` scheme in Tauri via `tauri-plugin-deep-link`
2. Create minimal hosted auth page (Privy SDK + redirect)
3. Handle deep link in frontend, extract auth data, update Redux state
4. Remove Rust localhost callback server

**For the hosted page in production**, options include:
- Deploy to Vercel/Cloudflare Pages (simplest)
- Serve from `auth.vana.com` or similar subdomain
- Could even be a static HTML file on a CDN

**Current localhost approach (Option A) is fine for now** and can ship as-is while Option B is built. They're not mutually exclusive — Option A works for dev, Option B for production.

---

## Option A Implementation Progress (2026-01-30)

### What was done

Implemented a **self-contained localhost auth server** — the Rust backend now serves the auth page directly via `include_str!`, eliminating the dependency on Vite dev server or any hosted page.

**Flow:**
```
User clicks "Grant Access" → Tauri starts localhost:3083 → Opens browser →
User sees Privy login (Google / email) → Auth completes →
JS POSTs to /auth-callback → Rust emits auth-complete event →
Frontend updates Redux → Browser shows "You're signed in!"
```

**Changes made:**
- `src-tauri/auth-page/index.html` — Self-contained auth page using Privy vanilla JS SDK (`@privy-io/js-sdk-core@0.58.5`) loaded from esm.sh CDN. Supports Google OAuth and email OTP.
- `src-tauri/src/commands/auth.rs` — Serves bundled HTML on `GET /`, handles OAuth redirect URLs with query params, uses fixed port 3083 (fallback 5173) to match Privy dashboard allowed origins.
- `src/pages/GrantFlow.tsx` — Auto-starts browser auth when auth is required (no intermediary "Sign In" page).
- `src/apps/rickroll/index.tsx` + `types.ts` — Accept ChatGPT memories data format (not just conversations).

### Privy Vanilla JS SDK Findings

The `@privy-io/js-sdk-core` package has a different API from the React SDK:

| Operation | API |
|-----------|-----|
| Constructor | `new PrivyClient({ appId, clientId, storage })` — note `clientId` not `appClientId` |
| OAuth step 1 | `privy.auth.oauth.generateURL('google', redirectURI)` — two positional string args, returns object with `.url` |
| OAuth step 2 | `privy.auth.oauth.loginWithCode(oauthCode, oauthState)` — from `privy_oauth_code`/`privy_oauth_state` query params |
| Email send code | `privy.auth.email.sendCode(email)` — plain string |
| Email verify | `privy.auth.email.loginWithCode(email, code)` — two strings |
| Default export | `module.default` is the `PrivyClient` class |

**Storage considerations:**
- `InMemoryCache` works for email OTP (no redirect) but **breaks OAuth** — state is lost when Google redirects back, causing "Unexpected auth flow" error.
- Default storage (localStorage) works on fixed ports. Random ports cause "Unable to access storage" errors.
- Fixed port (3083) solves both issues — localStorage persists across OAuth redirect.

### Known Issues / Next Steps

1. **Embedded wallet creation fails** with vanilla JS SDK — `embeddedWallet.create()` throws "Cannot destructure property 'password' of 'undefined'". This is a React SDK-only feature. Need an alternative approach for wallet creation (server-side API, or separate ethers.js wallet).
2. **`generateURL` returns an object**, not a string — need to extract `.url` property.
3. **Privy dashboard must allow `http://localhost:3083`** as an allowed origin for OAuth redirects.
4. **Option B (deep link)** remains the better production approach — eliminates firewall/port concerns entirely.
