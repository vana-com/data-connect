import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { ChevronRight, LoaderIcon } from "lucide-react"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { ActionButton } from "@/components/typography/button-action"
import { LearnMoreLink } from "@/components/typography/link-learn-more"
import { ButtonArrow } from "@/components/ui/button"
import { DEFAULT_APP_ID, getAppRegistryEntry } from "@/apps/registry"
import {
  buildGrantSearchParams,
  getGrantParamsFromSearchParams,
} from "@/lib/grant-params"
import {
  getPrimaryDataSourceLabel,
  getPrimaryScopeToken,
} from "@/lib/scope-labels"
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
import { cn } from "@/lib/classes"

/*
  NB! If you’re running the web build (not Tauri), invoke fails → no platforms.

  "If you want, I can also surface the Tauri debug_connector_paths output in the UI so you can see exactly which paths it's scanning and why it’s empty."
*/

export function Connect() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Deep link params are the source of truth for step-1 targeting.
  const params = getGrantParamsFromSearchParams(searchParams)
  const [generatedSessionId] = useState(() => `grant-session-${Date.now()}`)
  // Fallbacks: if no appId/scopes are provided, use the default (Rickroll → ChatGPT).
  const resolvedAppId = params.appId ?? DEFAULT_APP_ID
  const appEntry =
    getAppRegistryEntry(resolvedAppId) ?? getAppRegistryEntry(DEFAULT_APP_ID)
  const sessionId = params.sessionId ?? generatedSessionId
  // Scopes drive the "Connect your <data source>" copy.
  // URL params are checked first; if missing, fall back to claimed session scopes,
  // then to the default app entry scopes.
  const initialScopes =
    params.scopes && params.scopes.length > 0 ? params.scopes : undefined
  const [claimedScopes, setClaimedScopes] = useState<string[] | undefined>()
  const grantScopes = initialScopes ?? claimedScopes ?? appEntry?.scopes
  const scopesKey = grantScopes?.join("|") ?? ""

  // Background pre-fetch: claim session + verify builder while user exports data.
  // Per spec, session claim and builder verification happen in the background during
  // the connect/export page (Screen 1), so the grant page can skip straight to consent.
  const prefetchedSessionRef = useRef<string | null>(null)
  const [prefetched, setPrefetched] = useState<PrefetchedGrantData | null>(null)

  useEffect(() => {
    // Only pre-fetch for real sessions (not demo, needs secret)
    if (!params.sessionId || !params.secret) return
    if (import.meta.env.DEV && params.sessionId.startsWith("grant-session-"))
      return
    if (prefetchedSessionRef.current === params.sessionId) return // already started for this session

    void (async (): Promise<PrefetchedGrantData | null> => {
      // Step 1: Claim session
      let session: GrantSession
      try {
        console.log("[Connect] Pre-fetch: claiming session", {
          sessionId: params.sessionId,
          hasSecret: Boolean(params.secret),
          timestamp: Date.now(),
        })
        const claimed = await claimSession({
          sessionId: params.sessionId!,
          secret: params.secret!,
        })
        console.log("[Connect] Pre-fetch: claim succeeded", {
          sessionId: params.sessionId,
          granteeAddress: claimed.granteeAddress,
          scopes: claimed.scopes,
        })
        // Update scopes from the claimed session so the UI reflects the
        // actual requested data source (not the default fallback).
        if (claimed.scopes && claimed.scopes.length > 0) {
          setClaimedScopes(claimed.scopes)
        }
        session = {
          id: params.sessionId!,
          granteeAddress: claimed.granteeAddress,
          scopes: claimed.scopes,
          expiresAt: claimed.expiresAt,
          webhookUrl: claimed.webhookUrl,
          appUserId: claimed.appUserId,
        }
      } catch (err) {
        // Claim failure is non-fatal — the grant page will retry from scratch
        console.warn("[Connect] Pre-fetch: claim failed", {
          sessionId: params.sessionId,
          error: err,
        })
        return null
      }

      // Step 2: Verify builder
      // If this fails, still pass the claimed session so the grant flow
      // can skip re-claiming and only retry builder verification.
      try {
        const builderManifest = await verifyBuilder(
          session.granteeAddress,
          session.webhookUrl
        )
        const result = { session, builderManifest }
        console.log(
          "[Connect] Pre-fetch: builder verified, prefetched data ready",
          {
            sessionId: params.sessionId,
            builderName: builderManifest?.name,
          }
        )
        setPrefetched(result)
        return result
      } catch (err) {
        // Builder verification failed — still pass session so grant flow skips claim
        console.warn(
          "[Connect] Pre-fetch: builder verification failed, passing session only",
          {
            sessionId: params.sessionId,
            error: err,
          }
        )
        const result: PrefetchedGrantData = { session }
        setPrefetched(result)
        return result
      }
    })()

    prefetchedSessionRef.current = params.sessionId!
  }, [params.sessionId, params.secret])

  // Platform resolution + connector run (data-source login/scrape).
  const { platforms, isPlatformConnected, platformsLoaded, platformLoadError } =
    usePlatforms()
  const { startExport } = useConnector()
  const runs = useSelector((state: RootState) => state.app.runs)
  const [connectRunId, setConnectRunId] = useState<string | null>(null)

  // Map primary scope token → platform registry entry → available connector.
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
  const connectTitle = dataSourceLabel
    ? `Connect your ${dataSourceLabel}${isAlreadyConnected ? " (again)" : ""}`
    : "Connect your data"
  const dataLabel = dataSourceLabel ? `${dataSourceLabel} data` : "data"
  const connectDescription = (
    <>
      {isAlreadyConnected
        ? `You've already connected your ${dataLabel}. You can run it again to refresh.`
        : `This saves your ${dataLabel} to your computer.`}{" "}
      <LearnMoreLink />
    </>
  )
  const connectCta = dataSourceLabel
    ? `Connect ${dataSourceLabel}`
    : "Connect data"

  // Build the canonical `/grant` query for step-2+.
  // Thread `secret` through so the grant flow can claim + approve the session.
  const grantSearch = useMemo(
    () =>
      buildGrantSearchParams({
        sessionId,
        secret: params.secret,
        appId: resolvedAppId,
        scopes: grantScopes,
      }).toString(),
    [sessionId, params.secret, resolvedAppId, scopesKey]
  )

  const activeRun = connectRunId
    ? runs.find(run => run.id === connectRunId)
    : null
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

  // If the data source is already connected, skip the connect step entirely
  // and go straight to the grant consent screen.
  useEffect(() => {
    if (!platformsLoaded || !isAlreadyConnected) return
    const grantHref = grantSearch
      ? `${ROUTES.grant}?${grantSearch}`
      : ROUTES.grant
    navigate(grantHref, {
      replace: true,
      state: prefetched ? { prefetched } : undefined,
    })
  }, [platformsLoaded, isAlreadyConnected, grantSearch, navigate, prefetched])

  // When the connector run succeeds, move into `/grant`.
  // Pass pre-fetched session + builder data via navigation state so the
  // grant page can skip the claim + verify steps (already done in background).
  useEffect(() => {
    if (!activeRun) return
    if (activeRun.status === "success") {
      const grantHref = grantSearch
        ? `${ROUTES.grant}?${grantSearch}`
        : ROUTES.grant
      console.log("[Connect] Navigating to /grant", {
        hasPrefetched: prefetched !== null,
        prefetchedSession: prefetched?.session?.id,
        prefetchedBuilder: prefetched?.builderManifest?.name,
        grantHref,
      })
      setConnectRunId(null)
      navigate(grantHref, {
        state: prefetched ? { prefetched } : undefined,
      })
    }
    if (activeRun.status === "error" || activeRun.status === "stopped") {
      setConnectRunId(null)
    }
  }, [activeRun, grantSearch, navigate, prefetched])

  // Step 1 CTA: open data-source login/scrape (connector run).
  const handleConnect = async () => {
    if (!connectPlatform || isBusy) return
    const runId = await startExport(connectPlatform)
    setConnectRunId(runId)
  }

  const handleDebugGrant = () => {
    const grantHref = grantSearch
      ? `${ROUTES.grant}?${grantSearch}`
      : ROUTES.grant
    navigate(grantHref, {
      state: prefetched ? { prefetched } : undefined,
    })
  }

  return (
    <div className="container pt-major">
      <div className="space-y-w6">
        <Text as="h1" intent="title">
          {connectTitle}
        </Text>
        <Text as="p" intent="body">
          {connectDescription}
        </Text>

        <div className="action-outset">
          <ActionButton
            size="xl"
            onClick={handleConnect}
            aria-busy={isBusy}
            disabled={!connectPlatform || isBusy}
            className="relative gap-3 group disabled:opacity-100"
          >
            <PlatformIcon iconName={dataSourceLabel ?? "Data"} />
            <span className={cn(isBusy ? "opacity-0" : undefined)}>
              {connectCta}
            </span>
            {!connectPlatform && !isBusy ? (
              <EyebrowBadge
                variant="outline"
                className="text-foreground-dim ml-auto"
              >
                No connector
              </EyebrowBadge>
            ) : (
              <ButtonArrow
                icon={ChevronRight}
                className={cn(
                  "size-[2em] text-muted-foreground group-hover:text-foreground",
                  isBusy ? "opacity-0" : undefined
                )}
                aria-hidden="true"
              />
            )}

            {isBusy ? (
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center",
                  "bg-background/70"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <LoaderIcon
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  {isCheckingPlatforms
                    ? "Checking connectors..."
                    : (activeRun?.statusMessage ?? "Opening browser...")}
                </span>
              </span>
            ) : null}
          </ActionButton>
        </div>

        {connectorErrorMessage ? (
          <div className="space-y-1">
            <Text as="p" intent="small" color="destructive">
              {connectorErrorMessage}
            </Text>
            {import.meta.env.DEV ? (
              <>
                <Text as="p" intent="small" color="destructive">
                  If you’re viewing this in a browser, connectors won’t load.
                  Use the Tauri app.
                </Text>
                <Text as="p" intent="small" color="destructive">
                  Need to bypass connectors?{" "}
                  <a className="link cursor-pointer" onClick={handleDebugGrant}>
                    Skip to grant step
                  </a>
                  .
                </Text>
              </>
            ) : null}
          </div>
        ) : null}

        {/* <div className="">
          <Link
            to={ROUTES.apps}
            className="link flex items-center gap-1.5 text-muted-foreground"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-em" />
            Back to your Apps
          </Link>
        </div> */}
      </div>
    </div>
  )
}
