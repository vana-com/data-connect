import { useEffect } from 'react';
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
import { getScopeForPlatform, ingestData, ingestExportData } from '../services/personalServerIngest';

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

/**
 * Deliver a single run's export data to the personal server and mark staging as synced.
 * Returns true on success, false on failure (non-throwing).
 */
async function deliverRunToPersonalServer(
  run: { id: string; platformId: string; exportPath?: string; itemsExported?: number; itemLabel?: string; syncedToPersonalServer?: boolean },
  port: number,
  dispatch: ReturnType<typeof import('react-redux').useDispatch>,
): Promise<boolean> {
  if (!run.exportPath || run.syncedToPersonalServer) return false;

  // Normalize exportPath to directory
  const dirPath = run.exportPath.endsWith('.json')
    ? run.exportPath.replace(/\/[^/]+$/, '')
    : run.exportPath;

  try {
    const data = await invoke<Record<string, unknown>>('load_run_export_data', {
      runId: run.id,
      exportPath: dirPath,
    });
    const payload = (data.content ?? data) as Record<string, unknown>;
    const ingested = await ingestExportData(port, run.platformId, payload);
    if (ingested.length === 0) return false;

    // Mark staging as synced (trims the large JSON)
    await invoke('mark_export_synced', {
      runId: run.id,
      exportPath: run.exportPath,
      itemsExported: run.itemsExported ?? null,
      itemLabel: run.itemLabel ?? null,
      scope: ingested[0],
    });

    dispatch(markRunSynced(run.id));
    console.log('[Data Delivery] Synced run', run.id, 'to personal server, scopes:', ingested.join(', '));
    return true;
  } catch (err) {
    console.warn('[Data Delivery] Failed for run', run.id, '(non-blocking):', err);
    return false;
  }
}

export function useEvents() {
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;
    const unlistenFns: (() => void)[] = [];

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
      console.log('[Connector Log]', message);
      dispatch(updateRunLogs({ runId, logs: message }));
    });

    // Listen for connector status events
    addListener<ConnectorStatusEventPayload>('connector-status', ({ runId, status }) => {
      console.log('[Connector Status]', runId, status);

      // Handle both string and object status formats
      const statusType = typeof status === 'string' ? status : status.type;

      // Get message, phase, and count from status if it's an object
      const statusMessage = typeof status === 'object' ? status.message : undefined;
      const phase = typeof status === 'object' ? status.phase : undefined;
      const itemCount = typeof status === 'object' ? status.count : undefined;

      // Helper to dispatch progress update
      const updateProgress = () => {
        dispatch(updateRunExportData({
          runId,
          statusMessage,
          phase,
          itemCount,
        }));
      };

      if (statusType === 'CONNECT_WEBSITE' || statusType === 'WAITING_LOGIN') {
        dispatch(updateRunConnected({ runId, isConnected: false }));
        updateProgress();
      } else if (statusType === 'DOWNLOADING' || statusType === 'COLLECTING') {
        dispatch(updateRunStatus({ runId, status: 'running' }));
        dispatch(updateRunConnected({ runId, isConnected: true }));
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

        // If status has data, save it and update UI
        if (typeof status === 'object' && status.data) {
          const exportData = status.data as ExportedData;
          console.log('[Connector Status] Export complete with data:', exportData);

          // Update the UI with export data
          const { itemsExported, itemLabel } = normalizeExportData(exportData);

          dispatch(
            updateRunExportData({
              runId,
              statusMessage: status.message || 'Export complete',
              itemsExported,
              itemLabel,
              exportData,
            })
          );

          // Save the data via Rust backend, then attempt delivery
          invoke('write_export_data', {
            runId: runId,
            platformId: exportData.platform || 'unknown',
            company: exportData.company || 'Unknown',
            data: JSON.stringify(exportData),
          }).then(async (result) => {
            console.log('[Export Saved]', result);
            if (typeof result !== 'string') return;

            dispatch(
              updateExportStatus({
                runId,
                exportPath: result,
                exportSize: JSON.stringify(exportData).length,
              })
            );

            // Attempt immediate delivery to personal server
            try {
              const serverStatus = await invoke<{ running: boolean; port?: number }>('get_personal_server_status');
              if (!serverStatus.running || !serverStatus.port) return;

              const ingested = await ingestExportData(
                serverStatus.port,
                exportData.platform || 'unknown',
                exportData as Record<string, unknown>
              );
              if (ingested.length === 0) return;

              await invoke('mark_export_synced', {
                runId,
                exportPath: result,
                itemsExported: itemsExported ?? null,
                itemLabel: itemLabel ?? null,
                scope: ingested[0],
              });
              dispatch(markRunSynced(runId));
              console.log('[Data Delivery] Synced run', runId, 'immediately after export, scopes:', ingested.join(', '));
            } catch (err) {
              console.warn('[Data Delivery] Deferred (server not ready):', err);
            }
          }).catch((err) => {
            console.error('[Export Save Error]', err);
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
      console.log('[Download Progress]', percent.toFixed(1) + '%');
    });

    // When personal server becomes ready, deliver all pending (unsynced) exports sequentially
    let deliveryInProgress = false;
    addListener<{ port: number }>('personal-server-ready', async ({ port }) => {
      if (!port || deliveryInProgress) return;
      deliveryInProgress = true;
      console.log('[Data Delivery] Personal server ready on port', port, '— scanning for pending exports');
      try {
        const runs = store.getState().app.runs;
        const pending = runs.filter(
          (r) => r.exportPath && !r.syncedToPersonalServer && r.status === 'success'
        );
        console.log('[Data Delivery]', pending.length, 'pending exports to deliver');
        for (const run of pending) {
          if (cancelled) break;
          await deliverRunToPersonalServer(run, port, dispatch);
        }
      } finally {
        deliveryInProgress = false;
      }
    });

    // Listen for export complete events from connector
    addListener<ConnectorExportCompleteEvent>('export-complete', ({ runId, platformId, company, name, data }) => {
      console.log('[Export Complete]', runId, platformId, name);

      dispatch(
        updateRunStatus({
          runId,
          status: 'success',
          endDate: new Date().toISOString(),
        })
      );

      // Extract export summary for UI display
      const exportData = data as ExportedData;
      const { itemsExported, itemLabel } = normalizeExportData(exportData);

      // Update the UI with export data
      dispatch(
        updateRunExportData({
          runId,
          statusMessage: 'Export complete',
          itemsExported,
          itemLabel,
          exportData,
        })
      );

      // Save the export data, then attempt delivery to personal server
      invoke('write_export_data', {
        runId: runId,
        platformId: platformId,
        company,
        name: name || platformId, // Use display name if available
        data: JSON.stringify(data),
      }).then(async (result) => {
        console.log('[Export Saved]', result);
        if (typeof result !== 'string') return;

        // Update export status with the path
        dispatch(
          updateExportStatus({
            runId,
            exportPath: result,
            exportSize: 0,
          })
        );

        // Attempt immediate delivery to personal server
        try {
          const serverStatus = await invoke<{ running: boolean; port?: number }>('get_personal_server_status');
          if (!serverStatus.running || !serverStatus.port) return;

          const ingested = await ingestExportData(
            serverStatus.port,
            platformId,
            data as Record<string, unknown>
          );
          if (ingested.length === 0) return;

          // Delivery succeeded — trim staging and mark synced
          await invoke('mark_export_synced', {
            runId,
            exportPath: result,
            itemsExported: itemsExported ?? null,
            itemLabel: itemLabel ?? null,
            scope: ingested[0],
          });
          dispatch(markRunSynced(runId));
          console.log('[Data Delivery] Synced run', runId, 'immediately after export, scopes:', ingested.join(', '));
        } catch (err) {
          // Delivery failed — staging file stays intact for personal-server-ready retry
          console.warn('[Data Delivery] Deferred (server not ready):', err);
        }
      }).catch((err) => {
        console.error('[Export Save Error]', err);
      });
    });

    // Listen for export complete events from Rust backend (legacy format)
    addListener<ExportCompleteEvent>('export-complete-rust', ({ run_id, export_path, export_size }) => {
      console.log('[Export Complete Rust]', run_id, export_path);
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
