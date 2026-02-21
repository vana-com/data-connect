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
    preview,
    isPreviewLoading,
    previewError,
    copyStatus,
    resetCacheStatus,
    fallbackPreviewJson,
    handleOpenSourcePath,
    handleCopyFullJson,
    handleResetExportedDataCache,
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
          onOpenSourcePath={handleOpenSourcePath}
        />
      }
      content={
        <SourcePreviewCard
          isPreviewLoading={isPreviewLoading}
          previewError={previewError}
          preview={preview}
          fallbackPreviewJson={fallbackPreviewJson}
          copyStatus={copyStatus}
          resetCacheStatus={resetCacheStatus}
          onCopyFullJson={handleCopyFullJson}
          onResetExportedDataCache={handleResetExportedDataCache}
        />
      }
    />
  )
}
