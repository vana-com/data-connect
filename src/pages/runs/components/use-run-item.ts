import { useCallback, useEffect, useMemo, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { getScopeForPlatform, ingestData } from "@/services/personalServerIngest"
import type { Run } from "@/types"
import {
  buildExportData,
  formatRunDate,
  getIngestButtonLabel,
  type IngestStatus,
} from "../run-utils"

export interface UseRunItemProps {
  run: Run
  serverPort: number | null
  serverReady: boolean
}

export function useRunItem({ run, serverPort, serverReady }: UseRunItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [exportData, setExportData] = useState<Run["exportData"]>(run.exportData)
  const [loadingData, setLoadingData] = useState(false)
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>("idle")

  useEffect(() => {
    setExportData(run.exportData)
  }, [run.exportData])

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
      const dirPath = run.exportPath!.replace(/\/[^/]+$/, "")
      const data = await invoke<Record<string, unknown>>("load_run_export_data", {
        runId: run.id,
        exportPath: dirPath,
      })
      const payload = (data.content ?? data) as object
      await ingestData(serverPort!, scope!, payload)
      setIngestStatus("sent")
    } catch (err) {
      console.error("[Ingest] Failed:", err)
      setIngestStatus("error")
    }
  }, [canIngest, run, serverPort, scope])

  const openFolder = useCallback(async () => {
    if (run.exportPath) {
      try {
        await invoke("open_folder", { path: run.exportPath })
      } catch (error) {
        console.error("Failed to open folder:", error)
      }
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
