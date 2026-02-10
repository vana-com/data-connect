// Copied from: src/pages/grant/components/grant-success-state.tsx
import { Link } from "react-router-dom"
import { CheckIcon, UserRoundCogIcon } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { ActionPanel } from "@/components/typography/action-button"
import { Text } from "@/components/typography/text"

export function DemoSuccess() {
  return (
    <>
      <TopNav />
      <div className="container py-w24">
      <div className="space-y-w6">
        <Text as="h1" intent="title" className="relative">
          <div className="absolute left-[-1.3em] top-[0.05em]">
            <CheckIcon
              className="size-9 text-success"
              aria-hidden="true"
              strokeWidth={2.5}
            />
          </div>
          Rickroll has your ChatGPT data
        </Text>

        <Text as="p">
          You can{" "}
          <Text as={Link} to="/demo" link="default">
            revoke this permission
          </Text>{" "}
          at any time.
        </Text>

        <a
          href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          target="_blank"
          rel="noopener noreferrer"
          className="action-outset block"
        >
          <ActionPanel className="gap-3 justify-start">
            <PlatformIcon iconName="Rickroll" />
            Return to Rickroll to continue
          </ActionPanel>
        </a>

        <Text as={Link} to="/demo" dim withIcon link="default">
          <UserRoundCogIcon aria-hidden="true" className="size-[1.1em]" />
          Manage your account
        </Text>
      </div>
    </div>
    </>
  )
}
