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
import { ingestExportData } from '../services/personalServerIngest';
import { getPlatformRegistryEntry } from '@/lib/platform/utils';
import { durationSince } from '@/lib/telemetry/client';
import {
  trackCollectionCancelled,
  trackCollectionCompleted,
  trackCollectionFailed,
  trackCollectionNeedsInput,
  trackSyncRequestCompleted,
  trackSyncRequestFailed,
  trackSyncRequestSkipped,
  trackSyncRequestStarted,
} from '@/lib/telemetry/events';

const isDev = import.meta.env.DEV;

function debugLog(...args: unknown[]) {
  if (!isDev) return;
  console.log(...args);
}

interface ConnectorStatusEventPayload {
  runId: string;
  status:
    | string
    | {
        type: string;
        message?: string;
        data?: unknown;
        phase?: ProgressPhase;
        count?: number;
      };
  timestamp: number;
}

interface ConnectorExportCompleteEvent {
  runId: string;
  platformId: string;
  company: string;
  name: string;
  data: unknown;
  timestamp: number;
}

function toExportedData(
  value: unknown,
  fallback: { platform: string; company: string }
): ExportedData | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Record<string, unknown>;

  const platform =
    typeof candidate.platform === 'string' && candidate.platform.length > 0
      ? candidate.platform
      : fallback.platform;
  const company =
    typeof candidate.company === 'string' && candidate.company.length > 0
      ? candidate.company
      : fallback.company;
  const exportedAt =
    typeof candidate.exportedAt === 'string' && candidate.exportedAt.length > 0
      ? candidate.exportedAt
      : typeof candidate.timestamp === 'string' && candidate.timestamp.length > 0
        ? candidate.timestamp
        : new Date().toISOString();

  return {
    ...candidate,
    platform,
    company,
    exportedAt,
  } as ExportedData;
}

function getRunTelemetryContext(runId: string) {
  const run = store.getState().app.runs.find((candidate) => candidate.id === runId);
  if (!run) return null;
  return {
    run,
    source: getPlatformRegistryEntry({
      id: run.platformId,
      name: run.name,
      company: run.company,
    })?.id ?? run.platformId,
    durationMs: durationSince(run.startDate),
  };
}

function createSyncRunId(collectionRunId: string) {
  return `${collectionRunId}:sync:${crypto.randomUUID()}`;
}

async function deliverRunToPersonalServer(
  run: {
    id: string;
    platformId: string;
    exportPath?: string;
    itemsExported?: number;
    itemLabel?: string;
    syncedToPersonalServer?: boolean;
  },
  port: number,
  dispatch: AppDispatch
): Promise<boolean> {
  if (!run.exportPath || run.syncedToPersonalServer) return false;

  const source = getPlatformRegistryEntry({ id: run.platformId })?.id ?? run.platformId;
  const syncRunId = createSyncRunId(run.id);
  trackSyncRequestStarted({
    collectionRunId: run.id,
    syncRunId,
    source,
  });

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
    if (ingested.length === 0) {
      trackSyncRequestFailed({
        collectionRunId: run.id,
        syncRunId,
        source,
        errorClass: 'sync_request_failed',
      });
      return false;
    }

    await invoke('mark_export_synced', {
      runId: run.id,
      exportPath: run.exportPath,
      itemsExported: run.itemsExported ?? null,
      itemLabel: run.itemLabel ?? null,
      scope: ingested[0],
    });

    dispatch(markRunSynced({ runId: run.id, scope: ingested[0] }));
    trackSyncRequestCompleted({
      collectionRunId: run.id,
      syncRunId,
      source,
      scopeCount: ingested.length,
    });
    debugLog('[Data Delivery] Synced run', run.id, 'scopes:', ingested);
    return true;
  } catch (err) {
    if (isDev) {
      console.warn('[Data Delivery] Failed for run', run.id, '(non-blocking):', err);
    }
    trackSyncRequestFailed({
      collectionRunId: run.id,
      syncRunId,
      source,
      error: err,
    });
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
  const source = getPlatformRegistryEntry({ id: platformId, company, name })?.id ?? platformId;

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

    const serverStatus = await invoke<{ running: boolean; port?: number }>('get_personal_server_status');
    if (!serverStatus.running || !serverStatus.port) {
      trackSyncRequestSkipped({
        collectionRunId: runId,
        syncRunId: createSyncRunId(runId),
        source,
        reason: 'skipped_server_unavailable',
      });
      return;
    }

    const syncRunId = createSyncRunId(runId);
    trackSyncRequestStarted({
      collectionRunId: runId,
      syncRunId,
      source,
    });

    const ingested = await ingestExportData(serverStatus.port, platformId, exportData as unknown as Record<string, unknown>);
    if (ingested.length === 0) {
      trackSyncRequestFailed({
        collectionRunId: runId,
        syncRunId,
        source,
        errorClass: 'sync_request_failed',
      });
      return;
    }

    await invoke('mark_export_synced', {
      runId,
      exportPath,
      itemsExported: itemsExported ?? null,
      itemLabel: itemLabel ?? null,
      scope: ingested[0],
    });
    dispatch(markRunSynced({ runId, scope: ingested[0] }));
    trackSyncRequestCompleted({
      collectionRunId: runId,
      syncRunId,
      source,
      scopeCount: ingested.length,
    });
    debugLog('[Data Delivery] Synced run', runId, 'scopes:', ingested);
  } catch (err) {
    persistedRunIds.delete(runId);
    const message = err instanceof Error ? err.message : String(err);
    dispatch(
      updateRunExportData({
        runId,
        statusMessage: `Failed to save export locally: ${message}`,
      })
    );
    dispatch(
      updateRunLogs({
        runId,
        logs: `[Export Persistence Error] ${message}`,
      })
    );
    trackSyncRequestFailed({
      collectionRunId: runId,
      syncRunId: createSyncRunId(runId),
      source,
      error: err,
    });
    if (isDev) {
      console.warn('[Export Persistence] Deferred or failed for run', runId, err);
    }
  }
}

export function useEvents() {
  const dispatch = useDispatch();
  const deliveryInProgressRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const unlistenFns: (() => void)[] = [];
    const persistedRunIds = new Set<string>();
    const needsInputRunIds = new Set<string>();
    const terminalCollectionRunIds = new Set<string>();

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

    function markCollectionCompleted(runId: string) {
      if (terminalCollectionRunIds.has(runId)) return;
      const context = getRunTelemetryContext(runId);
      if (!context) return;
      terminalCollectionRunIds.add(runId);
      trackCollectionCompleted({
        collectionRunId: runId,
        source: context.source,
        durationMs: context.durationMs,
      });
    }

    function markCollectionFailed(runId: string, error?: unknown, errorClass?: 'needs_input' | 'collection_failed' | 'runtime_error' | 'auth_failed') {
      if (terminalCollectionRunIds.has(runId)) return;
      const context = getRunTelemetryContext(runId);
      if (!context) return;
      terminalCollectionRunIds.add(runId);
      trackCollectionFailed({
        collectionRunId: runId,
        source: context.source,
        durationMs: context.durationMs,
        error,
        errorClass,
      });
    }

    function markCollectionCancelled(runId: string) {
      if (terminalCollectionRunIds.has(runId)) return;
      const context = getRunTelemetryContext(runId);
      if (!context) return;
      terminalCollectionRunIds.add(runId);
      trackCollectionCancelled({
        collectionRunId: runId,
        source: context.source,
        durationMs: context.durationMs,
      });
    }

    addListener<ConnectorLogEvent>('connector-log', ({ runId, message }) => {
      debugLog('[Connector Log]', message);
      dispatch(updateRunLogs({ runId, logs: message }));
    });

    addListener<ConnectorStatusEventPayload>('connector-status', ({ runId, status }) => {
      debugLog('[Connector Status]', runId, status);

      const statusType = typeof status === 'string' ? status : status.type;
      const statusMessage = typeof status === 'object' ? status.message : undefined;
      const fallbackStatusMessage =
        statusType === 'WAITING_FOR_USER'
          ? 'Waiting for sign in...'
          : statusType === 'RUNNING'
            ? 'Collecting data...'
            : undefined;
      const phase = typeof status === 'object' ? status.phase : undefined;
      const itemCount = typeof status === 'object' ? status.count : undefined;

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
        if (!needsInputRunIds.has(runId)) {
          const context = getRunTelemetryContext(runId);
          if (context) {
            needsInputRunIds.add(runId);
            trackCollectionNeedsInput({
              collectionRunId: runId,
              source: context.source,
            });
          }
        }
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
        markCollectionCompleted(runId);

        if (typeof status === 'object') {
          const activeRun = store.getState().app.runs.find((r) => r.id === runId);
          if (!activeRun) {
            if (isDev) {
              console.warn('[Connector Status] COMPLETE for unknown run', runId);
            }
            return;
          }
          const normalizedData = toExportedData(status.data, {
            platform: activeRun.platformId,
            company: activeRun.company ?? 'Unknown',
          });
          if (!normalizedData) return;
          void persistAndDeliverExport({
            runId,
            platformId: normalizedData.platform,
            company: normalizedData.company,
            name: normalizedData.platform,
            exportData: normalizedData,
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
        markCollectionFailed(runId, statusMessage ?? statusType);
      } else if (statusType === 'STOPPED') {
        const currentRun = store.getState().app.runs.find((candidate) => candidate.id === runId);
        dispatch(
          updateRunStatus({
            runId,
            status: 'stopped',
            endDate: new Date().toISOString(),
            onlyIfRunning: true,
          })
        );
        if (statusMessage) {
          dispatch(updateRunExportData({ runId, statusMessage }));
        }
        if (currentRun?.status === 'running') {
          markCollectionCancelled(runId);
        }
      }
    });

    addListener<DownloadProgressEvent>('download-progress', ({ percent }) => {
      if (isDev) {
        console.log('[Download Progress]', percent.toFixed(1) + '%');
      }
    });

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

    addListener<ConnectorExportCompleteEvent>('export-complete', ({ runId, platformId, company, name, data }) => {
      const normalizedData = toExportedData(data, {
        platform: platformId,
        company,
      });
      if (!normalizedData) return;

      dispatch(
        updateRunStatus({
          runId,
          status: 'success',
          endDate: new Date().toISOString(),
        })
      );
      markCollectionCompleted(runId);

      void persistAndDeliverExport({
        runId,
        platformId,
        company,
        name,
        exportData: normalizedData,
        dispatch,
        persistedRunIds,
      });
    });

    addListener<ExportCompleteEvent>('export-complete-rust', ({ run_id, export_path, export_size }) => {
      debugLog('[Export Complete Rust]', run_id, export_path);
      dispatch(
        updateExportStatus({
          runId: run_id,
          exportPath: export_path,
          exportSize: export_size,
        })
      );
      markCollectionCompleted(run_id);
    });

    return () => {
      cancelled = true;
      unlistenFns.forEach((fn) => fn());
    };
  }, [dispatch]);
}
