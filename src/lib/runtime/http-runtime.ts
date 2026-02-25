import type { Runtime } from "./types"

/**
 * HTTP runtime — uses fetch() for commands and WebSocket for events.
 * Used in cloud mode when the frontend is served by the API server.
 */
export function createHttpRuntime(): Runtime {
  let eventSocket: WebSocket | null = null
  let socketReady: Promise<void> | null = null
  const eventHandlers = new Map<string, Set<(payload: unknown) => void>>()

  function getEventSocket(): Promise<void> {
    if (socketReady) return socketReady

    socketReady = new Promise<void>((resolve, reject) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const wsUrl = `${protocol}//${window.location.host}/ws/events`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        eventSocket = ws
        resolve()
      }

      ws.onerror = () => {
        reject(new Error("WebSocket connection failed"))
      }

      ws.onmessage = (msg) => {
        try {
          const { event, payload } = JSON.parse(msg.data) as {
            event: string
            payload: unknown
          }
          const handlers = eventHandlers.get(event)
          if (handlers) {
            for (const handler of handlers) {
              handler(payload)
            }
          }
        } catch {
          // Ignore malformed messages
        }
      }

      ws.onclose = () => {
        eventSocket = null
        socketReady = null
        // Reconnect after a brief delay
        setTimeout(() => getEventSocket(), 2000)
      }
    })

    return socketReady
  }

  return {
    mode: "http",

    async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
      const res = await fetch(`/api/invoke/${command}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args ?? {}),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`invoke ${command} failed (${res.status}): ${text}`)
      }
      return res.json()
    },

    onEvent<T = unknown>(event: string, handler: (payload: T) => void): () => void {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      const handlers = eventHandlers.get(event)!
      const wrappedHandler = handler as (payload: unknown) => void
      handlers.add(wrappedHandler)

      // Ensure the WebSocket is connected and subscribe
      getEventSocket().then(() => {
        if (eventSocket?.readyState === WebSocket.OPEN) {
          eventSocket.send(JSON.stringify({ type: "subscribe", event }))
        }
      })

      return () => {
        handlers.delete(wrappedHandler)
        if (handlers.size === 0) {
          eventHandlers.delete(event)
          if (eventSocket?.readyState === WebSocket.OPEN) {
            eventSocket.send(JSON.stringify({ type: "unsubscribe", event }))
          }
        }
      }
    },

    async fetch(url: string, init?: RequestInit): Promise<Response> {
      // In HTTP mode, the API server handles any CORS proxying if needed.
      // For same-origin requests (e.g., personal server on localhost),
      // the browser's native fetch works directly.
      return globalThis.fetch(url, init)
    },

    async openUrl(url: string): Promise<void> {
      window.open(url, "_blank", "noopener,noreferrer")
    },

    async openPath(_path: string): Promise<void> {
      // In cloud mode, local file paths aren't accessible from the browser.
      // This is a no-op; the UI should show the path as text instead.
      console.warn("[HttpRuntime] openPath is not available in cloud mode")
    },

    async copyToClipboard(text: string): Promise<void> {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
      }
      // Fallback for insecure contexts
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.setAttribute("readonly", "true")
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.append(textarea)
      textarea.select()
      document.execCommand("copy")
      textarea.remove()
    },

    async getAppVersion(): Promise<string> {
      // In cloud mode, version comes from the API server
      const res = await fetch("/api/version")
      if (!res.ok) return "unknown"
      const data = await res.json()
      return data.version ?? "unknown"
    },
  }
}
