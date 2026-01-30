import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  usePrivy,
  useLoginWithOAuth,
  useLoginWithEmail,
  useCreateWallet,
  useWallets,
} from '@privy-io/react-auth';
import type { User } from '@privy-io/react-auth';
import { Loader, CheckCircle } from 'lucide-react';

export function BrowserLogin() {
  const [searchParams] = useSearchParams();
  const callbackPort = searchParams.get('callbackPort');

  const { authenticated, user, ready } = usePrivy();
  const { wallets } = useWallets();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [authSent, setAuthSent] = useState(false);

  const { createWallet } = useCreateWallet({
    onSuccess: () => {
      setIsCreatingWallet(false);
    },
    onError: (err) => {
      console.error('Wallet creation error:', err);
      setIsCreatingWallet(false);
    },
  });

  const ensureEmbeddedWallet = useCallback(
    async (privyUser: User) => {
      const hasEmbeddedWallet = privyUser.linkedAccounts?.some(
        (account) => account.type === 'wallet' && account.walletClientType === 'privy'
      );

      if (!hasEmbeddedWallet) {
        setIsCreatingWallet(true);
        try {
          await createWallet();
        } catch (err) {
          console.error('Failed to create embedded wallet:', err);
          setIsCreatingWallet(false);
        }
      }
    },
    [createWallet]
  );

  const { initOAuth, state: oauthState } = useLoginWithOAuth({
    onComplete: async ({ user: privyUser }) => {
      setError(null);
      await ensureEmbeddedWallet(privyUser);
    },
    onError: (err) => {
      console.error('OAuth Error:', err);
      setError(err || 'Login with Google failed.');
    },
  });

  const { sendCode, loginWithCode, state: emailState } = useLoginWithEmail({
    onComplete: async ({ user: privyUser }) => {
      setError(null);
      await ensureEmbeddedWallet(privyUser);
    },
    onError: (err) => {
      console.error('Email Error:', err);
      setError(err || 'Failed to send/verify code.');
    },
  });

  // Send auth result to callback server when authenticated
  useEffect(() => {
    if (authenticated && user && callbackPort && !authSent && !isCreatingWallet) {
      const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy');
      const linkedWallet = user.linkedAccounts?.find(
        (account) => account.type === 'wallet' && account.walletClientType === 'privy'
      );

      const walletAddress =
        (linkedWallet && 'address' in linkedWallet ? linkedWallet.address : null) ||
        embeddedWallet?.address ||
        null;

      // Wait a bit for wallet to be ready if still creating
      if (!walletAddress && user.linkedAccounts?.length === 0) {
        return;
      }

      const sendAuthResult = async () => {
        try {
          await fetch(`http://localhost:${callbackPort}/auth-callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: true,
              user: {
                id: user.id,
                email: user.email?.address || null,
              },
              walletAddress,
            }),
          });
          setAuthSent(true);
        } catch (err) {
          console.error('Failed to send auth result:', err);
          setError('Failed to communicate with app. Please try again.');
        }
      };

      sendAuthResult();
    }
  }, [authenticated, user, wallets, callbackPort, authSent, isCreatingWallet]);

  const handleGoogleLogin = useCallback(() => {
    setError(null);
    initOAuth({ provider: 'google' });
  }, [initOAuth]);

  const handleSendCode = useCallback(async () => {
    setError(null);
    try {
      await sendCode({ email });
      setIsCodeSent(true);
    } catch {
      // Error handled by onError callback
    }
  }, [email, sendCode]);

  const handleLoginWithCode = useCallback(async () => {
    setError(null);
    try {
      await loginWithCode({ code });
    } catch {
      // Error handled by onError callback
    }
  }, [code, loginWithCode]);

  const isLoading =
    oauthState.status === 'loading' ||
    emailState.status === 'sending-code' ||
    emailState.status === 'submitting-code' ||
    isCreatingWallet;

  // No callback port - show error
  if (!callbackPort) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Invalid Request</h1>
          <p style={styles.subtitle}>
            This page should be opened from the DataBridge app. Please return to the app and try again.
          </p>
        </div>
      </div>
    );
  }

  // Loading Privy
  if (!ready) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <Loader style={{ ...styles.loader, margin: '0 auto' }} />
          <p style={{ ...styles.subtitle, textAlign: 'center', marginTop: '16px' }}>Initializing...</p>
        </div>
      </div>
    );
  }

  // Auth complete
  if (authSent) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <div style={styles.successIcon}>
            <CheckCircle style={{ width: '32px', height: '32px', color: '#22c55e' }} />
          </div>
          <h1 style={styles.title}>You're signed in!</h1>
          <p style={styles.subtitle}>You can close this window and return to the app.</p>
        </div>
      </div>
    );
  }

  // Creating wallet
  if (authenticated && isCreatingWallet) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <Loader style={{ ...styles.loader, margin: '0 auto' }} />
          <p style={{ ...styles.subtitle, textAlign: 'center', marginTop: '16px' }}>
            Setting up your wallet...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={styles.title}>Welcome to Data Connect</h1>
          <p style={styles.subtitle}>Sign in to continue</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button onClick={handleGoogleLogin} disabled={isLoading} style={styles.googleBtn}>
          {oauthState.status === 'loading' ? (
            <Loader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </button>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        {!isCodeSent ? (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={styles.input}
              />
            </div>
            <button
              onClick={handleSendCode}
              disabled={isLoading || !email}
              style={{
                ...styles.primaryBtn,
                backgroundColor: isLoading || !email ? '#9ca3af' : '#1a1a1a',
              }}
            >
              {emailState.status === 'sending-code' ? (
                <>
                  <Loader style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  Sending...
                </>
              ) : (
                'Send sign-in code'
              )}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Enter the code sent to {email}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code"
                maxLength={6}
                style={{ ...styles.input, textAlign: 'center', letterSpacing: '4px' }}
              />
            </div>
            <button
              onClick={handleLoginWithCode}
              disabled={isLoading || !code}
              style={{
                ...styles.primaryBtn,
                backgroundColor: isLoading || !code ? '#9ca3af' : '#6366f1',
              }}
            >
              {emailState.status === 'submitting-code' ? (
                <>
                  <Loader style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  Verifying...
                </>
              ) : (
                'Verify code'
              )}
            </button>
            <button
              onClick={() => {
                setIsCodeSent(false);
                setCode('');
                setError(null);
              }}
              style={styles.linkBtn}
            >
              Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    backgroundColor: '#f5f5f7',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '8px',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  error: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#dc2626',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    fontWeight: 500,
    color: '#1a1a1a',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    margin: '24px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#1a1a1a',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 500,
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  linkBtn: {
    width: '100%',
    marginTop: '12px',
    padding: '12px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  loader: {
    width: '32px',
    height: '32px',
    color: '#6366f1',
    animation: 'spin 1s linear infinite',
  },
  successIcon: {
    width: '64px',
    height: '64px',
    backgroundColor: '#dcfce7',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
};
