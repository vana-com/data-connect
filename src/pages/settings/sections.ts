import type { SettingsSection } from "./types"

export const SETTINGS_SECTION_ORDER: SettingsSection[] = [
  "account",
  "apps",
  "storage",
  "imports",
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
    // description: "Review and manage applications with access to your data.",
    description: "OAuth apps that you have approved to use your data.",
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
  imports: {
    navLabel: "Import History",
    title: "Import History",
    description: "View and manage import history in one place.",
  },
}
