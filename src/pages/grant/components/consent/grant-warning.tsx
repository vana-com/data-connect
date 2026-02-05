import { Text } from "@/components/typography/text"
import { LearnMoreLink } from "@/components/typography/learn-more-link"

export function GrantWarning() {
  return (
    <Text as="p" dim>
      You can revoke this permission at any time. <LearnMoreLink />
    </Text>
  )
}
