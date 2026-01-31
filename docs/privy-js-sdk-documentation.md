# Privy Vanilla JavaScript SDK (`@privy-io/js-sdk-core`) Documentation

> Reference documentation for integrating Privy authentication and wallet infrastructure using the vanilla JS SDK. This is the low-level SDK used by DataBridge's self-contained auth page (not the React SDK).

**Package:** `@privy-io/js-sdk-core`
**Docs:** https://docs.privy.io/recipes/core-js

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Initialization](#initialization)
5. [Secure Context (iframe)](#secure-context-iframe)
6. [Authentication](#authentication)
   - [OAuth (Google, Apple, Twitter, etc.)](#oauth)
   - [Email OTP](#email-otp)
   - [SMS OTP](#sms-otp)
   - [JWT-based Auth](#jwt-based-auth)
7. [Embedded Wallets](#embedded-wallets)
   - [Creating Wallets](#creating-wallets)
   - [Using Wallets (Signing & Transactions)](#using-wallets)
8. [User Management](#user-management)
9. [Security Model](#security-model)
10. [DataBridge-Specific Notes](#databridge-specific-notes)
11. [API Quick Reference](#api-quick-reference)
12. [Troubleshooting](#troubleshooting)

---

## Overview

`@privy-io/js-sdk-core` is a low-level vanilla JavaScript library for browser environments. It provides:

- **Authentication** — Email OTP, SMS OTP, OAuth (Google, Apple, Twitter, Farcaster, etc.), external OIDC/JWT
- **Embedded wallets** — Self-custodial Ethereum and Solana wallets provisioned client-side
- **User management** — Link multiple auth methods to a single user account

Privy explicitly notes this is a low-level library and recommends contacting their team before using it (vs. the React SDK). DataBridge uses it because the auth page is a standalone HTML file served by Rust, not a React app.

---

## Prerequisites

- A **Privy App ID** and **Client ID** from the [Privy Dashboard](https://dashboard.privy.io)
- Configure allowed origins in the dashboard (e.g., `http://localhost:3083` for DataBridge dev)
- Configure allowed OAuth redirect URLs in the dashboard

---

## Installation

```bash
npm install @privy-io/js-sdk-core@latest
```

For CDN usage (as DataBridge does in the bundled auth page):

```html
<script type="module">
  import Privy, { LocalStorage } from 'https://esm.sh/@privy-io/js-sdk-core@0.58.5';
</script>
```

---

## Initialization

```js
import Privy, { LocalStorage } from '@privy-io/js-sdk-core';

const privy = new Privy({
  appId: '<YOUR_APP_ID>',
  clientId: '<YOUR_CLIENT_ID>',     // Note: `clientId`, NOT `appClientId` (React SDK uses appClientId)
  supportedChains: [/* chain configs */],
  storage: new LocalStorage()        // or InMemoryCache — see caveats below
});
```

**Important:** Only one `Privy` instance should exist per app.

### Storage Options

| Storage | Use Case | Caveats |
|---------|----------|---------|
| `LocalStorage` | Default, works for OAuth flows | Requires stable origin (fixed port) |
| `InMemoryCache` | Email/SMS OTP only | Breaks OAuth — state lost on redirect |

For DataBridge's localhost server, a **fixed port (3083)** is required so localStorage persists across the OAuth redirect cycle.

---

## Secure Context (iframe)

To provision embedded wallets, the SDK needs a secure iframe context for key operations:

```js
// 1. Get the iframe URL from Privy
const iframeUrl = privy.embeddedWallet.getURL();

// 2. Mount the iframe
const iframe = document.createElement('iframe');
iframe.src = iframeUrl;
document.body.appendChild(iframe);

// 3. Connect message passing
privy.setMessagePoster(iframe.contentWindow);
const listener = (e) => privy.embeddedWallet.onMessage(e.data);
window.addEventListener('message', listener);
```

This iframe hosts Privy's secure execution environment where key sharding and signing operations occur. Neither your app nor Privy can access the user's full private key — it is only reconstituted inside this secure context at the moment of signing.

---

## Authentication

### OAuth

OAuth is a two-step process: generate a URL, redirect the user, then exchange the code on return.

```js
// Step 1: Generate the OAuth URL
const provider = 'google';  // or 'apple', 'twitter', 'discord', 'github', 'farcaster', etc.
const redirectURI = `${window.location.origin}/login-callback`;

const result = await privy.auth.oauth.generateURL(provider, redirectURI);
// IMPORTANT: result is an object, not a string
const oauthURL = result.url;

// Step 2: Redirect the user
window.location.assign(oauthURL);

// Step 3: On callback page, exchange the code
const queryParams = new URLSearchParams(window.location.search);
const oauthCode = queryParams.get('privy_oauth_code');
const oauthState = queryParams.get('privy_oauth_state');

const session = await privy.auth.oauth.loginWithCode(oauthCode, oauthState);
```

**Key gotchas:**
- `generateURL()` returns `{ url: string }`, not a bare string
- The redirect page must use the **same Privy instance** with **same storage** — this is why fixed ports matter
- `localStorage` must be accessible (same origin before and after redirect)
- Privy dashboard must have the redirect URL allowlisted

### Email OTP

No redirect needed — works with any storage type.

```js
// Step 1: Send the code
await privy.auth.email.sendCode('user@example.com');

// Step 2: User enters the code, verify it
const session = await privy.auth.email.loginWithCode('user@example.com', '123456');
```

### SMS OTP

```js
// Step 1: Send the code
await privy.auth.sms.sendCode('+1234567890');

// Step 2: Verify
const session = await privy.auth.sms.loginWithCode('+1234567890', '123456');
```

### JWT-based Auth

For integrating with an existing auth provider (Auth0, Firebase, AWS Cognito, or any OIDC-compliant system):

```js
const session = await privy.auth.custom.authenticate({ token: '<your-jwt-token>' });
```

This lets you use Privy's wallet infrastructure while keeping your own authentication system.

---

## Embedded Wallets

Privy provisions self-custodial wallets using distributed key sharding. Keys are never stored in complete form — they are split across security boundaries and only reconstituted inside a TEE (Trusted Execution Environment) at the moment of signing.

### Creating Wallets

**Ethereum:**

```js
import { getUserEmbeddedEthereumWallet, getEntropyDetailsFromUser } from '@privy-io/js-sdk-core';

// IMPORTANT: Pass an empty object {}, not undefined
const { user } = await privy.embeddedWallet.create({});

const wallet = getUserEmbeddedEthereumWallet(user);
const { entropyId, entropyIdVerifier } = getEntropyDetailsFromUser(user);

const provider = await privy.embeddedWallet.getEthereumProvider({
  wallet,
  entropyId,
  entropyIdVerifier
});
```

**Solana:**

```js
import { getUserEmbeddedSolanaWallet, getEntropyDetailsFromUser } from '@privy-io/js-sdk-core';

const { user } = await privy.embeddedWallet.create({});

const wallet = getUserEmbeddedSolanaWallet(user);
const { entropyId, entropyIdVerifier } = getEntropyDetailsFromUser(user);

const provider = await privy.embeddedWallet.getSolanaProvider({
  wallet,
  entropyId,
  entropyIdVerifier
});
```

**Gotcha:** `privy.embeddedWallet.create()` requires `{}` as argument. Omitting it causes: `Cannot destructure property 'password' of 'undefined'`.

The created wallet address can be found in `user.linkedAccounts`.

### Using Wallets

**Sign a message (Ethereum):**

```js
const provider = await privy.embeddedWallet.getEthereumProvider({ ...args });

await provider.request({
  method: 'personal_sign',
  params: ['hello world', walletAddress]
});
```

**Send a transaction (Ethereum):**

```js
await provider.request({
  method: 'eth_sendTransaction',
  params: [{
    from: walletAddress,
    to: '0x...',
    value: '0x...',
    data: '0x...'
  }]
});
```

**Sign typed data (EIP-712):**

```js
await provider.request({
  method: 'eth_signTypedData_v4',
  params: [walletAddress, JSON.stringify(typedData)]
});
```

The wallet must have funds to pay gas for transactions. Use testnet faucets (e.g., Base Sepolia) for development.

---

## User Management

Privy users can have multiple linked accounts (email, phone, social logins, wallets). After authentication, the session object provides:

- **User ID** — Privy's internal identifier
- **Linked accounts** — All auth methods and wallets associated with the user
- **Session tokens** — For verifying the user server-side

Server-side user management is available via the REST API:
- Search, create, delete users
- Verify session tokens
- Manage wallets programmatically

Webhooks can be configured in the dashboard to notify your server when users are created, log in, or perform other actions.

---

## Security Model

Privy's security architecture is built on:

| Component | Description |
|-----------|-------------|
| **Key sharding** | Private keys are split across independent security boundaries, never stored whole |
| **TEEs (Secure Enclaves)** | Signing happens inside AWS Nitro Enclaves — hardware-isolated execution environments |
| **Non-custodial** | Neither Privy nor your app can access user keys |
| **Key export** | Users can export their private key as an escape hatch |
| **SOC2 Type II** | Independently audited by Cure53, Zellic, and Doyensec |
| **Bug bounty** | Active program on HackerOne |

Supported chains: All EVM-compatible (Ethereum, Base, Arbitrum, HyperEVM, etc.), Solana, SVM-compatible, plus Bitcoin, TRON, Stellar, and others.

---

## DataBridge-Specific Notes

DataBridge uses the vanilla JS SDK in a self-contained HTML page served by Rust:

### Auth Flow

```
User clicks "Grant Access"
  → Tauri starts localhost:3083
  → Opens system browser
  → Browser loads bundled auth page (Privy vanilla JS SDK)
  → User authenticates (Google OAuth or Email OTP)
  → JS POSTs session data to localhost:3083/auth-callback
  → Rust receives data, emits event to frontend
  → Frontend updates Redux state
  → Browser shows "You're signed in!"
```

### Key Configuration

| Setting | Value |
|---------|-------|
| SDK package | `@privy-io/js-sdk-core@0.58.5` (via esm.sh CDN) |
| Auth page | `src-tauri/auth-page/index.html` |
| Rust server | `src-tauri/src/commands/auth.rs` |
| Fixed port | `3083` (fallback: `5173`) |
| Storage | `LocalStorage` (required for OAuth) |
| Dashboard origin | `http://localhost:3083` must be allowlisted |

### Why Not the React SDK?

- Auth page is standalone HTML served by Rust via `include_str!`
- No React build pipeline in the auth page context
- The vanilla SDK is sufficient for our auth-only use case

---

## API Quick Reference

### Constructor

```js
new Privy({ appId, clientId, supportedChains?, storage })
```

### Auth Methods

| Method | Signature | Returns |
|--------|-----------|---------|
| **OAuth generate URL** | `privy.auth.oauth.generateURL(provider, redirectURI)` | `Promise<{ url: string }>` |
| **OAuth login** | `privy.auth.oauth.loginWithCode(code, state)` | `Promise<Session>` |
| **Email send code** | `privy.auth.email.sendCode(email)` | `Promise<void>` |
| **Email login** | `privy.auth.email.loginWithCode(email, code)` | `Promise<Session>` |
| **SMS send code** | `privy.auth.sms.sendCode(phone)` | `Promise<void>` |
| **SMS login** | `privy.auth.sms.loginWithCode(phone, code)` | `Promise<Session>` |
| **Custom JWT** | `privy.auth.custom.authenticate({ token })` | `Promise<Session>` |

### Embedded Wallet Methods

| Method | Signature |
|--------|-----------|
| **Create wallet** | `privy.embeddedWallet.create({})` |
| **Get iframe URL** | `privy.embeddedWallet.getURL()` |
| **Set message poster** | `privy.setMessagePoster(iframe.contentWindow)` |
| **Handle messages** | `privy.embeddedWallet.onMessage(event.data)` |
| **Get ETH provider** | `privy.embeddedWallet.getEthereumProvider({ wallet, entropyId, entropyIdVerifier })` |
| **Get SOL provider** | `privy.embeddedWallet.getSolanaProvider({ wallet, entropyId, entropyIdVerifier })` |

### Helper Functions

| Function | Purpose |
|----------|---------|
| `getUserEmbeddedEthereumWallet(user)` | Extract ETH wallet from user object |
| `getUserEmbeddedSolanaWallet(user)` | Extract SOL wallet from user object |
| `getEntropyDetailsFromUser(user)` | Get entropy ID/verifier for wallet provider |

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Unexpected auth flow" after OAuth redirect | `InMemoryCache` loses state on redirect | Use `LocalStorage` with a fixed port |
| "Unable to access storage" | Origin changes between requests (random port) | Use fixed port (3083) |
| `Cannot destructure property 'password' of 'undefined'` | `create()` called without `{}` | Pass empty object: `create({})` |
| `generateURL` returns object, not string | API returns `{ url }` | Extract `.url` property |
| OAuth redirect fails | Redirect URL not allowlisted in dashboard | Add `http://localhost:3083` to Privy dashboard allowed origins |
| Google OAuth blocked | Running inside webview/iframe | Must use system browser — Google blocks embedded webviews |

---

## References

- Privy JS SDK Recipe: https://docs.privy.io/recipes/core-js
- Authentication Overview: https://docs.privy.io/authentication/overview
- Wallets Overview: https://docs.privy.io/wallets/overview
- Security Overview: https://docs.privy.io/security/overview
- User Management: https://docs.privy.io/user-management/overview
- API Reference: https://docs.privy.io/api-reference/introduction
- Privy Dashboard: https://dashboard.privy.io
