import type { ConnectedApp, Platform } from "@/types"

// Used when DEV_FLAGS.useHomeTestFixtures is true (see dev-flags.ts).
export const testPlatforms: Platform[] = [
  {
    id: "instagram",
    company: "Meta",
    name: "Instagram",
    filename: "instagram",
    description: "Instagram data export",
    isUpdated: false,
    logoURL: "",
    needsConnection: true,
    connectURL: null,
    connectSelector: null,
    exportFrequency: null,
    vectorize_config: null,
    runtime: null,
  },
  {
    id: "linkedin",
    company: "LinkedIn",
    name: "LinkedIn",
    filename: "linkedin",
    description: "LinkedIn data export",
    isUpdated: false,
    logoURL: "",
    needsConnection: false,
    connectURL: null,
    connectSelector: null,
    exportFrequency: null,
    vectorize_config: null,
    runtime: null,
  },
  {
    id: "spotify",
    company: "Spotify",
    name: "Spotify",
    filename: "spotify",
    description: "Spotify data export",
    isUpdated: false,
    logoURL: "",
    needsConnection: false,
    connectURL: null,
    connectSelector: null,
    exportFrequency: null,
    vectorize_config: null,
    runtime: null,
  },
  {
    id: "chatgpt-playwright",
    company: "OpenAI",
    name: "ChatGPT",
    filename: "chatgpt",
    description: "ChatGPT data export",
    isUpdated: false,
    logoURL: "",
    needsConnection: false,
    connectURL: "https://chatgpt.com/",
    connectSelector: "nav a[href^='/c/']",
    exportFrequency: "daily",
    vectorize_config: { documents: "content" },
    runtime: "playwright",
  },
]

export const testConnectedPlatforms: Platform[] = [
  {
    id: "chatgpt-playwright",
    company: "OpenAI",
    name: "ChatGPT",
    filename: "chatgpt",
    description: "ChatGPT data export",
    isUpdated: false,
    logoURL: "",
    needsConnection: true,
    connectURL: "https://chatgpt.com/",
    connectSelector: "nav a[href^='/c/']",
    exportFrequency: "daily",
    vectorize_config: { documents: "content" },
    runtime: "playwright",
  },
]

// When useHomeTestFixtures: Connected Apps list uses testConnectedApps
export const testConnectedApps: ConnectedApp[] = [
  {
    id: "rickroll",
    name: "RickRoll",
    icon: "R",
    permissions: ["Data exports"],
    connectedAt: "2026-01-16T12:00:00.000Z",
  },
]
