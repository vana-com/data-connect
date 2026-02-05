import { ArrowUpRight, Settings } from "lucide-react"
import {
  ActionButton,
  ActionPanel,
} from "@/components/typography/action-button"
import { LearnMoreLink } from "@/components/typography/learn-more-link"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
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

function DefaultAppIcon({ icon, name }: { icon?: string; name: string }) {
  const label = icon?.trim() || name.charAt(0).toUpperCase()
  return (
    <div
      data-component="default-app-icon"
      className={cn(
        // layout
        "flex items-center justify-center",
        // size & shape
        "size-6 rounded-card",
        // color
        "bg-muted text-foreground"
      )}
    >
      <span className="text-xs font-semibold">{label}</span>
    </div>
  )
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
        {apps.map(app => (
          <ActionButton
            key={app.id}
            className={cn("items-start justify-between gap-4 text-left")}
          >
            <div className="flex h-full flex-1 items-center gap-3">
              <DefaultAppIcon icon={app.icon} name={app.name} />
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
              <Settings className="size-4 text-muted-foreground" aria-hidden />
              <ArrowUpRight
                className="size-5 text-muted-foreground"
                aria-hidden
              />
            </div>
          </ActionButton>
        ))}
      </div>
    </section>
  )
}
