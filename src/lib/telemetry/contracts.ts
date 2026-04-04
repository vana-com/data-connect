// ---------------------------------------------------------------------------
// Telemetry contract — copied from the server.
//
// SOURCE OF TRUTH:
//   https://github.com/vana-com/context-gateway/blob/main/packages/contracts/src/telemetry.ts
//   https://github.com/vana-com/context-gateway/blob/main/packages/contracts/TELEMETRY.md
//
// This file is manually synced from context-gateway because that repo is
// private and can't be published to npm. When the server contract changes,
// update this file to match. The server validates events against its own
// copy; a mismatch will cause events from this client to be rejected.
//
// See TELEMETRY.md in context-gateway for the state machine, when to emit
// each event, and the rollup rules.
// ---------------------------------------------------------------------------

import { getPlatformRegistryEntryById } from "@/lib/platform/utils";

// ── Ingest endpoint ─────────────────────────────────────────────────────────

export const TELEMETRY_ENDPOINT =
  import.meta.env.VITE_TELEMETRY_URL ||
  "https://telemetry.opendatalabs.com/v1/data-connect/events";

export const TELEMETRY_CLIENT_NAME = "data-connect";
export const TELEMETRY_EVENT_VERSION = 1;

// ── Producers ───────────────────────────────────────────────────────────────

export const TELEMETRY_PRODUCERS = [
  "cli",
  "data_connect",
  "personal_server",
] as const;
export type TelemetryProducer = (typeof TELEMETRY_PRODUCERS)[number];

// ── Event names ─────────────────────────────────────────────────────────────

export const TELEMETRY_EVENT_NAMES = [
  // Collection lifecycle
  "collection_run_started",
  "collection_needs_input",
  "collection_completed",
  "collection_failed",
  "collection_cancelled",

  // Sync lifecycle
  "sync_request_started",
  "sync_request_skipped",
  "sync_request_completed",
  "sync_request_failed",

  // Grant flow lifecycle
  "grant_flow_started",
  "grant_flow_completed",
  "grant_flow_denied",
  "grant_flow_failed",
  "grant_flow_expired",

  // Auxiliary DataConnect events (fire-and-forget, no rollups)
  "session_claim_completed",
  "session_claim_failed",
  "builder_verification_completed",
  "builder_verification_failed",
] as const;
export type TelemetryEventName = (typeof TELEMETRY_EVENT_NAMES)[number];

// ── Error classes ───────────────────────────────────────────────────────────
//
// `needs_input` is intentionally NOT an error class. It's a state, not a
// failure mode. Use `abandoned_waiting_for_input` when a run times out
// waiting for the user.

export const TELEMETRY_ERROR_CLASSES = [
  "auth_failed",
  "abandoned_waiting_for_input",
  "personal_server_unavailable",
  "builder_verification_failed",
  "session_claim_failed",
  "grant_flow_failed",
  "sync_request_failed",
  "collection_failed",
  "network_error",
  "timeout",
  "runtime_error",
  "unknown",
] as const;
export type TelemetryErrorClass = (typeof TELEMETRY_ERROR_CLASSES)[number];

// ── Event shape ─────────────────────────────────────────────────────────────
//
// The server contract is a discriminated union keyed by `eventName`, with
// per-variant required fields. This client intentionally uses a single flat
// interface with everything optional — the typed `track*` helpers in
// `events.ts` enforce the per-event shape at the call site, and this
// envelope is what ultimately gets serialized. Keep this in sync with the
// server's `TelemetryEvent` union in terms of fields, not shape.

export interface DataConnectTelemetryEvent {
  // Identity
  eventId: string;
  eventVersion: number;
  timestamp: string; // ISO 8601
  producer: "data_connect";
  installId: string;
  appSessionId?: string | null;

  // Run correlation
  collectionRunId?: string | null;
  syncRunId?: string | null;
  sessionId?: string | null;

  // Event
  eventName: TelemetryEventName;
  source?: string | null; // connector ID, e.g. "chatgpt-playwright"
  errorClass?: TelemetryErrorClass | null;
  detail?: string | null; // free-form debugging context (NOT used by rollup logic)

  // Context
  connectorVersion?: string | null;
  authMode?: string | null;
  platform?: string | null;
  os?: string | null;
  arch?: string | null;
  appVersion: string;

  // Metrics
  durationMs?: number | null;
  recordCount?: number | null;
  scopeCount?: number | null;

  // Extensibility
  metadata?: Record<string, unknown> | null;
}

export interface DataConnectTelemetryBatch {
  batchId?: string | null;
  sentAt?: string | null;
  client?: {
    name?: string | null;
    version?: string | null;
  } | null;
  events: DataConnectTelemetryEvent[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function canonicalizeTelemetrySource(source: string | null | undefined) {
  if (!source) return null;
  return getPlatformRegistryEntryById(source)?.id ?? source;
}
