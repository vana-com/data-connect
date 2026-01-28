import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDispatch, useSelector } from 'react-redux';
import {
  setConnectorUpdates,
  setIsCheckingUpdates,
  removeConnectorUpdate,
} from '../state/store';
import type { RootState } from '../state/store';
import type { ConnectorUpdateInfo } from '../types';
import { usePlatforms } from './usePlatforms';

// Check if running in browser-only dev mode (no Tauri backend)
const isDevMode = () => {
  return (
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') &&
    !(window as unknown as { __TAURI__?: unknown }).__TAURI__
  );
};

// Mock updates for browser-only dev mode (empty - no fake updates)
const MOCK_UPDATES: ConnectorUpdateInfo[] = [];

export function useConnectorUpdates() {
  const dispatch = useDispatch();
  const updates = useSelector((state: RootState) => state.app.connectorUpdates);
  const lastUpdateCheck = useSelector(
    (state: RootState) => state.app.lastUpdateCheck
  );
  const isCheckingUpdates = useSelector(
    (state: RootState) => state.app.isCheckingUpdates
  );
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const { loadPlatforms } = usePlatforms();

  const checkForUpdates = useCallback(
    async (force = false) => {
      setError(null);
      dispatch(setIsCheckingUpdates(true));

      try {
        const result = await invoke<ConnectorUpdateInfo[]>(
          'check_connector_updates',
          { force }
        );
        dispatch(setConnectorUpdates(result));
        return result;
      } catch (err) {
        // In dev mode, use mock data
        if (isDevMode()) {
          console.log('Dev mode: using mock connector updates');
          dispatch(setConnectorUpdates(MOCK_UPDATES));
          return MOCK_UPDATES;
        }
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to check for updates';
        setError(errorMsg);
        console.error('Failed to check for updates:', err);
        return [];
      } finally {
        dispatch(setIsCheckingUpdates(false));
      }
    },
    [dispatch]
  );

  const downloadConnector = useCallback(
    async (id: string) => {
      console.log('[downloadConnector] Called with id:', id);
      setError(null);
      setDownloadingIds((prev) => new Set(prev).add(id));

      try {
        // In dev mode, simulate download
        if (isDevMode()) {
          console.log('Dev mode: simulating connector download for', id);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          dispatch(removeConnectorUpdate(id));
          return true;
        }

        console.log('[downloadConnector] About to invoke download_connector Tauri command');
        console.log('[downloadConnector] __TAURI__ exists:', !!(window as any).__TAURI__);

        const result = await invoke('download_connector', { id });
        console.log('[downloadConnector] Tauri command completed, result:', result);
        // Remove from updates list after successful download
        dispatch(removeConnectorUpdate(id));
        // Reload platforms to pick up the new connector
        await loadPlatforms();
        return true;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to download connector';
        setError(errorMsg);
        console.error('[downloadConnector] Failed:', err);
        // Show alert for debugging
        alert(`Download failed: ${errorMsg}`);
        return false;
      } finally {
        setDownloadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [dispatch, loadPlatforms]
  );

  const isDownloading = useCallback(
    (id: string) => downloadingIds.has(id),
    [downloadingIds]
  );

  const hasUpdates = updates.length > 0;
  const updateCount = updates.length;
  const newConnectorCount = updates.filter((u) => u.isNew).length;
  const updateableCount = updates.filter((u) => u.hasUpdate).length;

  return {
    updates,
    lastUpdateCheck,
    isCheckingUpdates,
    error,
    hasUpdates,
    updateCount,
    newConnectorCount,
    updateableCount,
    checkForUpdates,
    downloadConnector,
    isDownloading,
  };
}
