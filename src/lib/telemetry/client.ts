import { getVersion } from "@tauri-apps/api/app";
import {
  type DataConnectTelemetryBatch,
  type DataConnectTelemetryEvent,
  TELEMETRY_CLIENT_NAME,
  TELEMETRY_ENDPOINT,
  TELEMETRY_EVENT_VERSION,
  canonicalizeTelemetrySource,
} from "@/lib/telemetry/contracts";

const STORAGE_VERSION = "v1";
const TELEMETRY_ENABLED_KEY = `${STORAGE_VERSION}_telemetry_enabled`;
const TELEMETRY_INSTALL_ID_KEY = `${STORAGE_VERSION}_telemetry_install_id`;
const TELEMETRY_OUTBOX_KEY = `${STORAGE_VERSION}_telemetry_outbox`;
const TELEMETRY_SESSION_ID_KEY = `${STORAGE_VERSION}_telemetry_app_session_id`;
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
let memoryOutbox: DataConnectTelemetryEvent[] = [];
let memoryOutboxLoaded = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

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

function loadOutboxFromStorage(): DataConnectTelemetryEvent[] {
  const raw = safeGetItem(TELEMETRY_OUTBOX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DataConnectTelemetryEvent[];
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
  safeSetItem(TELEMETRY_OUTBOX_KEY, JSON.stringify(memoryOutbox.slice(-MAX_OUTBOX_EVENTS)));
}

function schedulePersist() {
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistOutbox();
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * Persist immediately and flush — call on pagehide or when telemetry is disabled.
 */
export function persistAndFlush() {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  persistOutbox();
}

function appendToOutbox(event: DataConnectTelemetryEvent) {
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

export function getTelemetryInstallId() {
  if (!hasWindow()) return crypto.randomUUID();
  return getOrCreateLocalId(TELEMETRY_INSTALL_ID_KEY, localStorage);
}

export function getTelemetryAppSessionId() {
  if (!hasWindow()) return crypto.randomUUID();
  return getOrCreateLocalId(TELEMETRY_SESSION_ID_KEY, sessionStorage);
}

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: {
    platform?: string;
    architecture?: string;
  };
}

function detectPlatform() {
  if (!hasWindow()) return null;
  const navigatorWithUAData = navigator as NavigatorWithUserAgentData;
  return navigatorWithUAData.userAgentData?.platform ?? navigator.platform ?? null;
}

function detectOs() {
  if (!hasWindow()) return null;
  const navigatorWithUAData = navigator as NavigatorWithUserAgentData;
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac")) return "macos";
  if (userAgent.includes("windows")) return "windows";
  if (userAgent.includes("linux")) return "linux";
  return navigatorWithUAData.userAgentData?.platform?.toLowerCase() ?? null;
}

function detectArch() {
  if (!hasWindow()) return null;
  const navigatorWithUAData = navigator as NavigatorWithUserAgentData;
  return navigatorWithUAData.userAgentData?.architecture ?? null;
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

function buildBatch(events: DataConnectTelemetryEvent[]): DataConnectTelemetryBatch {
  return {
    batchId: crypto.randomUUID(),
    sentAt: new Date().toISOString(),
    client: {
      name: TELEMETRY_CLIENT_NAME,
      version: cachedAppVersion,
    },
    events,
  };
}

export interface QueueTelemetryEventInput {
  eventName: DataConnectTelemetryEvent["eventName"];
  collectionRunId?: string | null;
  syncRunId?: string | null;
  sessionId?: string | null;
  source?: string | null;
  connectorVersion?: string | null;
  authMode?: string | null;
  platform?: string | null;
  outcome?: string | null;
  errorClass?: DataConnectTelemetryEvent["errorClass"];
  durationMs?: number | null;
  scopeCount?: number | null;
  metadata?: Record<string, unknown> | null;
}

export async function queueTelemetryEvent(input: QueueTelemetryEventInput) {
  if (!getTelemetryEnabled()) {
    return;
  }

  const appVersion = await resolveAppVersion();
  const event: DataConnectTelemetryEvent = {
    eventId: crypto.randomUUID(),
    eventVersion: TELEMETRY_EVENT_VERSION,
    timestamp: new Date().toISOString(),
    producer: "data_connect",
    installId: getTelemetryInstallId(),
    appSessionId: getTelemetryAppSessionId(),
    collectionRunId: input.collectionRunId ?? null,
    syncRunId: input.syncRunId ?? null,
    sessionId: input.sessionId ?? null,
    eventName: input.eventName,
    source: canonicalizeTelemetrySource(input.source),
    connectorVersion: input.connectorVersion ?? null,
    authMode: input.authMode ?? null,
    platform: input.platform ?? detectPlatform(),
    os: detectOs(),
    arch: detectArch(),
    appVersion,
    outcome: input.outcome ?? null,
    errorClass: input.errorClass ?? null,
    durationMs: input.durationMs ?? null,
    scopeCount: input.scopeCount ?? null,
    metadata: input.metadata ?? null,
  };

  if (ENV_DEBUG) {
    console.info("[telemetry:debug]", event);
    return;
  }

  appendToOutbox(event);
  void flushTelemetry();
}

export async function flushTelemetry(options?: { keepalive?: boolean }) {
  if (!getTelemetryEnabled() || ENV_DEBUG) {
    return;
  }

  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    while (true) {
      const next = getOutbox();
      if (next.length === 0) {
        return;
      }

      const batchEvents = next.slice(0, MAX_BATCH_EVENTS);

      try {
        const fetchOptions: RequestInit = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBatch(batchEvents)),
        };

        if (options?.keepalive) {
          fetchOptions.keepalive = true;
        } else {
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
          continue;
        }

        const response = await fetch(TELEMETRY_ENDPOINT, fetchOptions);
        if (!response.ok) return;
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

export function classifyTelemetryError(error: unknown, fallback: DataConnectTelemetryEvent["errorClass"] = "unknown") {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error ?? "");
  const normalized = message.toLowerCase();

  if (normalized.includes("timeout")) return "timeout";
  if (normalized.includes("network")) return "network_error";
  if (normalized.includes("personal server") || normalized.includes("server unavailable")) {
    return "personal_server_unavailable";
  }
  if (normalized.includes("sign in") || normalized.includes("auth")) {
    return "auth_failed";
  }
  return fallback;
}

export function durationSince(startedAt: string | null | undefined) {
  if (!startedAt) return null;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return null;
  return Math.max(0, Date.now() - started);
}
