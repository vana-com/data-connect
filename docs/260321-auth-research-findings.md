# CLI Auth Research Findings

**Date:** 2026-03-21
**Status:** Reference document

## 1. Token Expiry & Refresh

| Tool | Token Lifetime | Auto-Refresh | On Expiry |
|------|---------------|-------------|-----------|
| GitHub CLI OAuth | Never expires | N/A | Auto-revoked after 1yr inactivity |
| GitHub PATs | 30 days (default, configurable) | No | Commands fail, re-login |
| Stripe CLI | 90 days | No | Commands fail, re-login |
| Vercel CLI | 8hr (OIDC) / 10 days (inactivity) | No | Re-login prompt |
| Codex CLI | 1hr access + long-lived refresh | Yes (transparent) | Seamless if refresh works |
| Claude Code | 2-24hr | Buggy (race conditions) | 401, disruptive |
| AWS IAM keys | Never | N/A | N/A |
| Supabase CLI | Never (PATs) | N/A | N/A |

**Our choice: 30 days, no refresh.** Matches GitHub PAT default. Auto-refresh is nice (Codex) but complex to implement correctly (see Claude Code's bugs). For MVP, explicit re-login is the safer choice.

**Key insight:** No CLI gracefully degrades on expiry. They all fail loudly. No CLI warns before expiry.

**`gh auth logout` doesn't revoke server-side** — same gap we had. We fixed it; GitHub still hasn't.

## 2. Rate Limiting & Brute Force

### User Codes
- RFC 8628 recommends consonant-only charset (20 chars, no vowels to avoid offensive words)
- Our charset: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (30 chars, includes vowels, removes ambiguous 0/O/1/I/L)
- Our entropy: 30^8 ≈ 656 billion — higher than RFC's 20^8 ≈ 25.6 billion
- 5-minute expiry + rate limiting makes brute force infeasible

### Polling
- RFC 8628: 5-second minimum interval, return `slow_down` with +5s penalty if too fast
- Our implementation: 5-second interval with `slow_down` response ✓

### Token Entropy
- GitHub tokens: ~178 bits entropy
- Our `vana_ps_` tokens: 256 bits (32 random bytes) — more than sufficient
- At 256 bits, brute force is computationally impossible

### Session Revocation Dashboard
- GitHub: per-token revoke from settings, org admins can bulk revoke
- Stripe: "Roll key" generates new, invalidates old
- **No CLI tool has a "revoke all sessions" button** — it's a universal gap
- Our current implementation: per-token revocation on logout ✓

### What We're Missing
- No rate limiting on `POST /api/auth/device` (session creation). A flood of requests could fill the DB. Low risk for MVP but should add IP-based rate limiting.
- No rate limiting on the approve endpoint (POST /api/auth/device/approve). Could add failed-attempt counting.

## 3. Personal Data Store Auth Models

### Universal Pattern: Owner vs Apps

| Aspect | Owner | Third-party Apps |
|--------|-------|-----------------|
| Auth mechanism | Interactive login (password, 2FA, OIDC, wallet) | OAuth tokens, API keys, or signed grants |
| Access scope | Full by default | Explicitly scoped and limited |
| Consent | Implicit (it's your data) | Explicit consent required per-scope |
| Revocation | Session management | Per-app token revocation |

**Key insight:** Authentication is often the same protocol. Authorization is what differs. The owner gets broad access by identity; apps get only what's explicitly granted.

### Most Relevant Models

**Solid Pods (closest to our architecture):**
- Same auth protocol (OIDC + DPoP) for owner and apps
- Authorization via Access Grants (Verifiable Credentials)
- Per-resource, per-scope grants with expiration
- Owner reviews and approves each grant
- This is very close to our Web3Signed + grant model

**Mastodon (good scope taxonomy reference):**
- Hierarchical scopes: `read`, `write`, `follow`, `push` + granular sub-scopes (`read:accounts`, `write:statuses`)
- Could inform our scope design

**Google Drive (sensitivity tiers):**
- `drive.file` scope: access only files user explicitly selects
- Three tiers: non-sensitive, sensitive, restricted
- Stronger consent UX for more sensitive scopes

### Is Web3Signed Auth Unusual?

**Yes, but architecturally sound.** No major personal data store uses wallet-signed auth natively today. However:
- Solid's DPoP (proof-of-possession of a key pair) is conceptually similar
- W3C Verifiable Credentials 2.0 (2025) provides a standards bridge
- The pattern of "sign with a private key to prove identity" exists in both wallets and DPoP

Our model (Web3Signed for owner/builders, Bearer token for CLI) is a pragmatic hybrid that serves both crypto-native users and standard tooling.

## Validation of Our Implementation

| Decision | Research Support | Status |
|----------|-----------------|--------|
| Device code flow (RFC 8628) | GitHub, Vercel, Codex all use it | ✓ Correct |
| 30-day token expiry, no refresh | Matches GitHub PATs, simpler than Codex's refresh | ✓ Reasonable |
| Bearer token for CLI, Web3Signed for protocol | Matches Nextcloud (app passwords) + Solid (DPoP) hybrid | ✓ Sound |
| Server-side revocation on logout | Better than GitHub (which doesn't do this) | ✓ Good |
| Self-hosted /auth/device (Nextcloud pattern) | Matches Login Flow v2 from Nextcloud | ✓ Industry-proven |
| XXXX-XXXX code format | Matches GitHub, higher entropy than RFC minimum | ✓ Good |
| `vana_ps_` prefixed tokens, 256-bit entropy | Exceeds GitHub's 178-bit standard | ✓ Excellent |
| No "revoke all sessions" dashboard | Universal gap — no CLI tool has this | Acceptable for MVP |
| No rate limiting on auth creation endpoint | Should add for production | ⚠ Gap |
| No token refresh flow | Simplifies implementation, acceptable at 30-day lifetime | Acceptable for MVP |

## Sources

### CLI Auth Flows
- [GitHub CLI manual](https://cli.github.com/manual/gh_auth_login)
- [Vercel CLI login](https://vercel.com/docs/cli/login)
- [Codex CLI auth](https://developers.openai.com/codex/auth)
- [Claude Code authentication](https://code.claude.com/docs/en/authentication)

### Token Security
- [RFC 8628 - Device Authorization Grant](https://datatracker.ietf.org/doc/html/rfc8628)
- [GitHub token formats](https://github.blog/engineering/platform-security/behind-githubs-new-authentication-token-formats/)
- [Stripe API keys](https://docs.stripe.com/keys)

### Personal Data Stores
- [Solid-OIDC Specification](https://solid.github.io/solid-oidc/)
- [Inrupt Access Grants](https://docs.inrupt.com/ess/latest/security/access-requests-grants/)
- [Mastodon OAuth scopes](https://docs.joinmastodon.org/api/oauth-scopes/)
- [Matrix Authentication Service](https://element-hq.github.io/matrix-authentication-service/topics/authorization.html)
- [Google Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)

### Rate Limiting & Security
- [Microsoft Smart Lockout](https://learn.microsoft.com/en-us/entra/identity/authentication/howto-password-smart-lockout)
- [GitHub Credential Revocation API](https://github.blog/changelog/2025-04-29-credential-revocation-api-to-revoke-exposed-pats-is-now-generally-available/)
- [Google compromised token mitigation](https://cloud.google.com/architecture/bps-for-mitigating-gcloud-oauth-tokens)
