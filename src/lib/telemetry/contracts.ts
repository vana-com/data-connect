import { getPlatformRegistryEntryById } from "@/lib/platform/utils";

export const TELEMETRY_ENDPOINT =
  import.meta.env.VITE_TELEMETRY_URL ||
  "https://telemetry.opendatalabs.com/v1/data-connect/events";

export const TELEMETRY_CLIENT_NAME = "data-connect";
export const TELEMETRY_EVENT_VERSION = 1;

export const TELEMETRY_EVENT_NAMES = [
  "collection_run_started",
  "collection_needs_input",
  "collection_completed",
  "collection_failed",
  "collection_cancelled",
  "sync_request_started",
  "sync_request_skipped",
  "sync_request_completed",
  "sync_request_failed",
  "session_claim_completed",
  "session_claim_failed",
  "builder_verification_completed",
  "builder_verification_failed",
  "grant_flow_completed",
  "grant_flow_denied",
  "grant_flow_failed",
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENT_NAMES)[number];

export const TELEMETRY_ERROR_CLASSES = [
  "needs_input",
  "auth_failed",
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

export interface DataConnectTelemetryEvent {
  eventId: string;
  eventVersion: number;
  timestamp: string;
  producer: "data_connect";
  installId: string;
  appSessionId?: string | null;
  collectionRunId?: string | null;
  syncRunId?: string | null;
  sessionId?: string | null;
  eventName: TelemetryEventName;
  source?: string | null;
  connectorVersion?: string | null;
  authMode?: string | null;
  platform?: string | null;
  os?: string | null;
  arch?: string | null;
  appVersion: string;
  outcome?: string | null;
  errorClass?: TelemetryErrorClass | null;
  durationMs?: number | null;
  scopeCount?: number | null;
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

export function canonicalizeTelemetrySource(source: string | null | undefined) {
  if (!source) return null;
  return getPlatformRegistryEntryById(source)?.id ?? source;
}
