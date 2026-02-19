// Copied from: src/pages/grant/components/consent/grant-consent-state.tsx
import { Link, useNavigate } from "react-router-dom"
import { ArrowRightIcon } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { Button } from "@/components/ui/button"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { ActionPanel } from "@/components/typography/button-action"
import { GrantWarning } from "@/pages/grant/components/consent/grant-warning"

export function DemoConsent() {
  const navigate = useNavigate()

  return (
    <>
      <TopNav />
      <div className="container pt-major">
        <div className="space-y-w6">
          <Text as="h1" intent="title">
            Allow access to your ChatGPT data
          </Text>
          <Text as="p">
            This will allow <strong>Rickroll</strong> to:
          </Text>

          <div className="action-outsetx">
            <ActionPanel className="justify-start gap-w4">
              <div className="h-full flex items-center gap-1">
                <PlatformIcon iconName="ChatGPT" aria-hidden="true" />
                <ArrowRightIcon aria-hidden="true" className="size-[1.5em]" />
                <PlatformIcon iconName="Rickroll" aria-hidden="true" />
              </div>
              <Text as="p" intent="button" weight="medium">
                See your ChatGPT data
              </Text>
            </ActionPanel>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button
              asChild
              variant="ghost"
              className="text-muted-foreground border border-transparent hover:border-ring hover:bg-background"
            >
              <Link to="/demo">Cancel</Link>
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/demo/success")}
              variant="accent"
              className="w-[140px]"
            >
              Allow
            </Button>
          </div>

          <hr />
          <div className="flex justify-end">
            <GrantWarning />
          </div>
        </div>
      </div>
    </>
  )
}
