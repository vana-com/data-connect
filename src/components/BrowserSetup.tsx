import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface BrowserStatus {
  available: boolean;
  browser_type: string;
  needs_download: boolean;
}

interface BrowserSetupProps {
  children: React.ReactNode;
}

export function BrowserSetup({ children }: BrowserSetupProps) {
  const [status, setStatus] = useState<'checking' | 'downloading' | 'ready' | 'error'>('checking');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs to track cleanup on unmount
  const mountedRef = useRef(true);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  // Cleanup function to clear all async resources
  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
  }, []);

  const downloadBrowser = useCallback(async () => {
    console.log('Starting browser download...');

    // Simulate progress while downloading
    progressIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 5;
      });
    }, 500);

    // Listen for progress events
    const unlisten = await listen('browser-download-progress', (event) => {
      console.log('Download progress:', event.payload);
    });
    unlistenRef.current = unlisten;

    try {
      await invoke('download_browser');
      cleanup();
      if (!mountedRef.current) return;
      setProgress(100);
      readyTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setStatus('ready');
        }
      }, 500);
    } catch (err) {
      console.error('Download error:', err);
      cleanup();
      if (!mountedRef.current) return;
      setError(`Failed to download browser: ${err}`);
      setStatus('error');
    }
  }, [cleanup]);

  const checkBrowser = useCallback(async () => {
    try {
      console.log('Checking browser availability...');
      const result = await invoke<BrowserStatus>('check_browser_available');
      console.log('Browser check result:', result);

      if (!mountedRef.current) return;

      if (result.available) {
        console.log('Browser available, proceeding to app');
        setStatus('ready');
      } else {
        // Need to download browser
        console.log('No browser found, starting download');
        setStatus('downloading');
        await downloadBrowser();
      }
    } catch (err) {
      console.error('Failed to check browser:', err);
      if (!mountedRef.current) return;
      // If check fails, try to download browser
      setStatus('downloading');
      await downloadBrowser();
    }
  }, [downloadBrowser]);

  useEffect(() => {
    mountedRef.current = true;
    checkBrowser();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [checkBrowser, cleanup]);

  if (status === 'ready') {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f7',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Logo/Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 24px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        {status === 'checking' && (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
              Setting up DataBridge
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              Checking browser availability...
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  border: '2px solid #e5e7eb',
                  borderTopColor: '#6366f1',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            </div>
          </>
        )}

        {status === 'downloading' && (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
              Downloading Browser
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
              One-time setup (~160 MB)
            </p>

            {/* Progress bar */}
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>
              {Math.round(progress)}%
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
              Setup Failed
            </h2>
            <p style={{ fontSize: '14px', color: '#ef4444', marginBottom: '24px' }}>
              {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                setProgress(0);
                checkBrowser();
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </>
        )}
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
