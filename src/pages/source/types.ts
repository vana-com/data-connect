import type { MouseEventHandler, ReactNode } from "react"
import type { SourceExportPreview } from "@/lib/tauri-paths"
import type { Platform } from "@/types"

export type CopyStatus = "idle" | "copying" | "copied" | "error"

export type QuickstartGenerationReason =
  | "ai-unavailable"
  | "ai-failed"
  | "ai-invalid"

export type AppQuickstartArtifact = {
  source: {
    id: string
    label: string
    schemaId?: number
    localDataLocation: string
    sourceSummary: string
  }
  intent: {
    appIdea: string
  }
  handoff: {
    title: string
    summary: string
    prompt: string
    nextStep: string
    exampleAppLabel?: string
    exampleAppHref?: string
  }
  advanced?: {
    dataProcessingPrompt?: string
  }
  generation: {
    mode: "ai-generated" | "fallback"
    providerLabel?: string
  }
}

export type QuickstartGenerationState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "generated"; artifact: AppQuickstartArtifact }
  | {
      status: "fallback-ready"
      artifact: AppQuickstartArtifact
      reason: QuickstartGenerationReason
    }
  | {
      status: "error-with-retry"
      message: string
    }

export type StarterAppMatch = {
  sourceId: string
  appLabel: string
  appDescription?: string
  destinationUrl: string
  actionLabel: string
}

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
  sourcePlatform: Platform | null
  preview: SourceExportPreview | null
  isPreviewLoading: boolean
  previewError: string | null
  copyStatus: CopyStatus
  promptCopyStatus: CopyStatus
  revealFilesStatus: CopyStatus
  starterAppMatch: StarterAppMatch | null
  quickstartIdea: string
  quickstartState: QuickstartGenerationState
  createAppPrompt: string
  sourceSummary: string
  openSourcePath: string | null
  fallbackPreviewJson: string
  handleOpenSourcePath: () => Promise<void>
  handleCopyFullJson: () => Promise<void>
  handleQuickstartIdeaChange: (value: string) => void
  handleGenerateQuickstart: () => Promise<void>
  handleCopyCreateAppPrompt: () => Promise<void>
  handleRevealQuickstartFiles: () => Promise<void>
}
