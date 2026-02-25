import { useCallback, useEffect, useState } from "react"
import { Clipboard, X } from "lucide-react"
import { ConnectorView, type ConnectionState } from "./index"
import type { CloudViewMode } from "./types"

interface ScreencastModalProps {
  nekoUrl: string
  viewMode?: CloudViewMode
  screencastWsUrl?: string
  onClose?: () => void
}

export function ScreencastModal({
  nekoUrl,
  viewMode = "neko",
  screencastWsUrl,
  onClose,
}: ScreencastModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [clipboardGranted, setClipboardGranted] = useState<boolean | null>(null)
  const iframeSrc = `${nekoUrl}/?embed=1&usr=user&pwd=x`

  // Clipboard permission check only needed for n.eko mode
  useEffect(() => {
    if (viewMode !== "neko") {
      setClipboardGranted(true)
      return
    }
    async function checkPermission() {
      try {
        const result = await navigator.permissions.query({
          name: "clipboard-read" as PermissionName,
        })
        setClipboardGranted(result.state === "granted")
        result.addEventListener("change", () => {
          setClipboardGranted(result.state === "granted")
        })
      } catch {
        // Permissions API not supported — load iframe anyway
        setClipboardGranted(true)
      }
    }
    checkPermission()
  }, [viewMode])

  async function handleEnableClipboard() {
    try {
      await navigator.clipboard.readText()
      setClipboardGranted(true)
    } catch {
      // User denied — load iframe anyway
      setClipboardGranted(true)
    }
  }

  const handleCdpConnectionChange = useCallback((state: ConnectionState) => {
    setIsLoading(state !== "connected")
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
      <div className="flex shrink-0 items-center justify-between pb-2 text-white">
        <span className="text-sm">
          {isLoading
            ? "Connecting to browser..."
            : "Sign in below — your input is forwarded to the remote browser"}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-white/20"
            aria-label="Close browser view"
          >
            <X className="size-5" />
          </button>
        )}
      </div>
      {viewMode === "cdp" && screencastWsUrl ? (
        <ConnectorView
          wsUrl={screencastWsUrl}
          className="flex min-h-0 flex-1 items-center justify-center"
          onConnectionChange={handleCdpConnectionChange}
        />
      ) : (
        <>
          {clipboardGranted === false && (
            <div className="flex items-center justify-center py-8">
              <button
                type="button"
                onClick={handleEnableClipboard}
                className="flex items-center gap-2 rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
              >
                <Clipboard className="size-4" />
                Enable clipboard sharing
              </button>
            </div>
          )}
          {clipboardGranted !== false && (
            <iframe
              src={iframeSrc}
              className="min-h-0 flex-1 rounded"
              allow="clipboard-read; clipboard-write"
              onLoad={() => setIsLoading(false)}
              title="Remote browser view"
            />
          )}
        </>
      )}
    </div>
  )
}
