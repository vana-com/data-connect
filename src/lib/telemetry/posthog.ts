import { getTelemetryEnabled } from "@/lib/telemetry/client";
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST || "https://us.posthog.com").replace(/\/$/, "");

function isEnabled() {
  return typeof window !== "undefined" && Boolean(POSTHOG_KEY) && getTelemetryEnabled();
}

function buildDistinctId() {
  try {
    const existing = localStorage.getItem("v1_posthog_distinct_id");
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem("v1_posthog_distinct_id", next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

export function capturePosthogMilestone(eventName: string, properties: Record<string, unknown>) {
  if (!isEnabled()) return;

  const payload = {
    api_key: POSTHOG_KEY,
    event: eventName,
    distinct_id: buildDistinctId(),
    properties: {
      ...properties,
      $lib: "data-connect",
      $lib_version: "1",
    },
    timestamp: new Date().toISOString(),
  };

  void fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
