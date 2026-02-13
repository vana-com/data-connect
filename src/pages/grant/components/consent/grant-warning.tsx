import { Text } from "@/components/typography/text"
import { LearnMoreLink } from "@/components/typography/link-learn-more"

export function GrantWarning() {
  return (
    <Text as="p" dim>
      You can revoke this permission at any time. <LearnMoreLink />
    </Text>
  )
}
