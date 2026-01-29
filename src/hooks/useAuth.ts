import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuth, setAuthLoading } from '../state/store';
import type { RootState } from '../state/store';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

export function useAuth() {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.app.auth);

  const privyEnabled = !!PRIVY_APP_ID;

  // Note: Privy hooks need to be used within components that are wrapped by PrivyProvider
  // This is a simplified version that works without Privy or gracefully degrades
  useEffect(() => {
    if (!privyEnabled) {
      dispatch(setAuthLoading(false));
      return;
    }

    // If Privy is configured, we'd initialize it here
    // For now, mark as not loading since Privy integration is optional
    dispatch(setAuthLoading(false));
  }, [dispatch, privyEnabled]);

  const logout = useCallback(async () => {
    // Privy logout would be called here if Privy was initialized
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
