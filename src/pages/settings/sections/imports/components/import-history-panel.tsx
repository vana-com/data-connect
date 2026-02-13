import { ActivityIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { PersonalServerCard } from "./personal-server-card"
import { RunItem } from "./run-item/run-item"
import { useImportsSection } from "../use-imports-section"

interface ImportHistoryPanelProps {
  showHeader?: boolean
}

/* Import history = scraped data import activity, not app authorization history. */
export function ImportHistoryPanel({ showHeader = true }: ImportHistoryPanelProps) {
  const {
    activeImports,
    finishedImports,
    sourceFilterOptions,
    selectedSourceFilter,
    setSourceFilter,
    stopExport,
    isAuthenticated,
    personalServer,
    serverId,
    serverReady,
  } = useImportsSection()

  return (
    <div className="space-y-6">
      {showHeader ? (
        <div className="space-y-1">
          <Text as="h1" intent="heading" weight="semi">
            Import History
          </Text>
          <Text as="p" intent="small" color="mutedForeground">
            Your data import activity
          </Text>
        </div>
      ) : null}

      <PersonalServerCard
        isAuthenticated={isAuthenticated}
        personalServer={personalServer}
        serverId={serverId}
      />

      <div className="flex flex-wrap gap-2">
        {sourceFilterOptions.map(option => (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            size="xs"
            selected={selectedSourceFilter === option.value}
            onClick={() => setSourceFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {activeImports.length > 0 ? (
        <div className="space-y-3">
          {activeImports.map(run => (
            <RunItem
              key={run.id}
              run={run}
              onStop={stopExport}
              serverPort={personalServer.port}
              serverReady={serverReady}
            />
          ))}
        </div>
      ) : null}

      {finishedImports.length === 0 && activeImports.length === 0 ? (
        <div className="rounded-card border border-border bg-background p-12 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-card bg-muted">
            <ActivityIcon aria-hidden="true" className="size-8 text-muted-foreground" />
          </div>
          <Text as="h3" intent="heading" weight="semi" className="mb-2">
            No imports yet
          </Text>
          <Text as="p" intent="small" color="mutedForeground">
            Start an import from the Data Sources page.
          </Text>
        </div>
      ) : finishedImports.length > 0 ? (
        <div className="space-y-3">
          {finishedImports.map(run => (
            <RunItem
              key={run.id}
              run={run}
              onStop={stopExport}
              serverPort={personalServer.port}
              serverReady={serverReady}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
