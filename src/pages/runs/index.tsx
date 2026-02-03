import { ActivityIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { PersonalServerCard } from "./components/personal-server-card"
import { RunItem } from "./components/run-item/run-item"
import { useRunsPage } from "./use-runs-page"

export function Runs() {
  const {
    finishedRuns,
    stopExport,
    isAuthenticated,
    personalServer,
    serverId,
    serverReady,
  } = useRunsPage()

  return (
    <div className="flex-1 overflow-auto bg-muted">
      <div className="container py-w16">
        <div className="mx-auto max-w-[560px] space-y-6">
          <div className="space-y-1">
            <Text as="h1" intent="heading" weight="semi">
              Export history
            </Text>
            <Text as="p" intent="small" color="mutedForeground">
              Your data export runs
            </Text>
          </div>

          <PersonalServerCard
            isAuthenticated={isAuthenticated}
            personalServer={personalServer}
            serverId={serverId}
          />

          {finishedRuns.length === 0 ? (
            <div className="rounded-card border border-border bg-background p-12 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-card bg-muted">
                <ActivityIcon
                  aria-hidden="true"
                  className="size-8 text-muted-foreground"
                />
              </div>
              <Text as="h3" intent="heading" weight="semi" className="mb-2">
                No exports yet
              </Text>
              <Text as="p" intent="small" color="mutedForeground">
                Start an export from the Data Sources page.
              </Text>
            </div>
          ) : (
            <div className="space-y-3">
              {finishedRuns.map(run => (
                <RunItem
                  key={run.id}
                  run={run}
                  onStop={stopExport}
                  serverPort={personalServer.port}
                  serverReady={serverReady}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
