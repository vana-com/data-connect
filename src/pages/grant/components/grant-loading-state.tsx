import { LoaderIcon } from "lucide-react"
import { Text } from "@/components/typography/text"

export function GrantLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="flex flex-col items-center gap-4 text-center">
        <LoaderIcon
          aria-hidden="true"
          className="size-12 animate-spin text-accent motion-reduce:animate-none"
        />
        <Text as="p" intent="body" color="mutedForeground" aria-live="polite">
          Loading…
        </Text>
      </div>
    </div>
  )
}
