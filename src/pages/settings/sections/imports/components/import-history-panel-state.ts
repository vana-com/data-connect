import { DEV_FLAGS } from "@/config/dev-flags"
import type { Run } from "@/types"

export type TestImportsUiState = "empty" | "active" | "finished" | "mixed"

export const IMPORT_HISTORY_UI_STATE: "real" | TestImportsUiState =
  DEV_FLAGS.useSettingsUiMocks ? "mixed" : "real"

export const TEST_ACTIVE_IMPORTS: Run[] = [
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

export const TEST_FINISHED_IMPORTS: Run[] = [
  {
    id: "test-finished-chatgpt",
    platformId: "chatgpt",
    filename: "chatgpt-export-finished.zip",
    exportPath: "/tmp/dataconnect/chatgpt/success/export.json",
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
  {
    id: "test-finished-chatgpt-error",
    platformId: "chatgpt",
    filename: "chatgpt-export-error.zip",
    exportPath: "/tmp/dataconnect/chatgpt/error",
    isConnected: true,
    startDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    status: "error",
    url: "https://chatgpt.com",
    company: "OpenAI",
    name: "ChatGPT",
    itemsExported: 0,
    itemLabel: "conversations",
  },
  {
    id: "test-finished-chatgpt-stopped",
    platformId: "chatgpt",
    filename: "chatgpt-export-stopped.zip",
    exportPath: "/tmp/dataconnect/chatgpt/stopped/export.json",
    isConnected: true,
    startDate: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    status: "stopped",
    url: "https://chatgpt.com",
    company: "OpenAI",
    name: "ChatGPT",
    itemsExported: 12,
    itemLabel: "conversations",
  },
]

interface ResolveImportHistoryRunsArgs {
  activeImports: Run[]
  finishedImports: Run[]
  uiState?: "real" | TestImportsUiState
}

export function resolveImportHistoryRuns({
  activeImports,
  finishedImports,
  uiState = IMPORT_HISTORY_UI_STATE,
}: ResolveImportHistoryRunsArgs) {
  switch (uiState) {
    case "real":
      return {
        effectiveActiveImports: activeImports,
        effectiveFinishedImports: finishedImports,
      }
    case "empty":
      return {
        effectiveActiveImports: [],
        effectiveFinishedImports: [],
      }
    case "active":
      return {
        effectiveActiveImports: TEST_ACTIVE_IMPORTS,
        effectiveFinishedImports: [],
      }
    case "finished":
      return {
        effectiveActiveImports: [],
        effectiveFinishedImports: TEST_FINISHED_IMPORTS,
      }
    case "mixed":
      return {
        effectiveActiveImports: TEST_ACTIVE_IMPORTS,
        effectiveFinishedImports: TEST_FINISHED_IMPORTS,
      }
    default: {
      const unexpectedUiState: never = uiState
      void unexpectedUiState
      return {
        effectiveActiveImports: activeImports,
        effectiveFinishedImports: finishedImports,
      }
    }
  }
}
