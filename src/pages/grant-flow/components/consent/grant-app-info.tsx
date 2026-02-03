import { Text } from "@/components/typography/text"

interface GrantAppInfoProps {
  appName?: string
  appIcon?: string
}

export function GrantAppInfo({ appName, appIcon }: GrantAppInfoProps) {
  return (
    <div className="flex items-center gap-4 rounded-card bg-muted p-4">
      <div
        className={
          appIcon
            ? "flex size-14 shrink-0 items-center justify-center rounded-button text-2xl"
            : "flex size-14 shrink-0 items-center justify-center rounded-button bg-accent/10 text-2xl"
        }
      >
        {appIcon || "🔗"}
      </div>
      <div className="space-y-1">
        <Text as="h2" intent="xlarge" weight="semi">
          {appName || "Unknown App"}
        </Text>
        <Text as="p" intent="small" color="mutedForeground">
          is requesting access to your data
        </Text>
      </div>
    </div>
  )
}
