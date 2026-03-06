import { useCallback, useEffect, useRef, useState } from "react"
import { Keyboard, X } from "lucide-react"
import { ConnectorView, type ConnectionState } from "./index"
import { useRuntime } from "@/lib/runtime"
import { NekoClient, type NekoClientHandle } from "./neko-client"
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
  const runtime = useRuntime()
  const containerRef = useRef<HTMLDivElement>(null)
  const nekoClientRef = useRef<NekoClientHandle>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Auto-set n.eko screen resolution to match the container size
  useEffect(() => {
    if (runtime.mode !== "http") return

    const el = containerRef.current
    if (!el) return

    let timer: ReturnType<typeof setTimeout> | null = null

    function syncResolution() {
      if (!el) return
      const width = Math.round(el.clientWidth)
      const height = Math.round(el.clientHeight)
      if (width < 100 || height < 100) return

      runtime
        .invoke("set_screen_resolution", { width, height })
        .catch((err: unknown) =>
          console.warn("[ScreencastModal] Failed to set resolution:", err)
        )
    }

    // Debounced resize handler
    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(syncResolution, 300)
    })

    observer.observe(el)
    syncResolution()

    return () => {
      observer.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [runtime])

  const handleCdpConnectionChange = useCallback((state: ConnectionState) => {
    setIsLoading(state !== "connected")
  }, [])

  const handleNekoConnectionStatus = useCallback(
    (status: "connected" | "connecting" | "disconnected") => {
      setIsLoading(status !== "connected")
    },
    [],
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black">
      <div className="flex shrink-0 items-center justify-between px-3 py-1.5 text-white">
        <span className="text-xs opacity-70">
          {isLoading
            ? "Connecting to browser..."
            : "Sign in below — your input is forwarded to the remote browser"}
        </span>
        <div className="flex items-center gap-1">
          {viewMode !== "cdp" && !isLoading && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onClick={() => nekoClientRef.current?.mobileKeyboardToggle()}
              className="rounded p-1 hover:bg-white/20"
              aria-label="Toggle keyboard"
            >
              <Keyboard className="size-4" />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 hover:bg-white/20"
              aria-label="Close browser view"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
        {viewMode === "cdp" && screencastWsUrl ? (
          <ConnectorView
            wsUrl={screencastWsUrl}
            className="flex min-h-0 flex-1 items-center justify-center"
            onConnectionChange={handleCdpConnectionChange}
          />
        ) : (
          <NekoClient
            ref={nekoClientRef}
            server={nekoUrl}
            className="min-h-0 flex-1"
            onConnectionStatus={handleNekoConnectionStatus}
          />
        )}
      </div>
    </div>
  )
}
