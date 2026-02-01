import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import { setAuthenticated } from '../state/store';
import { approveSession, getSessionInfo, SessionRelayError } from '../services/sessionRelay';
import { prepareGrantMessage } from '../services/grantSigning';
import { setConnectedApp } from '../lib/storage';
import type { ConnectedApp } from '../types';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;

interface GrantFlowState {
  sessionId: string;
  status: 'loading' | 'auth-required' | 'consent' | 'signing' | 'success' | 'error';
  error?: string;
  session?: {
    id: string;
    appId: string;
    appName: string;
    appIcon?: string;
    scopes: string[];
    expiresAt: string;
  };
}

type GrantStep = 1 | 2 | 3;

export function GrantFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading: authLoading, walletAddress } = useAuth();
  const [flowState, setFlowState] = useState<GrantFlowState>({
    sessionId: '',
    status: 'loading',
  });
  const [currentStep, setCurrentStep] = useState<GrantStep>(1);
  const authTriggered = useRef(false);
  const [isApproving, setIsApproving] = useState(false);

  const params = location.state as { sessionId?: string; appId?: string; scopes?: string[] } | null;

  useEffect(() => {
    if (!params?.sessionId) {
      setFlowState({
        sessionId: '',
        status: 'error',
        error: 'No session ID provided. Please restart the flow from the app.',
      });
      return;
    }

    const loadSession = async () => {
      const sessionId = params.sessionId!;
      try {
        setFlowState((prev) => ({ ...prev, status: 'loading', sessionId }));

        // Check if this is a local demo app (sessionId starts with 'grant-session-')
        // For demo apps, use mock session data instead of fetching from relay
        let session: GrantFlowState['session'];
        if (sessionId.startsWith('grant-session-') && params.appId) {
          // Mock session data for local demo apps
          const demoApps: Record<string, { name: string; icon: string; scopes: string[] }> = {
            rickroll: {
              name: 'RickRoll Facts',
              icon: '🎵',
              scopes: ['read:chatgpt-conversations'],
            },
          };
          const appInfo = demoApps[params.appId] || { name: params.appId, icon: '🔗', scopes: ['read:data'] };
          session = {
            id: sessionId,
            appId: params.appId,
            appName: appInfo.name,
            appIcon: appInfo.icon,
            scopes: appInfo.scopes,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          };
        } else {
          session = await getSessionInfo(sessionId);
        }
        setFlowState((prev) => ({ ...prev, session, sessionId }));

        if (authLoading) return;

        if (!isAuthenticated) {
          setFlowState((prev) => ({ ...prev, status: 'auth-required' }));
          setCurrentStep(1);
        } else {
          setFlowState((prev) => ({ ...prev, status: 'consent' }));
          setCurrentStep(2);
        }
      } catch (error) {
        setFlowState({
          sessionId: params.sessionId!,
          status: 'error',
          error: error instanceof SessionRelayError ? error.message : 'Failed to load session',
        });
      }
    };

    loadSession();
  }, [params, isAuthenticated, walletAddress, authLoading]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && flowState.sessionId) {
      if (flowState.status === 'auth-required') {
        setFlowState((prev) => ({ ...prev, status: 'consent' }));
        setCurrentStep(2);
      }
    }
  }, [authLoading, isAuthenticated, walletAddress, flowState.sessionId, flowState.status]);

  // Auto-start browser auth when auth is required
  useEffect(() => {
    if (flowState.status !== 'auth-required' || authTriggered.current || !PRIVY_APP_ID) return;
    authTriggered.current = true;
    invoke('start_browser_auth', { privyAppId: PRIVY_APP_ID, privyClientId: import.meta.env.VITE_PRIVY_CLIENT_ID || undefined }).catch((err) => {
      console.error('Failed to start browser auth:', err);
    });
  }, [flowState.status]);

  // Listen for auth completion from browser
  useEffect(() => {
    const unlisten = listen<{ success: boolean; user?: { id: string; email: string | null }; walletAddress?: string; masterKeySignature?: string; error?: string }>(
      'auth-complete',
      (event) => {
        const result = event.payload;
        if (result.success && result.user) {
          dispatch(
            setAuthenticated({
              user: { id: result.user.id, email: result.user.email || undefined },
              walletAddress: result.walletAddress || null,
              masterKeySignature: result.masterKeySignature || null,
            })
          );
        }
      }
    );
    return () => { unlisten.then((fn) => fn()); };
  }, [dispatch]);

  const handleApprove = useCallback(async () => {
    if (!flowState.session || !walletAddress) return;

    setIsApproving(true);
    setFlowState((prev) => ({ ...prev, status: 'signing' }));
    setCurrentStep(3);

    try {
      const grantData = {
        sessionId: flowState.session.id,
        appId: flowState.session.appId,
        scopes: flowState.session.scopes,
        expiresAt: flowState.session.expiresAt,
        walletAddress,
      };

      // Prepare the grant message
      const typedData = prepareGrantMessage(grantData);

      // For now, we'll use a placeholder signature
      // In production, this would use the Privy wallet to sign
      const typedDataString = JSON.stringify(typedData);
      const mockSignature = `0x${typedDataString}${'0'.repeat(Math.max(0, 130 - typedDataString.length))}`.slice(0, 132);

      // Skip relay call for local demo sessions
      if (!flowState.sessionId.startsWith('grant-session-')) {
        await approveSession({
          sessionId: flowState.sessionId,
          walletAddress,
          grantSignature: mockSignature,
        });
      }

      setFlowState((prev) => ({ ...prev, status: 'success' }));

      // Add to connected apps (this would normally come from the backend)
      const newApp: ConnectedApp = {
        id: flowState.session.appId,
        name: flowState.session.appName,
        icon: flowState.session.appIcon,
        permissions: flowState.session.scopes,
        connectedAt: new Date().toISOString(),
      };

      // Store in versioned storage
      setConnectedApp(newApp);
    } catch (error) {
      setFlowState({
        sessionId: flowState.sessionId,
        status: 'error',
        error: error instanceof SessionRelayError ? error.message : 'Failed to approve session',
      });
    } finally {
      setIsApproving(false);
    }
  }, [flowState.session, flowState.sessionId, walletAddress]);

  const handleDecline = useCallback(() => {
    navigate(flowState.session?.appId ? `/apps/${flowState.session.appId}` : '/data');
  }, [navigate, flowState.session]);


  // Loading state
  if (flowState.status === 'loading' || authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f7',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Loader
            style={{ width: '48px', height: '48px', color: '#6366f1', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}
          />
          <p style={{ color: '#6b7280', fontSize: '15px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Auth required state — browser auth is auto-started, show waiting UI
  if (flowState.status === 'auth-required') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f7',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
            textAlign: 'center',
          }}
        >
          <Loader
            style={{ width: '48px', height: '48px', color: '#6366f1', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }}
          />
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
            Sign in to continue
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: '1.5', marginBottom: '24px' }}>
            A sign-in page has opened in your browser.
            Complete the sign-in to grant <strong>{flowState.session?.appName || 'this app'}</strong> access to your data.
          </p>

          <button
            onClick={handleDecline}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
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

  // Error state
  if (flowState.status === 'error') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f7',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
            textAlign: 'center',
          }}
        >
          <XCircle style={{ width: '64px', height: '64px', color: '#ef4444', margin: '0 auto 20px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '24px' }}>{flowState.error}</p>
          <button
            onClick={() => navigate(flowState.session?.appId ? `/apps/${flowState.session.appId}` : '/data')}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#1a1a1a',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#333';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1a1a1a';
            }}
          >
            Go to Your Data
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (flowState.status === 'success') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f7',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
            textAlign: 'center',
          }}
        >
          <CheckCircle style={{ width: '64px', height: '64px', color: '#22c55e', margin: '0 auto 20px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
            Access Granted
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '8px' }}>
            You've successfully granted <strong>{flowState.session?.appName || 'the app'}</strong> access to
            your data.
          </p>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '24px' }}>
            You can manage this connection in Settings anytime.
          </p>
          <button
            onClick={() => navigate(flowState.session?.appId ? `/apps/${flowState.session.appId}` : '/data')}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#6366f1',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4f46e5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6366f1';
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Consent/Signing flow
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f7',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {[1, 2, 3].map((step) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= step ? '#6366f1' : '#e5e7eb',
                  color: currentStep >= step ? 'white' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  style={{
                    width: '24px',
                    height: '2px',
                    backgroundColor: currentStep > step ? '#6366f1' : '#e5e7eb',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* App Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: flowState.session?.appIcon ? 'transparent' : '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              flexShrink: 0,
            }}
          >
            {flowState.session?.appIcon || '🔗'}
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
              {flowState.session?.appName || 'Unknown App'}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>is requesting access to your data</p>
          </div>
        </div>

        {/* Scope Details */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
            Permissions requested:
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#6b7280' }}>
            {flowState.session?.scopes.map((scope) => (
              <li key={scope} style={{ marginBottom: '4px' }}>
                {scope}
              </li>
            )) || <li>No specific permissions requested</li>}
          </ul>
        </div>

        {/* Wallet Info */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '13px',
          }}
        >
          <span style={{ color: '#6b7280' }}>Signing as: </span>
          <span style={{ color: '#1a1a1a', fontFamily: 'monospace' }}>
            {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
          </span>
        </div>

        {/* Warning */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <AlertCircle style={{ width: '18px', height: '18px', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '13px', color: '#92400e', margin: 0, lineHeight: '1.4' }}>
            By approving, you authorize this app to access the specified data. You can revoke this access
            anytime from Settings.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleDecline}
            disabled={isApproving}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '15px',
              fontWeight: 500,
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              cursor: isApproving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isApproving) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Decline
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving}
            style={{
              flex: 1,
              padding: '14px',
              fontSize: '15px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: isApproving ? '#9ca3af' : '#6366f1',
              border: 'none',
              borderRadius: '10px',
              cursor: isApproving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              if (!isApproving) {
                e.currentTarget.style.backgroundColor = '#4f46e5';
              }
            }}
            onMouseLeave={(e) => {
              if (!isApproving) {
                e.currentTarget.style.backgroundColor = '#6366f1';
              }
            }}
          >
            {isApproving ? (
              <>
                <Loader style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                Approving...
              </>
            ) : (
              'Approve'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
