import { Link, useParams } from "react-router-dom"
import { ArrowLeftIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { ROUTES } from "@/config/routes"
import { SourceOverviewLayout } from "./components/source-overview-layout"
import { SourcePreviewCard } from "./components/source-preview-card"
import { SourceSidebar } from "./components/source-sidebar"
import { useSourceOverviewPage } from "./use-source-overview-page"

export function SourceOverview() {
  const { platformId } = useParams<{ platformId: string }>()
  const {
    sourceEntry,
    sourceName,
    lastUsedLabel,
    syncStatusLabel,
    preview,
    isPreviewLoading,
    previewError,
    copyStatus,
    fallbackPreviewJson,
    handleOpenSourcePath,
    handleCopyFullJson,
  } = useSourceOverviewPage(platformId)

  if (!sourceEntry) {
    return (
      <div className="container py-w16 space-y-w8">
        <Link
          to={ROUTES.home}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Link>
        <div className="rounded-card border border-border/60 bg-card p-6">
          <Text as="h1" intent="heading" weight="medium">
            404
          </Text>
          <Text muted>
            Source not found for route: {platformId ?? "unknown"}
          </Text>
        </div>
      </div>
    )
  }

  return (
    <SourceOverviewLayout
      sidebar={
        <SourceSidebar
          sourceId={sourceEntry.id}
          sourceName={sourceName}
          lastUsedLabel={lastUsedLabel}
          syncStatusLabel={syncStatusLabel}
          onOpenSourcePath={handleOpenSourcePath}
        />
      }
      content={
        /*
          RESET CACHE IS DELIBERATELY OFF.
          Timeline:
          1) UI reset action existed in this Source page.
          2) Backend behavior and UX intent diverged and caused destructive outcomes.
          3) Feature is parked until we have a clear, reviewed contract.
          Trail:
          - Source state/orchestration: src/pages/source/use-source-overview-page.ts
          - Tauri file ops command surface: src-tauri/src/commands/file_ops.rs
          - IPC bindings: src/lib/tauri-paths.ts
        */
        <SourcePreviewCard
          isPreviewLoading={isPreviewLoading}
          previewError={previewError}
          preview={preview}
          fallbackPreviewJson={fallbackPreviewJson}
          copyStatus={copyStatus}
          onCopyFullJson={handleCopyFullJson}
        />
      }
    />
  )
}
