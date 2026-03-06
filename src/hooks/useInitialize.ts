import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRuntime } from '@/lib/runtime';
import { removeConnectorUpdate, setRuns } from '../state/store';
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
  scope?: string;
}

export function useInitialize() {
  const dispatch = useDispatch();
  const runtime = useRuntime();
  const currentRuns = useSelector((state: RootState) => state.app.runs);
  const runsInitialized = useRef(false);
  const connectorUpdatesInitialized = useRef(false);

  // Handle ?reset=true query param — reset the cloud session before loading
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset") !== "true") return;

    // Remove ?reset from URL so refresh doesn't re-trigger
    params.delete("reset");
    const clean = params.toString();
    const newUrl = window.location.pathname + (clean ? `?${clean}` : "");
    window.history.replaceState({}, "", newUrl);

    runtime.invoke("reset_session").then(() => {
      dispatch(setRuns([]));
      console.log("[Initialize] Session reset via ?reset=true");
    }).catch((err: unknown) => {
      console.error("[Initialize] Failed to reset session:", err);
    });
  }, [runtime, dispatch]);

  useEffect(() => {
    // Hydrate persisted runs once on first mount.
    if (runsInitialized.current) return;
    runsInitialized.current = true;

    // Load saved runs from disk on startup
    const loadSavedRuns = async () => {
      try {
        const savedRuns = await runtime.invoke<SavedRun[]>('load_runs');
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
          scope: saved.scope,
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
  }, [dispatch, currentRuns, runtime]);

  useEffect(() => {
    // Run connector update check once at app init (silent, non-blocking).
    if (connectorUpdatesInitialized.current) return;
    connectorUpdatesInitialized.current = true;

    const runConnectorUpdateCheck = async () => {
      const updates = await checkConnectorUpdates(runtime, dispatch, {
        onError: error => {
          console.error('[Initialize] Failed to check connector updates:', error);
        },
      });

      const updatable = updates.filter(u => u.hasUpdate);
      if (updatable.length === 0) {
        console.info('[Initialize] All connectors up to date');
        return;
      }

      console.info(`[Initialize] Auto-updating ${updatable.length} connector(s)…`);
      for (const update of updatable) {
        try {
          await runtime.invoke('download_connector', { id: update.id });
          dispatch(removeConnectorUpdate(update.id));
          console.info(`[Initialize] Updated ${update.name} to ${update.latestVersion}`);
        } catch (err) {
          console.error(`[Initialize] Failed to update ${update.name}:`, err);
        }
      }
    };

    void runConnectorUpdateCheck();
  }, [dispatch, runtime]);
}
