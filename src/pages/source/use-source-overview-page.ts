import { useEffect, useMemo, useState } from "react"
import { useSelector } from "react-redux"
import { copyTextToClipboard } from "@/lib/clipboard"
import { openExportFolderPath, openLocalPath } from "@/lib/open-resource"
import { getPlatformRegistryEntryById } from "@/lib/platform/utils"
import {
  getUserDataPath,
  loadLatestSourceExportFull,
  loadLatestSourceExportPreview,
  openPlatformExportFolder,
  writeAppQuickstartFiles,
  type SourceExportPreview,
} from "@/lib/tauri-paths"
import type { RootState, Run } from "@/types"
import { generateAiQuickstartArtifact } from "./app-quickstart-ai"
import {
  buildFallbackQuickstartArtifact,
  buildSourceSummary,
  getStarterAppMatch,
  serializeAppQuickstartMarkdown,
  serializeSourceContextJson,
} from "./app-quickstart"
import type {
  AppQuickstartArtifact,
  CopyStatus,
  QuickstartGenerationState,
  SourceOverviewPageState,
} from "./types"
import { formatRelativeTimeLabel } from "./utils"

const actionFeedbackMs = 1_200

const isTauriRuntime = () =>
  typeof window !== "undefined" &&
  ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)

const isArtifactState = (
  state: QuickstartGenerationState
): state is
  | { status: "generated"; artifact: AppQuickstartArtifact }
  | {
      status: "fallback-ready"
      artifact: AppQuickstartArtifact
      reason: "ai-unavailable" | "ai-failed" | "ai-invalid"
    } => state.status === "generated" || state.status === "fallback-ready"

function useTransientCopyStatus(
  status: CopyStatus,
  setStatus: (status: CopyStatus) => void
) {
  useEffect(() => {
    if (status !== "copied" && status !== "error") {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setStatus("idle")
    }, actionFeedbackMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [setStatus, status])
}

export function useSourceOverviewPage(
  platformId?: string
): SourceOverviewPageState {
  const runs = useSelector((state: RootState) => state.app.runs)
  const platforms = useSelector((state: RootState) => state.app.platforms)

  const [appDataPath, setAppDataPath] = useState<string | null>(null)
  const [preview, setPreview] = useState<SourceExportPreview | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle")
  const [promptCopyStatus, setPromptCopyStatus] = useState<CopyStatus>("idle")
  const [revealFilesStatus, setRevealFilesStatus] = useState<CopyStatus>("idle")
  const [quickstartIdea, setQuickstartIdea] = useState("")
  const [quickstartState, setQuickstartState] =
    useState<QuickstartGenerationState>({ status: "idle" })

  const sourceEntry = platformId
    ? getPlatformRegistryEntryById(platformId)
    : null

  const sourceName = sourceEntry?.displayName ?? platformId ?? "Unknown source"
  const sourceScope = sourceEntry?.ingestScope

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
    setQuickstartIdea("")
    setQuickstartState({ status: "idle" })
    setPromptCopyStatus("idle")
    setRevealFilesStatus("idle")
  }, [sourceEntry?.id])

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
      sourcePlatform.name,
      sourceScope
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
  }, [sourcePlatform, sourceScope])

  useTransientCopyStatus(copyStatus, setCopyStatus)
  useTransientCopyStatus(promptCopyStatus, setPromptCopyStatus)
  useTransientCopyStatus(revealFilesStatus, setRevealFilesStatus)

  const openSourcePath =
    preview?.filePath ??
    latestSourceRun?.exportPath ??
    (appDataPath ? `${appDataPath}/exported_data` : null)

  const fallbackPreviewJson = `{
  "${sourceEntry?.id ?? "source"}Preview": {
    "status": "stub",
    "note": "Local browser fallback preview. Full source preview requires Tauri runtime.",
    "latestRunPath": "${latestSourceRun?.exportPath ?? "pending"}"
  }
}`

  const sourceSummary = useMemo(
    () =>
      buildSourceSummary(
        sourceName,
        preview?.previewJson ?? fallbackPreviewJson,
        {
          isTruncated: preview?.isTruncated,
        }
      ),
    [
      fallbackPreviewJson,
      preview?.isTruncated,
      preview?.previewJson,
      sourceName,
    ]
  )

  const starterAppMatch = useMemo(
    () => (sourceEntry ? getStarterAppMatch(sourceEntry.id) : null),
    [sourceEntry]
  )

  const currentArtifact = isArtifactState(quickstartState)
    ? quickstartState.artifact
    : null

  const createAppPrompt = currentArtifact?.handoff.prompt ?? ""

  const lastUsedLabel = useMemo(
    () =>
      formatRelativeTimeLabel(
        latestSourceRun?.startDate ?? preview?.exportedAt ?? null
      ),
    [latestSourceRun?.startDate, preview?.exportedAt]
  )

  const buildFallbackArtifact = (appIdea: string) =>
    buildFallbackQuickstartArtifact({
      sourceId: sourceEntry?.id ?? platformId ?? "source",
      sourceLabel: sourceName,
      localDataLocation: openSourcePath,
      sourceSummary,
      appIdea,
      starterAppMatch,
    })

  const handleOpenSourcePath = async () => {
    if (preview?.filePath) {
      await openExportFolderPath(preview.filePath)
      return
    }

    if (sourcePlatform) {
      try {
        await openPlatformExportFolder(
          sourcePlatform.company,
          sourcePlatform.name,
          sourceScope
        )
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
        try {
          const fullJson = await loadLatestSourceExportFull(
            sourcePlatform.company,
            sourcePlatform.name,
            sourceScope
          )
          copyPayload = fullJson ?? null
        } catch (error) {
          console.error("Failed to load full source export JSON:", error)
        }
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

  const handleGenerateQuickstart = async () => {
    const trimmedIdea = quickstartIdea.trim()
    if (!trimmedIdea) {
      return
    }

    setQuickstartState({ status: "generating" })

    try {
      const aiResult = await generateAiQuickstartArtifact({
        appIdea: trimmedIdea,
        sourceId: sourceEntry?.id ?? platformId ?? "source",
        sourceLabel: sourceName,
      })

      if (aiResult.status === "success") {
        setQuickstartState({
          status: "generated",
          artifact: aiResult.artifact,
        })
        return
      }

      const fallbackArtifact = buildFallbackArtifact(trimmedIdea)
      setQuickstartState({
        status: "fallback-ready",
        artifact: fallbackArtifact,
        reason: aiResult.status === "invalid" ? "ai-invalid" : "ai-unavailable",
      })
    } catch (error) {
      console.error("Failed to generate app quickstart artifact:", error)

      try {
        const fallbackArtifact = buildFallbackArtifact(trimmedIdea)
        setQuickstartState({
          status: "fallback-ready",
          artifact: fallbackArtifact,
          reason: "ai-failed",
        })
      } catch {
        setQuickstartState({
          status: "error-with-retry",
          message:
            "Could not prepare an app quickstart yet. Try again in a moment.",
        })
      }
    }
  }

  const handleCopyCreateAppPrompt = async () => {
    if (!createAppPrompt) {
      return
    }

    setPromptCopyStatus("copying")
    try {
      const copied = await copyTextToClipboard(createAppPrompt)
      if (!copied) {
        throw new Error("Clipboard copy failed")
      }
      setPromptCopyStatus("copied")
    } catch (error) {
      console.error("Failed to copy create app prompt:", error)
      setPromptCopyStatus("error")
    }
  }

  const handleRevealQuickstartFiles = async () => {
    if (!currentArtifact) {
      return
    }

    setRevealFilesStatus("copying")
    try {
      const folderPath = await writeAppQuickstartFiles(
        currentArtifact.source.id,
        currentArtifact.intent.appIdea,
        serializeAppQuickstartMarkdown(currentArtifact),
        serializeSourceContextJson(currentArtifact)
      )

      const opened = await openLocalPath(folderPath)
      if (!opened) {
        throw new Error("Open handoff folder failed")
      }

      setRevealFilesStatus("copied")
    } catch (error) {
      console.error("Failed to reveal app quickstart files:", error)
      setRevealFilesStatus("error")
    }
  }

  return {
    sourceEntry,
    sourceName,
    lastUsedLabel,
    sourcePlatform,
    preview,
    isPreviewLoading,
    previewError,
    copyStatus,
    promptCopyStatus,
    revealFilesStatus,
    starterAppMatch,
    quickstartIdea,
    quickstartState,
    createAppPrompt,
    sourceSummary,
    openSourcePath,
    fallbackPreviewJson,
    handleOpenSourcePath,
    handleCopyFullJson,
    handleQuickstartIdeaChange: setQuickstartIdea,
    handleGenerateQuickstart,
    handleCopyCreateAppPrompt,
    handleRevealQuickstartFiles,
  }
}
