import { Link } from "react-router-dom"
import { sourceRowActionStyle } from "@/components/elements/source-row"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { ActionPanel } from "@/components/typography/action-button"
import { stateFocus } from "@/components/typography/field"
import { Text } from "@/components/typography/text"
import { buttonVariants } from "@/components/ui/button"
import { DEV_FLAGS } from "@/config/dev-flags"
import { ROUTES } from "@/config/routes"
import { cn } from "@/lib/classes"
import { openExternalUrl } from "@/lib/open-resource"
import { getAppRegistryEntry } from "@/apps/registry"
import type { ConnectedApp } from "@/types"
import { ArrowUpRight, Settings } from "lucide-react"

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
  return openExternalUrl(url)
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
  const entry = getAppRegistryEntry(app.id)
  // Otherwise, rely on the registry's externalUrl.
  return entry?.status === "live"
    ? new URL(entry.externalUrl, window.location.origin)
    : null
}

const Header = () => {
  return (
    <Text as="h2" weight="medium">
      Apps using your data
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
          const handleOpenApp = appUrl
            ? () => {
                void openExternalApp(appUrl.toString())
              }
            : undefined

          return (
            <div
              key={app.id}
              className={cn(
                // replication of ActionnButton with split click targets
                buttonVariants({
                  variant: "outline",
                  size: "xl",
                  fullWidth: true,
                }),
                "gap-0 items-stretch px-0"
              )}
            >
              <button
                type="button"
                className={cn(
                  "cursor-pointer",
                  "flex h-full min-w-0 flex-1 items-center gap-3",
                  "px-4 text-left",
                  stateFocus
                )}
                onClick={handleOpenApp}
              >
                {/* Duplicated SourceRow LHS; RHS is different! */}
                <PlatformIcon
                  iconName={app.id}
                  fallbackLabel={
                    app.icon?.trim() || app.name.charAt(0).toUpperCase()
                  }
                />
                <div className="flex items-baseline gap-2">
                  {app.name}

                  <Text as="span" intent="small" muted>
                    {formatConnectedAt(app.connectedAt)}
                  </Text>
                </div>
              </button>

              <Link
                to={ROUTES.settings}
                className={cn(
                  "flex h-full items-center justify-center px-3",
                  stateFocus,
                  "text-foreground/30 hover:text-foreground"
                )}
                aria-label="Account settings"
              >
                <Settings className="size-4.5" aria-hidden />
              </Link>

              <button
                type="button"
                className={cn(
                  "cursor-pointer",
                  "flex h-full items-center justify-center pl-0.5 pr-4",
                  // "border-l border-ring/20 group-hover:border-ring",
                  stateFocus
                )}
                onClick={handleOpenApp}
                aria-label={`Open ${app.name}`}
              >
                <ArrowUpRight
                  className={cn(sourceRowActionStyle, "size-7")}
                  aria-hidden
                />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
