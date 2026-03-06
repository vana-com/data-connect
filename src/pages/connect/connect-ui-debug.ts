import { buildGrantSearchParams, type GrantParams } from "@/lib/grant-params"

export type ConnectDebugState =
  | "idle"
  | "checking-connectors"
  | "collecting-data"
  | "no-connector"
  | "already-connected"
  | "redirecting"
  | null

const CONNECT_DEBUG_STATE_PARAM = "connectDebugState"

const VALID_CONNECT_DEBUG_STATES: Exclude<ConnectDebugState, null>[] = [
  "idle",
  "checking-connectors",
  "collecting-data",
  "no-connector",
  "already-connected",
  "redirecting",
]

export const CONNECT_DEBUG_PARAM_PRESETS: {
  label: string
  params: GrantParams
}[] = [
  {
    label: "ChatGPT",
    params: {
      appId: "chatgpt",
      scopes: ["chatgpt.conversations"],
    },
  },
]

function isConnectDebugState(
  value: string | null
): value is Exclude<ConnectDebugState, null> {
  return value !== null && VALID_CONNECT_DEBUG_STATES.includes(value as never)
}

export function getConnectDebugStateFromSearch(
  search: string
): ConnectDebugState {
  if (!import.meta.env.DEV) return null

  const params = new URLSearchParams(search)
  const value = params.get(CONNECT_DEBUG_STATE_PARAM)
  return isConnectDebugState(value) ? value : null
}

export function buildConnectDebugSearchParams(
  currentSearch: string,
  updates: {
    connectDebugState?: ConnectDebugState
    sessionId?: string | null
    secret?: string | null
    appId?: string | null
    scopes?: string[] | null
  }
): string {
  const params = new URLSearchParams(currentSearch)

  if (updates.connectDebugState !== undefined) {
    if (updates.connectDebugState === null) {
      params.delete(CONNECT_DEBUG_STATE_PARAM)
    } else {
      params.set(CONNECT_DEBUG_STATE_PARAM, updates.connectDebugState)
    }
  }

  if (updates.sessionId !== undefined) {
    if (updates.sessionId) params.set("sessionId", updates.sessionId)
    else params.delete("sessionId")
  }

  if (updates.secret !== undefined) {
    if (updates.secret) params.set("secret", updates.secret)
    else params.delete("secret")
  }

  if (updates.appId !== undefined) {
    if (updates.appId) params.set("appId", updates.appId)
    else params.delete("appId")
  }

  if (updates.scopes !== undefined) {
    if (updates.scopes?.length) {
      params.set("scopes", JSON.stringify(updates.scopes))
    } else {
      params.delete("scopes")
    }
  }

  return params.toString()
}

export function buildConnectDebugPresetSearch(
  preset: (typeof CONNECT_DEBUG_PARAM_PRESETS)[number]
): string {
  return buildGrantSearchParams(preset.params).toString()
}
