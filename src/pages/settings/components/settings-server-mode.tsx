import { Text } from "@/components/typography/text"
import { useVanaLogin } from "@/hooks/useVanaLogin"
import { setAppConfig } from "@/state/store"
import type { RootState } from "@/state/store"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"

import {
  SettingsCard,
  SettingsCardStack,
  SettingsRowAction,
  SettingsSection,
} from "@/pages/settings/components/settings-shared"

/**
 * Server-mode toggle: bundled-local vs remote (with "Connect with Vana"
 * device-code flow against Hydra). When connected, the user's PS URL is
 * auto-discovered via account.vana.org/api/servers and populated into
 * remoteServerUrl. The user can also paste a URL manually as a fallback.
 *
 * See docs/auth-redesign/01-architecture.md §10.2 (PR-X) and §1.8 (Hydra
 * device flow).
 */
export function SettingsServerModeSection() {
  const dispatch = useDispatch()
  const appConfig = useSelector((state: RootState) => state.app.appConfig)
  const { connect, disconnect, pending, error, busy, isConnected } =
    useVanaLogin()
  const [manualUrl, setManualUrl] = useState(
    appConfig.remoteServerUrl ?? ""
  )

  const isRemote = appConfig.serverMode === "remote"

  return (
    <SettingsSection title="Server mode">
      <SettingsCardStack>
        <SettingsCard>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <Text className="font-medium">Mode</Text>
              <Text className="mt-0.5 text-sm text-muted-foreground">
                {isRemote
                  ? "Remote: data is ingested into a Personal Server you've connected to via Vana."
                  : "Local: data is ingested into the Personal Server bundled with this app."}
              </Text>
            </div>
            <SettingsRowAction>
              <button
                className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
                onClick={() => {
                  dispatch(
                    setAppConfig({
                      serverMode: isRemote ? "local" : "remote",
                    })
                  )
                }}
                type="button"
              >
                {isRemote ? "Switch to local" : "Switch to remote"}
              </button>
            </SettingsRowAction>
          </div>
        </SettingsCard>

        {isRemote ? (
          <SettingsCard>
            <div className="flex flex-col gap-3 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Text className="font-medium">Connect with Vana</Text>
                  <Text className="mt-0.5 text-sm text-muted-foreground">
                    {isConnected
                      ? "Signed in. Your Personal Server URL was discovered automatically."
                      : "Open your browser to authorize this device. Your Personal Server URL will be auto-discovered."}
                  </Text>
                </div>
                <SettingsRowAction>
                  {isConnected ? (
                    <button
                      className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
                      onClick={disconnect}
                      type="button"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      className="rounded-md border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
                      disabled={busy}
                      onClick={connect}
                      type="button"
                    >
                      {busy ? "Connecting…" : "Connect with Vana"}
                    </button>
                  )}
                </SettingsRowAction>
              </div>

              {pending ? (
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <div>
                    Code: <span className="font-mono">{pending.user_code}</span>
                  </div>
                  <div className="mt-1 break-all text-xs text-muted-foreground">
                    {pending.verification_uri_complete ??
                      pending.verification_uri}
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div>
                <Text className="text-sm font-medium">
                  Personal Server URL
                </Text>
                <Text className="mb-1 text-xs text-muted-foreground">
                  Auto-populated when you Connect with Vana. You can override
                  it manually here.
                </Text>
                <input
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm font-mono"
                  onBlur={() => {
                    if (manualUrl !== appConfig.remoteServerUrl) {
                      dispatch(
                        setAppConfig({
                          remoteServerUrl: manualUrl || undefined,
                        })
                      )
                    }
                  }}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://0xabc.myvana.app"
                  spellCheck={false}
                  value={manualUrl}
                />
              </div>
            </div>
          </SettingsCard>
        ) : null}
      </SettingsCardStack>
    </SettingsSection>
  )
}
