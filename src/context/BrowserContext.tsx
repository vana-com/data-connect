import { createContext, useState, useEffect, useCallback, useRef, useContext, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface BrowserStatus {
  available: boolean;
  browser_type: string;
  needs_download: boolean;
}

export interface BrowserContextType {
  status: 'checking' | 'needs_browser' | 'downloading' | 'ready' | 'error';
  progress: number;
  error: string | null;
  retry: () => void;
  startDownload: () => void;
}

export const BrowserContext = createContext<BrowserContextType | null>(null);

interface BrowserProviderProps {
  children: ReactNode;
}

export function BrowserProvider({ children }: BrowserProviderProps) {
  const [status, setStatus] = useState<'checking' | 'needs_browser' | 'downloading' | 'ready' | 'error'>('checking');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const downloadBrowser = useCallback(async () => {
    console.log('Starting browser download...');
    setStatus('downloading');
    setProgress(0);

    // Clear any existing interval before starting a new one
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Simulate progress while downloading
    progressIntervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 3;
      });
    }, 500);

    try {
      await invoke('download_browser');
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setProgress(100);
      setTimeout(() => setStatus('ready'), 500);
    } catch (err) {
      console.error('Download error:', err);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setError(`Failed to download browser: ${err}`);
      setStatus('error');
    }
  }, []);

  // Initial browser check on mount - state updates happen after async boundary
  useEffect(() => {
    let cancelled = false;

    const checkBrowser = async () => {
      try {
        console.log('Checking browser availability...');
        const result = await invoke<BrowserStatus>('check_browser_available');
        if (cancelled) return;
        console.log('Browser check result:', result);

        if (result.available) {
          console.log('Browser available');
          setStatus('ready');
        } else {
          console.log('No browser found, waiting for user action');
          setStatus('needs_browser');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to check browser:', err);
        // If running on localhost without Tauri backend, assume Chrome is available (dev mode)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Dev mode detected, assuming browser is available');
          setStatus('ready');
        } else {
          setStatus('needs_browser');
        }
      }
    };

    checkBrowser();

    return () => {
      cancelled = true;
    };
  }, []);

  const retry = useCallback(async () => {
    setError(null);
    setProgress(0);
    setStatus('checking');

    try {
      console.log('Retrying browser check...');
      const result = await invoke<BrowserStatus>('check_browser_available');
      console.log('Browser check result:', result);

      if (result.available) {
        console.log('Browser available');
        setStatus('ready');
      } else {
        console.log('No browser found, waiting for user action');
        setStatus('needs_browser');
      }
    } catch (err) {
      console.error('Failed to check browser:', err);
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Dev mode detected, assuming browser is available');
        setStatus('ready');
      } else {
        setStatus('needs_browser');
      }
    }
  }, []);

  const startDownload = useCallback(() => {
    downloadBrowser();
  }, [downloadBrowser]);

  return (
    <BrowserContext.Provider value={{ status, progress, error, retry, startDownload }}>
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowserStatus() {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error('useBrowserStatus must be used within BrowserProvider');
  }
  return context;
}
