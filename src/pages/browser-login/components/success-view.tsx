import { CheckCircleIcon } from "lucide-react"
import { Text } from "@/components/typography/text"

export function SuccessView() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted px-6 py-10">
      <div className="w-full max-w-[420px] rounded-card bg-background p-10 text-center shadow-md">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircleIcon aria-hidden="true" className="size-8 text-success" />
        </div>
        <Text as="h1" intent="heading" weight="semi" className="mb-2">
          You&apos;re signed in!
        </Text>
        <Text as="p" intent="small" color="mutedForeground">
          You can close this window and return to the app.
        </Text>
      </div>
    </div>
  )
}
