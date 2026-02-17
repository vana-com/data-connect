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

const basePending: PendingApproval = {
  sessionId: 'sess-123',
  grantId: 'grant-456',
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

  it('pending_approval_does_not_persist_secret_after_migration', () => {
    localStorage.setItem(
      pendingApprovalKey,
      JSON.stringify({
        ...basePending,
        secret: 'legacy-secret',
      })
    );

    const retrieved = storage.getPendingApproval();
    expect(retrieved).toEqual(basePending);

    const storedAfterRead = localStorage.getItem(pendingApprovalKey);
    expect(storedAfterRead).not.toContain('legacy-secret');
    expect(storedAfterRead).not.toContain('"secret"');
  });
});
