import {
  check,
  type DownloadEvent,
  type Update,
} from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  )
}

function isMacOsPlatform(): boolean {
  if (typeof navigator === "undefined") return false

  const userAgentData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData
  const platform = userAgentData?.platform || navigator.platform || ""
  return platform.toLowerCase().includes("mac")
}

export function isMacOsTauriUpdaterRuntime(): boolean {
  return isTauriRuntime() && isMacOsPlatform()
}

export interface TauriUpdaterHandle {
  version: string
  notes: string | null
  publishedAt: string | null
  download: (onEvent?: (event: DownloadEvent) => void) => Promise<void>
  install: () => Promise<void>
}

function createHandle(update: Update): TauriUpdaterHandle {
  return {
    version: update.version,
    notes: update.body ?? null,
    publishedAt: update.date ?? null,
    download: onEvent => update.download(onEvent),
    install: () => update.install(),
  }
}

export async function checkForTauriUpdate(): Promise<TauriUpdaterHandle | null> {
  if (!isMacOsTauriUpdaterRuntime()) {
    return null
  }

  const update = await check()
  return update ? createHandle(update) : null
}

export async function downloadTauriUpdate(
  update: TauriUpdaterHandle,
  onEvent?: (event: DownloadEvent) => void
): Promise<void> {
  if (!isMacOsTauriUpdaterRuntime()) {
    return
  }

  await update.download(onEvent)
}

export async function installTauriUpdate(
  update: TauriUpdaterHandle
): Promise<void> {
  if (!isMacOsTauriUpdaterRuntime()) {
    return
  }

  await update.install()
}

export async function relaunchTauriApp(): Promise<void> {
  if (!isMacOsTauriUpdaterRuntime()) {
    return
  }

  await relaunch()
}
