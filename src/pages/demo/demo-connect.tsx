// Copied from: src/pages/connect/index.tsx
import { useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { TopNav } from "@/components/top-nav"
import { Text } from "@/components/typography/text"
import { ActionButton } from "@/components/typography/action-button"
import { LearnMoreLink } from "@/components/typography/learn-more-link"
import { ButtonArrow } from "@/components/ui/button"
import { PlatformIcon } from "@/components/icons/platform-icon"

export function DemoConnect() {
  const navigate = useNavigate()

  return (
    <>
      <TopNav />
      <div className="container py-w24">
      <div className="space-y-w6">
        <Text as="h1" intent="title">
          Connect your ChatGPT
        </Text>
        <Text as="p" intent="body">
          This saves your ChatGPT data to your computer. <LearnMoreLink />
        </Text>

        <div className="action-outset">
          <ActionButton
            size="xl"
            onClick={() => navigate("/demo/auth")}
            className="relative gap-3 group"
          >
            <PlatformIcon iconName="ChatGPT" />
            <span>Connect ChatGPT</span>
            <ButtonArrow
              icon={ChevronRight}
              className="size-[1.5em] text-muted-foreground group-hover:text-foreground"
              aria-hidden="true"
            />
          </ActionButton>
        </div>
      </div>
    </div>
    </>
  )
}
