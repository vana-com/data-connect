import { ExternalLinkIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { mockApps } from "./fixtures"
import { AppCard } from "./components/AppCard"

export function DataApps() {
  const liveApps = mockApps.filter(app => app.status === "live")
  const comingSoonApps = mockApps.filter(app => app.status === "coming-soon")

  return (
    <div className="flex-1 overflow-auto bg-muted">
      <div className="container py-w16">
        <div className="space-y-w12">
          <div className="space-y-2">
            <Text as="h1" intent="title" weight="semi">
              Data Apps
            </Text>
            <Text as="p" intent="body" color="mutedForeground">
              Discover applications that can work with your data
            </Text>
          </div>

          {liveApps.length > 0 && (
            <section className="space-y-5">
              <Text as="h2" intent="heading" weight="semi">
                Available Now
              </Text>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {liveApps.map(app => (
                  <AppCard key={app.id} app={app} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-5">
            <Text as="h2" intent="heading" weight="semi">
              Coming Soon
            </Text>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {comingSoonApps.map(app => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </section>

          <section className="rounded-card border border-border bg-background p-8 text-center">
            <Text as="h3" intent="heading" weight="semi" className="mb-2">
              Build your own data app
            </Text>
            <Text as="p" intent="small" color="mutedForeground" className="mb-5">
              Create applications that leverage the Vana Data Portability Protocol
            </Text>
            <Button asChild variant="accent">
              <a href="https://docs.vana.org" target="_blank" rel="noopener noreferrer">
                View Documentation
                <ExternalLinkIcon aria-hidden="true" className="size-4" />
              </a>
            </Button>
          </section>
        </div>
      </div>
    </div>
  )
}
