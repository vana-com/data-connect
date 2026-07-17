import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { LINKS } from "@/config/links"
import {
  ActionLink,
  OpenExternalLink,
} from "@/components/typography/link-open-external"
import { LoadingButton } from "@/components/elements/button-loading"
import { Button } from "@/components/ui/button"
import { SettingsConfirmAction } from "@/pages/settings/components/settings-confirm-action"
import { setAppConfig, type RootState } from "@/state/store"
import { SettingsBadgeActive } from "./settings-status-badge"
import {
  SettingsCard,
  SettingsCardStack,
  SettingsRowAction,
  SettingsSingleSelectRowGroup,
} from "@/pages/settings/components/public"
import { SettingsServerSection } from "./settings-server-section"
import { SettingsMetaRow } from "./settings-meta-row"

export interface SettingsStorageProps {
  dataPath: string
  onOpenDataFolder: () => void
  isAuthenticated: boolean
  accountEmail?: string | null
  walletAddress?: string | null
  onSignIn: () => void
  personalServer: ReturnType<typeof usePersonalServer>
}

const storageOptions = [
  {
    id: "local-only",
    label: "Local Only",
    description:
      "Keep exports on this device only. No sign-in required. This is the default.",
    available: true,
  },
  {
    id: "vana-storage",
    label: "Vana Storage",
    description: (
      <>
        Optional. Sync exports to a Personal Server via{" "}
        <OpenExternalLink href={LINKS.vana}>Vana</OpenExternalLink>.
      </>
    ),
    available: true,
  },
  {
    id: "google-drive",
    label: "Google Drive",
    description: "Coming soon",
    available: false,
  },
  {
    id: "dropbox",
    label: "Dropbox",
    description: "Coming soon",
    available: false,
  },
] as const

type StorageOptionId = (typeof storageOptions)[number]["id"]

/** Map a selectable storage option to the underlying appConfig.serverMode. */
function storageOptionToServerMode(
  option: StorageOptionId
): "local-only" | "local" {
  return option === "vana-storage" ? "local" : "local-only"
}

function serverModeToStorageOption(
  serverMode: "local-only" | "local" | "remote"
): StorageOptionId | null {
  if (serverMode === "local-only") return "local-only"
  if (serverMode === "local" || serverMode === "remote") return "vana-storage"
  return null
}

export function SettingsStorage({
  dataPath,
  onOpenDataFolder,
  isAuthenticated,
  accountEmail,
  walletAddress,
  onSignIn,
  personalServer,
}: SettingsStorageProps) {
  const dispatch = useDispatch()
  const serverMode = useSelector(
    (state: RootState) => state.app.appConfig.serverMode
  )
  const [draftStorageOption, setDraftStorageOption] =
    useState<StorageOptionId | null>(null)
  const [isSavingStorage, setIsSavingStorage] = useState(false)
  const activeStorageOption = serverModeToStorageOption(serverMode)
  const selectedStorageOption = draftStorageOption ?? activeStorageOption
  const showSaveStorage =
    !!draftStorageOption && draftStorageOption !== activeStorageOption

  const handleSaveStorage = async () => {
    if (!draftStorageOption || isSavingStorage) return
    setIsSavingStorage(true)
    try {
      dispatch(
        setAppConfig({
          serverMode: storageOptionToServerMode(draftStorageOption),
        })
      )
      setDraftStorageOption(null)
    } finally {
      setIsSavingStorage(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* LOCAL */}
      <SettingsCardStack>
        <SettingsCard>
          <SettingsMetaRow
            title="Local Data"
            description={
              <>
                Required.&nbsp;
                <ActionLink onPress={onOpenDataFolder}>
                  Open location.
                  <span className="sr-only"> at {dataPath}</span>
                </ActionLink>
              </>
            }
            badge={<SettingsBadgeActive />}
          />
        </SettingsCard>
      </SettingsCardStack>

      {/* STORAGE */}
      <SettingsCardStack>
        <SettingsCard>
          <SettingsMetaRow
            title="Storage"
            description="Local Only requires no sign-in. Vana Storage is an optional add-on for always-on access."
            badge={<SettingsBadgeActive />}
          />
          <SettingsSingleSelectRowGroup
            ariaLabel="Storage"
            options={storageOptions}
            value={selectedStorageOption}
            onChange={nextValue => {
              if (!nextValue || nextValue === activeStorageOption) return
              setDraftStorageOption(nextValue)
            }}
            renderRight={(item, selected) =>
              activeStorageOption === item.id &&
              selected &&
              item.id !== "local-only" ? (
                <SettingsConfirmAction
                  trigger={<SettingsRowAction>Remove</SettingsRowAction>}
                  title="Switch back to Local Only?"
                  description="This will stop syncing exports to Vana Storage. Your local exports are unaffected. You can reconnect later."
                  actionLabel="Remove"
                  onAction={() => {
                    dispatch(setAppConfig({ serverMode: "local-only" }))
                    setDraftStorageOption(null)
                  }}
                />
              ) : null
            }
          />
        </SettingsCard>
        {showSaveStorage ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="px-w6 font-normal border border-transparent hover:border-ring/20 hover:bg-background"
              disabled={isSavingStorage}
              onClick={() => setDraftStorageOption(null)}
            >
              Cancel
            </Button>
            <LoadingButton
              variant="iris"
              size="sm"
              isLoading={isSavingStorage}
              loadingLabel="Saving…"
              onClick={() => void handleSaveStorage()}
            >
              Save & create
            </LoadingButton>
          </div>
        ) : null}
      </SettingsCardStack>

      {/* SERVER */}
      <SettingsServerSection
        isAuthenticated={isAuthenticated}
        accountEmail={accountEmail}
        walletAddress={walletAddress}
        onSignIn={onSignIn}
        personalServer={personalServer}
      />
    </div>
  )
}
