import { Link } from "react-router-dom"
import { ActivityIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/config/routes"
import {
  SettingsCard,
  SettingsCardStack,
  SettingsRow,
} from "@/pages/settings/components/settings-shared"
import type { Run } from "@/types"
import { RunItem } from "./run-item/run-item"
import { useImportsSection } from "../use-imports-section"

interface ImportHistoryPanelProps {
  showHeader?: boolean
}

type TestImportsUiState = "empty" | "active" | "finished" | "mixed"

// Local UI test toggle for designing Import History states.
// - null: use real app state (no UI override)
// - empty: show placeholder only
// - active: show active imports only
// - finished: show finished imports only
// - mixed: show both active and finished imports
const TEST_IMPORTS_UI_STATE: TestImportsUiState | null = null

const TEST_ACTIVE_IMPORTS: Run[] = [
  {
    id: "test-active-chatgpt",
    platformId: "chatgpt",
    filename: "chatgpt-export-active.zip",
    isConnected: true,
    startDate: new Date().toISOString(),
    status: "running",
    url: "https://chatgpt.com",
    company: "OpenAI",
    name: "ChatGPT",
    phase: { step: 2, total: 4, label: "Collecting conversations" },
    statusMessage: "Fetching latest messages...",
  },
]

const TEST_FINISHED_IMPORTS: Run[] = [
  {
    id: "test-finished-chatgpt",
    platformId: "chatgpt",
    filename: "chatgpt-export-finished.zip",
    isConnected: true,
    startDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    status: "success",
    url: "https://chatgpt.com",
    company: "OpenAI",
    name: "ChatGPT",
    itemsExported: 48,
    itemLabel: "conversations",
  },
]

/* Import history = scraped data import activity, not app authorization history. */
export function ImportHistoryPanel({
  showHeader = true,
}: ImportHistoryPanelProps) {
  const {
    activeImports,
    finishedImports,
    sourceFilterOptions,
    selectedSourceFilter,
    setSourceFilter,
    stopExport,
    personalServer,
    serverReady,
  } = useImportsSection()

  const { effectiveActiveImports, effectiveFinishedImports } =
    TEST_IMPORTS_UI_STATE === null
      ? {
          effectiveActiveImports: activeImports,
          effectiveFinishedImports: finishedImports,
        }
      : TEST_IMPORTS_UI_STATE === "empty"
        ? {
            effectiveActiveImports: [],
            effectiveFinishedImports: [],
          }
        : TEST_IMPORTS_UI_STATE === "active"
          ? {
              effectiveActiveImports: TEST_ACTIVE_IMPORTS,
              effectiveFinishedImports: [],
            }
          : TEST_IMPORTS_UI_STATE === "finished"
            ? {
                effectiveActiveImports: [],
                effectiveFinishedImports: TEST_FINISHED_IMPORTS,
              }
            : {
                effectiveActiveImports: TEST_ACTIVE_IMPORTS,
                effectiveFinishedImports: TEST_FINISHED_IMPORTS,
              }

  const hasNoImports =
    effectiveActiveImports.length === 0 && effectiveFinishedImports.length === 0

  return (
    // varied spacer here so that the filters + list is handled from root
    <div className="space-y-4">
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

      {hasNoImports ? (
        <>
          <SettingsCardStack>
            <SettingsCard>
              <SettingsRow
                icon={<ActivityIcon aria-hidden="true" />}
                title={
                  <Text as="div" intent="body" weight="semi">
                    No imports yet
                  </Text>
                }
              />
            </SettingsCard>
          </SettingsCardStack>
          <Text as="p" intent="small" muted className="pt-4">
            Start an import from{" "}
            <Text
              as={Link}
              to={ROUTES.home}
              intent="inherit"
              color="inherit"
              link="default"
              className="text-current hover:text-foreground"
            >
              Connect Data on Home
            </Text>
            .
          </Text>
        </>
      ) : null}

      {!hasNoImports ? (
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
      ) : null}

      {effectiveActiveImports.length > 0 ? (
        <div className="space-y-3">
          {effectiveActiveImports.map(run => (
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

      {effectiveFinishedImports.length > 0 ? (
        <div className="space-y-3">
          {effectiveFinishedImports.map(run => (
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
