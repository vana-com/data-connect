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
  safeSetItem(
    PENDING_GRANT_REDIRECT_KEY,
    JSON.stringify({
      route,
      createdAt: new Date().toISOString(),
    } satisfies PendingGrantRedirect),
  );
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
