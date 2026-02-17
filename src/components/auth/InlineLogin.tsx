import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Loader, ExternalLink } from 'lucide-react';
import { setAuthenticated } from '../../state/store';
import { saveAuthSession } from '../../services/auth-session';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;
const PRIVY_CLIENT_ID = import.meta.env.VITE_PRIVY_CLIENT_ID;

interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email?: string;
  };
  walletAddress?: string;
  authToken?: string;
  masterKeySignature?: string;
  error?: string;
}

export function InlineLogin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStarted, setAuthStarted] = useState(false);
  const isPrivyConfigured = Boolean(PRIVY_APP_ID && PRIVY_CLIENT_ID);

  // Store unlisten function in ref for synchronous cleanup
  const unlistenRef = useRef<(() => void) | null>(null);

  // Listen for auth completion
  useEffect(() => {
    let isActive = true;

    listen<AuthResult>('auth-complete', (event) => {
      const result = event.payload;

      if (result.success && result.user) {
        const session = {
          user: {
            id: result.user.id,
            email: result.user.email,
          },
          walletAddress: result.walletAddress || null,
          masterKeySignature: result.masterKeySignature || null,
        };
        dispatch(
          setAuthenticated({
            user: session.user,
            walletAddress: session.walletAddress,
            masterKeySignature: session.masterKeySignature,
          })
        );
        void saveAuthSession(session);
        navigate(-1); // Go back to grant flow
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
        setIsLoading(false);
        setAuthStarted(false);
      }
    }).then((fn) => {
      if (!isActive) {
        fn();
        return;
      }
      unlistenRef.current = fn;
    });

    // Synchronous cleanup using ref
    return () => {
      isActive = false;
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, [dispatch, navigate]);

  const handleBrowserAuth = useCallback(async () => {
    if (!PRIVY_APP_ID || !PRIVY_CLIENT_ID) {
      setError('Authentication is not configured. Missing VITE_PRIVY_APP_ID or VITE_PRIVY_CLIENT_ID.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setAuthStarted(true);

    try {
      await invoke('start_browser_auth', { privyAppId: PRIVY_APP_ID, privyClientId: PRIVY_CLIENT_ID });
    } catch (err) {
      console.error('Failed to start browser auth:', err);
      setError(err instanceof Error ? err.message : 'Failed to open browser for authentication.');
      setIsLoading(false);
      setAuthStarted(false);
    }
  }, []);

  // Auto-start browser auth on mount
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !PRIVY_APP_ID || !PRIVY_CLIENT_ID) return;
    autoStarted.current = true;
    handleBrowserAuth();
  }, [handleBrowserAuth]);

  useEffect(() => {
    if (isPrivyConfigured) return;
    setError('Authentication is not configured. Missing VITE_PRIVY_APP_ID or VITE_PRIVY_CLIENT_ID.');
  }, [isPrivyConfigured]);

  // Waiting for browser auth to complete
  if (authStarted) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          backgroundColor: '#f5f5f7',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
            textAlign: 'center',
          }}
        >
          <Loader
            style={{
              width: '48px',
              height: '48px',
              color: '#6366f1',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px',
            }}
          />
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
            Complete sign-in in your browser
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            A browser window has opened for you to sign in. Return here once you've completed the sign-in process.
          </p>
          <button
            onClick={() => {
              setAuthStarted(false);
              setIsLoading(false);
            }}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: '#f5f5f7',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
            Welcome to Data Connect
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Sign in to continue</p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              color: '#dc2626',
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleBrowserAuth}
          disabled={isLoading || !isPrivyConfigured}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            padding: '14px 16px',
            fontSize: '15px',
            fontWeight: 500,
            color: 'white',
            backgroundColor: isLoading ? '#9ca3af' : '#6366f1',
            border: 'none',
            borderRadius: '10px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#4f46e5';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#6366f1';
            }
          }}
        >
          {isLoading ? (
            <Loader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
          ) : (
            <ExternalLink style={{ width: '20px', height: '20px' }} />
          )}
          Sign in with Browser
        </button>

        <p
          style={{
            marginTop: '16px',
            fontSize: '13px',
            color: '#9ca3af',
            textAlign: 'center',
          }}
        >
          A browser window will open for secure sign-in with Google or email.
        </p>
      </div>
    </div>
  );
}
