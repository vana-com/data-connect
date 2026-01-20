import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDispatch, useSelector } from 'react-redux';
import {
  startRun,
  updateRunStatus,
  updateExportStatus,
  updateRunLogs,
  updateRunConnected,
  stopRun,
} from '../state/store';
import type { RootState } from '../state/store';
import type { Platform, Run } from '../types';

export function useConnector() {
  const dispatch = useDispatch();
  const runs = useSelector((state: RootState) => state.app.runs);

  const startExport = useCallback(
    async (platform: Platform) => {
      const runId = `${platform.id}-${Date.now()}`;

      const newRun: Run = {
        id: runId,
        platformId: platform.id,
        filename: platform.filename,
        isConnected: false,
        startDate: new Date().toISOString(),
        status: 'running',
        url: platform.connectURL || '',
        company: platform.company,
        name: platform.name,
        logs: '',
      };

      dispatch(startRun(newRun));

      try {
        await invoke('start_connector_run', {
          runId,
          platformId: platform.id,
          filename: platform.filename,
          company: platform.company,
          name: platform.name,
          connectUrl: platform.connectURL || '',
        });
      } catch (error) {
        console.error('Failed to start connector run:', error);
        dispatch(
          updateRunStatus({
            runId,
            status: 'error',
            endDate: new Date().toISOString(),
          })
        );
      }

      return runId;
    },
    [dispatch]
  );

  const stopExport = useCallback(
    async (runId: string) => {
      // Always update Redux state first to ensure UI updates
      dispatch(stopRun(runId));

      // Then try to close the window (may fail if already closed)
      try {
        await invoke('stop_connector_run', { runId });
      } catch (error) {
        // Window may already be closed, that's ok
        console.log('Stop connector run (window may be closed):', error);
      }
    },
    [dispatch]
  );

  const handleConnectorLog = useCallback(
    (runId: string, message: string) => {
      dispatch(updateRunLogs({ runId, logs: message }));
    },
    [dispatch]
  );

  const handleConnectorStatus = useCallback(
    (runId: string, status: string) => {
      if (status === 'CONNECT_WEBSITE') {
        dispatch(updateRunConnected({ runId, isConnected: false }));
      } else if (status === 'DOWNLOADING') {
        dispatch(updateRunStatus({ runId, status: 'running' }));
      } else if (status === 'COMPLETE') {
        dispatch(
          updateRunStatus({
            runId,
            status: 'success',
            endDate: new Date().toISOString(),
          })
        );
      } else if (status === 'ERROR') {
        dispatch(
          updateRunStatus({
            runId,
            status: 'error',
            endDate: new Date().toISOString(),
          })
        );
      }
    },
    [dispatch]
  );

  const handleExportComplete = useCallback(
    (runId: string, exportPath: string, exportSize: number) => {
      dispatch(updateExportStatus({ runId, exportPath, exportSize }));
    },
    [dispatch]
  );

  const getRunById = useCallback(
    (runId: string) => {
      return runs.find((r) => r.id === runId);
    },
    [runs]
  );

  return {
    runs,
    startExport,
    stopExport,
    handleConnectorLog,
    handleConnectorStatus,
    handleExportComplete,
    getRunById,
  };
}
