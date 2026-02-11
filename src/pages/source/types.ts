import type { MouseEventHandler, ReactNode } from "react"
import type { SourceExportPreview } from "@/lib/tauri-paths"
import type { Platform } from "@/types"

export type CopyStatus = "idle" | "copying" | "copied" | "error"

export type SourceLinkRowProps =
  | {
      children: ReactNode
      icon?: ReactNode
      trailingIcon?: ReactNode
      muted?: boolean
      className?: string
      onClick?: MouseEventHandler<HTMLAnchorElement>
      href: string
      to?: never
    }
  | {
      children: ReactNode
      icon?: ReactNode
      trailingIcon?: ReactNode
      muted?: boolean
      className?: string
      onClick?: MouseEventHandler<HTMLAnchorElement>
      to: string
      href?: never
    }

export interface SourceOverviewPageState {
  sourceEntry: {
    id: string
    displayName: string
  } | null
  sourceName: string
  sourceStoragePath: string
  sourcePlatform: Platform | null
  canAccessDebugRuns: boolean
  preview: SourceExportPreview | null
  isPreviewLoading: boolean
  previewError: string | null
  copyStatus: CopyStatus
  openSourcePath: string | null
  openSourceHref: string
  fallbackPreviewJson: string
  handleOpenSourcePath: () => Promise<void>
  handleOpenFile: () => Promise<void>
  handleCopyFullJson: () => Promise<void>
}
