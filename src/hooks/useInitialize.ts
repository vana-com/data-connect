import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDispatch, useSelector } from 'react-redux';
import { setAuthenticated, setRuns } from '../state/store';
import { clearPersistedAuthSession, getPersistedAuthSession } from '../lib/storage';
import type { RootState } from '../state/store';
import type { Run } from '../types';
interface SavedRun {
  id: string;
  platformId: string;
  filename: string;
  company: string;
  name: string;
  startDate: string;
  endDate?: string;
  status: string;
  exportPath?: string;
  itemsExported?: number;
  itemLabel?: string;
  syncedToPersonalServer?: boolean;
}

export function useInitialize() {
  const dispatch = useDispatch();
  const currentRuns = useSelector((state: RootState) => state.app.runs);
  const initialized = useRef(false);

  useEffect(() => {
    // Only run once on mount
    if (initialized.current) return;
    initialized.current = true;

    // Restore persisted auth session before loading route-specific data.
    const persistedAuth = getPersistedAuthSession();
    if (persistedAuth?.user?.id && persistedAuth.walletAddress) {
      dispatch(
        setAuthenticated({
          user: persistedAuth.user,
          walletAddress: persistedAuth.walletAddress,
          masterKeySignature: null,
        })
      );
    } else if (persistedAuth) {
      clearPersistedAuthSession();
    }

    // Load saved runs from disk on startup
    const loadSavedRuns = async () => {
      try {
        const savedRuns = await invoke<SavedRun[]>('load_runs');
        console.log('[Initialize] Loaded runs from disk:', savedRuns.length);

        // Convert SavedRun to Run format
        const loadedRuns: Run[] = savedRuns.map((saved) => ({
          id: saved.id,
          platformId: saved.platformId,
          filename: saved.filename,
          company: saved.company,
          name: saved.name,
          startDate: saved.startDate,
          endDate: saved.endDate,
          status: saved.status as Run['status'],
          url: '',
          isConnected: true,
          exportPath: saved.exportPath,
          itemsExported: saved.itemsExported,
          itemLabel: saved.itemLabel,
          syncedToPersonalServer: saved.syncedToPersonalServer,
          logs: '',
        }));

        // Merge with any existing runs (in case there were running exports)
        const existingIds = new Set(currentRuns.map(r => r.id));
        const newRuns = loadedRuns.filter(r => !existingIds.has(r.id));
        const allRuns = [...currentRuns, ...newRuns];

        // Sort by start date (most recent first)
        allRuns.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

        dispatch(setRuns(allRuns));
      } catch (error) {
        console.error('[Initialize] Failed to load runs:', error);
      }
    };

    loadSavedRuns();
  }, [dispatch, currentRuns]);
}
