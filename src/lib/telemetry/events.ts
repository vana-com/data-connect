// Typed telemetry constructors.
//
// These are the only way to emit events. Each function takes exactly the
// fields valid for its Kind variant — the compiler rejects wrong fields
// or missing required ones. The state machine rules from TELEMETRY.md are
// enforced at the call site.

import {
  emitTelemetryEvent,
  classifyTelemetryError,
  getHostRunId,
} from "@/lib/telemetry/client";
import type {
  TelemetryCancellationReason,
  TelemetryErrorClass,
  TelemetryInteractionKind,
  TelemetrySyncSkipReason,
} from "@/lib/telemetry/contract";

// ── Host lifecycle ──────────────────────────────────────────────────────────

export function trackHostStarted(extensions?: Record<string, unknown>) {
  void emitTelemetryEvent({
    correlation: { scope: "host", hostRunId: getHostRunId() },
    kind: { lifecycle: "host", phase: "started" },
    extensions,
  });
}

export function trackHostCompleted(durationMs?: number) {
  void emitTelemetryEvent({
    correlation: { scope: "host", hostRunId: getHostRunId() },
    kind: { lifecycle: "host", phase: "terminal", outcome: "success" },
    durationMs,
  });
}

export function trackHostFailed(args: {
  error?: unknown;
  errorClass?: TelemetryErrorClass;
  durationMs?: number;
}) {
  void emitTelemetryEvent({
    correlation: { scope: "host", hostRunId: getHostRunId() },
    kind: {
      lifecycle: "host",
      phase: "terminal",
      outcome: "failure",
      errorClass: args.errorClass ?? classifyTelemetryError(args.error),
    },
    durationMs: args.durationMs,
  });
}

// ── Collection lifecycle ────────────────────────────────────────────────────

export function trackCollectionStarted(args: {
  collectionRunId: string;
  source: string;
  connectorVersion?: string;
  authMode?: string;
}) {
  void emitTelemetryEvent({
    correlation: {
      scope: "collection",
      hostRunId: getHostRunId(),
      collectionRunId: args.collectionRunId,
      source: args.source,
    },
    kind: { lifecycle: "collection", phase: "started" },
    connectorVersion: args.connectorVersion,
    authMode: args.authMode,
  });
}

export function trackCollectionNeedsInput(args: {
  collectionRunId: string;
  source: string;
  interactionKind?: TelemetryInteractionKind;
  connectorVersion?: string;
}) {
  void emitTelemetryEvent({
    correlation: {
      scope: "collection",
      hostRunId: getHostRunId(),
      collectionRunId: args.collectionRunId,
      source: args.source,
    },
    kind: {
      lifecycle: "collection",
      phase: "needs_input",
      ...(args.interactionKind ? { interactionKind: args.interactionKind } : {}),
    },
    connectorVersion: args.connectorVersion,
  });
}

export function trackCollectionCompleted(args: {
  collectionRunId: string;
  source: string;
  durationMs: number;
  recordCount?: number;
  connectorVersion?: string;
}) {
  void emitTelemetryEvent({
    correlation: {
      scope: "collection",
      hostRunId: getHostRunId(),
      collectionRunId: args.collectionRunId,
      source: args.source,
    },
    kind: {
      lifecycle: "collection",
      phase: "terminal",
      outcome: "success",
      ...(args.recordCount !== undefined ? { recordCount: args.recordCount } : {}),
    },
    durationMs: args.durationMs,
    connectorVersion: args.connectorVersion,
  });
}

export function trackCollectionFailed(args: {
  collectionRunId: string;
  source: string;
  error?: unknown;
  errorClass?: TelemetryErrorClass;
  durationMs?: number;
  connectorVersion?: string;
}) {
  void emitTelemetryEvent({
    correlation: {
      scope: "collection",
      hostRunId: getHostRunId(),
      collectionRunId: args.collectionRunId,
      source: args.source,
    },
    kind: {
      lifecycle: "collection",
      phase: "terminal",
      outcome: "failure",
      errorClass: args.errorClass ?? classifyTelemetryError(args.error),
    },
    durationMs: args.durationMs,
    connectorVersion: args.connectorVersion,
  });
}

export function trackCollectionCancelled(args: {
  collectionRunId: string;
  source: string;
  reason?: TelemetryCancellationReason;
  durationMs?: number;
  connectorVersion?: string;
}) {
  void emitTelemetryEvent({
    correlation: {
      scope: "collection",
      hostRunId: getHostRunId(),
      collectionRunId: args.collectionRunId,
      source: args.source,
    },
    kind: {
      lifecycle: "collection",
      phase: "terminal",
      outcome: "cancelled",
      ...(args.reason ? { reason: args.reason } : {}),
    },
    durationMs: args.durationMs,
    connectorVersion: args.connectorVersion,
  });
}

// ── Sync lifecycle ──────────────────────────────────────────────────────────

export function trackSyncStarted(args: {
  syncRunId: string;
  source: string;
  collectionRunId?: string;
}) {
  void emitTelemetryEvent({
    correlation: {
      scope: "sync",
      hostRunId: getHostRunId(),
      syncRunId: args.syncRunId,
      source: args.source,
      ...(args.collectionRunId ? { collectionRunId: args.collectionRunId } : {}),
    },
    kind: { lifecycle: "sync", phase: "started" },
  });
}

export function trackSyncCompleted(args: {
  syncRunId: string;
  source: string;
  storedScopeCount: number;
  failedScopeCount: number;
  collectionRunId?: string;
  durationMs?: number;
}) {
  void emitTelemetryEvent({
    correlation: {
      scope: "sync",
      hostRunId: getHostRunId(),
      syncRunId: args.syncRunId,
      source: args.source,
      ...(args.collectionRunId ? { collectionRunId: args.collectionRunId } : {}),
    },
    kind: {
      lifecycle: "sync",
      phase: "terminal",
      outcome: "success",
      storedScopeCount: args.storedScopeCount,
      failedScopeCount: args.failedScopeCount,
    },
    durationMs: args.durationMs,
  });
}

export function trackSyncFailed(args: {
  syncRunId: string;
  source: string;
  error?: unknown;
  errorClass?: TelemetryErrorClass;
  collectionRunId?: string;
  durationMs?: number;
}) {
  void emitTelemetryEvent({
    correlation: {
      scope: "sync",
      hostRunId: getHostRunId(),
      syncRunId: args.syncRunId,
      source: args.source,
      ...(args.collectionRunId ? { collectionRunId: args.collectionRunId } : {}),
    },
    kind: {
      lifecycle: "sync",
      phase: "terminal",
      outcome: "failure",
      errorClass: args.errorClass ?? classifyTelemetryError(args.error),
    },
    durationMs: args.durationMs,
  });
}

export function trackSyncSkipped(args: {
  syncRunId: string;
  source: string;
  reason: TelemetrySyncSkipReason;
  collectionRunId?: string;
}) {
  void emitTelemetryEvent({
    correlation: {
      scope: "sync",
      hostRunId: getHostRunId(),
      syncRunId: args.syncRunId,
      source: args.source,
      ...(args.collectionRunId ? { collectionRunId: args.collectionRunId } : {}),
    },
    kind: { lifecycle: "sync", phase: "skipped", reason: args.reason },
  });
}

// ── Grant flow lifecycle ────────────────────────────────────────────────────

export function trackGrantFlowStarted(args: { sessionId: string; platform?: string | null }) {
  void emitTelemetryEvent({
    correlation: { scope: "grant", hostRunId: getHostRunId(), grantFlowId: args.sessionId },
    kind: { lifecycle: "grant", phase: "started" },
    ...(args.platform ? { extensions: { platform: args.platform } } : {}),
  });
}

/** Alias for trackGrantFlowStarted — call sites may use either "completed" (approved) semantics. */
export function trackGrantFlowCompleted(args: { sessionId: string; platform?: string | null }) {
  void emitTelemetryEvent({
    correlation: { scope: "grant", hostRunId: getHostRunId(), grantFlowId: args.sessionId },
    kind: { lifecycle: "grant", phase: "terminal", outcome: "approved" },
    ...(args.platform ? { extensions: { platform: args.platform } } : {}),
  });
}

export function trackGrantFlowDenied(args: { sessionId: string; platform?: string | null }) {
  void emitTelemetryEvent({
    correlation: { scope: "grant", hostRunId: getHostRunId(), grantFlowId: args.sessionId },
    kind: { lifecycle: "grant", phase: "terminal", outcome: "denied" },
    ...(args.platform ? { extensions: { platform: args.platform } } : {}),
  });
}

export function trackGrantFlowExpired(args: { sessionId: string; platform?: string | null }) {
  void emitTelemetryEvent({
    correlation: { scope: "grant", hostRunId: getHostRunId(), grantFlowId: args.sessionId },
    kind: { lifecycle: "grant", phase: "terminal", outcome: "expired" },
    ...(args.platform ? { extensions: { platform: args.platform } } : {}),
  });
}

export function trackGrantFlowFailed(args: {
  sessionId: string;
  error?: unknown;
  errorClass?: TelemetryErrorClass;
  platform?: string | null;
}) {
  void emitTelemetryEvent({
    correlation: { scope: "grant", hostRunId: getHostRunId(), grantFlowId: args.sessionId },
    kind: {
      lifecycle: "grant",
      phase: "terminal",
      outcome: "failure",
      errorClass: args.errorClass ?? classifyTelemetryError(args.error),
    },
    ...(args.platform ? { extensions: { platform: args.platform } } : {}),
  });
}

// ── Auxiliary events (session claim, builder verification) ─────────────────
//
// These are DataConnect-specific side flows that don't have their own
// first-class lifecycle. They're emitted as host-level events with
// auxiliary details in `extensions`. The server stores them but doesn't
// compute lifecycle rollups over them.

export function trackSessionClaimCompleted(args: { sessionId: string; platform?: string | null }) {
  void emitTelemetryEvent({
    correlation: { scope: "host", hostRunId: getHostRunId() },
    kind: { lifecycle: "host", phase: "started" },
    extensions: {
      auxKind: "session_claim_completed",
      sessionId: args.sessionId,
      ...(args.platform ? { platform: args.platform } : {}),
    },
  });
}

export function trackSessionClaimFailed(args: {
  sessionId: string;
  error?: unknown;
  platform?: string | null;
}) {
  void emitTelemetryEvent({
    correlation: { scope: "host", hostRunId: getHostRunId() },
    kind: { lifecycle: "host", phase: "started" },
    extensions: {
      auxKind: "session_claim_failed",
      sessionId: args.sessionId,
      errorClass: classifyTelemetryError(args.error),
      ...(args.platform ? { platform: args.platform } : {}),
    },
  });
}

export function trackBuilderVerificationCompleted(args: {
  sessionId: string;
  platform?: string | null;
}) {
  void emitTelemetryEvent({
    correlation: { scope: "host", hostRunId: getHostRunId() },
    kind: { lifecycle: "host", phase: "started" },
    extensions: {
      auxKind: "builder_verification_completed",
      sessionId: args.sessionId,
      ...(args.platform ? { platform: args.platform } : {}),
    },
  });
}

export function trackBuilderVerificationFailed(args: {
  sessionId: string;
  error?: unknown;
  platform?: string | null;
}) {
  void emitTelemetryEvent({
    correlation: { scope: "host", hostRunId: getHostRunId() },
    kind: { lifecycle: "host", phase: "started" },
    extensions: {
      auxKind: "builder_verification_failed",
      sessionId: args.sessionId,
      errorClass: classifyTelemetryError(args.error),
      ...(args.platform ? { platform: args.platform } : {}),
    },
  });
}

// ── Legacy alias ────────────────────────────────────────────────────────────

/** @deprecated Use trackCollectionStarted instead. */
export const trackCollectionRunStarted = trackCollectionStarted;
