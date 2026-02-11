import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import type { SourceExportPreview } from "@/lib/tauri-paths"
import type { Platform } from "@/types"
import type { CopyStatus } from "../types"
import { formatBytes } from "../utils"

interface SourcePreviewCardProps {
  sourcePlatform: Platform | null
  openSourcePath: string | null
  isPreviewLoading: boolean
  previewError: string | null
  preview: SourceExportPreview | null
  fallbackPreviewJson: string
  copyStatus: CopyStatus
  onCopyFullJson: () => Promise<void>
  onOpenFile: () => Promise<void>
}

export function SourcePreviewCard({
  sourcePlatform,
  openSourcePath,
  isPreviewLoading,
  previewError,
  preview,
  fallbackPreviewJson,
  copyStatus,
  onCopyFullJson,
  onOpenFile,
}: SourcePreviewCardProps) {
  return (
    <section className="rounded-card ring ring-border bg-card overflow-hidden flex min-h-[520px] h-full flex-col">
      <div className="flex items-center justify-end gap-2 border-b border-border p-3">
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => void onCopyFullJson()}
          disabled={!sourcePlatform || isPreviewLoading || copyStatus === "copying"}
        >
          {copyStatus === "copying"
            ? "Copying..."
            : copyStatus === "copied"
              ? "Copied"
              : copyStatus === "error"
                ? "Copy failed"
                : "Copy full JSON"}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => void onOpenFile()}
          disabled={!sourcePlatform && !openSourcePath}
        >
          Open file
        </Button>
        <Button type="button" size="xs" variant="outline" disabled>
          MCP
        </Button>
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
          <pre className="text-sm leading-6 text-foreground/80">
            {preview.previewJson}
          </pre>
        ) : (
          <pre className="text-sm leading-6 text-foreground/80">
            {fallbackPreviewJson}
          </pre>
        )}
      </div>

      <div className="border-t border-border px-gap py-3">
        <Text as="p" intent="fine" muted>
          {preview
            ? `File: ${preview.filePath} · Size: ${formatBytes(preview.fileSizeBytes)} · Updated: ${new Date(preview.exportedAt).toLocaleString()}${preview.isTruncated ? " · Preview truncated" : ""}`
            : "No local export metadata available."}
        </Text>
      </div>
    </section>
  )
}
