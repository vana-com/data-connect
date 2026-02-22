import { PageContainer } from "@/components/elements/page-container"
import { Spinner } from "@/components/elements/spinner"
import { PageHeading } from "@/components/typography/page-heading"

interface LoadingStateProps {
  title?: string
}

export function LoadingState({ title }: LoadingStateProps) {
  return (
    <PageContainer>
      <div className="space-y-w6">
        <PageHeading withIcon aria-live="polite">
          <Spinner className="size-[0.75em]" />
          {title ?? "Loading…"}
        </PageHeading>
      </div>
    </PageContainer>
  )
}
