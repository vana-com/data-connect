import { useCallback } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeftIcon } from "lucide-react"
import { PageContainer } from "@/components/elements/page-container"
import { Text } from "@/components/typography/text"
import { ROUTES } from "@/config/routes"
import { openExternalUrl } from "@/lib/open-resource"
import { SourceAppQuickstartDialog } from "./components/source-app-quickstart-dialog"
import { SourceOverviewLayout } from "./components/source-overview-layout"
import { SourcePreviewCard } from "./components/source-preview-card"
import { SourceSidebar } from "./components/source-sidebar"
import { useSourceOverviewPage } from "./use-source-overview-page"

export function SourceOverview() {
  const { platformId } = useParams<{ platformId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    sourceEntry,
    sourceName,
    lastUsedLabel,
    preview,
    isPreviewLoading,
    previewError,
    copyStatus,
    promptCopyStatus,
    revealFilesStatus,
    starterAppMatch,
    quickstartIdea,
    quickstartState,
    openSourcePath,
    sourceSummary,
    fallbackPreviewJson,
    handleOpenSourcePath,
    handleCopyFullJson,
    handleQuickstartIdeaChange,
    handleGenerateQuickstart,
    handleCopyCreateAppPrompt,
    handleRevealQuickstartFiles,
  } = useSourceOverviewPage(platformId)
  const isCreateAppOpen = searchParams.get("intent") === "create-app"

  const setCreateAppOpen = useCallback(
    (open: boolean) => {
      const nextParams = new URLSearchParams(searchParams)
      if (open) nextParams.set("intent", "create-app")
      else nextParams.delete("intent")
      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  if (!sourceEntry) {
    return (
      <PageContainer>
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
      </PageContainer>
    )
  }

  return (
    <SourceOverviewLayout
      sidebar={
        <SourceSidebar
          sourceId={sourceEntry.id}
          sourceName={sourceName}
          lastUsedLabel={lastUsedLabel}
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
        <>
          <SourcePreviewCard
            sourceName={sourceName}
            isPreviewLoading={isPreviewLoading}
            previewError={previewError}
            preview={preview}
            fallbackPreviewJson={fallbackPreviewJson}
            copyStatus={copyStatus}
            onCopyFullJson={handleCopyFullJson}
            onOpenSourcePath={handleOpenSourcePath}
            onOpenCreateApp={() => setCreateAppOpen(true)}
          />
          <SourceAppQuickstartDialog
            open={isCreateAppOpen}
            sourceName={sourceName}
            localDataLocation={openSourcePath}
            sourceSummary={sourceSummary}
            starterAppMatch={starterAppMatch}
            quickstartIdea={quickstartIdea}
            quickstartState={quickstartState}
            promptCopyStatus={promptCopyStatus}
            revealFilesStatus={revealFilesStatus}
            onOpenChange={setCreateAppOpen}
            onQuickstartIdeaChange={handleQuickstartIdeaChange}
            onGenerateQuickstart={handleGenerateQuickstart}
            onCopyPrompt={handleCopyCreateAppPrompt}
            onRevealFiles={handleRevealQuickstartFiles}
            onOpenStarterApp={match => {
              void openExternalUrl(match.destinationUrl)
            }}
          />
        </>
      }
    />
  )
}
