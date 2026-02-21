export function getConnectTitle(
  dataSourceLabel: string | null,
  isAlreadyConnected: boolean
): string {
  if (!dataSourceLabel) return "Connect your data"
  return `Connect your ${dataSourceLabel}${isAlreadyConnected ? " (again)" : ""}`
}

export function getConnectCta(dataSourceLabel: string | null): string {
  return dataSourceLabel ? `Connect ${dataSourceLabel}` : "Connect data"
}

export function getDataLabel(dataSourceLabel: string | null): string {
  return dataSourceLabel ? `${dataSourceLabel} data` : "data"
}
