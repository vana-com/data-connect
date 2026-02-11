import {
  useEffect,
  useMemo,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from "react"
import { useSelector } from "react-redux"
import { Link, useParams } from "react-router-dom"
import {
  ActivityIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  FolderIcon,
  RefreshCcwIcon,
} from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/classes"
import { openLocalPath, toFileUrl } from "@/lib/open-resource"
import { getPlatformRegistryEntryById } from "@/lib/platform/utils"
import {
  getUserDataPath,
  loadLatestSourceExportFull,
  loadLatestSourceExportPreview,
  openPlatformExportFolder,
  type SourceExportPreview,
} from "@/lib/tauri-paths"
import type { RootState, Run } from "@/types"

const fileSystemStub = `../exported_data`

export function SourceOverview() {
  const { platformId } = useParams<{ platformId: string }>()
  const runs = useSelector((state: RootState) => state.app.runs)
  const platforms = useSelector((state: RootState) => state.app.platforms)
  const { canAccessDebugRuns } = useAuth()
  const [appDataPath, setAppDataPath] = useState<string | null>(null)
  const [preview, setPreview] = useState<SourceExportPreview | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<
    "idle" | "copying" | "copied" | "error"
  >("idle")
  const sourceEntry = platformId
    ? getPlatformRegistryEntryById(platformId)
    : null

  const sourceName = sourceEntry?.displayName ?? platformId ?? "Unknown source"
  const sourceStoragePath = sourceEntry
    ? `${fileSystemStub}/${sourceEntry.id}`
    : fileSystemStub

  const latestSourceRun = useMemo(() => {
    if (!platformId) return null
    return [...runs]
      .filter(
        run =>
          getPlatformRegistryEntryById(run.platformId)?.id === sourceEntry?.id
      )
      .sort((a: Run, b: Run) => b.startDate.localeCompare(a.startDate))[0]
  }, [platformId, runs, sourceEntry?.id])
  const sourcePlatform = useMemo(
    () =>
      platforms.find(
        platform =>
          getPlatformRegistryEntryById(platform.id)?.id === sourceEntry?.id
      ) ?? null,
    [platforms, sourceEntry?.id]
  )
  const isTauriRuntime =
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  useEffect(() => {
    let cancelled = false
    void getUserDataPath()
      .then(path => {
        if (!cancelled) {
          setAppDataPath(path)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppDataPath(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!sourcePlatform) {
      setPreview(null)
      setPreviewError(null)
      setIsPreviewLoading(false)
      return
    }

    let cancelled = false
    setIsPreviewLoading(true)
    setPreviewError(null)

    void loadLatestSourceExportPreview(
      sourcePlatform.company,
      sourcePlatform.name
    )
      .then(result => {
        if (!cancelled) {
          setPreview(result)
        }
      })
      .catch(error => {
        if (!cancelled) {
          setPreview(null)
          setPreviewError(
            isTauriRuntime
              ? error instanceof Error
                ? error.message
                : "Failed to load preview"
              : null
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreviewLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isTauriRuntime, sourcePlatform])

  const openSourcePath =
    preview?.filePath ??
    latestSourceRun?.exportPath ??
    (appDataPath ? `${appDataPath}/exported_data` : null)
  const openSourceHref = openSourcePath ? toFileUrl(openSourcePath) : "#"

  const handleOpenSourcePath = async () => {
    if (sourcePlatform) {
      try {
        await openPlatformExportFolder(
          sourcePlatform.company,
          sourcePlatform.name
        )
        return
      } catch {
        // Fall through to generic local path fallback.
      }
    }
    if (!openSourcePath) return
    await openLocalPath(openSourcePath)
  }

  const handleOpenFile = async () => {
    await handleOpenSourcePath()
  }

  const handleCopyFullJson = async () => {
    if (!sourcePlatform) return
    setCopyStatus("copying")
    try {
      const fullJson = await loadLatestSourceExportFull(
        sourcePlatform.company,
        sourcePlatform.name
      )
      if (!fullJson) {
        throw new Error("No source JSON found on disk")
      }
      const copied = await copyTextToClipboard(fullJson)
      if (!copied) {
        throw new Error("Clipboard copy failed")
      }
      setCopyStatus("copied")
    } catch (error) {
      console.error("Failed to copy full JSON:", error)
      setCopyStatus("error")
    }
  }

  const fallbackPreviewJson = `{
  "${sourceEntry?.id ?? "source"}Preview": {
    "status": "stub",
    "note": "Local browser fallback preview. Full source preview requires Tauri runtime.",
    "latestRunPath": "${latestSourceRun?.exportPath ?? "pending"}"
  }
}`

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
    <div
      data-component="source-overview"
      className={cn(
        "flex flex-1 w-full h-full",
        "py-w16 px-inset",
        // condense the width
        "lg:px-w24"
      )}
    >
      <section className="w-full grid gap-small lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="space-y-6 relative">
          {/* <Text
            as={Link}
            to={ROUTES.home}
            intent="small"
            withIcon
            weight="medium"
            className={cn(
              "absolute left-0 top-[-2.5em]",
              "hover:text-foreground gap-1!"
            )}
          >
            <ArrowLeftIcon className="size-[1.1em]!" />
            Back
          </Text> */}
          <div className="space-y-5">
            <div className="flex items-center gap-1.5 ml-[-0.375em] pt-2">
              <PlatformIcon
                iconName={sourceEntry.id}
                fallbackLabel={sourceName.charAt(0).toUpperCase()}
                size={28}
              />
              <Text as="h1" intent="subtitle" weight="medium">
                {sourceName}
              </Text>
            </div>

            <div className="space-y-3">
              <SourceLinkRow
                href={openSourceHref}
                icon={<FolderIcon aria-hidden />}
                onClick={event => {
                  event.preventDefault()
                  void handleOpenSourcePath()
                }}
              >
                {sourceStoragePath}
              </SourceLinkRow>
              <SourceLinkRow href="#" icon={<ActivityIcon aria-hidden />}>
                Last used yesterday
              </SourceLinkRow>
              <SourceLinkRow
                to={ROUTES.runs}
                icon={<RefreshCcwIcon aria-hidden />}
              >
                Last synced yesterday
              </SourceLinkRow>
            </div>
          </div>
          <hr />

          <nav className="space-y-3">
            <SourceLinkRow
              href="#"
              muted
              trailingIcon={<ArrowUpRightIcon aria-hidden />}
            >
              Build on Vana
            </SourceLinkRow>
            <SourceLinkRow
              href="#"
              muted
              trailingIcon={<ArrowUpRightIcon aria-hidden />}
            >
              Connect to Claude
            </SourceLinkRow>
            <SourceLinkRow
              href="#"
              muted
              trailingIcon={<ArrowUpRightIcon aria-hidden />}
            >
              Connect to ChatGPT
            </SourceLinkRow>
            {canAccessDebugRuns ? (
              <SourceLinkRow
                to={ROUTES.runs}
                muted
                trailingIcon={<ArrowUpRightIcon aria-hidden />}
              >
                Debug runs
              </SourceLinkRow>
            ) : null}
          </nav>
        </aside>

        <section className="rounded-card ring ring-border bg-card overflow-hidden flex min-h-[520px] h-full flex-col">
          <div className="flex items-center justify-end gap-2 border-b border-border p-3">
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => void handleCopyFullJson()}
              disabled={
                !sourcePlatform || isPreviewLoading || copyStatus === "copying"
              }
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
              onClick={() => void handleOpenFile()}
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
      </section>
    </div>
  )
}

type SourceLinkRowProps =
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

function SourceLinkRow({
  children,
  icon,
  trailingIcon,
  muted,
  className,
  onClick,
  href,
  to,
}: SourceLinkRowProps) {
  if (to) {
    return (
      <Text
        as={Link}
        to={to}
        intent="small"
        muted={muted}
        withIcon
        className={cn(linkStyle, className)}
        onClick={onClick}
      >
        {icon}
        {children}
        {trailingIcon}
      </Text>
    )
  }

  return (
    <Text
      as="a"
      href={href}
      intent="small"
      muted={muted}
      withIcon
      className={cn(linkStyle, className)}
      onClick={onClick}
    >
      {icon}
      {children}
      {trailingIcon}
    </Text>
  )
}

const linkStyle = [
  "gap-2.5",
  "[&_svg:not([class*=size-])]:size-[1em]",
  "no-underline hover:text-foreground",
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

async function copyTextToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fallback below for webviews where Clipboard API is restricted.
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "true")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.append(textarea)
  textarea.select()
  let copied = false
  try {
    copied = document.execCommand("copy")
  } catch {
    copied = false
  }
  textarea.remove()
  return copied
}
