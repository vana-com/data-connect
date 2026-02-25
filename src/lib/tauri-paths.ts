import type { Runtime } from "@/lib/runtime"

export const getUserDataPath = (runtime: Runtime) =>
  runtime.invoke<string>("get_user_data_path")
export const getPersonalServerDataPath = (runtime: Runtime) =>
  runtime.invoke<string>("get_personal_server_data_path")

export const openPlatformExportFolder = (
  runtime: Runtime,
  company: string,
  name: string,
  scope?: string
) => runtime.invoke("open_platform_export_folder", { company, name, scope })

export const openPersonalServerScopeFolder = (runtime: Runtime, scope: string) =>
  runtime.invoke("open_personal_server_scope_folder", { scope })

export interface SourceExportPreview {
  previewJson: string
  isTruncated: boolean
  filePath: string
  fileSizeBytes: number
  exportedAt: string
}

export const loadLatestSourceExportPreview = (
  runtime: Runtime,
  company: string,
  name: string,
  scope?: string,
  maxBytes = 262_144
) =>
  runtime.invoke<SourceExportPreview | null>("load_latest_source_export_preview", {
    company,
    name,
    scope,
    maxBytes,
  })

export const loadLatestSourceExportFull = (
  runtime: Runtime,
  company: string,
  name: string,
  scope?: string
) =>
  runtime.invoke<string | null>("load_latest_source_export_full", {
    company,
    name,
    scope,
  })

export const deleteExportedRun = (runtime: Runtime, exportPath: string) =>
  runtime.invoke("delete_exported_run", { exportPath })
