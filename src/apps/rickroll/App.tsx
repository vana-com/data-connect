import { useState } from "react"
import { DatabaseIcon, Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { useRickRollData } from "./index"

export function RickRollApp() {
  const { data, loading, error, funFacts, hasData } = useRickRollData()
  const [showAllFacts, setShowAllFacts] = useState(false)

  const handleRequestAccess = () => {
    // Open deep link to grant flow
    // For demo purposes, use a mock session ID
    const sessionId = "demo-session-" + Date.now()
    window.location.href = `dataconnect://?sessionId=${sessionId}&appId=rickroll`
  }

  const hasAccess = true // In real implementation, check if this app is authorized

  if (!hasAccess) {
    return (
      <div className="flex-1 overflow-auto bg-muted">
        <div className="container py-w16">
          <div className="mx-auto max-w-[600px] rounded-card bg-background p-10 text-center shadow-md">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-card bg-accent/15">
              <span className="text-2xl" aria-hidden="true">
                🎵
              </span>
            </div>
            <Text as="h1" intent="heading" weight="semi" className="mb-3">
              RickRoll Facts
            </Text>
            <Text as="p" intent="body" color="mutedForeground" className="mb-8">
              Discover fun and interesting facts from your ChatGPT conversations
            </Text>

            <div className="mb-6 rounded-card border border-border bg-muted p-6 text-left">
              <Text as="p" intent="small" weight="medium" withIcon className="mb-2">
                <DatabaseIcon aria-hidden="true" className="size-4" />
                Requires access to your ChatGPT export data
              </Text>
              <Text as="p" intent="fine" color="mutedForeground">
                This app needs permission to read your exported ChatGPT conversations to
                generate fun facts.
              </Text>
            </div>

            <Button
              type="button"
              variant="accent"
              fullWidth
              onClick={handleRequestAccess}
            >
              Connect Your Data
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted">
        <div className="text-center">
          <Loader2Icon
            aria-hidden="true"
            className="size-12 animate-spin text-accent motion-reduce:animate-none"
          />
          <Text as="p" intent="small" color="mutedForeground" className="mt-4">
            Loading your ChatGPT data...
          </Text>
        </div>
      </div>
    )
  }

  if (error || !hasData) {
    return (
      <div className="flex-1 overflow-auto bg-muted">
        <div className="container py-w16">
          <div className="mx-auto max-w-[600px] rounded-card bg-background p-10 text-center shadow-md">
            <DatabaseIcon
              aria-hidden="true"
              className="mx-auto size-12 text-muted-foreground"
            />
            <Text as="h2" intent="heading" weight="semi" className="mt-4">
              No Data Found
            </Text>
            <Text as="p" intent="body" color="mutedForeground" className="mt-3">
              {error ||
                "Could not find your ChatGPT export data. Please export your ChatGPT conversations first, then grant this app access."}
            </Text>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
              className="mt-6"
            >
              <RefreshCwIcon aria-hidden="true" className="size-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const displayFacts = showAllFacts ? funFacts : funFacts.slice(0, 3)

  return (
    <div className="flex-1 overflow-auto bg-muted">
      <div className="container py-w16">
        <div className="mx-auto max-w-[700px] space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-card bg-accent/15">
              <span className="text-2xl" aria-hidden="true">
                🎵
              </span>
            </div>
            <div className="space-y-1">
              <Text as="h1" intent="heading" weight="semi">
                RickRoll Facts
              </Text>
              <Text as="p" intent="small" color="mutedForeground">
                Your ChatGPT conversation insights
              </Text>
            </div>
          </div>

          <div className="rounded-card bg-background shadow-sm">
            <div className="space-y-5 p-6">
              <div className="flex items-center gap-2">
                <SparklesIcon aria-hidden="true" className="size-5 text-accent" />
                <Text as="h2" intent="xlarge" weight="semi">
                  Fun Facts
                </Text>
              </div>

              {displayFacts.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {displayFacts.map((fact, index) => (
                    <div
                      key={index}
                      className="rounded-button border border-border bg-muted px-4 py-3"
                    >
                      <Text as="p" intent="small">
                        {fact}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text
                  as="p"
                  intent="small"
                  color="mutedForeground"
                  align="center"
                  className="py-5"
                >
                  No facts generated
                </Text>
              )}

              {funFacts.length > 3 && !showAllFacts && (
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setShowAllFacts(true)}
                >
                  Show all {funFacts.length} facts
                </Button>
              )}
            </div>
          </div>

          {data && data.conversations && (
            <div className="rounded-card bg-background p-6 shadow-sm">
              <Text as="h3" intent="small" weight="semi" className="mb-4">
                Your Stats
              </Text>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Text as="div" intent="subtitle" weight="bold">
                    {data.totalConversations || data.conversations.length}
                  </Text>
                  <Text as="div" intent="fine" color="mutedForeground">
                    Conversations
                  </Text>
                </div>
                <div className="space-y-1">
                  <Text as="div" intent="subtitle" weight="bold">
                    {data.conversations.reduce(
                      (sum, conv) => sum + conv.messages.length,
                      0
                    )}
                  </Text>
                  <Text as="div" intent="fine" color="mutedForeground">
                    Messages
                  </Text>
                </div>
                <div className="space-y-1">
                  <Text as="div" intent="subtitle" weight="bold">
                    {data.conversations
                      .reduce((sum, conv) => sum + conv.messages.join("").length, 0)
                      .toLocaleString()}
                  </Text>
                  <Text as="div" intent="fine" color="mutedForeground">
                    Characters
                  </Text>
                </div>
              </div>
            </div>
          )}

          <Text
            as="p"
            intent="fine"
            color="mutedForeground"
            align="center"
            className="pt-6"
          >
            Data stays on your device. This app only reads your exported ChatGPT data.
          </Text>
        </div>
      </div>
    </div>
  )
}
