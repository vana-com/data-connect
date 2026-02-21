import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { useAuth } from "@/hooks/useAuth"
import { copyTextToClipboard } from "@/lib/clipboard"
import { openExportFolderPath } from "@/lib/open-resource"
import { getPlatformRegistryEntryById } from "@/lib/platform/utils"
import {
  clearExportedDataCache,
  getUserDataPath,
  loadLatestSourceExportFull,
  loadLatestSourceExportPreview,
  openPlatformExportFolder,
  type SourceExportPreview,
} from "@/lib/tauri-paths"
import type { RootState, Run } from "@/types"
import type {
  CopyStatus,
  ResetCacheStatus,
  SourceOverviewPageState,
} from "./types"
import { formatRelativeTimeLabel } from "./utils"

const actionFeedbackMs = 1_200
const resetActionMinLoadingMs = 1_500

const isTauriRuntime = () =>
  typeof window !== "undefined" &&
  ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)

const waitForMinimumLoadingState = async (
  startedAtMs: number,
  minLoadingMs: number
) => {
  const elapsedMs = Date.now() - startedAtMs
  const remainingMs = minLoadingMs - elapsedMs
  if (remainingMs <= 0) return
  await new Promise(resolve => {
    window.setTimeout(resolve, remainingMs)
  })
}

export function useSourceOverviewPage(
  platformId?: string
): SourceOverviewPageState {
  const runs = useSelector((state: RootState) => state.app.runs)
  const platforms = useSelector((state: RootState) => state.app.platforms)
  const { canAccessDebugRuns } = useAuth()

  const [appDataPath, setAppDataPath] = useState<string | null>(null)
  const [preview, setPreview] = useState<SourceExportPreview | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle")
  const [resetCacheStatus, setResetCacheStatus] =
    useState<ResetCacheStatus>("idle")

  const sourceEntry = platformId
    ? getPlatformRegistryEntryById(platformId)
    : null

  const sourceName = sourceEntry?.displayName ?? platformId ?? "Unknown source"

  const latestSourceRun = useMemo(() => {
    if (!platformId) return null
    return [...runs]
      .filter(
        run =>
          getPlatformRegistryEntryById(run.platformId)?.id === sourceEntry?.id
      )
      .sort((a: Run, b: Run) => b.startDate.localeCompare(a.startDate))[0]
  }, [platformId, runs, sourceEntry?.id])

  const sourcePlatform = useMemo(
    () =>
      platforms.find(
        platform =>
          getPlatformRegistryEntryById(platform.id)?.id === sourceEntry?.id
      ) ?? null,
    [platforms, sourceEntry?.id]
  )

  useEffect(() => {
    let cancelled = false
    void getUserDataPath()
      .then(path => {
        if (!cancelled) {
          setAppDataPath(path)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppDataPath(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!sourcePlatform) {
      setPreview(null)
      setPreviewError(null)
      setIsPreviewLoading(false)
      return
    }

    let cancelled = false
    setIsPreviewLoading(true)
    setPreviewError(null)

    void loadLatestSourceExportPreview(
      sourcePlatform.company,
      sourcePlatform.name
    )
      .then(result => {
        if (!cancelled) {
          setPreview(result)
        }
      })
      .catch(error => {
        if (!cancelled) {
          setPreview(null)
          setPreviewError(
            isTauriRuntime()
              ? error instanceof Error
                ? error.message
                : "Failed to load preview"
              : null
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreviewLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [sourcePlatform])

  useEffect(() => {
    if (resetCacheStatus !== "success" && resetCacheStatus !== "error") {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setResetCacheStatus("idle")
    }, actionFeedbackMs)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [resetCacheStatus])

  useEffect(() => {
    if (copyStatus !== "copied" && copyStatus !== "error") {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setCopyStatus("idle")
    }, actionFeedbackMs)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [copyStatus])

  const openSourcePath =
    preview?.filePath ??
    latestSourceRun?.exportPath ??
    (appDataPath ? `${appDataPath}/exported_data` : null)
  const lastUsedLabel = useMemo(
    () =>
      formatRelativeTimeLabel(
        latestSourceRun?.startDate ?? preview?.exportedAt ?? null
      ),
    [latestSourceRun?.startDate, preview?.exportedAt]
  )

  const handleOpenSourcePath = async () => {
    if (sourcePlatform) {
      try {
        await openPlatformExportFolder(sourcePlatform.company, sourcePlatform.name)
        return
      } catch {
        // Fall through to generic local path fallback.
      }
    }
    let fallbackPath = openSourcePath
    if (!fallbackPath) {
      try {
        const userDataPath = await getUserDataPath()
        fallbackPath = `${userDataPath}/exported_data`
      } catch {
        fallbackPath = null
      }
    }
    if (!fallbackPath) return
    await openExportFolderPath(fallbackPath)
  }

  const handleCopyFullJson = async () => {
    setCopyStatus("copying")
    try {
      let copyPayload: string | null = null

      if (sourcePlatform) {
        const fullJson = await loadLatestSourceExportFull(
          sourcePlatform.company,
          sourcePlatform.name
        )
        copyPayload = fullJson ?? null
      }

      if (!copyPayload) {
        copyPayload = preview?.previewJson ?? fallbackPreviewJson
      }

      const copied = await copyTextToClipboard(copyPayload)
      if (!copied) {
        throw new Error("Clipboard copy failed")
      }
      setCopyStatus("copied")
    } catch (error) {
      console.error("Failed to copy full JSON:", error)
      setCopyStatus("error")
    }
  }

  const handleResetExportedDataCache = async () => {
    if (resetCacheStatus === "resetting") return
    const startedAtMs = Date.now()
    setResetCacheStatus("resetting")
    try {
      await clearExportedDataCache()
      setPreview(null)
      setPreviewError(null)
      setIsPreviewLoading(false)
      await waitForMinimumLoadingState(startedAtMs, resetActionMinLoadingMs)
      setResetCacheStatus("success")
    } catch (error) {
      console.error("Failed to reset exported data cache:", error)
      await waitForMinimumLoadingState(startedAtMs, resetActionMinLoadingMs)
      setResetCacheStatus("error")
    }
  }

  const fallbackPreviewJson = `{
  "${sourceEntry?.id ?? "source"}Preview": {
    "status": "stub",
    "note": "Local browser fallback preview. Full source preview requires Tauri runtime.",
    "latestRunPath": "${latestSourceRun?.exportPath ?? "pending"}"
  }
}`

  return {
    sourceEntry,
    sourceName,
    lastUsedLabel,
    sourcePlatform,
    canAccessDebugRuns,
    preview,
    isPreviewLoading,
    previewError,
    copyStatus,
    resetCacheStatus,
    openSourcePath,
    fallbackPreviewJson,
    handleOpenSourcePath,
    handleCopyFullJson,
    handleResetExportedDataCache,
  }
}
