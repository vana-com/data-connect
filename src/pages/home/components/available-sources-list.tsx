import { Database as DatabaseIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { ConnectSourceCard } from "@/components/connect-source-card"
import { PlatformChatGPTIcon } from "@/components/icons/platform-chatgpt"
import { PlatformInstagramGlyphIcon } from "@/components/icons/platform-instagram-glyph"
import { PlatformLinkedinIcon } from "@/components/icons/platform-linkedin"
import { PlatformSpotifyIcon } from "@/components/icons/platform-spotify"
import type { Platform } from "@/types"

interface AvailableSourcesListProps {
  platforms: Platform[]
  browserReady: boolean
  onExport: (platform: Platform) => void
}

export function AvailableSourcesList({
  platforms,
  browserReady,
  onExport,
}: AvailableSourcesListProps) {
  const instagramPlatform = platforms.find(
    platform =>
      platform.id === "instagram" ||
      platform.name.toLowerCase().includes("instagram") ||
      platform.company.toLowerCase().includes("instagram")
  )
  const isInstagramAvailable = Boolean(instagramPlatform) && browserReady

  const chatgptPlatform = platforms.find(
    platform =>
      platform.id === "chatgpt-playwright" ||
      platform.id === "chatgpt" ||
      platform.name.toLowerCase().includes("chatgpt") ||
      platform.company.toLowerCase().includes("openai")
  )
  const isChatGPTAvailable = Boolean(chatgptPlatform) && browserReady

  // Empty state when browser not ready
  if (!browserReady) {
    return (
      <section className="space-y-4">
        <Text as="h2" intent="body">
          Connect your data sources
        </Text>
        <ConnectSourceCard
          label="No sources"
          Icon={DatabaseIcon}
          state="comingSoon"
          showArrow={false}
          className="bg-background/40"
        />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <Text as="h2" intent="body">
        Connect sources (more coming soon)
      </Text>
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: "Connect Instagram",
            Icon: PlatformInstagramGlyphIcon,
            state: isInstagramAvailable ? "available" : "comingSoon",
            onClick:
              isInstagramAvailable && instagramPlatform
                ? () => onExport(instagramPlatform)
                : undefined,
          },
          {
            label: "Connect LinkedIn",
            Icon: PlatformLinkedinIcon,
            state: "comingSoon",
          },
          {
            label: "Connect Spotify",
            Icon: PlatformSpotifyIcon,
            state: "comingSoon",
          },
          {
            label: "Connect ChatGPT",
            Icon: PlatformChatGPTIcon,
            state: isChatGPTAvailable ? "available" : "comingSoon",
            onClick:
              isChatGPTAvailable && chatgptPlatform
                ? () => onExport(chatgptPlatform)
                : undefined,
          },
        ]
          .map((card, index) => ({
            ...card,
            index,
            priority: card.state === "available" ? 0 : 1,
          }))
          .sort((a, b) => a.priority - b.priority || a.index - b.index)
          .map(({ label, Icon, state, onClick }) => (
            <ConnectSourceCard
              key={label}
              label={label}
              Icon={Icon}
              state={state}
              onClick={onClick}
            />
          ))}
      </div>
    </section>
  )
}
