import { AlertCircleIcon } from "lucide-react"
import { Text } from "@/components/typography/text"

export function GrantWarning() {
  return (
    <div className="flex gap-3 rounded-button bg-accent/10 px-3 py-2">
      <AlertCircleIcon
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-accent"
      />
      <Text as="p" intent="small" color="accentForeground">
        By approving, you authorize this app to access the specified data. You can revoke
        this access anytime from Settings.
      </Text>
    </div>
  )
}
