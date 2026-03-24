import type {
  CheckOptions,
  DownloadEvent,
  DownloadOptions,
  Update,
} from "@tauri-apps/plugin-updater"

export interface TauriUpdaterMetadata {
  currentVersion: string
  version: string
  date?: string
  body?: string
  rawJson: Record<string, unknown>
}

let pendingUpdate: Update | null = null

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  )
}

function isMacOsPlatform(): boolean {
  if (typeof navigator === "undefined") return false

  const platform =
    navigator.userAgentData?.platform ??
    navigator.platform ??
    navigator.userAgent ??
    ""

  return /mac/i.test(platform)
}

export function canUseTauriUpdater(): boolean {
  return isTauriRuntime() && isMacOsPlatform()
}

async function closePendingUpdate() {
  if (!pendingUpdate) return
  const update = pendingUpdate
  pendingUpdate = null
  await update.close()
}

function toMetadata(update: Update): TauriUpdaterMetadata {
  return {
    currentVersion: update.currentVersion,
    version: update.version,
    ...(update.date ? { date: update.date } : {}),
    ...(update.body ? { body: update.body } : {}),
    rawJson: update.rawJson,
  }
}

export async function checkForTauriUpdate(
  options?: CheckOptions
): Promise<TauriUpdaterMetadata | null> {
  if (!canUseTauriUpdater()) {
    await closePendingUpdate()
    return null
  }

  const { check } = await import("@tauri-apps/plugin-updater")
  const update = await check(options)

  await closePendingUpdate()
  if (!update) {
    return null
  }

  pendingUpdate = update
  return toMetadata(update)
}

export async function downloadTauriUpdate(
  onEvent?: (progress: DownloadEvent) => void,
  options?: DownloadOptions
): Promise<boolean> {
  if (!pendingUpdate) return false
  await pendingUpdate.download(onEvent, options)
  return true
}

export async function installTauriUpdate(): Promise<boolean> {
  if (!pendingUpdate) return false

  const update = pendingUpdate
  try {
    await update.install()
    return true
  } finally {
    pendingUpdate = null
    await update.close()
  }
}

export async function relaunchTauriApp(): Promise<boolean> {
  if (!canUseTauriUpdater()) return false
  const { relaunch } = await import("@tauri-apps/plugin-process")
  await relaunch()
  return true
}

export async function clearPendingTauriUpdate(): Promise<void> {
  await closePendingUpdate()
}
