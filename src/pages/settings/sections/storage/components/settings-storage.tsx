import { useState } from "react"
import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { LINKS } from "@/config/links"
import {
  ActionLink,
  OpenExternalLink,
} from "@/components/typography/link-open-external"
import { LoadingButton } from "@/components/typography/button-loading"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  SettingsBadgeActive,
  SettingsBadgeNone,
  SettingsCard,
  SettingsCardStack,
  SettingsMetaRow,
  SettingsRowAction,
  SettingsSingleSelectRowGroup,
} from "@/pages/settings/components/public"
import { SettingsServerSection } from "./settings-server-section"

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
    id: "vana-storage",
    label: "Vana Storage",
    description: (
      <>
        The free storage solution by{" "}
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

export function SettingsStorage({
  dataPath,
  onOpenDataFolder,
  isAuthenticated,
  accountEmail,
  walletAddress,
  onSignIn,
  personalServer,
}: SettingsStorageProps) {
  const [draftStorageOption, setDraftStorageOption] =
    useState<StorageOptionId | null>(null)
  const [activeStorageOption, setActiveStorageOption] =
    useState<StorageOptionId | null>(null)
  const [isSavingStorage, setIsSavingStorage] = useState(false)
  const selectedStorageOption = activeStorageOption ?? draftStorageOption
  const showSaveStorage = !activeStorageOption && !!draftStorageOption

  const handleSaveStorage = async () => {
    if (!draftStorageOption || isSavingStorage) return
    setIsSavingStorage(true)
    try {
      setActiveStorageOption(draftStorageOption)
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
            description="Optional. Choose a hosted option for always-on access."
            badge={
              activeStorageOption ? (
                <SettingsBadgeActive />
              ) : (
                <SettingsBadgeNone />
              )
            }
          />
          <SettingsSingleSelectRowGroup
            ariaLabel="Storage"
            options={storageOptions}
            value={selectedStorageOption}
            onChange={nextValue => {
              if (activeStorageOption) return
              setDraftStorageOption(nextValue)
            }}
            renderRight={(item, selected) =>
              activeStorageOption === item.id && selected ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <SettingsRowAction>Remove</SettingsRowAction>
                  </AlertDialogTrigger>
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Remove storage provider?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear the active storage selection. You can
                        set it again later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setActiveStorageOption(null)
                          setDraftStorageOption(null)
                        }}
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null
            }
          />
        </SettingsCard>
        {showSaveStorage ? (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
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
