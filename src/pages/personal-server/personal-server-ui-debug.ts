type PersonalServerUiDebugScenario =
  | "ui-signed-out"
  | "ui-auth-starting"
  | "ui-auth-running"
  | "ui-auth-stopped"
  | "ui-auth-error"

type PersonalServerStatus = "stopped" | "starting" | "running" | "error"
interface PersonalServerUiDebugStateOverride {
  status?: PersonalServerStatus
  port?: number | null
  tunnelUrl?: string | null
  error?: string | null
}

const PERSONAL_SERVER_UI_DEBUG_PARAM = "personalServerScenario"

const PERSONAL_SERVER_UI_DEBUG_SCENARIOS: Record<
  PersonalServerUiDebugScenario,
  {
    forceAuthenticatedUi: boolean
    forceSignedOutUi: boolean
    personalServer?: PersonalServerUiDebugStateOverride
  }
> = {
  "ui-signed-out": {
    forceAuthenticatedUi: false,
    forceSignedOutUi: true,
  },
  "ui-auth-starting": {
    forceAuthenticatedUi: true,
    forceSignedOutUi: false,
    personalServer: {
      status: "starting",
      port: null,
      tunnelUrl: null,
      error: null,
    },
  },
  "ui-auth-running": {
    forceAuthenticatedUi: true,
    forceSignedOutUi: false,
    personalServer: {
      status: "running",
      port: 4287,
      tunnelUrl: "https://abc123.server.vana.org",
      error: null,
    },
  },
  "ui-auth-stopped": {
    forceAuthenticatedUi: true,
    forceSignedOutUi: false,
    personalServer: {
      status: "stopped",
      port: null,
      tunnelUrl: null,
      error: null,
    },
  },
  "ui-auth-error": {
    forceAuthenticatedUi: true,
    forceSignedOutUi: false,
    personalServer: {
      status: "error",
      port: null,
      tunnelUrl: null,
      error: "Failed to bind server port",
    },
  },
}

export const PERSONAL_SERVER_UI_DEBUG_SCENARIO_VALUES: PersonalServerUiDebugScenario[] =
  [
    "ui-signed-out",
    "ui-auth-starting",
    "ui-auth-running",
    "ui-auth-stopped",
    "ui-auth-error",
  ]

function isPersonalServerUiDebugScenario(
  value: string | null
): value is PersonalServerUiDebugScenario {
  return value !== null && value in PERSONAL_SERVER_UI_DEBUG_SCENARIOS
}

function getPersonalServerUiDebugScenario(search: string) {
  if (!import.meta.env.DEV) return null
  const params = new URLSearchParams(search)
  const scenarioValue = params.get(PERSONAL_SERVER_UI_DEBUG_PARAM)
  return isPersonalServerUiDebugScenario(scenarioValue) ? scenarioValue : null
}

export function isPersonalServerUiDebugEnabled(search: string): boolean {
  return getPersonalServerUiDebugScenario(search) !== null
}

export function getPersonalServerUiDebugParamName(): string {
  return PERSONAL_SERVER_UI_DEBUG_PARAM
}

export function isPersonalServerUiForcedAuthenticated(search: string): boolean {
  const scenario = getPersonalServerUiDebugScenario(search)
  if (!scenario) return false
  return PERSONAL_SERVER_UI_DEBUG_SCENARIOS[scenario].forceAuthenticatedUi
}

export function isPersonalServerUiForcedSignedOut(search: string): boolean {
  const scenario = getPersonalServerUiDebugScenario(search)
  if (!scenario) return false
  return PERSONAL_SERVER_UI_DEBUG_SCENARIOS[scenario].forceSignedOutUi
}

export function getPersonalServerUiDebugStateOverride(search: string) {
  const scenario = getPersonalServerUiDebugScenario(search)
  if (!scenario) return null
  return PERSONAL_SERVER_UI_DEBUG_SCENARIOS[scenario].personalServer ?? null
}
