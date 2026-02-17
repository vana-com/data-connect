import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { setAuthenticated } from '../state/store';
import { getPersistedAuthSession } from '../lib/storage';
import { useEvents } from './useEvents';

const mockDispatch = vi.fn();
const listeners = new Map<string, (event: { payload: unknown }) => void>();

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, handler: (event: { payload: unknown }) => void) => {
    listeners.set(eventName, handler);
    return Promise.resolve(vi.fn());
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

function emit(eventName: string, payload: unknown) {
  const handler = listeners.get(eventName);
  if (!handler) throw new Error(`No listener registered for ${eventName}`);
  handler({ payload });
}

describe('useEvents auth-complete guard', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    listeners.clear();
    localStorage.clear();
  });

  it('clears persisted auth and does not authenticate when walletAddress is missing', () => {
    localStorage.setItem(
      'v1_auth_session',
      JSON.stringify({
        user: { id: 'old-user' },
        walletAddress: '0xold',
        masterKeySignature: null,
        createdAt: new Date().toISOString(),
      })
    );

    renderHook(() => useEvents());
    emit('auth-complete', {
      success: true,
      user: { id: 'user-1', email: 'test@vana.org' },
      walletAddress: '',
      masterKeySignature: '0xsig',
    });

    expect(localStorage.getItem('v1_auth_session')).toBeNull();
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: setAuthenticated.type,
      })
    );
  });

  it('persists and authenticates on valid auth-complete payload', () => {
    renderHook(() => useEvents());
    emit('auth-complete', {
      success: true,
      user: { id: 'user-1', email: 'test@vana.org' },
      walletAddress: '0xabc',
      masterKeySignature: '0xsig',
    });

    expect(getPersistedAuthSession()).toMatchObject({
      user: { id: 'user-1', email: 'test@vana.org' },
      walletAddress: '0xabc',
      masterKeySignature: '0xsig',
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      setAuthenticated({
        user: { id: 'user-1', email: 'test@vana.org' },
        walletAddress: '0xabc',
        masterKeySignature: '0xsig',
      })
    );
  });
});
