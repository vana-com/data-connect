import { Text } from "@/components/typography/text"

export function YourDataHeader() {
  return (
    <div className="space-y-2">
      <Text as="h1" intent="title" weight="semi">
        Your Data
      </Text>
      <Text as="p" intent="body" color="mutedForeground">
        Manage your connected data sources and applications
      </Text>
    </div>
  )
}
