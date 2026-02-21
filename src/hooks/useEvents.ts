import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useDispatch } from 'react-redux';
import {
  updateRunLogs,
  updateRunStatus,
  updateExportStatus,
  updateRunConnected,
  updateRunExportData,
  markRunSynced,
  type AppDispatch,
  store,
} from '../state/store';
import type {
  ConnectorLogEvent,
  DownloadProgressEvent,
  ExportCompleteEvent,
  ExportedData,
  ProgressPhase,
} from '../types';
import { normalizeExportData } from '../lib/export-data';
import { getScopeForPlatform, ingestData } from '../services/personalServerIngest';

const isDev = import.meta.env.DEV;

function debugLog(...args: unknown[]) {
  if (!isDev) return;
  console.log(...args);
}

// Extended connector status event that can handle both string and object status
interface ConnectorStatusEventPayload {
  runId: string;
  status: string | {
    type: string;
    message?: string;
    data?: unknown;
    phase?: ProgressPhase;
    count?: number;
  };
  timestamp: number;
}

// Export complete event from connector (includes display name)
interface ConnectorExportCompleteEvent {
  runId: string;
  platformId: string;
  company: string;
  name: string; // Display name (e.g., "Instagram (Playwright)")
  data: unknown;
  timestamp: number;
}

function isExportedData(value: unknown): value is ExportedData {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ExportedData>;
  return typeof candidate.platform === 'string' && typeof candidate.company === 'string';
}

/**
 * Deliver a single run's export data to the personal server and mark staging as synced.
 * Returns true on success, false on failure (non-throwing).
 */
async function deliverRunToPersonalServer(
  run: { id: string; platformId: string; exportPath?: string; itemsExported?: number; itemLabel?: string; syncedToPersonalServer?: boolean },
  port: number,
  dispatch: AppDispatch,
): Promise<boolean> {
  if (!run.exportPath || run.syncedToPersonalServer) return false;

  const scope = getScopeForPlatform(run.platformId);
  if (!scope) return false;

  // Normalize exportPath to directory
  const dirPath = run.exportPath.endsWith('.json')
    ? run.exportPath.replace(/\/[^/]+$/, '')
    : run.exportPath;

  try {
    const data = await invoke<Record<string, unknown>>('load_run_export_data', {
      runId: run.id,
      exportPath: dirPath,
    });
    const payload = (data.content ?? data) as object;
    await ingestData(port, scope, payload);

    // Mark staging as synced (trims the large JSON)
    await invoke('mark_export_synced', {
      runId: run.id,
      exportPath: run.exportPath,
      itemsExported: run.itemsExported ?? null,
      itemLabel: run.itemLabel ?? null,
      scope,
    });

    dispatch(markRunSynced(run.id));
    debugLog('[Data Delivery] Synced run', run.id, 'to personal server, scope:', scope);
    return true;
  } catch (err) {
    if (isDev) {
      console.warn('[Data Delivery] Failed for run', run.id, '(non-blocking):', err);
    }
    return false;
  }
}

async function persistAndDeliverExport({
  runId,
  platformId,
  company,
  name,
  exportData,
  dispatch,
  persistedRunIds,
}: {
  runId: string;
  platformId: string;
  company: string;
  name: string;
  exportData: ExportedData;
  dispatch: AppDispatch;
  persistedRunIds: Set<string>;
}): Promise<void> {
  if (persistedRunIds.has(runId)) return;

  const serializedExport = JSON.stringify(exportData);
  const { itemsExported, itemLabel } = normalizeExportData(exportData);

  dispatch(
    updateRunExportData({
      runId,
      statusMessage: 'Export complete',
      itemsExported,
      itemLabel,
      exportData,
    })
  );

  persistedRunIds.add(runId);

  try {
    const exportPath = await invoke<string>('write_export_data', {
      runId,
      platformId,
      company,
      name: name || platformId,
      data: serializedExport,
    });

    dispatch(
      updateExportStatus({
        runId,
        exportPath,
        exportSize: serializedExport.length,
      })
    );

    const scope = getScopeForPlatform(platformId);
    if (!scope) return;

    const serverStatus = await invoke<{ running: boolean; port?: number }>('get_personal_server_status');
    if (!serverStatus.running || !serverStatus.port) return;

    await ingestData(serverStatus.port, scope, exportData as object);
    await invoke('mark_export_synced', {
      runId,
      exportPath,
      itemsExported: itemsExported ?? null,
      itemLabel: itemLabel ?? null,
      scope,
    });
    dispatch(markRunSynced(runId));
    debugLog('[Data Delivery] Synced run', runId, 'immediately after export');
  } catch (err) {
    persistedRunIds.delete(runId);
    if (isDev) {
      console.warn('[Export Persistence] Deferred or failed for run', runId, err);
    }
  }
}

export function useEvents() {
  const dispatch = useDispatch();
  const deliveryInProgressRef = useRef(false);

  /**
   * App-wide runtime event bridge:
   * - subscribes to Tauri connector/server events
   * - normalizes them into Redux run state
   * - persists and delivers completed exports
   */
  useEffect(() => {
    let cancelled = false;
    const unlistenFns: (() => void)[] = [];
    const persistedRunIds = new Set<string>();

    // Helper: register a Tauri event listener with automatic cleanup on unmount.
    // Handles the race where unmount happens before listen() resolves.
    function addListener<T>(eventName: string, handler: (payload: T) => void) {
      listen<T>(eventName, (event) => {
        if (cancelled) return;
        handler(event.payload);
      }).then((unlisten) => {
        if (cancelled) {
          unlisten();
        } else {
          unlistenFns.push(unlisten);
        }
      });
    }

    // Listen for connector log events
    addListener<ConnectorLogEvent>('connector-log', ({ runId, message }) => {
      debugLog('[Connector Log]', message);
      dispatch(updateRunLogs({ runId, logs: message }));
    });

    // Listen for connector status events
    addListener<ConnectorStatusEventPayload>('connector-status', ({ runId, status }) => {
      debugLog('[Connector Status]', runId, status);

      // Handle both string and object status formats
      const statusType = typeof status === 'string' ? status : status.type;

      // Get message, phase, and count from status if it's an object
      const statusMessage = typeof status === 'object' ? status.message : undefined;
      const fallbackStatusMessage =
        statusType === 'WAITING_FOR_USER'
          ? 'Waiting for sign in...'
          : statusType === 'RUNNING'
            ? 'Collecting data...'
            : undefined;
      const phase = typeof status === 'object' ? status.phase : undefined;
      const itemCount = typeof status === 'object' ? status.count : undefined;

      // Helper to dispatch progress update
      const updateProgress = () => {
        dispatch(updateRunExportData({
          runId,
          statusMessage: statusMessage ?? fallbackStatusMessage,
          phase,
          itemCount,
        }));
      };

      if (
        statusType === 'CONNECT_WEBSITE' ||
        statusType === 'WAITING_LOGIN' ||
        statusType === 'WAITING_FOR_USER'
      ) {
        dispatch(updateRunConnected({ runId, isConnected: false }));
        updateProgress();
      } else if (statusType === 'DOWNLOADING' || statusType === 'COLLECTING') {
        dispatch(updateRunStatus({ runId, status: 'running' }));
        dispatch(updateRunConnected({ runId, isConnected: true }));
        updateProgress();
      } else if (statusType === 'RUNNING') {
        dispatch(updateRunStatus({ runId, status: 'running' }));
        updateProgress();
      } else if (statusType === 'STARTED') {
        dispatch(updateRunStatus({ runId, status: 'running' }));
        updateProgress();
      } else if (statusType === 'COMPLETE') {
        dispatch(
          updateRunStatus({
            runId,
            status: 'success',
            endDate: new Date().toISOString(),
          })
        );
        dispatch(updateRunConnected({ runId, isConnected: true }));

        if (typeof status === 'object' && isExportedData(status.data)) {
          void persistAndDeliverExport({
            runId,
            platformId: status.data.platform,
            company: status.data.company,
            name: status.data.platform,
            exportData: status.data,
            dispatch,
            persistedRunIds,
          });
        }
      } else if (statusType === 'ERROR') {
        dispatch(
          updateRunStatus({
            runId,
            status: 'error',
            endDate: new Date().toISOString(),
          })
        );
        if (statusMessage) {
          dispatch(updateRunExportData({ runId, statusMessage }));
        }
      } else if (statusType === 'STOPPED') {
        // Browser was closed or process ended without completing
        // Don't overwrite success/error status - STOPPED is only for incomplete runs
        dispatch(
          updateRunStatus({
            runId,
            status: 'stopped',
            endDate: new Date().toISOString(),
            // Flag to indicate this should only apply if not already complete
            onlyIfRunning: true,
          })
        );
        if (statusMessage) {
          dispatch(updateRunExportData({ runId, statusMessage }));
        }
      }
    });

    // Listen for download progress events
    addListener<DownloadProgressEvent>('download-progress', ({ percent }) => {
      if (isDev) {
        console.log('[Download Progress]', percent.toFixed(1) + '%');
      }
    });

    // When personal server becomes ready, deliver all pending (unsynced) exports sequentially
    addListener<{ port: number }>('personal-server-ready', async ({ port }) => {
      if (!port || deliveryInProgressRef.current) return;
      deliveryInProgressRef.current = true;
      debugLog('[Data Delivery] Personal server ready on port', port, '— scanning for pending exports');
      try {
        const runs = store.getState().app.runs;
        const pending = runs.filter(
          (r) => r.exportPath && !r.syncedToPersonalServer && r.status === 'success'
        );
        debugLog('[Data Delivery]', pending.length, 'pending exports to deliver');
        for (const run of pending) {
          if (cancelled) break;
          await deliverRunToPersonalServer(run, port, dispatch);
        }
      } finally {
        deliveryInProgressRef.current = false;
      }
    });

    // Listen for export complete events from connector
    addListener<ConnectorExportCompleteEvent>('export-complete', ({ runId, platformId, company, name, data }) => {
      if (!isExportedData(data)) return;

      dispatch(
        updateRunStatus({
          runId,
          status: 'success',
          endDate: new Date().toISOString(),
        })
      );

      void persistAndDeliverExport({
        runId,
        platformId,
        company,
        name,
        exportData: data,
        dispatch,
        persistedRunIds,
      });
    });

    // Listen for export complete events from Rust backend (legacy format)
    addListener<ExportCompleteEvent>('export-complete-rust', ({ run_id, export_path, export_size }) => {
      debugLog('[Export Complete Rust]', run_id, export_path);
      dispatch(
        updateExportStatus({
          runId: run_id,
          exportPath: export_path,
          exportSize: export_size,
        })
      );
    });

    // Cleanup: cancel stale handlers and unregister resolved listeners
    return () => {
      cancelled = true;
      unlistenFns.forEach((fn) => fn());
    };
  }, [dispatch]);
}
