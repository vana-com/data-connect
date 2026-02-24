import type { ConnectedApp, Platform } from "@/types"

// DEV/UI debug fixtures for Home surfaces only.
// Not production data; safe to change/remove as UI scenarios evolve.
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

// DEV/UI debug sample for Connected Apps.
export const testConnectedApps: ConnectedApp[] = [
  {
    id: "rickroll",
    name: "RickRoll",
    icon: "R",
    permissions: ["Data exports"],
    connectedAt: "2026-01-16T12:00:00.000Z",
  },
]
