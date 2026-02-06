import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  buildGrantSearchParams,
  getGrantParamsFromSearchParams,
  type GrantParams,
} from "../lib/grant-params"
import { ROUTES } from "@/config/routes"

export function useDeepLink() {
  const navigate = useNavigate()
  const location = useLocation()
  const [deepLinkParams, setDeepLinkParams] = useState<GrantParams | null>(null)
  const [isDeepLink, setIsDeepLink] = useState(false)

  useEffect(() => {
    const checkDeepLink = () => {
      // Check if we were opened via a deep link
      // This will be handled by Tauri deep link registration
      const urlParams = new URLSearchParams(location.search)
      const params = getGrantParamsFromSearchParams(urlParams)

      if (params.sessionId || params.appId) {
        setDeepLinkParams(params)
        setIsDeepLink(true)

        const normalizedSearch = buildGrantSearchParams(params).toString()
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
    }

    checkDeepLink()
  }, [location.pathname, location.search, navigate])

  return { deepLinkParams, isDeepLink }
}
