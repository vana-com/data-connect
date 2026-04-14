// ---------------------------------------------------------------------------
// Canonical telemetry contract — copied from context-gateway.
//
// SOURCE OF TRUTH:
//   https://github.com/vana-com/context-gateway/blob/main/packages/contracts/src/telemetry.ts
//   https://github.com/vana-com/context-gateway/blob/main/packages/contracts/TELEMETRY.md
//
// Context-gateway is a private monorepo, so this file is manually synced
// rather than imported from npm. When the canonical contract changes, this
// file MUST be updated to match — the server validates events against its
// own copy and a mismatch will cause events from this client to be rejected.
//
// DO NOT edit the shape below to differ from the canonical file. If you need
// client-only additions, put them in the "DataConnect additions" section at
// the bottom.
// ---------------------------------------------------------------------------

// ── Producers ───────────────────────────────────────────────────────────────

export const telemetryProducers = [
  "cli",
  "data_connect",
  "personal_server",
] as const;
export type TelemetryProducer = (typeof telemetryProducers)[number];

// ── Error classes ───────────────────────────────────────────────────────────
//
// Causes of terminal failures. Only attached to events where `outcome === "failure"`.
// Intentionally small — new values are added only when we need to distinguish
// a failure mode that drives different remediation.

export const telemetryErrorClasses = [
  "auth_failed",
  "rate_limited",
  "upstream_error",
  "navigation_error",
  "selector_error",
  "protocol_violation",
  "personal_server_unavailable",
  "network_error",
  "timeout",
  "runtime_error",
  "unknown",
] as const;
export type TelemetryErrorClass = (typeof telemetryErrorClasses)[number];

// ── Cancellation reasons ────────────────────────────────────────────────────
//
// Attached to `outcome: "cancelled"` events when the reason is known.
// Cancellation is a user/system choice, NOT an error.

export const telemetryCancellationReasons = [
  "user_aborted",
  "abandoned",
  "timeout",
] as const;
export type TelemetryCancellationReason =
  (typeof telemetryCancellationReasons)[number];

// ── Interaction kinds ───────────────────────────────────────────────────────
//
// Attached to `collection` `needs_input` events when the kind of interaction
// is known (a connector may detect "login needed" without knowing the flavor).

export const telemetryInteractionKinds = [
  "login",
  "otp",
  "captcha",
  "manual_action",
] as const;
export type TelemetryInteractionKind =
  (typeof telemetryInteractionKinds)[number];

// ── Sync skip reasons ───────────────────────────────────────────────────────

export const telemetrySyncSkipReasons = [
  "server_unavailable",
  "not_requested",
] as const;
export type TelemetrySyncSkipReason =
  (typeof telemetrySyncSkipReasons)[number];

// ── OS / arch ───────────────────────────────────────────────────────────────

export const telemetryOsValues = ["linux", "macos", "windows"] as const;
export type TelemetryOs = (typeof telemetryOsValues)[number];

export const telemetryArchValues = ["x86_64", "arm64"] as const;
export type TelemetryArch = (typeof telemetryArchValues)[number];

// ── Compartments ────────────────────────────────────────────────────────────
//
// An event is the composition of seven orthogonal compartments. Each has one
// job. The wire format is the nested JSON of these compartments — no
// flattening, no transformation at ingest beyond validation.

/** Uniqueness and schema version. */
export interface TelemetryIdentity {
  /** Globally unique UUID. The server dedupes on this. */
  eventId: string;
  /** Schema version of this event shape. Bumped when required fields change. */
  eventVersion: number;
}

/** When the event happened. */
export interface TelemetryTime {
  /** Client-reported time the event occurred (ISO 8601). Used for rollup ordering. */
  occurredAt: string;
  /**
   * Wall-clock duration in milliseconds. Only present on terminal lifecycle
   * events — measured from the lifecycle's `started` event to the terminal event.
   */
  durationMs?: number;
}

/** Who emitted the event. */
export interface TelemetryAttribution {
  producer: TelemetryProducer;
  /** Persistent per-install UUID. */
  installId: string;
  /**
   * Per-app-launch ID (desktop) or per-command-invocation ID (CLI). Optional
   * because some producers don't have this concept.
   */
  appSessionId?: string;
}

/** Stable process-level facts. Same across all events in a single host run. */
export interface TelemetryContext {
  /** Combined platform+arch, e.g. "linux-x86_64", "macos-arm64". */
  hostPlatform: string;
  os: TelemetryOs;
  arch: TelemetryArch;
  /** Producer's own version (e.g. "0.7.50" for data-connect, "0.12.2" for CLI). */
  producerVersion: string;
  /** Connector version. Only on events where a connector is involved. */
  connectorVersion?: string;
  /** Auth mode used by the connector. Only when relevant. */
  authMode?: string;
}

/** Minimal per-run scope counts for honest collection classification. */
export interface TelemetryScopeSummary {
  requested: number;
  produced: number;
  degraded: number;
  omitted: number;
}

// ── Correlation (nested tree) ───────────────────────────────────────────────
//
// The three in-flight entities (host run, collection run, sync attempt, grant
// flow) form a tree. The Correlation union enforces the tree shape in the
// type system — a sync event cannot exist without its host run, a grant flow
// event cannot exist without its host run.
//
// `source` (connector identifier, e.g. "chatgpt-playwright") is part of
// correlation for collection and sync events because the run's identity
// includes its source.

export type TelemetryCorrelation =
  | {
      scope: "host";
      hostRunId: string;
    }
  | {
      scope: "collection";
      hostRunId: string;
      collectionRunId: string;
      source: string;
    }
  | {
      scope: "sync";
      hostRunId: string;
      syncRunId: string;
      source: string;
      /**
       * Optional link to the collection that produced the data being synced.
       * Present for connector-triggered sync; absent for force-sync or
       * background-retry paths.
       */
      collectionRunId?: string;
    }
  | {
      scope: "grant";
      hostRunId: string;
      grantFlowId: string;
    };

// ── Kind (what happened) ────────────────────────────────────────────────────
//
// Strict discriminated union. Phase is orthogonal to outcome. Each variant
// declares its own required payload fields. Impossible combinations (e.g.,
// a success event with an errorClass) are compile errors.

export type TelemetryKind =
  // ── Host lifecycle ────────────────────────────────────────────────────────
  // Generic wrapper for an entire producer invocation. Details (command,
  // session attributes, setup steps) live in `extensions`.
  | { lifecycle: "host"; phase: "started" }
  | { lifecycle: "host"; phase: "terminal"; outcome: "success" }
  | {
      lifecycle: "host";
      phase: "terminal";
      outcome: "failure";
      errorClass: TelemetryErrorClass;
    }

  // ── Collection lifecycle ──────────────────────────────────────────────────
  // Running a connector to collect data from a platform.
  | { lifecycle: "collection"; phase: "started" }
  | {
      lifecycle: "collection";
      phase: "needs_input";
      interactionKind?: TelemetryInteractionKind;
    }
  | {
      lifecycle: "collection";
      phase: "terminal";
      outcome: "success";
      /** Records produced by the connector. Zero is valid (empty account). */
      recordCount?: number;
      /** Aggregate scope counts without enumerating individual scopes yet. */
      scopeSummary?: TelemetryScopeSummary;
    }
  | {
      lifecycle: "collection";
      phase: "terminal";
      outcome: "partial";
      errorClass: TelemetryErrorClass;
      /** Records produced by the connector, including partial results. */
      recordCount?: number;
      /** Aggregate scope counts without enumerating individual scopes yet. */
      scopeSummary?: TelemetryScopeSummary;
    }
  | {
      lifecycle: "collection";
      phase: "terminal";
      outcome: "failure";
      errorClass: TelemetryErrorClass;
      /** Aggregate scope counts without enumerating individual scopes yet. */
      scopeSummary?: TelemetryScopeSummary;
    }
  | {
      lifecycle: "collection";
      phase: "terminal";
      outcome: "cancelled";
      reason?: TelemetryCancellationReason;
      /** Aggregate scope counts without enumerating individual scopes yet. */
      scopeSummary?: TelemetryScopeSummary;
    }

  // ── Sync lifecycle ────────────────────────────────────────────────────────
  // Delivering collected data to the personal server.
  //
  // Two mutually exclusive paths:
  //   1. `started` → `terminal` (success or failure) when delivery is attempted
  //   2. `skipped` (standalone, no preceding `started`) when delivery is not attempted
  | { lifecycle: "sync"; phase: "started" }
  | {
      lifecycle: "sync";
      phase: "terminal";
      outcome: "success";
      /** Scopes successfully delivered. */
      storedScopeCount: number;
      /** Scopes that failed to deliver. If > 0, the UI labels this "partial". */
      failedScopeCount: number;
    }
  | {
      lifecycle: "sync";
      phase: "terminal";
      outcome: "failure";
      errorClass: TelemetryErrorClass;
    }
  | {
      lifecycle: "sync";
      phase: "skipped";
      reason: TelemetrySyncSkipReason;
    }

  // ── Grant flow lifecycle ──────────────────────────────────────────────────
  // Third-party app requesting access to user data through the protocol.
  | { lifecycle: "grant"; phase: "started" }
  | { lifecycle: "grant"; phase: "terminal"; outcome: "approved" }
  | { lifecycle: "grant"; phase: "terminal"; outcome: "denied" }
  | { lifecycle: "grant"; phase: "terminal"; outcome: "expired" }
  | {
      lifecycle: "grant";
      phase: "terminal";
      outcome: "failure";
      errorClass: TelemetryErrorClass;
    };

/** All lifecycle names — useful for filtering, rollup dispatch. */
export const telemetryLifecycles = [
  "host",
  "collection",
  "sync",
  "grant",
] as const;
export type TelemetryLifecycle = (typeof telemetryLifecycles)[number];

// ── Event (the whole thing) ─────────────────────────────────────────────────

export interface TelemetryEvent {
  identity: TelemetryIdentity;
  time: TelemetryTime;
  attribution: TelemetryAttribution;
  context: TelemetryContext;
  correlation: TelemetryCorrelation;
  kind: TelemetryKind;
  /**
   * Free-form debugging context. Rollup logic MUST NOT depend on this field.
   * Example: "Playwright timeout waiting for #login-button after 30s".
   */
  debug?: string;
  /**
   * Producer-specific or otherwise-unmodeled fields. Stored as JSONB. Use
   * this for host-level metadata (e.g., CLI's command/subcommand, desktop's
   * appInstanceId) and any one-off attributes.
   */
  extensions?: Record<string, unknown>;
}

// ── Batch (transport envelope) ──────────────────────────────────────────────

export interface TelemetryBatch {
  batchId: string;
  sentAt: string;
  events: TelemetryEvent[];
}

// ── Rollup outcome buckets ──────────────────────────────────────────────────
//
// Server-computed categories written to rollup tables. Clients never send
// these — the server derives them from event sequences.

export const telemetryCollectionRollupOutcomes = [
  "success",
  "partial",
  "failure",
  "cancelled",
  "no_terminal",
] as const;
export type TelemetryCollectionRollupOutcome =
  (typeof telemetryCollectionRollupOutcomes)[number];

export const telemetrySyncRollupOutcomes = [
  "success",
  "failure",
  "skipped_server_unavailable",
  "skipped_not_requested",
  "no_terminal",
] as const;
export type TelemetrySyncRollupOutcome =
  (typeof telemetrySyncRollupOutcomes)[number];

export const telemetryGrantRollupOutcomes = [
  "approved",
  "denied",
  "expired",
  "failure",
  "no_terminal",
] as const;
export type TelemetryGrantRollupOutcome =
  (typeof telemetryGrantRollupOutcomes)[number];

export const telemetryHostRollupOutcomes = [
  "success",
  "failure",
  "no_terminal",
] as const;
export type TelemetryHostRollupOutcome =
  (typeof telemetryHostRollupOutcomes)[number];

// ── PostHog forwarding ──────────────────────────────────────────────────────
//
// Terminal events and skipped events — anything a funnel might want to end at.
// Started events are intentionally excluded here to keep PostHog volume down;
// if we want funnel denominators later we can add them.

export interface PosthogMilestoneKey {
  lifecycle: TelemetryLifecycle;
  phase: "terminal" | "skipped";
}

export function isPosthogMilestone(kind: TelemetryKind): boolean {
  if (kind.phase === "terminal") return true;
  if (kind.lifecycle === "sync" && kind.phase === "skipped") return true;
  return false;
}

// ── DataConnect additions ───────────────────────────────────────────────────
//
// Client-only constants. These are not part of the wire contract — they
// configure how the DataConnect client talks to the ingest endpoint.

export const TELEMETRY_ENDPOINT =
  "https://telemetry.opendatalabs.com/v1/telemetry/events";
export const TELEMETRY_EVENT_VERSION = 1;
export const TELEMETRY_PRODUCER_NAME: TelemetryProducer = "data_connect";
