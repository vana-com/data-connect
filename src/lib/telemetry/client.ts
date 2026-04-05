// Telemetry client for data-connect. Sends canonical nested events to the
// context-gateway ingest endpoint. See @/lib/telemetry/contract.ts for the
// event shape, and the upstream TELEMETRY.md for the state machine.
//
// Architecture:
//  - In-memory outbox backed by localStorage (same pattern as before; a
//    file-backed outbox via Tauri fs is a future improvement).
//  - Typed constructors in @/lib/telemetry/events.ts are the only way to
//    build events at call sites — they enforce per-variant required fields.
//  - This module owns: identity (eventId, installId, appSessionId),
//    context (platform/os/arch/producerVersion), outbox, flush.

import { getVersion } from "@tauri-apps/api/app";
import {
  type TelemetryArch,
  type TelemetryBatch,
  type TelemetryContext,
  type TelemetryCorrelation,
  type TelemetryErrorClass,
  type TelemetryEvent,
  type TelemetryKind,
  type TelemetryOs,
  TELEMETRY_ENDPOINT,
  TELEMETRY_EVENT_VERSION,
  TELEMETRY_PRODUCER_NAME,
} from "@/lib/telemetry/contract";

const STORAGE_VERSION = "v2";
const TELEMETRY_ENABLED_KEY = `${STORAGE_VERSION}_telemetry_enabled`;
const TELEMETRY_INSTALL_ID_KEY = `${STORAGE_VERSION}_telemetry_install_id`;
const TELEMETRY_OUTBOX_KEY = `${STORAGE_VERSION}_telemetry_outbox`;
const TELEMETRY_SESSION_ID_KEY = `${STORAGE_VERSION}_telemetry_app_session_id`;
const TELEMETRY_HOST_RUN_ID_KEY = `${STORAGE_VERSION}_telemetry_host_run_id`;
const MAX_OUTBOX_EVENTS = 500;
const MAX_BATCH_EVENTS = 100;
const REQUEST_TIMEOUT_MS = 3_000;
const PERSIST_DEBOUNCE_MS = 2_000;

const ENV_DISABLED = import.meta.env.VITE_TELEMETRY_DISABLED === "1";
const ENV_DEBUG = import.meta.env.VITE_TELEMETRY_DEBUG === "1";

let flushPromise: Promise<void> | null = null;
let appVersionPromise: Promise<string> | null = null;
let cachedAppVersion = "unknown";

// In-memory outbox buffer — persisted to localStorage on a debounce and on pagehide.
let memoryOutbox: TelemetryEvent[] = [];
let memoryOutboxLoaded = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

// ── Helpers ─────────────────────────────────────────────────────────────────

function hasWindow() {
  return typeof window !== "undefined";
}

function safeGetItem(key: string) {
  if (!hasWindow()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string) {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[telemetry] failed to write ${key}`, error);
  }
}

function loadOutboxFromStorage(): TelemetryEvent[] {
  const raw = safeGetItem(TELEMETRY_OUTBOX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TelemetryEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ensureOutboxLoaded() {
  if (!memoryOutboxLoaded) {
    memoryOutbox = loadOutboxFromStorage();
    memoryOutboxLoaded = true;
  }
}

function persistOutbox() {
  safeSetItem(
    TELEMETRY_OUTBOX_KEY,
    JSON.stringify(memoryOutbox.slice(-MAX_OUTBOX_EVENTS)),
  );
}

function schedulePersist() {
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistOutbox();
  }, PERSIST_DEBOUNCE_MS);
}

/** Persist immediately and flush — call on pagehide or when telemetry is disabled. */
export function persistAndFlush() {
  ensureOutboxLoaded();
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  persistOutbox();
}

function appendToOutbox(event: TelemetryEvent) {
  ensureOutboxLoaded();
  memoryOutbox.push(event);
  if (memoryOutbox.length > MAX_OUTBOX_EVENTS) {
    memoryOutbox = memoryOutbox.slice(-MAX_OUTBOX_EVENTS);
  }
  schedulePersist();
}

function removeOutboxEvents(count: number) {
  memoryOutbox = memoryOutbox.slice(count);
  schedulePersist();
}

function getOutbox() {
  ensureOutboxLoaded();
  return memoryOutbox;
}

function getOrCreateLocalId(key: string, storage: Storage | null) {
  if (
    !storage ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function"
  ) {
    return crypto.randomUUID();
  }
  const existing = storage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  storage.setItem(key, next);
  return next;
}

// ── User controls ───────────────────────────────────────────────────────────

export function getTelemetryEnabled() {
  if (ENV_DISABLED) return false;
  return safeGetItem(TELEMETRY_ENABLED_KEY) !== "false";
}

export function setTelemetryEnabled(enabled: boolean) {
  safeSetItem(TELEMETRY_ENABLED_KEY, enabled ? "true" : "false");
  if (!enabled) {
    memoryOutbox = [];
    memoryOutboxLoaded = true;
    persistAndFlush();
  }
}

// ── Identity ────────────────────────────────────────────────────────────────

function getTelemetryInstallId() {
  if (!hasWindow()) return crypto.randomUUID();
  return getOrCreateLocalId(TELEMETRY_INSTALL_ID_KEY, localStorage);
}

function getTelemetryAppSessionId() {
  if (!hasWindow()) return crypto.randomUUID();
  return getOrCreateLocalId(TELEMETRY_SESSION_ID_KEY, sessionStorage);
}

/**
 * Per-app-launch host run ID. Desktop treats each app launch as one host run;
 * all collection/sync events during that launch carry this as `hostRunId` so
 * the server can correlate them. Stored in sessionStorage so it persists
 * across page navigation but resets on restart.
 */
export function getHostRunId() {
  if (!hasWindow()) return crypto.randomUUID();
  return getOrCreateLocalId(TELEMETRY_HOST_RUN_ID_KEY, sessionStorage);
}

// ── Host context detection ──────────────────────────────────────────────────

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: {
    platform?: string;
    architecture?: string;
  };
}

function detectOs(): TelemetryOs {
  if (!hasWindow()) return "linux";
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "macos";
  if (userAgent.includes("windows")) return "windows";
  return "linux";
}

function detectArch(): TelemetryArch {
  if (!hasWindow()) return "x86_64";
  const navigatorWithUAData = navigator as NavigatorWithUserAgentData;
  const raw = (navigatorWithUAData.userAgentData?.architecture ?? "").toLowerCase();
  if (raw.includes("arm")) return "arm64";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("arm") || ua.includes("aarch64")) return "arm64";
  return "x86_64";
}

async function resolveAppVersion() {
  if (cachedAppVersion !== "unknown") return cachedAppVersion;
  if (!appVersionPromise) {
    appVersionPromise = getVersion()
      .then((version) => {
        cachedAppVersion = version || "unknown";
        return cachedAppVersion;
      })
      .catch(() => cachedAppVersion);
  }
  return appVersionPromise;
}

async function buildContext(): Promise<TelemetryContext> {
  const os = detectOs();
  const arch = detectArch();
  const producerVersion = await resolveAppVersion();
  return {
    hostPlatform: `${os}-${arch}`,
    os,
    arch,
    producerVersion,
  };
}

// ── Event construction ──────────────────────────────────────────────────────

export interface EmitEventInput {
  correlation: TelemetryCorrelation;
  kind: TelemetryKind;
  durationMs?: number;
  connectorVersion?: string;
  authMode?: string;
  debug?: string;
  extensions?: Record<string, unknown>;
}

export async function emitTelemetryEvent(input: EmitEventInput): Promise<void> {
  if (!getTelemetryEnabled()) return;

  const context = await buildContext();
  if (input.connectorVersion) {
    context.connectorVersion = input.connectorVersion;
  }
  if (input.authMode) {
    context.authMode = input.authMode;
  }

  const event: TelemetryEvent = {
    identity: {
      eventId: crypto.randomUUID(),
      eventVersion: TELEMETRY_EVENT_VERSION,
    },
    time: {
      occurredAt: new Date().toISOString(),
      ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
    },
    attribution: {
      producer: TELEMETRY_PRODUCER_NAME,
      installId: getTelemetryInstallId(),
      appSessionId: getTelemetryAppSessionId(),
    },
    context,
    correlation: input.correlation,
    kind: input.kind,
    ...(input.debug ? { debug: input.debug } : {}),
    ...(input.extensions ? { extensions: input.extensions } : {}),
  };

  if (ENV_DEBUG) {
    console.info("[telemetry:debug]", event);
    return;
  }

  appendToOutbox(event);
  void flushTelemetry();
}

// ── Flush / network ─────────────────────────────────────────────────────────

function buildBatch(events: TelemetryEvent[]): TelemetryBatch {
  return {
    batchId: crypto.randomUUID(),
    sentAt: new Date().toISOString(),
    events,
  };
}

export async function flushTelemetry(options?: { keepalive?: boolean }) {
  if (!getTelemetryEnabled() || ENV_DEBUG) return;
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    while (true) {
      const next = getOutbox();
      if (next.length === 0) return;

      const batchEvents = next.slice(0, MAX_BATCH_EVENTS);
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBatch(batchEvents)),
      };

      try {
        if (options?.keepalive) {
          fetchOptions.keepalive = true;
          const response = await fetch(TELEMETRY_ENDPOINT, fetchOptions);
          if (!response.ok) return;
          removeOutboxEvents(batchEvents.length);
          persistOutbox();
          continue;
        }

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        fetchOptions.signal = controller.signal;
        try {
          const response = await fetch(TELEMETRY_ENDPOINT, fetchOptions);
          if (!response.ok) return;
        } finally {
          window.clearTimeout(timeout);
        }
        removeOutboxEvents(batchEvents.length);
        persistOutbox();
      } catch {
        return;
      }
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

// ── Utilities ───────────────────────────────────────────────────────────────

/** Best-effort error classification into a canonical TelemetryErrorClass. */
export function classifyTelemetryError(
  error: unknown,
  fallback: TelemetryErrorClass = "unknown",
): TelemetryErrorClass {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  const normalized = message.toLowerCase();

  if (normalized.includes("timeout") || normalized.includes("timed out")) return "timeout";
  if (
    normalized.includes("personal server") ||
    normalized.includes("server unavailable") ||
    normalized.includes("econnrefused")
  ) {
    return "personal_server_unavailable";
  }
  if (normalized.includes("network") || normalized.includes("fetch failed")) {
    return "network_error";
  }
  if (
    normalized.includes("sign in") ||
    normalized.includes("auth") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden")
  ) {
    return "auth_failed";
  }
  return fallback;
}

export function durationSince(startedAt: string | null | undefined): number | undefined {
  if (!startedAt) return undefined;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return undefined;
  return Math.max(0, Date.now() - started);
}
