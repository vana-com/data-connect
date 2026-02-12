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

          // Save the data via Rust backend
          invoke('write_export_data', {
            runId: runId,
            platformId: exportData.platform || 'unknown',
            company: exportData.company || 'Unknown',
            data: JSON.stringify(exportData),
          }).then((result) => {
            console.log('[Export Saved]', result);
            if (typeof result === 'string') {
              dispatch(
                updateExportStatus({
                  runId,
                  exportPath: result,
                  exportSize: JSON.stringify(exportData).length,
                })
              );
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

      // Save the export data
      invoke('write_export_data', {
        runId: runId,
        platformId: platformId,
        company,
        name: name || platformId, // Use display name if available
        data: JSON.stringify(data),
      }).then((result) => {
        console.log('[Export Saved]', result);
        // Update export status with the path
        if (typeof result === 'string') {
          dispatch(
            updateExportStatus({
              runId,
              exportPath: result,
              exportSize: 0,
            })
          );
        }
      }).catch((err) => {
        console.error('[Export Save Error]', err);
      });

      // Auto-upload to personal server if running
      const scope = getScopeForPlatform(platformId);
      if (scope) {
        invoke<{ running: boolean; port?: number }>('get_personal_server_status')
          .then((serverStatus) => {
            if (serverStatus.running && serverStatus.port) {
              return ingestData(serverStatus.port, scope, data as object);
            }
          })
          .then(() => {
            console.log('[Personal Server Ingest] Success for scope:', scope);
          })
          .catch((err) => {
            console.warn('[Personal Server Ingest] Failed (non-blocking):', err);
          });
      }
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
