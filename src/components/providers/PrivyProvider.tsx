import type { ReactNode } from 'react';

interface PrivyProviderProps {
  children: ReactNode;
}

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

export function PrivyProvider({ children }: PrivyProviderProps) {
  // Privy auth is optional - if not configured, just render children
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  // When Privy is properly configured, the real provider would be used here
  // For now, render children since @privy-io/react-auth is an optional dependency
  return <>{children}</>;
}
