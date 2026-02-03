import { useSyncExternalStore } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ExternalLinkIcon } from "lucide-react"
import { RickRollApp } from "../apps/rickroll/app"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { DEFAULT_APP_ID, getAppRegistryEntry } from "../apps/registry"
import { buildGrantSearchParams } from "../lib/grant-params"
import { isAppConnected, subscribeConnectedApps } from "../lib/storage"

const getIsRickrollConnected = () => isAppConnected(DEFAULT_APP_ID)

// Host page + access gating for the RickRoll demo app. The actual app UI
// lives in `src/apps/rickroll/app.tsx` and renders after the grant is approved.
export function RickRollAppPage() {
  const navigate = useNavigate()
  const isConnected = useSyncExternalStore(subscribeConnectedApps, getIsRickrollConnected)
  const appEntry = getAppRegistryEntry(DEFAULT_APP_ID)

  const handleConnect = () => {
    // Trigger grant flow using React Router navigation
    const sessionId = "grant-session-" + Date.now()
    const searchParams = buildGrantSearchParams({
      sessionId,
      appId: appEntry?.id || DEFAULT_APP_ID,
      scopes: appEntry?.scopes,
    })
    const search = searchParams.toString()
    navigate(`/grant${search ? `?${search}` : ""}`)
  }

  if (!isConnected) {
    return (
      <div className="flex-1 overflow-auto bg-muted">
        <div className="container py-w16">
          <div className="mx-auto max-w-[500px] rounded-card bg-background p-10 text-center shadow-md">
            <Text as="h1" intent="heading" weight="semi" className="mb-4">
              RickRoll Facts
            </Text>
            <Text as="p" intent="body" color="mutedForeground" className="mb-8">
              Discover fun facts from your ChatGPT conversations
            </Text>

            <div className="mb-6 rounded-card border border-border bg-muted p-6 text-left">
              <Text as="p" intent="small" weight="medium" className="mb-2">
                Authorization Required
              </Text>
              <Text as="p" intent="small" color="mutedForeground">
                This app needs access to your ChatGPT export data to generate insights
                about your conversations.
              </Text>
            </div>

            <Button type="button" variant="accent" fullWidth onClick={handleConnect}>
              Grant Access
            </Button>

            <Button asChild variant="outline" className="mt-4">
              <Link to="/data">
                <ExternalLinkIcon aria-hidden="true" className="size-4" />
                Back to Your Data
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <RickRollApp />
    </div>
  )
}
