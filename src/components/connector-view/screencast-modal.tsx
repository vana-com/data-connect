import { useCallback, useState } from "react"
import { X } from "lucide-react"
import { ConnectorView } from "./index"
import type { ConnectionState } from "./index"

interface ScreencastModalProps {
  wsUrl: string
  onClose?: () => void
}

export function ScreencastModal({ wsUrl, onClose }: ScreencastModalProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting")

  const handleConnectionChange = useCallback((state: ConnectionState) => {
    setConnectionState(state)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
      <div className="flex shrink-0 items-center justify-between pb-2 text-white">
        <span className="text-sm">
          {connectionState === "connecting"
            ? "Connecting to browser..."
            : connectionState === "connected"
              ? "Sign in below — your input is forwarded to the remote browser"
              : "Reconnecting..."}
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
      <ConnectorView
        wsUrl={wsUrl}
        className="flex min-h-0 flex-1 items-center justify-center"
        onConnectionChange={handleConnectionChange}
      />
    </div>
  )
}
