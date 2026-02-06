import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { ChevronRight, LoaderIcon } from "lucide-react"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { ActionButton } from "@/components/typography/action-button"
import { LearnMoreLink } from "@/components/typography/learn-more-link"
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
import type { RootState } from "@/types"
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
  const grantScopes =
    params.scopes && params.scopes.length > 0 ? params.scopes : appEntry?.scopes
  const scopesKey = grantScopes?.join("|") ?? ""

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
  const grantSearch = useMemo(
    () =>
      buildGrantSearchParams({
        sessionId,
        appId: resolvedAppId,
        scopes: grantScopes,
      }).toString(),
    [sessionId, resolvedAppId, scopesKey]
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

  // When the connector run succeeds, move into `/grant`.
  useEffect(() => {
    if (!activeRun) return
    if (activeRun.status === "success") {
      const grantHref = grantSearch
        ? `${ROUTES.grant}?${grantSearch}`
        : ROUTES.grant
      setConnectRunId(null)
      navigate(grantHref)
    }
    if (activeRun.status === "error" || activeRun.status === "stopped") {
      setConnectRunId(null)
    }
  }, [activeRun, grantSearch, navigate])

  // Step 1 CTA: open data-source login/scrape (connector run).
  const handleConnect = async () => {
    if (!connectPlatform || isBusy) return
    const runId = await startExport(connectPlatform)
    setConnectRunId(runId)
  }

  const handleDebugDeepLink = () => {
    const connectHref = grantSearch
      ? `${ROUTES.connect}?${grantSearch}`
      : ROUTES.connect
    window.location.assign(connectHref)
  }

  const handleDebugGrant = () => {
    const grantHref = grantSearch
      ? `${ROUTES.grant}?${grantSearch}`
      : ROUTES.grant
    navigate(grantHref)
  }

  return (
    <div className="container py-w24">
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
            <span>{connectCta}</span>
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
                className="size-[1.5em] text-muted-foreground group-hover:text-foreground"
                aria-hidden="true"
              />
            )}

            {/* TODO: busy loading state */}
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
                    : "Opening browser..."}
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
