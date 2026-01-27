import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface BrowserStatus {
  available: boolean;
  browser_type: string;
  needs_download: boolean;
}

interface BrowserContextType {
  status: 'checking' | 'needs_browser' | 'downloading' | 'ready' | 'error';
  progress: number;
  error: string | null;
  retry: () => void;
  startDownload: () => void;
}

const BrowserContext = createContext<BrowserContextType | null>(null);

export function useBrowserStatus() {
  const context = useContext(BrowserContext);
  if (!context) {
    throw new Error('useBrowserStatus must be used within BrowserProvider');
  }
  return context;
}

interface BrowserProviderProps {
  children: ReactNode;
}

export function BrowserProvider({ children }: BrowserProviderProps) {
  const [status, setStatus] = useState<'checking' | 'needs_browser' | 'downloading' | 'ready' | 'error'>('checking');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const downloadBrowser = useCallback(async () => {
    console.log('Starting browser download...');
    setStatus('downloading');
    setProgress(0);

    // Simulate progress while downloading
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 3;
      });
    }, 500);

    try {
      await invoke('download_browser');
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => setStatus('ready'), 500);
    } catch (err) {
      console.error('Download error:', err);
      clearInterval(progressInterval);
      setError(`Failed to download browser: ${err}`);
      setStatus('error');
    }
  }, []);

  const checkBrowser = useCallback(async () => {
    setStatus('checking');
    setError(null);

    try {
      console.log('Checking browser availability...');
      const result = await invoke<BrowserStatus>('check_browser_available');
      console.log('Browser check result:', result);

      if (result.available) {
        console.log('Browser available');
        setStatus('ready');
      } else {
        // Don't auto-download - show explanation and let user decide
        console.log('No browser found, waiting for user action');
        setStatus('needs_browser');
      }
    } catch (err) {
      console.error('Failed to check browser:', err);
      setStatus('needs_browser');
    }
  }, []);

  useEffect(() => {
    checkBrowser();
  }, [checkBrowser]);

  const retry = useCallback(() => {
    setError(null);
    setProgress(0);
    checkBrowser();
  }, [checkBrowser]);

  const startDownload = useCallback(() => {
    downloadBrowser();
  }, [downloadBrowser]);

  return (
    <BrowserContext.Provider value={{ status, progress, error, retry, startDownload }}>
      {children}
    </BrowserContext.Provider>
  );
}
