/**
 * Grant page debug (development only)
 *
 * URL params (all drive the page when set):
 * - sessionId, appId, scopes  — Grant flow params (protocol)
 * - grantStatus=<status>     — Override flow step
 * - consentScopeScenario     — Override scopes on consent screen (5-linkedin, mixed)
 *
 * The debug panel provides preset buttons that set the full URL.
 */

import { buildGrantSearchParams } from "@/lib/grant-params"
import type { GrantFlowState } from "./types"
import type { GrantParams } from "@/lib/grant-params"

export type ConsentDebugScenario = "5-linkedin" | "mixed" | null

const GRANT_STATUS_PARAM = "grantStatus"
const CONSENT_SCOPE_PARAM = "consentScopeScenario"
const CONSENT_DEBUG_SCOPES: Record<
  Exclude<ConsentDebugScenario, null>,
  string[]
> = {
  "5-linkedin": [
    "linkedin.experience",
    "linkedin.education",
    "linkedin.skills",
    "linkedin.languages",
    "linkedin.profile",
  ],
  mixed: [
    "linkedin.experience",
    "spotify.history",
    "chatgpt.conversations",
    "chatgpt.memories",
  ],
}

export const GRANT_DEBUG_PARAM_PRESETS: {
  label: string
  params: GrantParams & { grantStatus: GrantFlowState["status"] }
}[] = [
  {
    label: "Debug",
    params: {
      sessionId: "grant-session-debug",
      appId: "debug",
      scopes: ["chatgpt.conversations"],
      grantStatus: "consent",
    },
  },
  {
    label: "Rickroll",
    params: {
      sessionId: "grant-session-1770358735328",
      appId: "rickroll",
      scopes: ["read:chatgpt-conversations"],
      grantStatus: "consent",
    },
  },
]

const VALID_GRANT_STATUSES: GrantFlowState["status"][] = [
  "loading",
  "claiming",
  "verifying-builder",
  "preparing-server",
  "consent",
  "approving",
  "creating-grant",
  "success",
  "error",
]

const VALID_CONSENT_SCENARIOS: Exclude<ConsentDebugScenario, null>[] = [
  "5-linkedin",
  "mixed",
]

function isGrantStatus(value: string | null): value is GrantFlowState["status"] {
  return value !== null && VALID_GRANT_STATUSES.includes(value as never)
}

function isConsentScenario(
  value: string | null
): value is Exclude<ConsentDebugScenario, null> {
  return value !== null && VALID_CONSENT_SCENARIOS.includes(value as never)
}

export function getGrantDebugStatusFromSearch(
  search: string
): GrantFlowState["status"] | null {
  if (!import.meta.env.DEV) return null

  const params = new URLSearchParams(search)
  const value = params.get(GRANT_STATUS_PARAM)
  return isGrantStatus(value) ? value : null
}

export function getConsentScopeScenarioFromSearch(
  search: string
): ConsentDebugScenario {
  if (!import.meta.env.DEV) return null

  const params = new URLSearchParams(search)
  const value = params.get(CONSENT_SCOPE_PARAM)
  return isConsentScenario(value) ? value : null
}

export function getConsentDebugScopes(
  scenario: ConsentDebugScenario
): string[] | null {
  if (scenario === null) return null

  return CONSENT_DEBUG_SCOPES[scenario]
}

/** Update URL with new grant debug state. Preserves other search params. */
export function buildGrantDebugSearchParams(
  currentSearch: string,
  updates: {
    grantStatus?: GrantFlowState["status"] | null
    consentScopeScenario?: ConsentDebugScenario
    sessionId?: string | null
    appId?: string | null
    scopes?: string[] | null
  }
): string {
  const params = new URLSearchParams(currentSearch)

  if (updates.grantStatus !== undefined) {
    if (updates.grantStatus === null) params.delete(GRANT_STATUS_PARAM)
    else params.set(GRANT_STATUS_PARAM, updates.grantStatus)
  }

  if (updates.consentScopeScenario !== undefined) {
    if (updates.consentScopeScenario === null)
      params.delete(CONSENT_SCOPE_PARAM)
    else params.set(CONSENT_SCOPE_PARAM, updates.consentScopeScenario)
  }

  if (updates.sessionId !== undefined) {
    if (updates.sessionId) params.set("sessionId", updates.sessionId)
    else params.delete("sessionId")
  }
  if (updates.appId !== undefined) {
    if (updates.appId) params.set("appId", updates.appId)
    else params.delete("appId")
  }
  if (updates.scopes !== undefined) {
    if (updates.scopes?.length)
      params.set("scopes", JSON.stringify(updates.scopes))
    else params.delete("scopes")
  }

  return params.toString()
}

/** Build full grant search string from a preset. */
export function buildGrantDebugPresetSearch(
  preset: (typeof GRANT_DEBUG_PARAM_PRESETS)[number]
): string {
  const { grantStatus, ...grantParams } = preset.params
  const searchParams = buildGrantSearchParams(grantParams)
  searchParams.set(GRANT_STATUS_PARAM, grantStatus)
  return searchParams.toString()
}
