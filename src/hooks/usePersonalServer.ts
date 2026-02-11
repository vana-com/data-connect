import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSelector } from 'react-redux';
import type { RootState } from '../state/store';

interface PersonalServerStatus {
  running: boolean;
  port: number | null;
}

// Module-level state shared across all hook instances so the tunnel URL
// survives component remounts (e.g. navigating away from the runs page).
let _sharedTunnelUrl: string | null = null;
const isTauriRuntime = () =>
  typeof window !== 'undefined' &&
  ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);

export function usePersonalServer() {
  const { walletAddress, masterKeySignature } = useSelector(
    (state: RootState) => state.app.auth
  );
  const [status, setStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [port, setPort] = useState<number | null>(null);
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(_sharedTunnelUrl);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const startServer = useCallback(async (wallet?: string | null) => {
    if (!isTauriRuntime()) return;
    if (running.current) return;
    running.current = true;
    setStatus('starting');
    setError(null);

    try {
      const owner = wallet ?? walletAddress ?? null;
      console.log('[PersonalServer] Starting with wallet:', owner ?? 'none');
      const result = await invoke<PersonalServerStatus>('start_personal_server', {
        port: null,
        masterKeySignature: masterKeySignature ?? null,
        gatewayUrl: null,
        ownerAddress: owner,
      });

      if (result.running && result.port) {
        setStatus('running');
        setPort(result.port);
      }
      // If port is null (e.g. duplicate call), the personal-server-ready event will update it
    } catch (err) {
      console.error('[PersonalServer] Failed to start:', err);
      running.current = false;
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [walletAddress, masterKeySignature]);

  const stopServer = useCallback(async () => {
    if (!isTauriRuntime()) return;
    try {
      await invoke('stop_personal_server');
      running.current = false;
      setStatus('stopped');
      setPort(null);
      _sharedTunnelUrl = null;
      setTunnelUrl(null);
    } catch (err) {
      console.error('[PersonalServer] Failed to stop:', err);
    }
  }, []);

  // Listen for server events
  useEffect(() => {
    if (!isTauriRuntime()) return;
    const unlisteners: (() => void)[] = [];

    listen<{ port: number }>('personal-server-ready', (event) => {
      console.log('[PersonalServer] Ready on port', event.payload.port);
      setStatus('running');
      setPort(event.payload.port);
    }).then((fn) => unlisteners.push(fn));

    listen<{ message: string }>('personal-server-error', (event) => {
      console.error('[PersonalServer] Error:', event.payload.message);
      setStatus('error');
      setError(event.payload.message);
    }).then((fn) => unlisteners.push(fn));

    listen<{ url: string }>('personal-server-tunnel', (event) => {
      console.log('[PersonalServer] Tunnel:', event.payload.url);
      _sharedTunnelUrl = event.payload.url;
      setTunnelUrl(event.payload.url);
    }).then((fn) => unlisteners.push(fn));

    listen<{ message: string }>('personal-server-log', (event) => {
      console.log('[PersonalServer]', event.payload.message);
    }).then((fn) => unlisteners.push(fn));

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, []);

  // Start only after user is logged in (walletAddress available)
  useEffect(() => {
    if (!walletAddress) return;
    if (running.current) return;
    startServer(walletAddress);
  }, [walletAddress, startServer]);

  return { status, port, tunnelUrl, error, startServer, stopServer };
}
