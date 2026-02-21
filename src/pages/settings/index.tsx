import {
  ActivityIcon,
  BoxIcon,
  HousePlusIcon,
  InfoIcon,
  KeyRoundIcon,
  ServerIcon,
  UserIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { SettingsAbout } from "./components/settings-about"
import { SettingsAccount } from "./components/settings-account"
import { SettingsApps } from "./components/settings-apps"
import { SettingsContent } from "./components/settings-content"
import { SettingsCredentials } from "./components/settings-credentials"
import { SettingsOverviewLayout } from "./components/settings-overview-layout"
import { SettingsSidebar } from "./components/settings-sidebar"
import { SettingsImportsSection } from "./sections/imports/index"
import { SettingsPersonalServer } from "./components/settings-personal-server"
import { SettingsStorageSection } from "./sections/storage/index"
import { SETTINGS_SECTION_META, SETTINGS_SECTION_ORDER } from "./sections"
import type { SettingsSection } from "./types"
import { useSettingsPage } from "./use-settings-page"

const sectionIcons: Record<SettingsSection, ReactNode> = {
  account: <UserIcon aria-hidden="true" />,
  personalServer: <ServerIcon aria-hidden="true" />,
  apps: <BoxIcon aria-hidden="true" />,
  storage: <HousePlusIcon aria-hidden="true" />,
  imports: <ActivityIcon aria-hidden="true" />,
  credentials: <KeyRoundIcon aria-hidden="true" />,
  about: <InfoIcon aria-hidden="true" />,
}

const settingsSections: Array<{
  key: SettingsSection
  label: string
  icon: ReactNode
}> = SETTINGS_SECTION_ORDER
  // Temporarily hide Account and Storage in nav; keep section implementations intact.
  .filter(section => section !== "account" && section !== "storage")
  .map(section => ({
    key: section,
    label: SETTINGS_SECTION_META[section].navLabel,
    icon: sectionIcons[section],
  }))

export function Settings() {
  const {
    activeSection,
    setActiveSection,
    dataPath,
    appVersion,
    logPath,
    nodeTestStatus,
    nodeTestResult,
    nodeTestError,
    pathsDebug,
    browserStatus,
    simulateNoChrome,
    browserSessions,
    connectedApps,
    personalServer,
    user,
    isAuthenticated,
    walletAddress,
    onOpenDataFolder,
    onOpenLogFolder,
    onTestNodeJs,
    onDebugPaths,
    onClearDebugPaths,
    onCheckBrowserStatus,
    onSimulateNoChromeChange,
    onClearBrowserSession,
    onRevokeApp,
    onLogout,
    onSignIn,
  } = useSettingsPage()

  const sectionMeta = SETTINGS_SECTION_META[activeSection]

  let content: ReactNode = null
  if (activeSection === "account") {
    content = (
      <SettingsAccount
        user={user}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        onSignIn={onSignIn}
      />
    )
  } else if (activeSection === "apps") {
    content = (
      <SettingsApps connectedApps={connectedApps} onRevokeApp={onRevokeApp} />
    )
  } else if (activeSection === "credentials") {
    content = (
      <SettingsCredentials
        sessions={browserSessions}
        onClearSession={onClearBrowserSession}
      />
    )
  } else if (activeSection === "personalServer") {
    content = <SettingsPersonalServer personalServer={personalServer} />
  } else if (activeSection === "storage") {
    content = (
      <SettingsStorageSection
        dataPath={dataPath}
        onOpenDataFolder={onOpenDataFolder}
        isAuthenticated={isAuthenticated}
        accountEmail={user?.email ?? null}
        walletAddress={walletAddress ?? null}
        onSignIn={onSignIn}
        personalServer={personalServer}
      />
    )
  } else if (activeSection === "about") {
    content = (
      <SettingsAbout
        appVersion={appVersion}
        logPath={logPath}
        nodeTestStatus={nodeTestStatus}
        nodeTestResult={nodeTestResult}
        nodeTestError={nodeTestError}
        browserStatus={browserStatus}
        pathsDebug={pathsDebug}
        personalServer={{
          status: personalServer.status,
          port: personalServer.port,
          error: personalServer.error,
        }}
        simulateNoChrome={simulateNoChrome}
        onTestNodeJs={onTestNodeJs}
        onCheckBrowserStatus={onCheckBrowserStatus}
        onDebugPaths={onDebugPaths}
        onClearDebugPaths={onClearDebugPaths}
        onRestartPersonalServer={personalServer.startServer}
        onStopPersonalServer={personalServer.stopServer}
        onSimulateNoChromeChange={onSimulateNoChromeChange}
        onOpenLogFolder={onOpenLogFolder}
      />
    )
  } else if (activeSection === "imports") {
    content = <SettingsImportsSection />
  }

  return (
    <SettingsOverviewLayout
      sidebar={
        <SettingsSidebar
          items={settingsSections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      }
      content={
        <SettingsContent
          title={sectionMeta.title}
          description={sectionMeta.description}
        >
          {content}
        </SettingsContent>
      }
    />
  )
}
