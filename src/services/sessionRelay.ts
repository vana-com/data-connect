interface SessionClaimRequest {
  sessionId: string;
  walletAddress: string;
  signature?: string;
}

interface SessionClaimResponse {
  success: boolean;
  session?: {
    id: string;
    appId: string;
    appName: string;
    appIcon?: string;
    scopes: string[];
    expiresAt: string;
  };
  error?: string;
}

interface SessionApprovalRequest {
  sessionId: string;
  walletAddress: string;
  grantSignature: string;
}

interface SessionApprovalResponse {
  success: boolean;
  error?: string;
}

const SESSION_RELAY_URL = import.meta.env.VITE_SESSION_RELAY_URL || 'https://relay.vana.org/api';

export class SessionRelayError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'SessionRelayError';
    this.code = code;
  }
}

export async function claimSession(request: SessionClaimRequest): Promise<SessionClaimResponse> {
  try {
    const response = await fetch(`${SESSION_RELAY_URL}/sessions/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = (await response.json()) as SessionClaimResponse & { code?: string };

    if (!response.ok || !data.success) {
      throw new SessionRelayError(data.error || 'Failed to claim session', (data as { code?: string }).code);
    }

    return data;
  } catch (error) {
    if (error instanceof SessionRelayError) {
      throw error;
    }
    throw new SessionRelayError('Network error while claiming session');
  }
}

export async function approveSession(request: SessionApprovalRequest): Promise<SessionApprovalResponse> {
  try {
    const response = await fetch(`${SESSION_RELAY_URL}/sessions/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = (await response.json()) as SessionApprovalResponse & { code?: string };

    if (!response.ok || !data.success) {
      throw new SessionRelayError(data.error || 'Failed to approve session', (data as { code?: string }).code);
    }

    return data;
  } catch (error) {
    if (error instanceof SessionRelayError) {
      throw error;
    }
    throw new SessionRelayError('Network error while approving session');
  }
}

export async function getSessionInfo(sessionId: string): Promise<SessionClaimResponse['session']> {
  try {
    const response = await fetch(`${SESSION_RELAY_URL}/sessions/${sessionId}`);

    const data = (await response.json()) as { success: boolean; session?: SessionClaimResponse['session']; error?: string; code?: string };

    if (!response.ok || !data.success) {
      throw new SessionRelayError(data.error || 'Failed to get session info', data.code);
    }

    return data.session!;
  } catch (error) {
    if (error instanceof SessionRelayError) {
      throw error;
    }
    throw new SessionRelayError('Network error while fetching session info');
  }
}
