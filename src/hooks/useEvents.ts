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
  trackCollectionPartial,
  trackCollectionNeedsInput,
  trackSyncCompleted,
  trackSyncFailed,
  trackSyncSkipped,
  trackSyncStarted,
} from '@/lib/telemetry/events';
import type { TelemetryErrorClass, TelemetryScopeSummary } from '@/lib/telemetry/contract';

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
        outcome?: "success" | "partial" | "failure" | "cancelled";
        errorClass?: TelemetryErrorClass;
        recordCount?: number;
        scopeSummary?: TelemetryScopeSummary;
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
  trackSyncStarted({
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
      trackSyncFailed({
        collectionRunId: run.id,
        syncRunId,
        source,
        errorClass: 'runtime_error',
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
    trackSyncCompleted({
      collectionRunId: run.id,
      syncRunId,
      source,
      storedScopeCount: ingested.length,
      failedScopeCount: 0,
    });
    debugLog('[Data Delivery] Synced run', run.id, 'scopes:', ingested);
    return true;
  } catch (err) {
    if (isDev) {
      console.warn('[Data Delivery] Failed for run', run.id, '(non-blocking):', err);
    }
    trackSyncFailed({
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
      trackSyncSkipped({
        collectionRunId: runId,
        syncRunId: createSyncRunId(runId),
        source,
        reason: 'server_unavailable',
      });
      return;
    }

    const syncRunId = createSyncRunId(runId);
    trackSyncStarted({
      collectionRunId: runId,
      syncRunId,
      source,
    });

    const ingested = await ingestExportData(serverStatus.port, platformId, exportData as unknown as Record<string, unknown>);
    if (ingested.length === 0) {
      trackSyncFailed({
        collectionRunId: runId,
        syncRunId,
        source,
        errorClass: 'runtime_error',
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
    trackSyncCompleted({
      collectionRunId: runId,
      syncRunId,
      source,
      storedScopeCount: ingested.length,
      failedScopeCount: 0,
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
    trackSyncFailed({
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

    function markCollectionCompleted(
      runId: string,
      args?: { recordCount?: number; scopeSummary?: TelemetryScopeSummary }
    ) {
      if (terminalCollectionRunIds.has(runId)) return;
      const context = getRunTelemetryContext(runId);
      if (!context) return;
      terminalCollectionRunIds.add(runId);
      trackCollectionCompleted({
        collectionRunId: runId,
        source: context.source,
        durationMs: context.durationMs ?? 0,
        ...(args?.recordCount !== undefined ? { recordCount: args.recordCount } : {}),
        ...(args?.scopeSummary ? { scopeSummary: args.scopeSummary } : {}),
      });
    }

    function markCollectionPartial(
      runId: string,
      args: {
        errorClass?: TelemetryErrorClass;
        error?: unknown;
        recordCount?: number;
        scopeSummary?: TelemetryScopeSummary;
      }
    ) {
      if (terminalCollectionRunIds.has(runId)) return;
      const context = getRunTelemetryContext(runId);
      if (!context) return;
      terminalCollectionRunIds.add(runId);
      trackCollectionPartial({
        collectionRunId: runId,
        source: context.source,
        durationMs: context.durationMs ?? 0,
        errorClass: args.errorClass ?? 'unknown',
        ...(args.recordCount !== undefined ? { recordCount: args.recordCount } : {}),
        ...(args.scopeSummary ? { scopeSummary: args.scopeSummary } : {}),
      });
    }

    function markCollectionFailed(
      runId: string,
      error?: unknown,
      errorClass?: TelemetryErrorClass,
      scopeSummary?: TelemetryScopeSummary,
    ) {
      if (terminalCollectionRunIds.has(runId)) return;
      const context = getRunTelemetryContext(runId);
      if (!context) return;
      terminalCollectionRunIds.add(runId);
      trackCollectionFailed({
        collectionRunId: runId,
        source: context.source,
        durationMs: context.durationMs ?? undefined,
        error,
        errorClass,
        ...(scopeSummary ? { scopeSummary } : {}),
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
      const outcome = typeof status === 'object' ? status.outcome : undefined;
      const terminalErrorClass =
        typeof status === 'object' ? status.errorClass : undefined;
      const recordCount =
        typeof status === 'object' ? status.recordCount : undefined;
      const scopeSummary =
        typeof status === 'object' ? status.scopeSummary : undefined;

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
        markCollectionCompleted(runId, {
          recordCount,
          scopeSummary,
        });

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
        const isPartial = outcome === 'partial';
        dispatch(
          updateRunStatus({
            runId,
            status: isPartial ? 'partial' : 'error',
            endDate: new Date().toISOString(),
          })
        );
        if (isPartial) {
          dispatch(updateRunConnected({ runId, isConnected: true }));
        }
        if (statusMessage) {
          dispatch(updateRunExportData({ runId, statusMessage }));
        }
        if (isPartial) {
          markCollectionPartial(runId, {
            errorClass: terminalErrorClass,
            error: statusMessage ?? statusType,
            recordCount,
            scopeSummary,
          });
        } else {
          markCollectionFailed(
            runId,
            statusMessage ?? statusType,
            terminalErrorClass,
            scopeSummary,
          );
        }
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
          (r) => r.exportPath && !r.syncedToPersonalServer && (r.status === 'success' || r.status === 'partial')
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

    // `export-complete` carries the data payload that arrives when the
    // connector calls `page.setData('result', ...)`. For multi-step connectors
    // this fires BEFORE the connector process finishes, so we handle
    // persistence here but do NOT mark the run as complete or emit
    // `collection_completed` telemetry. The terminal signal comes from the
    // `connector-status: COMPLETE` handler above, which fires when the
    // connector process actually exits.
    addListener<ConnectorExportCompleteEvent>('export-complete', ({ runId, platformId, company, name, data }) => {
      const normalizedData = toExportedData(data, {
        platform: platformId,
        company,
      });
      if (!normalizedData) return;

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
