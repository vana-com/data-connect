import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSelector } from 'react-redux';
import type { RootState } from '../state/store';

interface PersonalServerStatus {
  running: boolean;
  port: number | null;
}

// Module-level state shared across all hook instances so values
// survive component remounts (e.g. navigating away from the runs page).
let _sharedPort: number | null = null;
let _sharedStatus: 'stopped' | 'starting' | 'running' | 'error' = 'stopped';
let _sharedTunnelUrl: string | null = null;
let _sharedDevToken: string | null = null;
const isTauriRuntime = () =>
  typeof window !== 'undefined' &&
  ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);

export function usePersonalServer() {
  const { walletAddress, masterKeySignature } = useSelector(
    (state: RootState) => state.app.auth
  );
  const [status, setStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>(_sharedStatus);
  const [port, setPort] = useState<number | null>(_sharedPort);
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(_sharedTunnelUrl);
  const [devToken, setDevToken] = useState<string | null>(_sharedDevToken);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(_sharedStatus === 'starting' || _sharedStatus === 'running');

  const startServer = useCallback(async (wallet?: string | null) => {
    if (!isTauriRuntime()) return;
    if (running.current) return;
    running.current = true;
    _sharedStatus = 'starting';
    setStatus('starting');
    setError(null);

    try {
      const owner = wallet ?? walletAddress ?? null;
      console.log('[PersonalServer] Starting with wallet:', owner ?? 'none');
      await invoke<PersonalServerStatus>('start_personal_server', {
        port: null,
        masterKeySignature: masterKeySignature ?? null,
        gatewayUrl: null,
        ownerAddress: owner,
      });

      // The invoke resolving means the subprocess was launched, not that
      // the HTTP server is listening. Keep status as 'starting' until the
      // 'personal-server-ready' event fires with the actual port.
    } catch (err) {
      console.error('[PersonalServer] Failed to start:', err);
      running.current = false;
      _sharedStatus = 'error';
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [walletAddress, masterKeySignature]);

  const stopServer = useCallback(async () => {
    if (!isTauriRuntime()) return;
    try {
      await invoke('stop_personal_server');
      running.current = false;
      _sharedStatus = 'stopped';
      _sharedPort = null;
      _sharedTunnelUrl = null;
      _sharedDevToken = null;
      setStatus('stopped');
      setPort(null);
      setTunnelUrl(null);
      setDevToken(null);
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
      _sharedStatus = 'running';
      _sharedPort = event.payload.port;
      setStatus('running');
      setPort(event.payload.port);
    }).then((fn) => unlisteners.push(fn));

    listen<{ message: string }>('personal-server-error', (event) => {
      console.error('[PersonalServer] Error:', event.payload.message);
      _sharedStatus = 'error';
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

    listen<{ token: string }>('personal-server-dev-token', (event) => {
      console.log('[PersonalServer] Dev token received');
      _sharedDevToken = event.payload.token;
      setDevToken(event.payload.token);
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

  return { status, port, tunnelUrl, devToken, error, startServer, stopServer };
}
