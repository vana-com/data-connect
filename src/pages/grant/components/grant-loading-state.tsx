import { Spinner } from "@/components/elements/spinner"
import { Text } from "@/components/typography/text"

interface GrantLoadingStateProps {
  title?: string
}

export function GrantLoadingState({ title }: GrantLoadingStateProps) {
  return (
    <div className="container pt-major">
      <div className="space-y-w6">
        <Text as="h1" intent="title" withIcon aria-live="polite">
          <Spinner className="size-[0.75em] motion-reduce:animate-none" />
          {title ?? "Loading…"}
        </Text>
      </div>
    </div>
  )
}
