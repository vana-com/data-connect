import { useEffect, useMemo, useState } from "react"
import { ClockIcon } from "lucide-react"
import {
  openSubmittedAppExternalUrl,
  parseSubmittedAppExternalUrl,
} from "@/apps/external-url"
import { deriveIconUrls } from "@/apps/icon-url"
import type { AppRegistryEntry } from "@/apps/registry-types"
import { Text } from "@/components/typography/text"
import { buildGrantSearchParams } from "@/lib/grant-params"
import { AppCard } from "./app-card"

function RegistryAppCardIcon({ app }: { app: AppRegistryEntry }) {
  const iconCandidates = useMemo(
    () => deriveIconUrls(app.status === "live" ? app.externalUrl : null, app.iconUrl),
    [app]
  )
  const [iconIndex, setIconIndex] = useState(0)

  useEffect(() => {
    setIconIndex(0)
  }, [iconCandidates])

  const activeIconUrl = iconCandidates[iconIndex]
  const showFallbackLetter = !activeIconUrl

  return (
    <div className="shrink-0 size-8 bg-foreground rounded-button flex items-center justify-center overflow-hidden">
      {showFallbackLetter ? (
        <Text as="span" intent="small" weight="medium" className="text-background">
          {app.icon}
        </Text>
      ) : (
        <img
          src={activeIconUrl}
          alt=""
          aria-hidden="true"
          className="size-full object-contain"
          onError={() => {
            setIconIndex(current => current + 1)
          }}
        />
      )}
    </div>
  )
}

export function RegistryAppCard({ app }: { app: AppRegistryEntry }) {
  const handleOpenApp = () => {
    const sessionId = `grant-session-${Date.now()}`
    const searchParams = buildGrantSearchParams({
      sessionId,
      appId: app.id,
      scopes: app.scopes,
    })
    const appUrl = parseSubmittedAppExternalUrl(app.externalUrl)
    const search = searchParams.toString()
    if (search) {
      appUrl.search = search
    }
    void openSubmittedAppExternalUrl(appUrl)
  }

  return (
    <AppCard
      footerLabel={app.status === "live" ? "Open app" : "Coming soon"}
      ariaLabel={app.status === "live" ? `Open ${app.name}` : undefined}
      onClick={app.status === "live" ? handleOpenApp : undefined}
      interactive={app.status === "live"}
    >
      <div className="space-y-3">
        <div className="p-1">
          <RegistryAppCardIcon app={app} />
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Text as="h3" intent="heading" weight="medium">
              {app.name}
            </Text>
            {app.status === "coming-soon" ? (
              <Text
                as="span"
                intent="pill"
                color="mutedForeground"
                withIcon
                className="rounded-button bg-muted px-2 py-0.5"
              >
                <ClockIcon aria-hidden="true" className="size-3" />
                Coming Soon
              </Text>
            ) : null}
          </div>
          <Text
            as="p"
            intent="small"
            dim
            balance
            className="whitespace-normal"
          >
            {app.description}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Text
            as="span"
            intent="pill"
            color="accent"
            className="rounded-button bg-accent/10 px-2 py-0.5"
          >
            {app.category}
          </Text>
          {app.dataRequired.map(data => (
            <Text
              key={data}
              as="span"
              intent="pill"
              color="mutedForeground"
              className="rounded-button bg-muted px-2 py-0.5"
            >
              {data}
            </Text>
          ))}
        </div>
      </div>
    </AppCard>
  )
}
