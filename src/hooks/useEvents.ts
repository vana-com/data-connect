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
} from '../types';

// Extended connector status event that can handle both string and object status
interface ConnectorStatusEventPayload {
  runId: string;
  status: string | {
    type: string;
    message?: string;
    data?: unknown;
  };
  timestamp: number;
}

// Export complete event from connector
interface ConnectorExportCompleteEvent {
  runId: string;
  platformId: string;
  company: string;
  name: string;
  data: unknown;
  timestamp: number;
}

export function useEvents() {
  const dispatch = useDispatch();

  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    // Listen for connector log events
    listen<ConnectorLogEvent>('connector-log', (event) => {
      console.log('[Connector Log]', event.payload.message);
      dispatch(
        updateRunLogs({
          runId: event.payload.runId,
          logs: event.payload.message,
        })
      );
    }).then((unlisten) => unlisteners.push(unlisten));

    // Listen for connector status events
    listen<ConnectorStatusEventPayload>('connector-status', (event) => {
      const { runId, status } = event.payload;
      console.log('[Connector Status]', runId, status);

      // Handle both string and object status formats
      const statusType = typeof status === 'string' ? status : status.type;

      // Get message from status if it's an object
      const statusMessage = typeof status === 'object' ? status.message : undefined;

      if (statusType === 'CONNECT_WEBSITE' || statusType === 'WAITING_LOGIN') {
        dispatch(updateRunConnected({ runId, isConnected: false }));
        if (statusMessage) {
          dispatch(updateRunExportData({ runId, statusMessage }));
        }
      } else if (statusType === 'DOWNLOADING' || statusType === 'COLLECTING') {
        dispatch(updateRunStatus({ runId, status: 'running' }));
        dispatch(updateRunConnected({ runId, isConnected: true }));
        if (statusMessage) {
          dispatch(updateRunExportData({ runId, statusMessage }));
        }
      } else if (statusType === 'STARTED') {
        dispatch(updateRunStatus({ runId, status: 'running' }));
        if (statusMessage) {
          dispatch(updateRunExportData({ runId, statusMessage }));
        }
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
          dispatch(
            updateRunExportData({
              runId,
              statusMessage: status.message || 'Export complete',
              itemsExported: exportData.totalConversations || exportData.conversations?.length || 0,
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
      }
    }).then((unlisten) => unlisteners.push(unlisten));

    // Listen for download progress events
    listen<DownloadProgressEvent>('download-progress', (event) => {
      console.log('[Download Progress]', event.payload.percent.toFixed(1) + '%');
    }).then((unlisten) => unlisteners.push(unlisten));

    // Listen for export complete events from connector
    listen<ConnectorExportCompleteEvent>('export-complete', (event) => {
      const { runId, platformId, company, data } = event.payload;
      console.log('[Export Complete]', runId, platformId);

      dispatch(
        updateRunStatus({
          runId,
          status: 'success',
          endDate: new Date().toISOString(),
        })
      );

      // Save the export data
      invoke('write_export_data', {
        runId: runId,
        platformId: platformId,
        company,
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
    }).then((unlisten) => unlisteners.push(unlisten));

    // Listen for export complete events from Rust backend (legacy format)
    listen<ExportCompleteEvent>('export-complete-rust', (event) => {
      const { run_id, export_path, export_size } = event.payload;
      console.log('[Export Complete Rust]', run_id, export_path);
      dispatch(
        updateExportStatus({
          runId: run_id,
          exportPath: export_path,
          exportSize: export_size,
        })
      );
    }).then((unlisten) => unlisteners.push(unlisten));

    // Cleanup listeners on unmount
    return () => {
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [dispatch]);
}
