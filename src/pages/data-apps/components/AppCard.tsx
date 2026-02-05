import { LockIcon, ClockIcon } from "lucide-react"
import { useNavigate } from "react-router"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import { ROUTES } from "@/config/routes"
import type { MockApp } from "../types"

export function AppCard({ app }: { app: MockApp }) {
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        "rounded-card border border-border bg-background p-6",
        app.status === "coming-soon" && "opacity-80"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-14 items-center justify-center rounded-card bg-muted">
          <Text as="span" intent="subtitle" inline>
            {app.icon}
          </Text>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Text as="h3" intent="large" weight="semi" truncate>
              {app.name}
            </Text>
            {app.status === "coming-soon" && (
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
            )}
          </div>
          <Text as="p" intent="small" color="mutedForeground">
            {app.description}
          </Text>
          <Text
            as="span"
            intent="pill"
            color="accent"
            className="inline-flex rounded-button bg-accent/10 px-2 py-0.5"
          >
            {app.category}
          </Text>
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <LockIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          <Text as="span" intent="fine" weight="medium" color="mutedForeground">
            Data required:
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
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

      {app.status === "coming-soon" ? (
        <Button
          type="button"
          variant="outline"
          fullWidth
          className="mt-4"
          disabled
        >
          Connect
        </Button>
      ) : (
        <Button
          type="button"
          variant="default"
          fullWidth
          className="mt-4"
          // TODO: Design expects opening the app in the user's browser, then deep-linking back to
          // `/connect?sessionId&appId&scopes`. Current behavior opens the in-app route.
          onClick={() => navigate(ROUTES.app(app.id))}
        >
          Open App
        </Button>
      )}
    </div>
  )
}
