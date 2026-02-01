import { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useSelector } from 'react-redux';
import type { RootState } from '../state/store';

interface PersonalServerStatus {
  running: boolean;
  port: number | null;
}

export function usePersonalServer() {
  const { walletAddress } = useSelector(
    (state: RootState) => state.app.auth
  );
  const [status, setStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [port, setPort] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const startServer = useCallback(async (wallet?: string | null) => {
    if (running.current) return;
    running.current = true;
    setStatus('starting');
    setError(null);

    try {
      const owner = wallet ?? walletAddress ?? null;
      console.log('[PersonalServer] Starting with wallet:', owner ?? 'none');
      const result = await invoke<PersonalServerStatus>('start_personal_server', {
        port: null,
        masterKeySignature: null,
        gatewayUrl: null,
        ownerAddress: owner,
      });

      if (result.running) {
        setStatus('running');
        setPort(result.port ?? null);
      }
    } catch (err) {
      console.error('[PersonalServer] Failed to start:', err);
      running.current = false;
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [walletAddress]);

  const stopServer = useCallback(async () => {
    try {
      await invoke('stop_personal_server');
      running.current = false;
      setStatus('stopped');
      setPort(null);
    } catch (err) {
      console.error('[PersonalServer] Failed to stop:', err);
    }
  }, []);

  // Listen for server events
  useEffect(() => {
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

  return { status, port, error, startServer, stopServer };
}
