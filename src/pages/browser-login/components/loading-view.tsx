import { LoaderIcon } from "lucide-react"
import { Text } from "@/components/typography/text"

export function LoadingView() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted px-6 py-10">
      <div className="w-full max-w-[420px] rounded-card bg-background p-10 text-center shadow-md">
        <LoaderIcon
          aria-hidden="true"
          className="mx-auto size-8 animate-spin text-accent motion-reduce:animate-none"
        />
        <Text as="p" intent="small" color="mutedForeground" className="mt-4">
          Initializing...
        </Text>
      </div>
    </div>
  )
}
