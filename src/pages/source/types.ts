import type { MouseEventHandler, ReactNode } from "react"
import type { SourceExportPreview } from "@/lib/tauri-paths"
import type { Platform } from "@/types"

export type CopyStatus = "idle" | "copying" | "copied" | "error"
export type ResetCacheStatus = "idle" | "resetting" | "success" | "error"

type SourceLinkRowBaseProps = {
  children: ReactNode
  icon?: ReactNode
  trailingIcon?: ReactNode
  muted?: boolean
  className?: string
}

export type SourceLinkRowProps = SourceLinkRowBaseProps &
  (
    | {
        onClick?: MouseEventHandler<HTMLAnchorElement>
        href: string
        to?: never
      }
    | {
        onClick?: MouseEventHandler<HTMLAnchorElement>
        to: string
        href?: never
      }
    | {
        onClick?: never
        to?: never
        href?: never
      }
  )

export interface SourceOverviewPageState {
  sourceEntry: {
    id: string
    displayName: string
  } | null
  sourceName: string
  lastUsedLabel: string
  syncStatusLabel: string
  sourcePlatform: Platform | null
  preview: SourceExportPreview | null
  isPreviewLoading: boolean
  previewError: string | null
  copyStatus: CopyStatus
  resetCacheStatus: ResetCacheStatus
  openSourcePath: string | null
  fallbackPreviewJson: string
  handleOpenSourcePath: () => Promise<void>
  handleCopyFullJson: () => Promise<void>
  handleResetExportedDataCache: () => Promise<void>
}
