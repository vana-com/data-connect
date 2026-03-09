import { useCallback, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowUpRightIcon } from "lucide-react"
import { DebugTogglePanel } from "@/components/elements/debug-toggle-panel"
import { PageContainer } from "@/components/elements/page-container"
import { LearnMoreLink } from "@/components/typography/link-learn-more"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { LINKS } from "@/config/links"
import { SettingsPersonalServer } from "@/pages/settings/components/settings-personal-server"
import { useSettingsPage } from "@/pages/settings/use-settings-page"
import {
  getPersonalServerUiDebugStateOverride,
  getPersonalServerUiDebugParamName,
  isPersonalServerUiDebugEnabled,
  isPersonalServerUiForcedAuthenticated,
  isPersonalServerUiForcedSignedOut,
  PERSONAL_SERVER_UI_DEBUG_SCENARIO_VALUES,
} from "./personal-server-ui-debug"

export function PersonalServer() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    personalServer,
    isAuthenticated,
    personalServerDataPath,
    onOpenPersonalServerFolder,
    onSignInToStart,
  } = useSettingsPage()
  const isUiDebugEnabled = useMemo(
    () => isPersonalServerUiDebugEnabled(location.search),
    [location.search]
  )
  const isForcedAuthenticatedUi = useMemo(
    () => isPersonalServerUiForcedAuthenticated(location.search),
    [location.search]
  )
  const isForcedSignedOutUi = useMemo(
    () => isPersonalServerUiForcedSignedOut(location.search),
    [location.search]
  )
  const personalServerUiOverride = useMemo(
    () => getPersonalServerUiDebugStateOverride(location.search),
    [location.search]
  )
  const effectivePersonalServer = useMemo(
    () =>
      personalServerUiOverride
        ? {
            ...personalServer,
            ...personalServerUiOverride,
          }
        : personalServer,
    [personalServer, personalServerUiOverride]
  )
  const effectiveIsAuthenticated = isForcedSignedOutUi
    ? false
    : isAuthenticated || isForcedAuthenticatedUi
  const currentScenario = useMemo(
    () =>
      new URLSearchParams(location.search).get(
        getPersonalServerUiDebugParamName()
      ),
    [location.search]
  )
  const setPersonalServerUiDebugScenario = useCallback(
    (scenario: string | null) => {
      const nextParams = new URLSearchParams(location.search)
      const paramName = getPersonalServerUiDebugParamName()
      if (scenario) nextParams.set(paramName, scenario)
      else nextParams.delete(paramName)
      navigate({ search: `?${nextParams.toString()}` }, { replace: true })
    },
    [location.search, navigate]
  )

  return (
    <PageContainer className="space-y-small pb-super">
      <header className="space-y-2">
        <Text as="h1" intent="subtitle" weight="medium">
          Personal Server
        </Text>
        <div className="space-y-1 ">
          <Text as="p" intent="small" muted>
            Your Personal Server lets connected apps request data from this
            device after you approve access.{" "}
            <LearnMoreLink
              href={LINKS.vanaDocsPersonalServers}
              withIcon
              className="gap-px!"
            >
              Learn how Personal Servers work
              <ArrowUpRightIcon aria-hidden="true" />
            </LearnMoreLink>
          </Text>
        </div>
      </header>
      <SettingsPersonalServer
        personalServer={effectivePersonalServer}
        onRestartPersonalServer={personalServer.startServer}
        onStopPersonalServer={personalServer.stopServer}
        onSignInToStart={onSignInToStart}
        isAuthenticated={effectiveIsAuthenticated}
        personalServerDataPath={personalServerDataPath}
        onOpenPersonalServerFolder={onOpenPersonalServerFolder}
      />
      {import.meta.env.DEV ? (
        <DebugTogglePanel title="Personal Server debug">
          <div className="space-y-2">
            <p className="text-xs font-medium">UI scenario</p>
            <div className="flex flex-wrap gap-2">
              {PERSONAL_SERVER_UI_DEBUG_SCENARIO_VALUES.map(scenario => (
                <Button
                  key={scenario}
                  size="xs"
                  variant={currentScenario === scenario ? "default" : "outline"}
                  onClick={() => setPersonalServerUiDebugScenario(scenario)}
                >
                  {scenario}
                </Button>
              ))}
              <Button
                size="xs"
                variant={isUiDebugEnabled ? "outline" : "default"}
                onClick={() => setPersonalServerUiDebugScenario(null)}
              >
                real
              </Button>
            </div>
          </div>
        </DebugTogglePanel>
      ) : null}
    </PageContainer>
  )
}
