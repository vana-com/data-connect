import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
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
  SettingsMetaRow,
} from "./settings-shared"
import { SettingsSingleSelectRowGroup } from "./settings-single-select-row-group"

interface SettingsStorageProps {
  dataPath: string
  onOpenDataFolder: () => void
  personalServerPort: number | null
  personalServerStatus: string
  walletAddress: string | null
}

const storageOptions = [
  {
    id: "vana-storage",
    label: "Vana Storage",
    description: (
      <>
        The free storage solution by{" "}
        <a href="#" className="link">
          Vana
        </a>
        .
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

const serverOptions = [
  {
    id: "opendatalabs-cloud",
    label: "OpenDataLabs Cloud",
    description: (
      <>
        Free remote compute by{" "}
        <a href="#" className="link">
          OpenDataLabs
        </a>
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

export function SettingsStorage({
  dataPath,
  onOpenDataFolder,
}: SettingsStorageProps) {
  const [draftStorageOption, setDraftStorageOption] =
    useState<StorageOptionId | null>(null)
  const [activeStorageOption, setActiveStorageOption] =
    useState<StorageOptionId | null>(null)
  const [draftServerOption, setDraftServerOption] =
    useState<ServerOptionId | null>(null)
  const [activeServerOption, setActiveServerOption] =
    useState<ServerOptionId | null>(null)

  const selectedStorageOption = activeStorageOption ?? draftStorageOption
  const showSaveStorage = !activeStorageOption && !!draftStorageOption
  const selectedServerOption = activeServerOption ?? draftServerOption
  const showSaveServer = !activeServerOption && !!draftServerOption

  return (
    <div className="space-y-8">
      {/* LOCAL */}
      <div className="space-y-3 form-outset">
        <SettingsCard>
          <SettingsMetaRow
            title={
              <Text as="div" intent="body" weight="semi">
                Local Data
              </Text>
            }
            description={
              <Text as="div" intent="small" muted>
                Required.&nbsp;
                <a
                  href="#"
                  className="link"
                  onClick={event => {
                    event.preventDefault()
                    onOpenDataFolder()
                  }}
                >
                  Open location.
                  <span className="sr-only"> at {dataPath}</span>
                </a>
              </Text>
            }
            badge={<SettingsBadgeActive />}
          />
        </SettingsCard>
      </div>

      {/* STORAGE */}
      <div className="space-y-3 form-outset">
        <SettingsCard>
          <SettingsMetaRow
            title={
              <Text as="div" intent="body" weight="semi">
                Storage
              </Text>
            }
            description={
              <Text as="div" intent="small" muted>
                Optional. Choose a hosted option for always-on access.
              </Text>
            }
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
                    <Button type="button" variant="ghost" size="sm">
                      Remove
                    </Button>
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
          <div className="flex justify-end">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-auto bg-irisLight px-w6"
              onClick={() => {
                setActiveStorageOption(draftStorageOption)
              }}
            >
              Save & create
            </Button>
          </div>
        ) : null}
      </div>

      {/* SERVER */}
      <div className="space-y-3 form-outset">
        <SettingsCard>
          <SettingsMetaRow
            title={
              <Text as="div" intent="body" weight="semi">
                Server
              </Text>
            }
            description={
              <Text as="div" intent="small" muted>
                Where requests are served from.
              </Text>
            }
            badge={
              activeServerOption ? (
                <SettingsBadgeActive />
              ) : (
                <SettingsBadgeNone />
              )
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
              if (item.id === "personal-server") {
                return (
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="size-6 text-foreground"
                  />
                )
              }

              return activeServerOption === item.id && selected ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm">
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Remove server provider?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear the active server selection. You can set
                        it again later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setActiveServerOption(null)
                          setDraftServerOption(null)
                        }}
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null
            }}
          />
        </SettingsCard>
        {showSaveServer ? (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="w-auto bg-irisLight px-w6"
              onClick={() => {
                setActiveServerOption(draftServerOption)
              }}
            >
              Save & create
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
