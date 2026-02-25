import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"

const WS_OPEN = 1

type ConnectionState = "connecting" | "connected" | "disconnected"

interface FrameMessage {
  type: "frame"
  data: string
  width: number
  height: number
}

interface ConnectorViewProps {
  wsUrl: string
  className?: string
  onConnectionChange?: (state: ConnectionState) => void
}

export function ConnectorView({
  wsUrl,
  className,
  onConnectionChange,
}: ConnectorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting")
  const [frameSize, setFrameSize] = useState<{
    width: number
    height: number
  } | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateConnectionState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state)
      onConnectionChange?.(state)
    },
    [onConnectionChange]
  )

  // Compute the scale factor between canvas CSS size and the remote frame size
  const getScaleFactor = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !frameSize) return { scaleX: 1, scaleY: 1 }
    const rect = canvas.getBoundingClientRect()
    return {
      scaleX: frameSize.width / rect.width,
      scaleY: frameSize.height / rect.height,
    }
  }, [frameSize])

  // WebSocket connection lifecycle
  useEffect(() => {
    let cancelled = false

    function connect() {
      if (cancelled) return
      updateConnectionState("connecting")

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (cancelled) {
          ws.close()
          return
        }
        updateConnectionState("connected")
      }

      ws.onmessage = (event) => {
        if (cancelled) return
        try {
          const msg = JSON.parse(event.data) as FrameMessage
          if (msg.type === "frame") {
            renderFrame(msg)
          }
        } catch {
          // Ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (cancelled) return
        updateConnectionState("disconnected")
        wsRef.current = null
        // Reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 2000)
      }

      ws.onerror = () => {
        // onclose will fire after onerror, so just let it handle reconnection
      }
    }

    function renderFrame(msg: FrameMessage) {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Update canvas resolution to match frame
      if (canvas.width !== msg.width || canvas.height !== msg.height) {
        canvas.width = msg.width
        canvas.height = msg.height
        setFrameSize({ width: msg.width, height: msg.height })
      }

      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
      }
      img.src = `data:image/jpeg;base64,${msg.data}`
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [wsUrl, updateConnectionState])

  const sendInput = useCallback(
    (payload: Record<string, unknown>) => {
      const ws = wsRef.current
      if (ws && ws.readyState === WS_OPEN) {
        ws.send(JSON.stringify(payload))
      }
    },
    []
  )

  const handleMouseEvent = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>, action: string) => {
      const { scaleX, scaleY } = getScaleFactor()
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      const buttonMap: Record<number, string> = {
        0: "left",
        1: "middle",
        2: "right",
      }

      sendInput({
        type: "mouse",
        action,
        x: Math.round(x),
        y: Math.round(y),
        button: buttonMap[e.button] ?? "left",
      })
    },
    [getScaleFactor, sendInput]
  )

  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLCanvasElement>) => {
      const { scaleX, scaleY } = getScaleFactor()
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      sendInput({
        type: "mouse",
        action: "scroll",
        x: Math.round(x),
        y: Math.round(y),
        deltaX: e.deltaX,
        deltaY: e.deltaY,
      })
    },
    [getScaleFactor, sendInput]
  )

  const handleKeyboard = useCallback(
    (
      e: ReactKeyboardEvent<HTMLCanvasElement>,
      action: "keyDown" | "keyUp"
    ) => {
      e.preventDefault()
      sendInput({
        type: "keyboard",
        action,
        key: e.key,
        code: e.code,
        modifiers: {
          alt: e.altKey,
          ctrl: e.ctrlKey,
          meta: e.metaKey,
          shift: e.shiftKey,
        },
      })
    },
    [sendInput]
  )

  return (
    <div className={className}>
      {connectionState === "connecting" && (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          Connecting to browser...
        </div>
      )}
      {connectionState === "disconnected" && (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          Disconnected. Reconnecting...
        </div>
      )}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="w-full outline-none"
        style={{
          display: connectionState === "connected" ? "block" : "none",
          aspectRatio: frameSize
            ? `${frameSize.width} / ${frameSize.height}`
            : "16 / 9",
          cursor: "default",
        }}
        onClick={(e) => handleMouseEvent(e, "click")}
        onMouseMove={(e) => handleMouseEvent(e, "mousemove")}
        onMouseDown={(e) => handleMouseEvent(e, "mousedown")}
        onMouseUp={(e) => handleMouseEvent(e, "mouseup")}
        onWheel={handleWheel}
        onKeyDown={(e) => handleKeyboard(e, "keyDown")}
        onKeyUp={(e) => handleKeyboard(e, "keyUp")}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  )
}
