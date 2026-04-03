import { queueTelemetryEvent, classifyTelemetryError } from "@/lib/telemetry/client";

export function trackCollectionRunStarted(args: {
  collectionRunId: string;
  source: string;
  connectorVersion?: string | null;
  authMode?: string | null;
}) {
  void queueTelemetryEvent({
    eventName: "collection_run_started",
    collectionRunId: args.collectionRunId,
    source: args.source,
    connectorVersion: args.connectorVersion,
    authMode: args.authMode,
  });
}

export function trackCollectionNeedsInput(args: {
  collectionRunId: string;
  source: string;
  connectorVersion?: string | null;
}) {
  void queueTelemetryEvent({
    eventName: "collection_needs_input",
    collectionRunId: args.collectionRunId,
    source: args.source,
    connectorVersion: args.connectorVersion,
    outcome: "needs_input",
    errorClass: "needs_input",
  });
}

export function trackCollectionCompleted(args: {
  collectionRunId: string;
  source: string;
  connectorVersion?: string | null;
  durationMs?: number | null;
}) {
  void queueTelemetryEvent({
    eventName: "collection_completed",
    collectionRunId: args.collectionRunId,
    source: args.source,
    connectorVersion: args.connectorVersion,
    outcome: "collected",
    durationMs: args.durationMs ?? null,
  });
}

export function trackCollectionFailed(args: {
  collectionRunId: string;
  source: string;
  connectorVersion?: string | null;
  durationMs?: number | null;
  error?: unknown;
  errorClass?: Parameters<typeof queueTelemetryEvent>[0]["errorClass"];
}) {
  void queueTelemetryEvent({
    eventName: "collection_failed",
    collectionRunId: args.collectionRunId,
    source: args.source,
    connectorVersion: args.connectorVersion,
    outcome: "failed",
    errorClass: args.errorClass ?? classifyTelemetryError(args.error, "collection_failed"),
    durationMs: args.durationMs ?? null,
  });
}

export function trackCollectionCancelled(args: {
  collectionRunId: string;
  source: string;
  connectorVersion?: string | null;
  durationMs?: number | null;
}) {
  void queueTelemetryEvent({
    eventName: "collection_cancelled",
    collectionRunId: args.collectionRunId,
    source: args.source,
    connectorVersion: args.connectorVersion,
    outcome: "cancelled",
    durationMs: args.durationMs ?? null,
  });
}

export function trackSyncRequestStarted(args: {
  collectionRunId: string;
  syncRunId: string;
  source: string;
}) {
  void queueTelemetryEvent({
    eventName: "sync_request_started",
    collectionRunId: args.collectionRunId,
    syncRunId: args.syncRunId,
    source: args.source,
  });
}

export function trackSyncRequestSkipped(args: {
  collectionRunId: string;
  syncRunId: string;
  source: string;
  reason: "skipped_server_unavailable" | "skipped_not_requested";
}) {
  void queueTelemetryEvent({
    eventName: "sync_request_skipped",
    collectionRunId: args.collectionRunId,
    syncRunId: args.syncRunId,
    source: args.source,
    outcome: args.reason,
    errorClass: args.reason === "skipped_server_unavailable" ? "personal_server_unavailable" : null,
  });
}

export function trackSyncRequestCompleted(args: {
  collectionRunId: string;
  syncRunId: string;
  source: string;
  scopeCount: number;
}) {
  void queueTelemetryEvent({
    eventName: "sync_request_completed",
    collectionRunId: args.collectionRunId,
    syncRunId: args.syncRunId,
    source: args.source,
    outcome: "requested_and_completed",
    scopeCount: args.scopeCount,
  });
}

export function trackSyncRequestFailed(args: {
  collectionRunId: string;
  syncRunId: string;
  source: string;
  error?: unknown;
  errorClass?: Parameters<typeof queueTelemetryEvent>[0]["errorClass"];
}) {
  void queueTelemetryEvent({
    eventName: "sync_request_failed",
    collectionRunId: args.collectionRunId,
    syncRunId: args.syncRunId,
    source: args.source,
    outcome: "failed",
    errorClass: args.errorClass ?? classifyTelemetryError(args.error, "sync_request_failed"),
  });
}

export function trackSessionClaimCompleted(args: { sessionId: string; platform?: string | null }) {
  void queueTelemetryEvent({
    eventName: "session_claim_completed",
    sessionId: args.sessionId,
    platform: args.platform ?? null,
    outcome: "approved",
  });
}

export function trackSessionClaimFailed(args: { sessionId: string; error?: unknown; platform?: string | null }) {
  void queueTelemetryEvent({
    eventName: "session_claim_failed",
    sessionId: args.sessionId,
    platform: args.platform ?? null,
    outcome: "failed",
    errorClass: classifyTelemetryError(args.error, "session_claim_failed"),
  });
}

export function trackBuilderVerificationCompleted(args: { sessionId: string; platform?: string | null }) {
  void queueTelemetryEvent({
    eventName: "builder_verification_completed",
    sessionId: args.sessionId,
    platform: args.platform ?? null,
    outcome: "approved",
  });
}

export function trackBuilderVerificationFailed(args: { sessionId: string; error?: unknown; platform?: string | null }) {
  void queueTelemetryEvent({
    eventName: "builder_verification_failed",
    sessionId: args.sessionId,
    platform: args.platform ?? null,
    outcome: "failed",
    errorClass: "builder_verification_failed",
    metadata: args.error instanceof Error ? { message: args.error.message } : null,
  });
}

export function trackGrantFlowCompleted(args: { sessionId: string; platform?: string | null }) {
  void queueTelemetryEvent({
    eventName: "grant_flow_completed",
    sessionId: args.sessionId,
    platform: args.platform ?? null,
    outcome: "approved",
  });
}

export function trackGrantFlowDenied(args: { sessionId: string; platform?: string | null }) {
  void queueTelemetryEvent({
    eventName: "grant_flow_denied",
    sessionId: args.sessionId,
    platform: args.platform ?? null,
    outcome: "denied",
  });
}

export function trackGrantFlowFailed(args: { sessionId: string; platform?: string | null; error?: unknown }) {
  void queueTelemetryEvent({
    eventName: "grant_flow_failed",
    sessionId: args.sessionId,
    platform: args.platform ?? null,
    outcome: "failed",
    errorClass: classifyTelemetryError(args.error, "grant_flow_failed"),
  });
}
