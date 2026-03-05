type PersonalServerUiDebugScenario = "force-authenticated"

const PERSONAL_SERVER_UI_DEBUG_PARAM = "personalServerScenario"

const PERSONAL_SERVER_UI_DEBUG_SCENARIOS: Record<
  PersonalServerUiDebugScenario,
  { forceAuthenticatedUi: boolean }
> = {
  "force-authenticated": { forceAuthenticatedUi: true },
}

export const PERSONAL_SERVER_UI_DEBUG_SCENARIO_VALUES: PersonalServerUiDebugScenario[] =
  ["force-authenticated"]

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
