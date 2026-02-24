import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDispatch, useSelector } from 'react-redux';
import { setRuns } from '../state/store';
import type { RootState } from '../state/store';
import type { Run } from '../types';
import { checkConnectorUpdates } from './check-connector-updates';
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
  const runsInitialized = useRef(false);
  const connectorUpdatesInitialized = useRef(false);

  useEffect(() => {
    // Hydrate persisted runs once on first mount.
    if (runsInitialized.current) return;
    runsInitialized.current = true;

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

    void loadSavedRuns();
  }, [dispatch, currentRuns]);

  useEffect(() => {
    // Run connector update check once at app init (silent, non-blocking).
    if (connectorUpdatesInitialized.current) return;
    connectorUpdatesInitialized.current = true;

    const runConnectorUpdateCheck = async () => {
      const updates = await checkConnectorUpdates(dispatch, {
        onError: error => {
          console.error('[Initialize] Failed to check connector updates:', error);
        },
      });
      console.info(`[Initialize] Connector update check complete: ${updates.length} update(s) available`);
    };

    void runConnectorUpdateCheck();
  }, [dispatch]);
}
