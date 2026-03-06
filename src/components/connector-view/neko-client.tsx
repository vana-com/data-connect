import { useEffect, useRef, forwardRef, useImperativeHandle } from "react"
// @ts-expect-error — no types for the UMD export
import NekoComponent from "@demodesk/neko"
import "@demodesk/neko/dist/neko.css"

export interface NekoClientHandle {
  mobileKeyboardShow(): void
  mobileKeyboardHide(): void
  mobileKeyboardToggle(): void
  setTouchEnabled(value?: boolean): void
}

interface NekoClientProps {
  server: string
  className?: string
  onConnectionStatus?: (
    status: "connected" | "connecting" | "disconnected",
  ) => void
}

function getOverlayTextarea(neko: any): HTMLTextAreaElement | null {
  return neko?._overlay?._textarea ?? null
}

export const NekoClient = forwardRef<NekoClientHandle, NekoClientProps>(
  function NekoClient({ server, className, onConnectionStatus }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const nekoRef = useRef<any>(null)
    const kbdOpenRef = useRef(false)

    useImperativeHandle(ref, () => ({
      mobileKeyboardShow() {
        const ta = getOverlayTextarea(nekoRef.current)
        if (!ta) return
        ta.focus()
        kbdOpenRef.current = true
      },
      mobileKeyboardHide() {
        const ta = getOverlayTextarea(nekoRef.current)
        if (!ta) return
        ta.blur()
        kbdOpenRef.current = false
      },
      mobileKeyboardToggle() {
        const ta = getOverlayTextarea(nekoRef.current)
        if (!ta) return
        if (kbdOpenRef.current) {
          ta.blur()
          kbdOpenRef.current = false
        } else {
          ta.focus()
          kbdOpenRef.current = true
        }
      },
      setTouchEnabled: (v?: boolean) => nekoRef.current?.setTouchEnabled(v),
    }))

    useEffect(() => {
      const el = containerRef.current
      if (!el) return

      // Create a mount target inside our container
      const mountEl = document.createElement("div")
      mountEl.style.width = "100%"
      mountEl.style.height = "100%"
      el.appendChild(mountEl)

      // Directly instantiate the neko Vue component (no template compiler needed)
      const neko = new NekoComponent({
        propsData: {
          autoplay: true,
          inputMode: "touch",
        },
      })

      neko.$mount(mountEl)
      nekoRef.current = neko

      // Set URL (triggers the internal watcher) then login + connect
      const init = async () => {
        try {
          await neko.setUrl(server)
          await neko.login("user", "neko")
          neko.connect()
        } catch (err) {
          console.warn("[NekoClient] login/connect failed:", err)
        }
      }
      init()

      return () => {
        nekoRef.current = null
        neko.$destroy()
        if (el.contains(neko.$el)) {
          el.removeChild(neko.$el)
        }
      }
    }, [server])

    // Watch connection status changes
    useEffect(() => {
      if (!onConnectionStatus) return
      const interval = setInterval(() => {
        const neko = nekoRef.current
        if (neko?.state?.connection?.status) {
          onConnectionStatus(neko.state.connection.status)
        }
      }, 500)
      return () => clearInterval(interval)
    }, [onConnectionStatus])

    return (
      <>
        <style>{`
          .neko-overlay,
          .neko-container,
          .neko-container video,
          .neko-component {
            cursor: none !important;
          }
          .neko-cursors canvas {
            display: none !important;
          }
        `}</style>
        <div ref={containerRef} className={className} />
      </>
    )
  },
)
