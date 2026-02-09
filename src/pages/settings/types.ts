export type SettingsSection = "account" | "apps" | "credentials" | "storage" | "about"

export interface BrowserSession {
  connectorId: string
  path: string
  sizeBytes: number
  lastModified: string
}

export interface NodeJsTestResult {
  nodejs: string
  platform: string
  arch: string
  hostname: string
  cpus: number
  memory: string
  uptime: string
}

export interface BrowserStatus {
  available: boolean
  browser_type: string
}

export interface PersonalServerInfo {
  status: "stopped" | "starting" | "running" | "error"
  port: number | null
  error: string | null
}
