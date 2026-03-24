import {
  check as checkForNativeUpdate,
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

function readPlatformString(): string {
  if (typeof navigator === "undefined") return ""

  const userAgentData = navigator as Navigator & {
    userAgentData?: { platform?: string }
  }

  return [
    userAgentData.userAgentData?.platform,
    navigator.platform,
    navigator.userAgent,
  ]
    .filter(value => typeof value === "string" && value.length > 0)
    .join(" ")
}

export function isTauriMacOsRuntime(): boolean {
  return isTauriRuntime() && /mac|darwin/i.test(readPlatformString())
}

export interface TauriAppUpdate {
  currentVersion: string
  version: string
  notes: string | null
  download: (onEvent?: (event: DownloadEvent) => void) => Promise<void>
  installAndRelaunch: () => Promise<void>
  close: () => Promise<void>
}

interface TauriUpdaterDependencies {
  check?: typeof checkForNativeUpdate
  relaunch?: typeof relaunch
}

export async function checkForTauriAppUpdate(
  dependencies: TauriUpdaterDependencies = {}
): Promise<TauriAppUpdate | null> {
  const check = dependencies.check ?? checkForNativeUpdate
  const restart = dependencies.relaunch ?? relaunch

  const update = await check()
  if (!update) return null

  let hasDownloaded = false

  const markDownloaded = async (
    action: (update: Update) => Promise<void>
  ): Promise<void> => {
    await action(update)
    hasDownloaded = true
  }

  return {
    currentVersion: update.currentVersion,
    version: update.version,
    notes: update.body ?? null,
    download: async onEvent => {
      if (hasDownloaded) return
      await markDownloaded(nextUpdate => nextUpdate.download(onEvent))
    },
    installAndRelaunch: async () => {
      if (!hasDownloaded) {
        await markDownloaded(nextUpdate => nextUpdate.download())
      }
      await update.install()
      await restart()
    },
    close: async () => {
      await update.close()
    },
  }
}
