import { invoke } from "@tauri-apps/api/core"

export const getUserDataPath = () => invoke<string>("get_user_data_path")
export const getPersonalServerDataPath = () =>
  invoke<string>("get_personal_server_data_path")

export const openPlatformExportFolder = (
  company: string,
  name: string,
  scope?: string
) => invoke("open_platform_export_folder", { company, name, scope })

export const openPersonalServerScopeFolder = (scope: string) =>
  invoke("open_personal_server_scope_folder", { scope })

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
  scope?: string,
  maxBytes = 262_144
) =>
  invoke<SourceExportPreview | null>("load_latest_source_export_preview", {
    company,
    name,
    scope,
    maxBytes,
  })

export const loadLatestSourceExportFull = (
  company: string,
  name: string,
  scope?: string
) =>
  invoke<string | null>("load_latest_source_export_full", {
    company,
    name,
    scope,
  })

export const deleteExportedRun = (exportPath: string) =>
  invoke("delete_exported_run", { exportPath })
