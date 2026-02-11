import type { SettingsSection } from "./types"

export const SETTINGS_SECTION_ORDER: SettingsSection[] = [
  "account",
  "apps",
  "storage",
  "runs",
  "credentials",
  "about",
]

export const SETTINGS_SECTION_META: Record<
  SettingsSection,
  {
    navLabel: string
    title: string
    description?: string
  }
> = {
  account: {
    navLabel: "Account",
    title: "Account",
  },
  apps: {
    navLabel: "Authorised Apps",
    title: "Authorised Apps",
    description: "Review and manage applications with access to your data.",
  },
  credentials: {
    navLabel: "Credentials",
    title: "Credentials",
    description: "Manage stored browser sessions used by connectors.",
  },
  storage: {
    navLabel: "Storage & Server",
    title: "Storage & Server",
    description:
      "Data is always stored on this device. Storage keeps data available. Server decides where requests are served.",
  },
  about: {
    navLabel: "About & Diagnostics",
    title: "About & Diagnostics",
    description: "Check runtime status, diagnostics, and debug resources.",
  },
  runs: {
    navLabel: "Runs",
    title: "Runs",
    description: "View and manage export history in one place.",
  },
}
