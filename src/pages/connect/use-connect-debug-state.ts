import { useCallback, useMemo } from "react"
import type { NavigateFunction } from "react-router-dom"
import { getConnectCta, getConnectTitle, getDataLabel } from "./connect-copy"
import {
  buildConnectDebugSearchParams,
  getConnectDebugStateFromSearch,
  type ConnectDebugState,
} from "./connect-ui-debug"

const DEBUG_SOURCE_LABEL = "ChatGPT"
const DEBUG_SCOPES = ["chatgpt.conversations"]

interface UseConnectDebugStateArgs {
  search: string
  navigate: NavigateFunction
  dataSourceLabel: string | null
  isAlreadyConnected: boolean
  hasConnector: boolean
  isBusy: boolean
  isAutoRedirecting: boolean
  busyCta: string
  connectorErrorMessage: string | null
  showDebugBypass: boolean
}

export function useConnectDebugState({
  search,
  navigate,
  dataSourceLabel,
  isAlreadyConnected,
  hasConnector,
  isBusy,
  isAutoRedirecting,
  busyCta,
  connectorErrorMessage,
  showDebugBypass,
}: UseConnectDebugStateArgs) {
  const debugState = useMemo(
    () => getConnectDebugStateFromSearch(search),
    [search]
  )
  const isDebugging = import.meta.env.DEV && debugState !== null
  const resolvedDataSourceLabel = isDebugging
    ? (dataSourceLabel ?? DEBUG_SOURCE_LABEL)
    : dataSourceLabel
  const resolvedScopes = DEBUG_SCOPES
  const resolvedIsAlreadyConnected = isDebugging
    ? debugState === "already-connected"
    : isAlreadyConnected
  const resolvedHasConnector = isDebugging
    ? debugState !== "no-connector"
    : hasConnector
  const resolvedIsBusy = isDebugging
    ? debugState === "checking-connectors" || debugState === "collecting-data"
    : isBusy
  const resolvedIsAutoRedirecting = isDebugging
    ? debugState === "redirecting"
    : isAutoRedirecting
  const resolvedBusyCta = isDebugging
    ? debugState === "checking-connectors"
      ? "Checking connectors..."
      : debugState === "collecting-data"
        ? "Collecting data..."
        : busyCta
    : busyCta
  const resolvedConnectorErrorMessage = isDebugging
    ? debugState === "no-connector"
      ? `No connector installed for ${resolvedDataSourceLabel ?? DEBUG_SOURCE_LABEL}. Scope: ${resolvedScopes.join(", ")}.`
      : null
    : connectorErrorMessage
  const resolvedShowDebugBypass = isDebugging
    ? debugState === "no-connector"
    : showDebugBypass
  const resolvedConnectTitle = getConnectTitle(
    resolvedDataSourceLabel,
    resolvedIsAlreadyConnected
  )
  const resolvedConnectCta = getConnectCta(resolvedDataSourceLabel)
  const resolvedDataLabel = getDataLabel(resolvedDataSourceLabel)

  const setDebugState = useCallback(
    (state: ConnectDebugState) => {
      const next = buildConnectDebugSearchParams(search, {
        connectDebugState: state,
      })
      navigate({ search: next ? `?${next}` : "" }, { replace: true })
    },
    [search, navigate]
  )

  return {
    debugState,
    isDebugging,
    resolvedDataSourceLabel,
    resolvedScopes,
    resolvedIsAlreadyConnected,
    resolvedHasConnector,
    resolvedIsBusy,
    resolvedIsAutoRedirecting,
    resolvedBusyCta,
    resolvedConnectorErrorMessage,
    resolvedShowDebugBypass,
    resolvedConnectTitle,
    resolvedConnectCta,
    resolvedDataLabel,
    setDebugState,
  }
}
