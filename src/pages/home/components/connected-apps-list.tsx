import { ArrowUpRight, Settings } from "lucide-react"
import { PlatformIcon } from "@/components/icons/platform-icon"
import {
  ActionButton,
  ActionPanel,
} from "@/components/typography/action-button"
import { LearnMoreLink } from "@/components/typography/learn-more-link"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { ROUTES } from "@/config/routes"
import { DEV_FLAGS } from "@/config/dev-flags"
import { mockApps } from "@/pages/data-apps/fixtures"
import type { ConnectedApp } from "@/types"

interface ConnectedAppsListProps {
  apps: ConnectedApp[]
}

function formatConnectedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Unknown"
  }
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

async function openExternalApp(url: string) {
  try {
    const { open } = await import("@tauri-apps/plugin-shell")
    await open(url)
    return true
  } catch {
    const popup = window.open(url, "_blank", "noopener,noreferrer")
    return Boolean(popup)
  }
}

function getConnectedAppUrl(app: ConnectedApp) {
  // If VITE_USE_RICKROLL_MOCK=true, then every connected app opens the RickRoll mock.
  if (DEV_FLAGS.useRickrollMock) {
    return new URL(ROUTES.rickrollMockRoot, window.location.origin)
  }
  if (!DEV_FLAGS.useTestData) {
    return null
  }
  // When using testConnectedApps, rickroll is the only in-app mock.
  if (app.id === "rickroll") {
    return new URL(ROUTES.rickrollMockRoot, window.location.origin)
  }
  const match = mockApps.find(item => item.id === app.id)
  // Otherwise, rely on the fixture's externalUrl.
  return match?.externalUrl
    ? new URL(match.externalUrl, window.location.origin)
    : null
}

const Header = () => {
  return (
    <Text as="h2" weight="medium">
      Apps using your data.&nbsp;
      <LearnMoreLink className="text-muted-foreground" />
    </Text>
  )
}

export function ConnectedAppsList({ apps }: ConnectedAppsListProps) {
  if (apps.length === 0) {
    return (
      <section data-component="connected-apps-list" className="space-y-gap">
        <Header />
        <div className="action-outset">
          <ActionPanel>
            <Text muted>No apps yet</Text>
          </ActionPanel>
        </div>
      </section>
    )
  }

  return (
    <section data-component="connected-apps-list" className="space-y-gap">
      <Header />
      <div className="flex flex-col gap-3 action-outset">
        {apps.map(app => {
          const appUrl = getConnectedAppUrl(app)
          return (
            <ActionButton
              key={app.id}
              className={cn("items-start justify-between gap-4 text-left")}
              onClick={
                appUrl
                  ? () => {
                      void openExternalApp(appUrl.toString())
                    }
                  : undefined
              }
            >
              <div className="flex h-full flex-1 items-center gap-3">
                <PlatformIcon
                  iconName={app.id}
                  fallbackScale={0.5}
                  fallbackLabel={
                    app.icon?.trim() || app.name.charAt(0).toUpperCase()
                  }
                />
                <span>{app.name}</span>
              </div>
              <div className="flex h-full items-center gap-3">
                <Text
                  as="span"
                  intent="small"
                  weight="medium"
                  color="mutedForeground"
                >
                  {formatConnectedAt(app.connectedAt)}
                </Text>
                <Settings
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                <ArrowUpRight
                  className="size-5 text-muted-foreground"
                  aria-hidden
                />
              </div>
            </ActionButton>
          )
        })}
      </div>
    </section>
  )
}
