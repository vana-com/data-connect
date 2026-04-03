import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDispatch, useSelector } from 'react-redux';
import { deleteRun, startRun, updateRunStatus, stopRun } from '../state/store';
import type { RootState } from '../state/store';
import type { Platform, Run } from '../types';
import { getPlatformRegistryEntry } from '@/lib/platform/utils';
import {
  trackCollectionFailed,
  trackCollectionRunStarted,
} from '@/lib/telemetry/events';
import { durationSince } from '@/lib/telemetry/client';

const DUPLICATE_ACTIVE_RUN_ERROR_CODE = 'DUPLICATE_ACTIVE_RUN';

function isDuplicateStartError(error: unknown): boolean {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String(error);
  return message.includes(DUPLICATE_ACTIVE_RUN_ERROR_CODE);
}

export function useConnector() {
  const dispatch = useDispatch();
  const runs = useSelector((state: RootState) => state.app.runs);

  const startImport = useCallback(
    async (platform: Platform) => {
      const runId = `${platform.id}-${Date.now()}`;
      const source = getPlatformRegistryEntry(platform)?.id ?? platform.id;

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
      trackCollectionRunStarted({
        collectionRunId: runId,
        source,
        authMode: 'interactive',
      });

      try {
        const simulateNoChrome =
          typeof window !== 'undefined' && window.localStorage?.getItem?.('dataconnect_simulate_no_chrome') === 'true';

        await invoke('start_connector_run', {
          runId,
          platformId: platform.id,
          filename: platform.filename,
          company: platform.company,
          name: platform.name,
          connectUrl: platform.connectURL || '',
          runtime: platform.runtime || null,
          simulateNoChrome,
        });
      } catch (error) {
        if (isDuplicateStartError(error)) {
          dispatch(deleteRun(runId));
          return null;
        }

        console.error('Failed to start connector run:', error);
        dispatch(
          updateRunStatus({
            runId,
            status: 'error',
            endDate: new Date().toISOString(),
          })
        );
        trackCollectionFailed({
          collectionRunId: runId,
          source,
          durationMs: durationSince(newRun.startDate),
          error,
        });
      }

      return runId;
    },
    [dispatch]
  );

  const stopExport = useCallback(
    async (runId: string) => {
      dispatch(stopRun(runId));

      try {
        await invoke('stop_connector_run', { runId });
      } catch (error) {
        console.log('Stop connector run (window may be closed):', error);
      }
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
    startImport,
    stopExport,
    getRunById,
  };
}
