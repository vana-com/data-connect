import { ClockIcon } from "lucide-react"
import {
  openSubmittedAppExternalUrl,
  parseSubmittedAppExternalUrl,
} from "@/apps/external-url"
import { deriveIconUrls } from "@/apps/icon-url"
import type { AppRegistryEntry } from "@/apps/registry-types"
import { IconFlow } from "@/components/elements/icon-flow"
import { PlatformIconGroup } from "@/components/elements/platform-icon-group"
import { AdaptiveIcon } from "@/components/icons/adaptive-icon"
import { EyebrowBadge } from "@/components/typography/eyebrow-badge"
import { Text } from "@/components/typography/text"
import { buildGrantSearchParams } from "@/lib/grant-params"
import { AppCard } from "./app-card"

export function RegistryAppCard({ app }: { app: AppRegistryEntry }) {
  const appIconImageSources = deriveIconUrls(
    app.status === "live" ? app.externalUrl : null,
    app.iconUrl
  )
  const requiredPlatformItems = app.dataRequired.map(data => ({
    iconName: data,
  }))

  const handleOpenApp = () => {
    if (app.status !== "live") {
      return
    }

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
      ariaLabel={app.status === "live" ? `Open ${app.name}` : undefined}
      onClick={app.status === "live" ? handleOpenApp : undefined}
      interactive={app.status === "live"}
    >
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="pt-2 px-1 pb-1">
            {requiredPlatformItems.length > 0 ? (
              <IconFlow
                className="gap-0.5"
                from={
                  <PlatformIconGroup items={requiredPlatformItems} size={28} />
                }
                to={
                  <AdaptiveIcon
                    imageSources={appIconImageSources}
                    fallbackLabel={app.icon}
                    variant="plain"
                    size={28}
                  />
                }
              />
            ) : (
              <AdaptiveIcon
                imageSources={appIconImageSources}
                fallbackLabel={app.icon}
                variant="plain"
                size={28}
              />
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <EyebrowBadge className="bg-dc/10 text-dc border-transparent">
              {app.category}
            </EyebrowBadge>
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
        </div>
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Text as="h3" intent="xlarge" weight="medium">
              {app.name}
            </Text>
          </div>
          <Text
            as="p"
            intent="small"
            dim
            balance
            className="line-clamp-2 whitespace-normal"
          >
            {app.description}
          </Text>
        </div>
      </div>
    </AppCard>
  )
}
