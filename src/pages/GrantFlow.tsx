import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { approveSession, getSessionInfo, SessionRelayError } from '../services/sessionRelay';
import { prepareGrantMessage } from '../services/grantSigning';
import { setConnectedApp } from '../lib/storage';
import type { ConnectedApp } from '../types';
import {
  GrantLoadingState,
  GrantAuthRequiredState,
  GrantErrorState,
  GrantSuccessState,
  GrantConsentState,
} from './grant-flow-sections';

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
  const { isAuthenticated, isLoading: authLoading, walletAddress } = useAuth();
  const [flowState, setFlowState] = useState<GrantFlowState>({
    sessionId: '',
    status: 'loading',
  });
  const [currentStep, setCurrentStep] = useState<GrantStep>(1);
  const [isApproving, setIsApproving] = useState(false);

  const params = location.state as { sessionId?: string; appId?: string; scopes?: string[] } | null;

  // Effect 1: Load session (runs only when sessionId/appId changes, NOT on auth state changes)
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
        // Only set session data - auth gating handled by separate effect
        setFlowState((prev) => ({ ...prev, session, sessionId }));
      } catch (error) {
        setFlowState({
          sessionId: params.sessionId!,
          status: 'error',
          error: error instanceof SessionRelayError ? error.message : 'Failed to load session',
        });
      }
    };

    loadSession();
  }, [params?.sessionId, params?.appId]);

  // Effect 2: Gate on auth state (separate from session fetch)
  useEffect(() => {
    // Wait for auth check and session load
    if (authLoading || !flowState.session) return;

    if (!isAuthenticated || !walletAddress) {
      setFlowState((prev) => ({ ...prev, status: 'auth-required' }));
      setCurrentStep(1);
    } else if (flowState.status === 'auth-required' || flowState.status === 'loading') {
      setFlowState((prev) => ({ ...prev, status: 'consent' }));
      setCurrentStep(2);
    }
  }, [isAuthenticated, walletAddress, authLoading, flowState.session, flowState.status]);

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

      // Store connected app using centralized storage
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
    navigate('/data');
  }, [navigate]);

  const handleLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  const handleNavigateToData = useCallback(() => {
    navigate('/data');
  }, [navigate]);

  // Loading state
  if (flowState.status === 'loading' || authLoading) {
    return <GrantLoadingState />;
  }

  // Auth required state
  if (flowState.status === 'auth-required') {
    return (
      <GrantAuthRequiredState
        appName={flowState.session?.appName}
        onLogin={handleLogin}
        onDecline={handleDecline}
      />
    );
  }

  // Error state
  if (flowState.status === 'error') {
    return (
      <GrantErrorState
        error={flowState.error}
        onNavigate={handleNavigateToData}
      />
    );
  }

  // Success state
  if (flowState.status === 'success') {
    return (
      <GrantSuccessState
        appName={flowState.session?.appName}
        onDone={handleNavigateToData}
      />
    );
  }

  // Consent/Signing flow
  return (
    <GrantConsentState
      session={{
        appName: flowState.session?.appName || 'Unknown App',
        appIcon: flowState.session?.appIcon,
        scopes: flowState.session?.scopes || [],
      }}
      walletAddress={walletAddress || ''}
      currentStep={currentStep}
      isApproving={isApproving}
      onApprove={handleApprove}
      onDecline={handleDecline}
    />
  );
}
