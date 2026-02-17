import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingApproval } from './storage';

type StorageModule = typeof import('./storage');

let storage: StorageModule;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  storage = await import('./storage');
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

const pendingApprovalKey = 'v1_pending_approval';
const pendingRedirectKey = 'v1_pending_grant_redirect';
const authSessionKey = 'v1_auth_session';

const basePending: PendingApproval = {
  sessionId: 'sess-123',
  grantId: 'grant-456',
  secret: 'secret-abc',
  userAddress: '0x1234567890abcdef1234567890abcdef12345678',
  scopes: ['chatgpt.conversations'],
  createdAt: '2025-01-15T12:00:00Z',
};

describe('pendingApproval', () => {
  it('saves and retrieves a pending approval', () => {
    storage.savePendingApproval(basePending);

    const retrieved = storage.getPendingApproval();
    expect(retrieved).toEqual(basePending);
  });

  it('returns null when no pending approval exists', () => {
    expect(storage.getPendingApproval()).toBeNull();
  });

  it('clears the pending approval', () => {
    storage.savePendingApproval(basePending);
    expect(storage.getPendingApproval()).not.toBeNull();

    storage.clearPendingApproval();
    expect(storage.getPendingApproval()).toBeNull();
  });

  it('returns null for corrupt stored data', () => {
    localStorage.setItem(pendingApprovalKey, '{not json');
    expect(storage.getPendingApproval()).toBeNull();
  });

  it('round-trips a pending approval with serverAddress', () => {
    const withServer: PendingApproval = {
      ...basePending,
      serverAddress: '0xserveraddress',
    };
    storage.savePendingApproval(withServer);

    const retrieved = storage.getPendingApproval();
    expect(retrieved).toEqual(withServer);
    expect(retrieved?.serverAddress).toBe('0xserveraddress');
  });

  it('round-trips a pending approval without serverAddress (backward compat)', () => {
    // Old records stored before serverAddress was added should still parse
    storage.savePendingApproval(basePending);

    const retrieved = storage.getPendingApproval();
    expect(retrieved).toEqual(basePending);
    expect(retrieved?.serverAddress).toBeUndefined();
  });

  it('returns null for data that fails schema validation', () => {
    localStorage.setItem(
      pendingApprovalKey,
      JSON.stringify({ sessionId: '', grantId: '' })
    );
    expect(storage.getPendingApproval()).toBeNull();
  });
});

describe('pendingGrantRedirect', () => {
  it('strips secret query params before persisting redirect route', () => {
    storage.savePendingGrantRedirect(
      '/grant?sessionId=sess-1&secret=super-secret&deepLinkUrl=vana%3A%2F%2Fconnect'
    );

    const persisted = storage.getPendingGrantRedirect();
    expect(persisted?.route).toBe(
      '/grant?sessionId=sess-1&deepLinkUrl=vana%3A%2F%2Fconnect'
    );
  });

  it('stores redirect payload with createdAt metadata', () => {
    storage.savePendingGrantRedirect('/grant?sessionId=sess-1');
    const raw = localStorage.getItem(pendingRedirectKey);

    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.route).toBe('/grant?sessionId=sess-1');
    expect(typeof parsed.createdAt).toBe('string');
  });
});

describe('persistedAuthSession', () => {
  it('saves and retrieves persisted auth session', () => {
    storage.savePersistedAuthSession({
      user: {
        id: 'user-1',
        email: 'test@vana.org',
      },
      walletAddress: '0xabc',
    });

    const retrieved = storage.getPersistedAuthSession();
    expect(retrieved?.user).toEqual({
      id: 'user-1',
      email: 'test@vana.org',
    });
    expect(retrieved?.walletAddress).toBe('0xabc');
    expect(typeof retrieved?.createdAt).toBe('string');
  });

  it('clears persisted auth session', () => {
    storage.savePersistedAuthSession({
      user: { id: 'user-2' },
      walletAddress: '0xdef',
    });
    expect(storage.getPersistedAuthSession()).not.toBeNull();

    storage.clearPersistedAuthSession();
    expect(storage.getPersistedAuthSession()).toBeNull();
  });

  it('returns null for corrupt auth session payload', () => {
    localStorage.setItem(authSessionKey, '{not json');
    expect(storage.getPersistedAuthSession()).toBeNull();
  });

  it('returns null for invalid auth session schema', () => {
    localStorage.setItem(
      authSessionKey,
      JSON.stringify({
        user: { id: '' },
        walletAddress: 123,
      })
    );
    expect(storage.getPersistedAuthSession()).toBeNull();
    expect(localStorage.getItem(authSessionKey)).toBeNull();
  });

  it('returns null and clears stale auth session by max age', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-17T00:00:00.000Z'));
    localStorage.setItem(
      authSessionKey,
      JSON.stringify({
        user: { id: 'user-1' },
        walletAddress: '0xabc',
        createdAt: '2026-02-15T00:00:00.000Z',
      })
    );

    expect(storage.getPersistedAuthSession()).toBeNull();
    expect(localStorage.getItem(authSessionKey)).toBeNull();
    vi.useRealTimers();
  });

  it('drops masterKeySignature from persisted auth records', () => {
    localStorage.setItem(
      authSessionKey,
      JSON.stringify({
        user: { id: 'user-legacy' },
        walletAddress: '0xlegacy',
        masterKeySignature: 'should-not-be-loaded',
        createdAt: new Date().toISOString(),
      })
    );

    expect(storage.getPersistedAuthSession()).toEqual({
      user: { id: 'user-legacy' },
      walletAddress: '0xlegacy',
      createdAt: expect.any(String),
    });
  });
});
