import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuth, setAuthLoading } from '../state/store';
import type { RootState } from '../state/store';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

export function useAuth() {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.app.auth);

  const privyEnabled = !!PRIVY_APP_ID;

  // Set loading to false on mount since auth is handled externally via browser
  useEffect(() => {
    if (auth.isLoading) {
      dispatch(setAuthLoading(false));
    }
  }, [dispatch, auth.isLoading]);

  const logout = useCallback(async () => {
    dispatch(clearAuth());
  }, [dispatch]);

  return {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    user: auth.user,
    walletAddress: auth.walletAddress,
    privyEnabled,
    logout,
  };
}
