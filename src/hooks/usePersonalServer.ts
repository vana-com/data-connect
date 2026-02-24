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
let _sharedTunnelFailed = false;
let _sharedDevToken: string | null = null;
let _sharedError: string | null = null;
const isTauriRuntime = () =>
  typeof window !== 'undefined' &&
  ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);

const MAX_RESTART_ATTEMPTS = 3;
let _restartCount = 0;
let _lastStartedWallet: string | null = null;
let _lastMasterKeySignature: string | null = null;
const FALLBACK_START_ERROR = 'Failed to start Personal Server';

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (error.message.includes('cyclic structures')) {
      return FALLBACK_START_ERROR;
    }
    return error.message;
  }

  if (typeof error === 'string') {
    if (error.includes('cyclic structures')) {
      return FALLBACK_START_ERROR;
    }
    return error;
  }

  try {
    const serialized = JSON.stringify(error);
    if (!serialized || serialized === '{}') {
      return FALLBACK_START_ERROR;
    }
    if (serialized.includes('cyclic structures')) {
      return FALLBACK_START_ERROR;
    }
    return serialized;
  } catch {
    return FALLBACK_START_ERROR;
  }
}

export function usePersonalServer() {
  const { walletAddress, masterKeySignature } = useSelector(
    (state: RootState) => state.app.auth
  );
  const [status, setStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>(_sharedStatus);
  const [port, setPort] = useState<number | null>(_sharedPort);
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(_sharedTunnelUrl);
  const [tunnelFailed, setTunnelFailed] = useState(_sharedTunnelFailed);
  const [devToken, setDevToken] = useState<string | null>(_sharedDevToken);
  const [error, setError] = useState<string | null>(_sharedError);
  const running = useRef(_sharedStatus === 'starting' || _sharedStatus === 'running');
  const restartingRef = useRef(false);
  const startServerRef = useRef<(wallet?: string | null) => Promise<void>>(null!);

  const startServer = useCallback(async (wallet?: string | null) => {
    if (!isTauriRuntime()) return;
    if (running.current) return;
    running.current = true;
    _sharedStatus = 'starting';
    _sharedError = null;
    setStatus('starting');
    setError(null);

    try {
      const owner = wallet ?? walletAddress ?? null;
      // Prefer the closure value, but fall back to the module-level snapshot
      // stored during Phase 2 — the closure can go stale if the component
      // remounts or React StrictMode recreates the callback between phases.
      const masterKey = masterKeySignature ?? _lastMasterKeySignature;
      console.log('[PersonalServer] Starting with wallet:', owner ?? 'none', 'masterKey:', masterKey ? 'present' : 'null');
      await invoke<PersonalServerStatus>('start_personal_server', {
        port: null,
        masterKeySignature: masterKey ?? null,
        gatewayUrl: import.meta.env.VITE_GATEWAY_URL || null,
        ownerAddress: owner,
      });

      // The invoke resolving means the subprocess was launched, not that
      // the HTTP server is listening. Keep status as 'starting' until the
      // 'personal-server-ready' event fires with the actual port.
    } catch (err) {
      console.error('[PersonalServer] Failed to start:', err);
      running.current = false;
      _sharedStatus = 'error';
      _sharedError = getSafeErrorMessage(err);
      setStatus('error');
      setError(_sharedError);
    }
  }, [walletAddress, masterKeySignature]);

  startServerRef.current = startServer;

  const stopServer = useCallback(async () => {
    if (!isTauriRuntime()) return;
    running.current = false;
    try {
      await invoke('stop_personal_server');
      _sharedStatus = 'stopped';
      _sharedPort = null;
      _sharedTunnelUrl = null;
      _sharedTunnelFailed = false;
      _sharedDevToken = null;
      setStatus('stopped');
      setPort(null);
      setTunnelUrl(null);
      setTunnelFailed(false);
      setDevToken(null);
    } catch (err) {
      console.error('[PersonalServer] Failed to stop:', err);
    }
  }, []);

  const restartServer = useCallback(async (wallet?: string | null) => {
    console.log('[PersonalServer] Restarting with wallet:', wallet ?? 'none');
    _restartCount = 0;
    await stopServer();
    // Brief wait for port release (stop_personal_server already waits up to 3s,
    // but add a small buffer for OS-level cleanup)
    await new Promise((r) => setTimeout(r, 500));
    await startServerRef.current(wallet);
  }, [stopServer]);

  // Listen for server events
  useEffect(() => {
    if (!isTauriRuntime()) return;
    const unlisteners: (() => void)[] = [];

    listen<{ port: number }>('personal-server-ready', (event) => {
      console.log('[PersonalServer] Ready on port', event.payload.port);
      _sharedStatus = 'running';
      _sharedPort = event.payload.port;
      _restartCount = 0;
      setStatus('running');
      setPort(event.payload.port);

      restartingRef.current = false;
    }).then((fn) => unlisteners.push(fn));

    listen<{ message: string }>('personal-server-error', (event) => {
      console.error('[PersonalServer] Error:', event.payload.message);
      running.current = false;
      _sharedStatus = 'error';
      _sharedError = getSafeErrorMessage(event.payload.message);
      setStatus('error');
      setError(_sharedError);
    }).then((fn) => unlisteners.push(fn));

    listen<{ exitCode: number | null; crashed: boolean }>('personal-server-exited', (event) => {
      const { exitCode, crashed } = event.payload;
      console.log('[PersonalServer] Exited:', { exitCode, crashed });

      running.current = false;
      _sharedTunnelUrl = null;
      _sharedTunnelFailed = false;
      _sharedDevToken = null;
      setTunnelUrl(null);
      setTunnelFailed(false);
      setDevToken(null);
      setPort(null);

      if (crashed) {
        _restartCount++;
        if (_restartCount <= MAX_RESTART_ATTEMPTS) {
          const delay = Math.pow(2, _restartCount) * 1000; // 2s, 4s, 8s
          console.log(`[PersonalServer] Auto-restart attempt ${_restartCount}/${MAX_RESTART_ATTEMPTS} in ${delay}ms`);
          _sharedStatus = 'starting';
          setStatus('starting');
          setTimeout(() => startServerRef.current(), delay);
        } else {
          console.error('[PersonalServer] Max restart attempts reached, giving up');
          _sharedStatus = 'error';
          _sharedError = 'Personal Server crashed repeatedly and could not be restarted';
          setStatus('error');
          setError(_sharedError);
        }
      } else {
        setStatus('stopped');
      }
    }).then((fn) => unlisteners.push(fn));

    listen<{ url: string }>('personal-server-tunnel', (event) => {
      console.log('[PersonalServer] Tunnel:', event.payload.url);
      _sharedTunnelUrl = event.payload.url;
      _sharedTunnelFailed = false;
      setTunnelUrl(event.payload.url);
      setTunnelFailed(false);
    }).then((fn) => unlisteners.push(fn));

    listen<{ message: string }>('personal-server-tunnel-failed', (event) => {
      console.warn('[PersonalServer] Tunnel failed:', event.payload.message);
      _sharedTunnelFailed = true;
      setTunnelFailed(true);
    }).then((fn) => unlisteners.push(fn));

    // The wrapper now self-registers and connects the tunnel in a single
    // pass, so we just log the event — no restart needed.
    listen<{ status: number; serverId: string | null }>('server-registered', (event) => {
      console.log('[PersonalServer] Server registered with gateway:', event.payload);
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

  // Phase 1 removed — starting without a wallet was ~3s of throwaway work
  // (random keypair, no registration, no tunnel). The server now starts
  // only in Phase 2 when credentials are available, so it can derive the
  // real identity, self-register, and connect the tunnel in a single pass.

  // Phase 2 — restart with credentials so the server derives its keypair.
  // The auth page needs the server identity (keypair address) to register
  // with the gateway, so we must restart before registration can proceed.
  //
  // Set restartingRef synchronously during render so child effects (e.g.
  // auto-approve in grant flow) see it before they fire.
  if (walletAddress && masterKeySignature && _lastStartedWallet !== walletAddress) {
    restartingRef.current = true;
  }
  useEffect(() => {
    if (!walletAddress || !masterKeySignature) return;
    if (_lastStartedWallet === walletAddress) return;
    _lastStartedWallet = walletAddress;
    _lastMasterKeySignature = masterKeySignature;
    console.log('[PersonalServer] Credentials available, starting server...');
    _restartCount = 0;
    void stopServer().then(() => {
      setTimeout(() => startServerRef.current(walletAddress), 500);
    });
  }, [walletAddress, masterKeySignature, stopServer]);

  // Phase 2.5 removed — the wrapper now self-registers with the gateway
  // before startBackgroundServices(), so frontend registration + restart
  // is no longer needed.

  return { status, port, tunnelUrl, tunnelFailed, devToken, error, startServer, stopServer, restartServer, restartingRef };
}
