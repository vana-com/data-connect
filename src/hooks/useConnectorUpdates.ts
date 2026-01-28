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
      setError(null);
      setDownloadingIds((prev) => new Set(prev).add(id));

      try {
        await invoke('download_connector', { id });
        // Remove from updates list after successful download
        dispatch(removeConnectorUpdate(id));
        // Reload platforms to pick up the new connector
        await loadPlatforms();
        return true;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to download connector';
        setError(errorMsg);
        console.error('Failed to download connector:', err);
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
