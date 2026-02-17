import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  buildGrantSearchParams,
  type GrantParams,
} from "../lib/grant-params"
import { normalizeGrantParams } from "../lib/grant-param-normalizer"
import { ROUTES } from "@/config/routes"
import { DEV_FLAGS } from "@/config/dev-flags"

/**
 * Parse a vana:// deep link URL into GrantParams.
 * Accepts URLs like: vana://connect?sessionId=abc&secret=xyz
 */
function parseDeepLinkUrl(url: string): GrantParams | null {
  try {
    const parsed = new URL(url)
    const normalized = normalizeGrantParams(parsed.searchParams, {
      strictAllowlist: DEV_FLAGS.strictGrantParamAllowlist,
    })
    if (normalized.hasGrantParams) {
      return normalized.params
    }
  } catch {
    // Not a valid URL
  }
  return null
}

/**
 * Try to import the Tauri deep-link plugin.
 * Returns null in non-Tauri environments (tests, browser dev).
 */
async function getTauriDeepLink() {
  try {
    return await import("@tauri-apps/plugin-deep-link")
  } catch {
    return null
  }
}

export function useDeepLink() {
  const navigate = useNavigate()
  const location = useLocation()
  const [deepLinkParams, setDeepLinkParams] = useState<GrantParams | null>(null)
  const [isDeepLink, setIsDeepLink] = useState(false)
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  // Navigate to the appropriate route based on grant params
  const handleGrantParams = (params: GrantParams) => {
    setDeepLinkParams(params)
    setIsDeepLink(true)

    const normalizedSearch = buildGrantSearchParams(params).toString()
    const targetSearch = normalizedSearch ? `?${normalizedSearch}` : ""
    const targetRoute =
      params.status === "success" ? ROUTES.grant : ROUTES.connect

    navigateRef.current(`${targetRoute}${targetSearch}`, { replace: true })
  }

  // Listen for native deep link events (Tauri plugin)
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupNativeDeepLink = async () => {
      const deepLink = await getTauriDeepLink()
      if (!deepLink) return

      // Check if app was launched via deep link
      const startUrls = await deepLink.getCurrent()
      if (startUrls && startUrls.length > 0) {
        for (const url of startUrls) {
          const params = parseDeepLinkUrl(url)
          if (params) {
            handleGrantParams(params)
            break
          }
        }
      }

      // Listen for deep links while app is running
      unlisten = await deepLink.onOpenUrl((urls: string[]) => {
        for (const url of urls) {
          const params = parseDeepLinkUrl(url)
          if (params) {
            handleGrantParams(params)
            break
          }
        }
      })
    }

    setupNativeDeepLink()

    return () => {
      unlisten?.()
    }
    // Only run once on mount — native deep links are global events
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fallback: check URL query params (dev mode, direct navigation)
  useEffect(() => {
    const normalized = normalizeGrantParams(new URLSearchParams(location.search), {
      strictAllowlist: DEV_FLAGS.strictGrantParamAllowlist,
    })
    const { params, hasGrantParams, normalizedSearch } = normalized

    if (hasGrantParams) {
      setDeepLinkParams(params)
      setIsDeepLink(true)

      const targetSearch = normalizedSearch ? `?${normalizedSearch}` : ""
      const targetRoute =
        params.status === "success" ? ROUTES.grant : ROUTES.connect
      const isAlreadyOnTarget =
        location.pathname === targetRoute && location.search === targetSearch
      const shouldRedirect =
        location.pathname !== ROUTES.connect &&
        location.pathname !== ROUTES.grant

      if (shouldRedirect && !isAlreadyOnTarget) {
        navigate(`${targetRoute}${targetSearch}`, { replace: true })
      }
    }
  }, [location.pathname, location.search, navigate])

  return { deepLinkParams, isDeepLink }
}
