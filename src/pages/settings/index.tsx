import {
  DatabaseIcon,
  InfoIcon,
  KeyIcon,
  MonitorIcon,
  ShieldIcon,
  TerminalIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { SettingsAbout } from "./components/settings-about"
import { SettingsAccount } from "./components/settings-account"
import { SettingsApps } from "./components/settings-apps"
import { SettingsCredentials } from "./components/settings-credentials"
import { SettingsStorage } from "./components/settings-storage"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import { ROUTES } from "@/config/routes"
import type { SettingsSection } from "./types"
import { useSettingsPage } from "./use-settings-page"

const settingsSections: Array<{
  key: SettingsSection
  label: string
  icon: ReactNode
}> = [
  {
    key: "account",
    label: "Account",
    icon: <MonitorIcon aria-hidden="true" className="size-4" />,
  },
  {
    key: "apps",
    label: "Authorised Apps",
    icon: <ShieldIcon aria-hidden="true" className="size-4" />,
  },
  {
    key: "credentials",
    label: "Credentials",
    icon: <KeyIcon aria-hidden="true" className="size-4" />,
  },
  {
    key: "storage",
    label: "Storage & Server",
    icon: <DatabaseIcon aria-hidden="true" className="size-4" />,
  },
  {
    key: "about",
    label: "About & Diagnostics",
    icon: <InfoIcon aria-hidden="true" className="size-4" />,
  },
]

export function Settings() {
  const {
    activeSection,
    setActiveSection,
    dataPath,
    appVersion,
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
    onTestNodeJs,
    onDebugPaths,
    onCheckBrowserStatus,
    onSimulateNoChromeChange,
    onClearBrowserSession,
    onRevokeApp,
    onLogout,
    onSignIn,
  } = useSettingsPage()

  return (
    <div className="container py-w16">
      <div className="space-y-8">
        <div className="space-y-1">
          <Text as="h1" intent="heading" weight="semi">
            Settings
          </Text>
          <Text as="p" intent="small" color="mutedForeground">
            Manage your preferences
          </Text>
        </div>

        <div className="flex gap-6">
          <aside className="w-56 shrink-0">
            <nav className="sticky top-6 space-y-1">
              {settingsSections.map(section => (
                <Button
                  key={section.key}
                  type="button"
                  variant={
                    activeSection === section.key ? "secondary" : "ghost"
                  }
                  onClick={() => setActiveSection(section.key)}
                  className={cn(
                    "w-full justify-start gap-3",
                    activeSection === section.key && "text-foreground"
                  )}
                >
                  {section.icon}
                  {section.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                asChild
              >
                <Link to={ROUTES.runs}>
                  <TerminalIcon aria-hidden="true" className="size-4" />
                  Runs
                </Link>
              </Button>
            </nav>
          </aside>

          <div className="flex-1">
            {activeSection === "account" && (
              <SettingsAccount
                user={user}
                isAuthenticated={isAuthenticated}
                onLogout={onLogout}
                onSignIn={onSignIn}
              />
            )}

            {activeSection === "apps" && (
              <SettingsApps
                connectedApps={connectedApps}
                onRevokeApp={onRevokeApp}
              />
            )}

            {activeSection === "credentials" && (
              <SettingsCredentials
                sessions={browserSessions}
                onClearSession={onClearBrowserSession}
              />
            )}

            {activeSection === "storage" && (
              <SettingsStorage
                dataPath={dataPath}
                onOpenDataFolder={onOpenDataFolder}
                personalServerPort={personalServer.port}
                personalServerStatus={personalServer.status}
                walletAddress={walletAddress ?? null}
              />
            )}

            {activeSection === "about" && (
              <SettingsAbout
                appVersion={appVersion}
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
                onRestartPersonalServer={personalServer.startServer}
                onStopPersonalServer={personalServer.stopServer}
                onSimulateNoChromeChange={onSimulateNoChromeChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
