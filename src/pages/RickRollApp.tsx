import { useState, useSyncExternalStore } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ChevronRight, ArrowLeftIcon } from "lucide-react"
import { RickRollApp } from "../apps/rickroll/App"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { ActionButton } from "@/components/typography/action-button"
import { LearnMoreLink } from "@/components/typography/learn-more-link"
import { ButtonArrow } from "@/components/ui/button"
import { DEFAULT_APP_ID, getAppRegistryEntry } from "../apps/registry"
import {
  buildGrantSearchParams,
  getGrantParamsFromSearchParams,
} from "../lib/grant-params"
import { isAppConnected, subscribeConnectedApps } from "../lib/storage"
import { ROUTES } from "@/config/routes"

const getIsRickrollConnected = () => isAppConnected(DEFAULT_APP_ID)

const DATA_SOURCE_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  reddit: "Reddit",
  twitter: "Twitter",
  x: "X (Twitter)",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  spotify: "Spotify",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  google: "Google",
}

function getPrimaryDataSourceLabel(scopes?: string[]) {
  if (!scopes || scopes.length === 0) return null
  const scopeToken = scopes
    .map(scope => scope.split(":")[1] ?? scope)
    .find(Boolean)
  if (!scopeToken) return null
  const scopeKey = scopeToken.split("-")[0]?.toLowerCase()
  if (!scopeKey) return null
  return (
    DATA_SOURCE_LABELS[scopeKey] ??
    `${scopeKey.charAt(0).toUpperCase()}${scopeKey.slice(1)}`
  )
}

// Host page + access gating for the RickRoll demo app.
// This renders the CTA when not connected, and renders the actual app UI (eg. RickRollApp from src/apps/rickroll/app.tsx) once connected.
export function RickRollAppPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isConnected = useSyncExternalStore(
    subscribeConnectedApps,
    getIsRickrollConnected
  )
  const appEntry = getAppRegistryEntry(DEFAULT_APP_ID)
  const grantParams = getGrantParamsFromSearchParams(searchParams)
  const [generatedSessionId] = useState(() => `grant-session-${Date.now()}`)
  const sessionId = grantParams.sessionId ?? generatedSessionId
  const resolvedAppId = grantParams.appId ?? appEntry?.id ?? DEFAULT_APP_ID
  const resolvedScopes = grantParams.scopes ?? appEntry?.scopes
  const isExternalApp = searchParams.get("external") === "1"
  const dataSourceLabel = getPrimaryDataSourceLabel(resolvedScopes)
  const connectTitle = dataSourceLabel
    ? `Connect your ${dataSourceLabel}`
    : "Connect your data"
  const dataLabel = dataSourceLabel ? `${dataSourceLabel} data` : "data"
  const connectDescription = (
    <>
      This saves your {dataLabel} to your computer. <LearnMoreLink />
    </>
  )
  const connectCta = dataSourceLabel
    ? `Connect ${dataSourceLabel}`
    : "Connect data"

  const handleConnect = () => {
    // Trigger grant flow using React Router navigation
    const searchParams = buildGrantSearchParams({
      sessionId,
      appId: resolvedAppId,
      scopes: resolvedScopes,
    })
    const search = searchParams.toString()
    if (isExternalApp) {
      const deepLink = search ? `dataconnect://?${search}` : "dataconnect://"
      window.location.href = deepLink
      return
    }
    navigate(`${ROUTES.grant}${search ? `?${search}` : ""}`)
  }

  // This is currently "Connect your ChatGPT data" UI
  // TODO: …but should be "Allow access to your ChatGPT data" UI
  if (!isConnected) {
    return (
      <div className="container py-w24">
        <div className="space-y-w6">
          <Text as="h1" intent="title">
            {connectTitle}
          </Text>
          <Text as="p" intent="body">
            {connectDescription}
          </Text>
          <ActionButton
            size="xl"
            className="gap-3 group"
            onClick={handleConnect}
          >
            <span aria-hidden="true">
              <PlatformIcon iconName={dataSourceLabel ?? "Data"} size={32} />
            </span>
            <span>{connectCta}</span>
            <ButtonArrow
              icon={ChevronRight}
              className="size-[1.5em] text-muted-foreground group-hover:text-foreground"
              aria-hidden="true"
            />
          </ActionButton>

          <div className="">
            <Link
              to={ROUTES.apps}
              className="link flex items-center gap-1.5 text-muted-foreground"
            >
              <ArrowLeftIcon aria-hidden="true" className="size-em" />
              Back to your Apps
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <RickRollApp />
    </div>
  )
}
