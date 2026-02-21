import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuth } from '../state/store';
import type { RootState } from '../state/store';

export function useAuth() {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.app.auth);

  const logout = useCallback(async () => {
    dispatch(clearAuth());
  }, [dispatch]);

  return {
    isAuthenticated: Boolean(auth.walletAddress && auth.masterKeySignature),
    isLoading: false,
    user: auth.user,
    walletAddress: auth.walletAddress,
    masterKeySignature: auth.masterKeySignature,
    accountRole: auth.accountRole,
    canAccessDebugRuns: auth.accountRole === 'debug',
    logout,
  };
}
