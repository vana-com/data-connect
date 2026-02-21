import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { DEFAULT_APP_ID, getAppRegistryEntry } from "@/apps/registry"
import {
  buildGrantSearchParams,
  getGrantParamsFromSearchParams,
} from "@/lib/grant-params"
import { getPrimaryDataSourceLabel, getPrimaryScopeToken } from "@/lib/scope-labels"
import { ROUTES } from "@/config/routes"
import { usePlatforms } from "@/hooks/usePlatforms"
import { useConnector } from "@/hooks/useConnector"
import {
  getPlatformRegistryEntryById,
  resolvePlatformForEntry,
} from "@/lib/platform/utils"
import { claimSession } from "@/services/sessionRelay"
import { verifyBuilder } from "@/services/builder"
import type { RootState } from "@/types"
import type { PrefetchedGrantData, GrantSession } from "@/pages/grant/types"
import { getConnectBusyCta } from "./connect-run-status"
import { getConnectCta, getConnectTitle, getDataLabel } from "./connect-copy"

/*
  NB! If you’re running the web build (not Tauri), invoke fails → no platforms.

  "If you want, I can also surface the Tauri debug_connector_paths output in the UI so you can see exactly which paths it's scanning and why it’s empty."
*/

interface UseConnectPageResult {
  connectTitle: string
  connectCta: string
  busyCta: string
  dataSourceLabel: string | null
  dataLabel: string
  isAlreadyConnected: boolean
  hasConnector: boolean
  isBusy: boolean
  isAutoRedirecting: boolean
  connectorErrorMessage: string | null
  showDebugBypass: boolean
  handleConnect: () => Promise<void>
  handleDebugGrant: () => void
}

export function useConnectPage(): UseConnectPageResult {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const params = getGrantParamsFromSearchParams(searchParams)
  const hasGrantSession = Boolean(params.sessionId)
  const [generatedSessionId] = useState(() => `grant-session-${Date.now()}`)
  const resolvedAppId = params.appId ?? DEFAULT_APP_ID
  const appEntry =
    getAppRegistryEntry(resolvedAppId) ?? getAppRegistryEntry(DEFAULT_APP_ID)
  const sessionId = params.sessionId ?? generatedSessionId

  const prefetchedSessionRef = useRef<string | null>(null)
  const prefetchedDataRef = useRef<PrefetchedGrantData | null>(null)
  const [prefetched, setPrefetched] = useState<PrefetchedGrantData | null>(null)
  const requestedScopes =
    params.scopes && params.scopes.length > 0 ? params.scopes : undefined
  const claimedScopes = prefetched?.session.scopes
  // Grant sessions must remain canonical to URL/claimed session inputs.
  // Do not infer app-default scopes when sessionId is present.
  const fallbackAppScopes = hasGrantSession ? undefined : appEntry?.scopes
  const grantScopes = requestedScopes ?? claimedScopes ?? fallbackAppScopes
  const scopesKey = grantScopes?.join("|") ?? ""

  useEffect(() => {
    const sessionIdParam = params.sessionId
    const secretParam = params.secret

    if (!sessionIdParam || !secretParam) return
    if (import.meta.env.DEV && sessionIdParam.startsWith("grant-session-")) return
    if (prefetchedSessionRef.current === sessionIdParam) return

    prefetchedSessionRef.current = sessionIdParam
    let isMounted = true

    void (async (): Promise<void> => {
      let session: GrantSession

      try {
        const claimed = await claimSession({
          sessionId: sessionIdParam,
          secret: secretParam,
        })
        session = {
          id: sessionIdParam,
          granteeAddress: claimed.granteeAddress,
          scopes: claimed.scopes,
          expiresAt: claimed.expiresAt,
          webhookUrl: claimed.webhookUrl,
          appUserId: claimed.appUserId,
        }
      } catch {
        return
      }

      try {
        const builderManifest = await verifyBuilder(
          session.granteeAddress,
          session.webhookUrl
        )
        const result: PrefetchedGrantData = { session, builderManifest }
        prefetchedDataRef.current = result
        if (isMounted) setPrefetched(result)
      } catch {
        const result: PrefetchedGrantData = { session }
        prefetchedDataRef.current = result
        if (isMounted) setPrefetched(result)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [params.secret, params.sessionId])

  const { platforms, isPlatformConnected, platformsLoaded, platformLoadError } =
    usePlatforms()
  const { startImport } = useConnector()
  const [connectRunId, setConnectRunId] = useState<string | null>(null)
  const activeRun = useSelector((state: RootState) =>
    connectRunId
      ? (state.app.runs.find(run => run.id === connectRunId) ?? null)
      : null
  )

  const registryEntry = useMemo(() => {
    const scopeToken = getPrimaryScopeToken(grantScopes)
    return scopeToken ? getPlatformRegistryEntryById(scopeToken) : null
  }, [scopesKey])

  const connectPlatform = useMemo(
    () =>
      registryEntry ? resolvePlatformForEntry(platforms, registryEntry) : null,
    [platforms, registryEntry]
  )

  const isCheckingPlatforms = !platformsLoaded
  const isAlreadyConnected = connectPlatform
    ? isPlatformConnected(connectPlatform.id)
    : false

  const dataSourceLabel = getPrimaryDataSourceLabel(grantScopes)
  const connectTitle = getConnectTitle(dataSourceLabel, isAlreadyConnected)
  const dataLabel = getDataLabel(dataSourceLabel)
  const connectCta = getConnectCta(dataSourceLabel)

  // Keep dependencies primitive and deterministic for query serialization.
  const grantSearch = useMemo(
    () =>
      buildGrantSearchParams({
        sessionId,
        secret: params.secret,
        appId: resolvedAppId,
        scopes: grantScopes,
      }).toString(),
    [params.secret, resolvedAppId, scopesKey, sessionId]
  )

  const isConnecting = Boolean(connectRunId)
  const scopeSummary =
    grantScopes && grantScopes.length > 0 ? grantScopes.join(", ") : null
  const isMissingRegistryEntry = platformsLoaded && !registryEntry
  const isMissingConnector =
    platformsLoaded && Boolean(registryEntry) && !connectPlatform

  const connectorErrorMessage = platformLoadError
    ? `Could not load connectors.${scopeSummary ? ` Scope: ${scopeSummary}.` : ""}`
    : isMissingRegistryEntry
      ? `No data source matches the requested scope${
          scopeSummary ? `: ${scopeSummary}.` : "."
        }`
      : isMissingConnector
        ? `No connector installed for ${
            dataSourceLabel ?? "requested scope"
          }.${scopeSummary ? ` Scope: ${scopeSummary}.` : ""}`
        : null

  const isBusy = isCheckingPlatforms || isConnecting
  const isAutoRedirecting = hasGrantSession && platformsLoaded && isAlreadyConnected
  const busyCta = isCheckingPlatforms
    ? "Checking connectors..."
    : getConnectBusyCta(activeRun)

  useEffect(() => {
    if (!hasGrantSession || !platformsLoaded || !isAlreadyConnected) return

    const grantHref = grantSearch ? `${ROUTES.grant}?${grantSearch}` : ROUTES.grant
    navigate(grantHref, {
      replace: true,
      state: prefetchedDataRef.current
        ? { prefetched: prefetchedDataRef.current }
        : undefined,
    })
  }, [grantSearch, hasGrantSession, isAlreadyConnected, navigate, platformsLoaded])

  useEffect(() => {
    if (!activeRun) return

    if (activeRun.status === "success") {
      const grantHref = grantSearch ? `${ROUTES.grant}?${grantSearch}` : ROUTES.grant
      setConnectRunId(null)
      navigate(grantHref, {
        state: prefetchedDataRef.current
          ? { prefetched: prefetchedDataRef.current }
          : undefined,
      })
      return
    }

    if (activeRun.status === "error" || activeRun.status === "stopped") {
      setConnectRunId(null)
    }
  }, [activeRun, grantSearch, navigate])

  const handleConnect = async () => {
    if (!connectPlatform || isBusy) return
    const runId = await startImport(connectPlatform)
    setConnectRunId(runId)
  }

  const handleDebugGrant = () => {
    const grantHref = grantSearch ? `${ROUTES.grant}?${grantSearch}` : ROUTES.grant
    navigate(grantHref, {
      state: prefetched ? { prefetched } : undefined,
    })
  }

  return {
    connectTitle,
    connectCta,
    busyCta,
    dataSourceLabel,
    dataLabel,
    isAlreadyConnected,
    hasConnector: Boolean(connectPlatform),
    isBusy,
    isAutoRedirecting,
    connectorErrorMessage,
    showDebugBypass: import.meta.env.DEV && Boolean(connectorErrorMessage),
    handleConnect,
    handleDebugGrant,
  }
}
