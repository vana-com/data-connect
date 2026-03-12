import { useCallback, useEffect, useRef, useState } from "react"
import { connectEmbrowse } from "@/lib/embrowse-protocol"

export type EmbrowseStatus =
  | "loading"
  | "ready"
  | "scraping"
  | "complete"
  | "error"
  | "cancelled"

export type EmbrowseMode = "iframe" | "popup"

interface UseEmbrowsePageOptions {
  /** Embrowse URL (e.g. "https://embrowse.vana.org") */
  embrowseUrl: string
  /** "iframe" (inline) or "popup" (new window, needed for COOP/COEP) */
  mode: EmbrowseMode
  /** Platform to scrape */
  platform: string
  /** Scopes to request */
  scopes: string[]
  /** Personal Server URL to POST results to */
  serverUrl: string
  /** Auth token for the Personal Server (when not localhost) */
  serverAuthToken?: string
}

export function useEmbrowsePage(options: UseEmbrowsePageOptions) {
  const {
    embrowseUrl,
    mode,
    platform,
    scopes,
    serverUrl,
    serverAuthToken,
  } = options
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const popupRef = useRef<Window | null>(null)
  const [status, setStatus] = useState<EmbrowseStatus>("loading")
  const [progressText, setProgressText] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [completedScopes, setCompletedScopes] = useState<string[]>([])

  const embrowseOrigin = embrowseUrl !== "about:blank"
    ? new URL(embrowseUrl).origin
    : ""

  const config = { platform, scopes, serverUrl, serverAuthToken }

  const openPopup = useCallback(() => {
    const popup = window.open(
      embrowseUrl,
      "embrowse",
      "popup=true,width=480,height=720"
    )
    if (!popup) {
      setStatus("error")
      setErrorMessage("Popup blocked — please allow popups for this site")
      return
    }
    popupRef.current = popup

    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval)
        if (status !== "complete") setStatus("cancelled")
      }
    }, 500)

    return () => {
      clearInterval(interval)
      popup.close()
    }
  }, [embrowseUrl, status])

  // Wire up protocol listener
  useEffect(() => {
    if (!embrowseOrigin) return

    let target: Window | null = null
    if (mode === "iframe") {
      target = iframeRef.current?.contentWindow ?? null
    } else {
      target = popupRef.current
    }
    if (!target) return

    return connectEmbrowse(
      {
        target,
        embrowseOrigin,
        onReady: () => setStatus("ready"),
        onProgress: (s: string) => {
          setStatus("scraping")
          setProgressText(s)
        },
        onComplete: (s: string[]) => {
          setStatus("complete")
          setCompletedScopes(s)
        },
        onError: (msg: string) => {
          setStatus("error")
          setErrorMessage(msg)
        },
        onCancel: () => setStatus("cancelled"),
      },
      config
    )
  }, [embrowseOrigin, mode, config.platform, config.scopes, config.serverUrl, config.serverAuthToken])

  return {
    iframeRef,
    embrowseUrl,
    mode,
    status,
    progressText,
    errorMessage,
    completedScopes,
    openPopup,
  }
}
