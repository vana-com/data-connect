import type { AuthUser } from '../types';

export type AccountRole = 'standard' | 'debug';

const DEBUG_USER_IDS = new Set<string>([]);
const DEBUG_USER_EMAILS = new Set<string>([]);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function getAccountRole(user: AuthUser | null): AccountRole {
  if (!user) return 'standard';

  if (DEBUG_USER_IDS.has(user.id)) {
    return 'debug';
  }

  if (user.email && DEBUG_USER_EMAILS.has(normalizeEmail(user.email))) {
    return 'debug';
  }

  return 'standard';
}

export function canAccessDebugRuns(user: AuthUser | null): boolean {
  return getAccountRole(user) === 'debug';
}
