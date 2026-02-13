import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { useAuth } from "@/hooks/useAuth"
import { copyTextToClipboard } from "@/lib/clipboard"
import { openLocalPath, toFileUrl } from "@/lib/open-resource"
import { getPlatformRegistryEntryById } from "@/lib/platform/utils"
import {
  getUserDataPath,
  loadLatestSourceExportFull,
  loadLatestSourceExportPreview,
  openPlatformExportFolder,
  type SourceExportPreview,
} from "@/lib/tauri-paths"
import type { RootState, Run } from "@/types"
import type { CopyStatus, SourceOverviewPageState } from "./types"

const fileSystemStub = `../exported_data`

const isTauriRuntime = () =>
  typeof window !== "undefined" &&
  ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)

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

  const sourceEntry = platformId
    ? getPlatformRegistryEntryById(platformId)
    : null

  const sourceName = sourceEntry?.displayName ?? platformId ?? "Unknown source"
  const sourceStoragePath = sourceEntry
    ? `${fileSystemStub}/${sourceEntry.id}`
    : fileSystemStub

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

  const openSourcePath =
    preview?.filePath ??
    latestSourceRun?.exportPath ??
    (appDataPath ? `${appDataPath}/exported_data` : null)
  const openSourceHref = openSourcePath ? toFileUrl(openSourcePath) : "#"

  const handleOpenSourcePath = async () => {
    if (sourcePlatform) {
      try {
        await openPlatformExportFolder(sourcePlatform.company, sourcePlatform.name)
        return
      } catch {
        // Fall through to generic local path fallback.
      }
    }
    if (!openSourcePath) return
    await openLocalPath(openSourcePath)
  }

  const handleOpenFile = async () => {
    await handleOpenSourcePath()
  }

  const handleCopyFullJson = async () => {
    if (!sourcePlatform) return
    setCopyStatus("copying")
    try {
      const fullJson = await loadLatestSourceExportFull(
        sourcePlatform.company,
        sourcePlatform.name
      )
      if (!fullJson) {
        throw new Error("No source JSON found on disk")
      }
      const copied = await copyTextToClipboard(fullJson)
      if (!copied) {
        throw new Error("Clipboard copy failed")
      }
      setCopyStatus("copied")
    } catch (error) {
      console.error("Failed to copy full JSON:", error)
      setCopyStatus("error")
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
    sourceStoragePath,
    sourcePlatform,
    canAccessDebugRuns,
    preview,
    isPreviewLoading,
    previewError,
    copyStatus,
    openSourcePath,
    openSourceHref,
    fallbackPreviewJson,
    handleOpenSourcePath,
    handleOpenFile,
    handleCopyFullJson,
  }
}
