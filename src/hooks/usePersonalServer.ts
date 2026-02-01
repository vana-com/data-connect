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
  const { isAuthenticated, masterKeySignature } = useSelector(
    (state: RootState) => state.app.auth
  );
  const [status, setStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [port, setPort] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const startServer = useCallback(async (signature?: string | null) => {
    if (started.current) return;
    started.current = true;
    setStatus('starting');
    setError(null);

    try {
      const result = await invoke<PersonalServerStatus>('start_personal_server', {
        port: 8080,
        masterKeySignature: signature ?? null,
        gatewayUrl: null,
      });

      if (result.running) {
        setStatus('running');
        setPort(result.port ?? null);
      }
    } catch (err) {
      console.error('[PersonalServer] Failed to start:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
      started.current = false;
    }
  }, []);

  const stopServer = useCallback(async () => {
    try {
      await invoke('stop_personal_server');
      setStatus('stopped');
      setPort(null);
      started.current = false;
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

  // Auto-start on mount (server runs without login; master key is optional)
  useEffect(() => {
    if (!started.current) {
      startServer(masterKeySignature);
    }
  }, [startServer, masterKeySignature]);

  // Restart with master key when user logs in (if server was already running without it)
  useEffect(() => {
    if (isAuthenticated && masterKeySignature && started.current && status === 'running') {
      // Restart to inject the master key signature
      stopServer().then(() => startServer(masterKeySignature));
    }
  }, [isAuthenticated, masterKeySignature, status, startServer, stopServer]);

  return { status, port, error, startServer, stopServer };
}
