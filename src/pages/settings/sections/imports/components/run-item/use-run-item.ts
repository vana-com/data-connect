import { useCallback, useEffect, useMemo, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { useDispatch } from "react-redux"
import { getScopeForPlatform, ingestData } from "@/services/personalServerIngest"
import { openLocalPath } from "@/lib/open-resource"
import { markRunSynced } from "@/state/store"
import type { Run } from "@/types"
import {
  buildExportData,
  formatRunDate,
  getIngestButtonLabel,
  type IngestStatus,
} from "./run-item-utils"

export interface UseRunItemProps {
  run: Run
  serverPort: number | null
  serverReady: boolean
}

export function useRunItem({ run, serverPort, serverReady }: UseRunItemProps) {
  const dispatch = useDispatch()
  const [expanded, setExpanded] = useState(false)
  const [exportData, setExportData] = useState<Run["exportData"]>(run.exportData)
  const [loadingData, setLoadingData] = useState(false)
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>(
    run.syncedToPersonalServer ? "sent" : "idle"
  )

  useEffect(() => {
    setExportData(run.exportData)
  }, [run.exportData])

  useEffect(() => {
    if (run.syncedToPersonalServer) {
      setIngestStatus("sent")
    }
  }, [run.syncedToPersonalServer])

  const scope = useMemo(() => getScopeForPlatform(run.platformId), [run.platformId])
  const canIngest = serverReady && !!serverPort && !!run.exportPath && !!scope
  const conversations = exportData?.conversations || []
  const ingestButtonLabel = getIngestButtonLabel(ingestStatus)
  const formattedDate = formatRunDate(run.startDate)
  const showExpandToggle =
    run.exportPath && (conversations.length > 0 || (!expanded && !exportData))

  const handleToggleExpanded = useCallback(async () => {
    if (!expanded && !exportData && run.exportPath) {
      setLoadingData(true)
      try {
        const data = await invoke<Record<string, unknown>>("load_run_export_data", {
          runId: run.id,
          exportPath: run.exportPath,
        })

        setExportData(buildExportData(data, run))
      } catch (error) {
        console.error("Failed to load export data:", error)
      } finally {
        setLoadingData(false)
      }
    }
    setExpanded(prev => !prev)
  }, [expanded, exportData, run])

  const handleIngest = useCallback(async () => {
    if (!canIngest) return
    setIngestStatus("sending")
    try {
      // exportPath can be either a file path (from write_export_data) or
      // a directory path (from load_runs on app restart). Handle both:
      // - If ends with .json, strip filename to get directory
      // - Otherwise, use as-is (already a directory)
      const exportPath = run.exportPath!
      const dirPath = exportPath.endsWith(".json")
        ? exportPath.replace(/\/[^/]+$/, "")
        : exportPath
      const data = await invoke<Record<string, unknown>>("load_run_export_data", {
        runId: run.id,
        exportPath: dirPath,
      })
      const payload = (data.content ?? data) as object
      await ingestData(serverPort!, scope!, payload)

      await invoke('mark_export_synced', {
        runId: run.id,
        exportPath: run.exportPath,
        itemsExported: run.itemsExported ?? null,
        itemLabel: run.itemLabel ?? null,
        scope,
      })
      dispatch(markRunSynced(run.id))

      setIngestStatus("sent")
    } catch (err) {
      console.error("[Ingest] Failed:", err)
      setIngestStatus("error")
    }
  }, [canIngest, run, serverPort, scope, dispatch])

  const openFolder = useCallback(async () => {
    if (run.exportPath) {
      await openLocalPath(run.exportPath)
    }
  }, [run.exportPath])

  return {
    expanded,
    loadingData,
    ingestStatus,
    ingestButtonLabel,
    formattedDate,
    conversations,
    scope,
    canIngest,
    showExpandToggle,
    handleToggleExpanded,
    handleIngest,
    openFolder,
  }
}
