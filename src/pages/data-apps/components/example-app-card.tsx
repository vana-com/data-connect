import { AsteriskIcon } from "lucide-react"
import { AdaptiveIcon } from "@/components/icons/adaptive-icon"
import { Text } from "@/components/typography/text"
import { LINKS } from "@/config/links"
import { openExternalUrl } from "@/lib/open-resource"
import { AppCard } from "./app-card"

export function ExampleAppCard() {
  const handleOpenExampleApp = () => {
    void openExternalUrl(LINKS.appBuilderExample)
  }

  return (
    <AppCard
      ariaLabel="Open Next.js example app"
      onClick={handleOpenExampleApp}
    >
      <div className="space-y-1.5">
        <div className="p-1">
          <AdaptiveIcon icon={AsteriskIcon} />
        </div>
        <Text as="h3" intent="xlarge" weight="medium">
          Add your app here
        </Text>
        <Text as="p" intent="small" dim balance className="whitespace-normal">
          Build apps with deep personal context for smarter experiences, for
          users and agents alike.
        </Text>
      </div>
    </AppCard>
  )
}
