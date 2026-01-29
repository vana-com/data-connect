import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

interface DeepLinkParams {
  sessionId?: string;
  appId?: string;
  scopes?: string[];
}

export function useDeepLink() {
  const navigate = useNavigate();
  const [deepLinkParams, setDeepLinkParams] = useState<DeepLinkParams | null>(null);
  const [isDeepLink, setIsDeepLink] = useState(false);

  useEffect(() => {
    const checkDeepLink = async () => {
      try {
        // Check if we were opened via a deep link
        // This will be handled by Tauri deep link registration
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('sessionId');
        const appId = urlParams.get('appId');
        const scopesParam = urlParams.get('scopes');

        if (sessionId || appId) {
          const params: DeepLinkParams = {
            sessionId: sessionId || undefined,
            appId: appId || undefined,
            scopes: scopesParam ? JSON.parse(scopesParam) : undefined,
          };

          setDeepLinkParams(params);
          setIsDeepLink(true);

          // Navigate to grant flow
          navigate('/grant', { state: params });
        }
      } catch (error) {
        console.error('Error checking deep link:', error);
      }
    };

    checkDeepLink();
  }, [navigate]);

  return { deepLinkParams, isDeepLink };
}
