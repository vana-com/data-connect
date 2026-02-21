import { CopyIcon } from "lucide-react"
import { LoadingButton } from "@/components/elements/button-loading"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import type { SourceExportPreview } from "@/lib/tauri-paths"
import type { CopyStatus } from "../types"
import { formatBytes } from "../utils"

interface SourcePreviewCardProps {
  isPreviewLoading: boolean
  previewError: string | null
  preview: SourceExportPreview | null
  fallbackPreviewJson: string
  copyStatus: CopyStatus
  onCopyFullJson: () => Promise<void>
}

export function SourcePreviewCard({
  isPreviewLoading,
  previewError,
  preview,
  fallbackPreviewJson,
  copyStatus,
  onCopyFullJson,
}: SourcePreviewCardProps) {
  return (
    <section className="rounded-card ring ring-border bg-card overflow-hidden flex min-h-[520px] h-full flex-col">
      <div className="flex items-center justify-end gap-2 border-b border-border p-3">
        <PreviewActionButton
          icon={<CopyIcon aria-hidden />}
          className="min-w-[105px]"
          isLoading={copyStatus === "copying"}
          isError={copyStatus === "error"}
          loadingLabel="Copying…"
          label={
            copyStatus === "copied"
              ? "Copied"
              : copyStatus === "error"
                ? "Copy failed"
                : "Copy JSON"
          }
          onClick={() => void onCopyFullJson()}
        />
        {/* 
          Reset cache intentionally disabled for now.
          Why: previous reset behavior wiped local source history and caused data loss.
          Keep this JSX skeleton here so design/placement is preserved until the
          backend contract is specified and safety-reviewed end-to-end.
          Re-enable only with an explicit product + data-safety spec.
        */}
        {/* <PreviewActionButton
          icon={<RefreshCcwIcon aria-hidden />} 
          className="min-w-[105px]"
          isLoading={resetCacheStatus === "resetting"}
          isError={resetCacheStatus === "error"}
          loadingLabel="Resetting…"
          label={
            resetCacheStatus === "success"
              ? "Cache reset"
              : resetCacheStatus === "error"
                ? "Reset failed"
                : "Reset cache"
          }
          onClick={() => void onResetExportedDataCache()}
        /> */}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-gap">
        {isPreviewLoading ? (
          <Text as="p" intent="small" muted>
            Loading preview...
          </Text>
        ) : previewError ? (
          <Text as="p" intent="small" color="destructive">
            {previewError}
          </Text>
        ) : preview ? (
          <pre className="font-mono text-sm leading-6 text-foreground/80">
            {preview.previewJson}
          </pre>
        ) : (
          <pre className="font-mono text-sm leading-6 text-foreground/80">
            {fallbackPreviewJson}
          </pre>
        )}
      </div>

      <div className="border-t border-border px-gap py-3">
        <Text as="p" intent="fine" muted>
          {preview
            ? `File: ${preview.filePath} · Size: ${formatBytes(preview.fileSizeBytes)} · Exported: ${new Date(preview.exportedAt).toLocaleString()}${preview.isTruncated ? " · Preview truncated" : ""}`
            : "No local export metadata available."}
        </Text>
      </div>
    </section>
  )
}

interface PreviewActionButtonProps {
  icon: React.ReactNode
  className?: string
  isLoading: boolean
  isError: boolean
  loadingLabel: string
  label: string
  onClick: () => void
}

function PreviewActionButton({
  icon,
  className,
  isLoading,
  isError,
  loadingLabel,
  label,
  onClick,
}: PreviewActionButtonProps) {
  return (
    <LoadingButton
      type="button"
      size="xs"
      variant="outline"
      isLoading={isLoading}
      loadingLabel={loadingLabel}
      className={cn(
        "px-4 disabled:opacity-100",
        "**:data-[slot=spinner]:size-[0.8em]",
        isError &&
          "border-destructive-foreground/40 text-destructive-foreground hover:bg-destructive-foreground/10 hover:text-destructive-foreground active:border-destructive-foreground",
        className
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </LoadingButton>
  )
}
