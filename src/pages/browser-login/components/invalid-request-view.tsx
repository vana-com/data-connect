import { Text } from "@/components/typography/text"

export function InvalidRequestView() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted px-6 py-10">
      <div className="w-full max-w-[420px] rounded-card bg-background p-10 shadow-md">
        <Text as="h1" intent="heading" weight="semi" className="mb-2">
          Invalid Request
        </Text>
        <Text as="p" intent="small" color="mutedForeground">
          This page should be opened from the DataConnect app. Please return to the app
          and try again.
        </Text>
      </div>
    </div>
  )
}
