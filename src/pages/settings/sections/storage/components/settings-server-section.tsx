import { useState } from "react"
import { ChevronDownIcon, RefreshCwIcon } from "lucide-react"
import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { DEV_FLAGS } from "@/config/dev-flags"
import { LINKS } from "@/config/links"
import { ButtonSignInVana } from "@/components/elements/button-sign-in-vana"
import { LoadingButton } from "@/components/elements/button-loading"
import { OpenExternalLink } from "@/components/typography/link-open-external"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { copyTextToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/classes"
import {
  SettingsCard,
  SettingsCardStack,
  SettingsRowAction,
  SettingsSingleSelectRowGroup,
} from "@/pages/settings/components/public"
import {
  SettingsBadgeActive,
  SettingsBadgeNone,
} from "./settings-status-badge"
import { SettingsConfirmAction } from "@/pages/settings/components/settings-confirm-action"
import { AuthRow } from "./auth-row"
import { PublicEndpointRow } from "./public-endpoint-row"
import { SettingsMetaRow } from "./settings-meta-row"
import { StatusRow } from "./status-row"

const serverOptions = [
  {
    id: "opendatalabs-cloud",
    label: "OpenDataLabs Cloud",
    description: (
      <>
        Free remote compute by{" "}
        <OpenExternalLink href={LINKS.openDataLabs}>
          OpenDataLabs
        </OpenExternalLink>
        .
      </>
    ),
    available: true,
  },
  {
    id: "personal-server",
    label: "Personal Server (advanced)",
    description: "Run your own server. Control it the way you want it.",
    available: true,
  },
] as const

type ServerOptionId = (typeof serverOptions)[number]["id"]
type ServerRuntimeStatus = ReturnType<typeof usePersonalServer>["status"]
const ACTIVE_SERVER_OPTION_KEY = "settings.active-server-option"

/*
  ============================================
  UI PREVIEW TEST CONTROLS (MANUAL)
  ============================================
  Edit these while designing this panel.

  TEST_AUTHENTICATED:
  - true  => always show authenticated server rows
  - false => show sign-in gate

  TEST_SERVER_STATUS_OVERRIDE:
  - "error"   => shows restart button
  - "stopped" => shows restart button
  - "running" => hides restart button
  - "starting" => hides restart button
  - null      => use real runtime status from usePersonalServer
*/
const TEST_AUTHENTICATED = false
const TEST_SERVER_STATUS_OVERRIDE: ServerRuntimeStatus | null = null

interface SettingsServerSectionProps {
  isAuthenticated: boolean
  accountEmail?: string | null
  walletAddress?: string | null
  onSignIn: () => void
  personalServer: ReturnType<typeof usePersonalServer>
}

export function SettingsServerSection({
  isAuthenticated,
  accountEmail,
  walletAddress,
  onSignIn,
  personalServer,
}: SettingsServerSectionProps) {
  const isAuthenticatedForUi =
    (DEV_FLAGS.useSettingsUiMocks && TEST_AUTHENTICATED) || isAuthenticated
  const [draftServerOption, setDraftServerOption] =
    useState<ServerOptionId | null>(null)
  const [activeServerOption, setActiveServerOption] =
    useState<ServerOptionId | null>(() => getStoredServerOption())
  const [copied, setCopied] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isSavingServer, setIsSavingServer] = useState(false)

  const selectedServerOption = activeServerOption ?? draftServerOption
  const showSaveServer = !activeServerOption && !!draftServerOption
  const canShowSaveServer =
    showSaveServer &&
    (draftServerOption !== "personal-server" || isAuthenticatedForUi)
  const isExpanded = selectedServerOption === "personal-server"
  const previewServerStatus =
    DEV_FLAGS.useSettingsUiMocks && TEST_SERVER_STATUS_OVERRIDE
      ? TEST_SERVER_STATUS_OVERRIDE
      : personalServer.status
  const shouldShowRestartControl =
    previewServerStatus === "error" || previewServerStatus === "stopped"

  const copyManagedUrl = async (url: string) => {
    const success = await copyTextToClipboard(url)
    if (!success) return false
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
    return true
  }

  const handleRestart = async () => {
    setIsRestarting(true)
    try {
      await personalServer.restartServer(walletAddress ?? null)
    } finally {
      setIsRestarting(false)
    }
  }

  const handleSaveServer = async () => {
    if (!draftServerOption || isSavingServer) return
    setIsSavingServer(true)
    try {
      setActiveServerOptionWithPersistence(draftServerOption)
    } finally {
      setIsSavingServer(false)
    }
  }

  const setActiveServerOptionWithPersistence = (
    value: ServerOptionId | null
  ) => {
    setActiveServerOption(value)
    if (typeof window === "undefined") return
    if (value) {
      window.localStorage.setItem(ACTIVE_SERVER_OPTION_KEY, value)
      return
    }
    window.localStorage.removeItem(ACTIVE_SERVER_OPTION_KEY)
  }

  return (
    <SettingsCardStack>
      <SettingsCard>
        <SettingsMetaRow
          title="Server"
          description="Where requests are served from."
          badge={
            activeServerOption ? <SettingsBadgeActive /> : <SettingsBadgeNone />
          }
        />
        <SettingsSingleSelectRowGroup
          ariaLabel="Server"
          options={serverOptions}
          value={selectedServerOption}
          onChange={nextValue => {
            if (activeServerOption) return
            setDraftServerOption(nextValue)
          }}
          renderRight={(item, selected) => {
            const canRemove = activeServerOption === item.id && selected

            if (canRemove) {
              return (
                <SettingsConfirmAction
                  trigger={<SettingsRowAction>Remove</SettingsRowAction>}
                  title="Remove server provider?"
                  description="This will clear the active server selection. You can set it again later."
                  actionLabel="Remove"
                  onAction={() => {
                    setActiveServerOptionWithPersistence(null)
                    setDraftServerOption(null)
                  }}
                />
              )
            }

            if (item.id === "personal-server") {
              return (
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn(
                    "size-6 text-foreground transition-transform duration-200 ease-out motion-reduce:transition-none",
                    isExpanded && "rotate-180"
                  )}
                />
              )
            }
            return null
          }}
        />

        {/* EXPANDED */}
        {isExpanded ? (
          <div className="px-4 pb-4">
            <div
              className={cn(
                "ml-[50px] space-y-4",
                // "-mt-3",
                "border-t pt-3"
              )}
            >
              {/* <Text as="p" intent="small" dim>
                Runs on your machine. Public endpoint and registration are
                configured automatically after sign-in.
              </Text> */}

              {/* 1. Must be authenticated first */}
              {!isAuthenticatedForUi ? (
                <div className="space-y-4 pb-1">
                  <Text as="p" intent="small" dim>
                    To use a Personal Server, sign in with Vana Passport.
                  </Text>
                  <ButtonSignInVana fullWidth showArrow onClick={onSignIn} />
                </div>
              ) : (
                /* 2. If authenticated, show server status */
                <div className="grid gap-0">
                  <StatusRow
                    status={previewServerStatus}
                    port={personalServer.port}
                    error={personalServer.error}
                  />
                  <PublicEndpointRow
                    tunnelUrl={personalServer.tunnelUrl}
                    copied={copied}
                    onCopy={copyManagedUrl}
                  />
                  <AuthRow
                    accountEmail={accountEmail}
                    walletAddress={walletAddress}
                    isLast={
                      previewServerStatus === "running" ||
                      previewServerStatus === "starting"
                        ? true
                        : !shouldShowRestartControl
                    }
                  />
                  {/* Registration row intentionally hidden for now.
                      Keep this feature dormant; it may return once semantics are final. */}
                  {/*
                    <RegistrationRow
                      status={personalServer.status}
                      tunnelUrl={personalServer.tunnelUrl}
                      isLast
                    />
                  */}

                  {shouldShowRestartControl ? (
                    <div className="flex flex-wrap gap-2 pt-gap">
                      <Button
                        type="button"
                        size="sm"
                        variant="accent"
                        fullWidth
                        disabled={isRestarting}
                        onClick={() => void handleRestart()}
                      >
                        <RefreshCwIcon
                          aria-hidden="true"
                          className={cn(isRestarting && "animate-spin")}
                        />
                        Restart Server
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </SettingsCard>

      {/* SAVE */}
      {canShowSaveServer ? (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-w6 font-normal border border-transparent hover:border-ring/20 hover:bg-background"
            disabled={isSavingServer}
            onClick={() => setDraftServerOption(null)}
          >
            Cancel
          </Button>
          <LoadingButton
            variant="iris"
            size="sm"
            isLoading={isSavingServer}
            loadingLabel="Saving…"
            onClick={() => void handleSaveServer()}
          >
            Save & create
          </LoadingButton>
        </div>
      ) : null}
    </SettingsCardStack>
  )
}

function getStoredServerOption(): ServerOptionId | null {
  if (typeof window === "undefined") return null
  const stored = window.localStorage.getItem(ACTIVE_SERVER_OPTION_KEY)
  if (stored === "opendatalabs-cloud" || stored === "personal-server") {
    return stored
  }
  return null
}
