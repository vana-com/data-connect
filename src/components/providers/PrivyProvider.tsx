import type { ReactNode } from 'react';
import { PrivyProvider as PrivyAuthProvider } from '@privy-io/react-auth';

interface PrivyProviderProps {
  children: ReactNode;
}

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;
const PRIVY_CLIENT_ID = import.meta.env.VITE_PRIVY_CLIENT_ID;

export function PrivyProvider({ children }: PrivyProviderProps) {
  // Privy auth is optional - if not configured, just render children
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return (
    <PrivyAuthProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#6366f1',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        loginMethods: ['google', 'email'],
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}
