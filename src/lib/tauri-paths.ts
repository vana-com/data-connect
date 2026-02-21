import { invoke } from "@tauri-apps/api/core"

export const getUserDataPath = () => invoke<string>("get_user_data_path")

export const openPlatformExportFolder = (company: string, name: string) =>
  invoke("open_platform_export_folder", { company, name })

export interface SourceExportPreview {
  previewJson: string
  isTruncated: boolean
  filePath: string
  fileSizeBytes: number
  exportedAt: string
}

export const loadLatestSourceExportPreview = (
  company: string,
  name: string,
  maxBytes = 262_144
) =>
  invoke<SourceExportPreview | null>("load_latest_source_export_preview", {
    company,
    name,
    maxBytes,
  })

export const loadLatestSourceExportFull = (company: string, name: string) =>
  invoke<string | null>("load_latest_source_export_full", {
    company,
    name,
  })

export const clearExportedDataCache = () =>
  invoke("clear_exported_data_cache")
