import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface BrowserStatus {
  available: boolean;
  browser_type: string;
  needs_download: boolean;
}

interface BrowserContextType {
  status: 'checking' | 'downloading' | 'ready' | 'error';
  progress: number;
  error: string | null;
  retry: () => void;
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
  const [status, setStatus] = useState<'checking' | 'downloading' | 'ready' | 'error'>('checking');
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
        console.log('No browser found, starting download');
        await downloadBrowser();
      }
    } catch (err) {
      console.error('Failed to check browser:', err);
      await downloadBrowser();
    }
  }, [downloadBrowser]);

  useEffect(() => {
    checkBrowser();
  }, [checkBrowser]);

  const retry = useCallback(() => {
    setError(null);
    setProgress(0);
    checkBrowser();
  }, [checkBrowser]);

  return (
    <BrowserContext.Provider value={{ status, progress, error, retry }}>
      {children}
    </BrowserContext.Provider>
  );
}
