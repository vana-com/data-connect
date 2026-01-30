import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

interface DeepLinkParams {
  sessionId?: string;
  appId?: string;
  scopes?: string[];
}

/**
 * Type guard to validate scopes is an array of strings
 */
function isValidScopes(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Parse scopes parameter - accepts JSON array or comma-delimited fallback
 * Returns undefined if invalid (navigation proceeds without scopes)
 */
function parseScopes(scopesParam: string | null): string[] | undefined {
  if (!scopesParam) return undefined;

  // Try JSON array first
  try {
    const parsed = JSON.parse(scopesParam);
    if (isValidScopes(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'string') {
      const commaSplit = parsed.split(',').map((s) => s.trim()).filter(Boolean);
      if (commaSplit.length > 0) {
        return commaSplit;
      }
    }
    console.warn('Deep link scopes JSON parsed but not a string array, ignoring');
  } catch {
    // JSON parse failed, try comma-delimited fallback
    const commaSplit = scopesParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (commaSplit.length > 0) {
      return commaSplit;
    }
    console.warn('Deep link scopes could not be parsed as JSON or comma-delimited, ignoring');
  }

  return undefined;
}

export function useDeepLink() {
  const navigate = useNavigate();
  const [deepLinkParams, setDeepLinkParams] = useState<DeepLinkParams | null>(null);
  const [isDeepLink, setIsDeepLink] = useState(false);

  useEffect(() => {
    const checkDeepLink = () => {
      // Check if we were opened via a deep link
      // This will be handled by Tauri deep link registration
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('sessionId');
      const appId = urlParams.get('appId');
      const scopesParam = urlParams.get('scopes');

      if (sessionId || appId) {
        // Parse scopes separately - invalid scopes shouldn't block navigation
        const scopes = parseScopes(scopesParam);

        const params: DeepLinkParams = {
          sessionId: sessionId || undefined,
          appId: appId || undefined,
          scopes,
        };

        setDeepLinkParams(params);
        setIsDeepLink(true);

        // Navigate to grant flow (even if scopes are invalid)
        navigate('/grant', { state: params });
      }
    };

    checkDeepLink();
  }, [navigate]);

  return { deepLinkParams, isDeepLink };
}
