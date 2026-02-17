/**
 * Centralized localStorage access for app-level persistence.
 *
 * Connected apps are NO LONGER stored in localStorage — the Gateway (via
 * Personal Server GET /v1/grants) is the single source of truth. The old
 * per-key + index scheme and its migration helper have been removed.
 *
 * What remains: pending-approval recovery for split-failure scenarios.
 */

import { z } from 'zod';

const STORAGE_VERSION = 'v1';

/**
 * Safe localStorage write that handles quota/blocked failures.
 * Returns true if write succeeded, false otherwise.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    // QuotaExceededError or SecurityError (blocked storage)
    console.warn(`storage: failed to write ${key}`, error);
    return false;
  }
}

// --- Pending approval recovery ---
// When grant creation succeeds but session approval fails, we persist the
// pending approval so it can be retried on next app open. Without this,
// the grant exists on Gateway but the builder never learns about it.

const PENDING_APPROVAL_KEY = `${STORAGE_VERSION}_pending_approval`;
const PENDING_GRANT_REDIRECT_KEY = `${STORAGE_VERSION}_pending_grant_redirect`;
const AUTH_SESSION_KEY = `${STORAGE_VERSION}_auth_session`;
const AUTH_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours
const AUTH_SESSION_MAX_FUTURE_SKEW_MS = 1000 * 60 * 5; // 5 minutes

export interface PendingApproval {
  sessionId: string;
  grantId: string;
  secret: string;
  userAddress: string;
  serverAddress?: string;
  scopes: string[];
  createdAt: string;
}

const PendingApprovalSchema = z.object({
  sessionId: z.string().min(1),
  grantId: z.string().min(1),
  secret: z.string().min(1),
  userAddress: z.string().min(1),
  serverAddress: z.string().optional(),
  scopes: z.array(z.string()),
  createdAt: z.string(),
});

export function savePendingApproval(approval: PendingApproval): void {
  safeSetItem(PENDING_APPROVAL_KEY, JSON.stringify(approval));
}

export function getPendingApproval(): PendingApproval | null {
  const raw = localStorage.getItem(PENDING_APPROVAL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = PendingApprovalSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function clearPendingApproval(): void {
  localStorage.removeItem(PENDING_APPROVAL_KEY);
}

// --- Pending grant redirect ---
// When a user clicks Allow while logged out, we route them to the root auth
// entrypoint first. Persist the grant URL so we can resume after auth succeeds.

export interface PendingGrantRedirect {
  route: string;
  createdAt: string;
}

const PendingGrantRedirectSchema = z.object({
  route: z.string().min(1),
  createdAt: z.string(),
});

export function savePendingGrantRedirect(route: string): void {
  if (!route) return;
  const sanitizedRoute = sanitizeGrantRedirectRoute(route);
  safeSetItem(
    PENDING_GRANT_REDIRECT_KEY,
    JSON.stringify({
      route: sanitizedRoute,
      createdAt: new Date().toISOString(),
    } satisfies PendingGrantRedirect),
  );
}

function sanitizeGrantRedirectRoute(route: string): string {
  try {
    const url = new URL(route, "https://databridge.local");
    url.searchParams.delete("secret");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return route
      .replace(/([?&])secret=[^&]*(&)?/g, (_match, prefix: string, hasTrailing: string) => {
        if (prefix === "?" && hasTrailing) return "?";
        if (prefix === "&" && hasTrailing) return "&";
        return "";
      })
      .replace(/\?&/, "?")
      .replace(/[?&]$/, "");
  }
}

export function getPendingGrantRedirect(): PendingGrantRedirect | null {
  const raw = localStorage.getItem(PENDING_GRANT_REDIRECT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = PendingGrantRedirectSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function clearPendingGrantRedirect(): void {
  localStorage.removeItem(PENDING_GRANT_REDIRECT_KEY);
}

// --- Durable auth session ---
// Persist minimal auth identity so app restarts can restore signed-in state
// without waiting for another browser callback.

export interface PersistedAuthSession {
  user: {
    id: string;
    email?: string;
  };
  walletAddress: string;
  createdAt: string;
}

const PersistedAuthSessionSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.string().optional(),
  }),
  walletAddress: z.string().min(1),
  createdAt: z.string().datetime(),
});

export function savePersistedAuthSession(
  session: Omit<PersistedAuthSession, "createdAt">
): void {
  safeSetItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      ...session,
      createdAt: new Date().toISOString(),
    } satisfies PersistedAuthSession)
  );
}

export function getPersistedAuthSession(): PersistedAuthSession | null {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = PersistedAuthSessionSchema.safeParse(parsed);
    if (!result.success) {
      clearPersistedAuthSession();
      return null;
    }

    const createdAtMs = new Date(result.data.createdAt).getTime();
    if (!Number.isFinite(createdAtMs)) {
      clearPersistedAuthSession();
      return null;
    }

    const now = Date.now();
    if (createdAtMs > now + AUTH_SESSION_MAX_FUTURE_SKEW_MS) {
      clearPersistedAuthSession();
      return null;
    }

    if (now - createdAtMs > AUTH_SESSION_MAX_AGE_MS) {
      clearPersistedAuthSession();
      return null;
    }

    return result.data;
  } catch {
    clearPersistedAuthSession();
    return null;
  }
}

export function clearPersistedAuthSession(): void {
  localStorage.removeItem(AUTH_SESSION_KEY);
}
