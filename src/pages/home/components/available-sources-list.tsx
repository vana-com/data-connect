import { Text } from "@/components/typography/text"
import { ConnectSourceCard, type ConnectSourceCardVariant } from "@/components/connect-source-card"
import { PlatformChatGPTIcon } from "@/components/icons/platform-chatgpt"
import { PlatformInstagramGlyphIcon } from "@/components/icons/platform-instagram-glyph"
import { PlatformLinkedinIcon } from "@/components/icons/platform-linkedin"
import { PlatformSpotifyIcon } from "@/components/icons/platform-spotify"
import type { Platform } from "@/types"

interface AvailableSourcesListProps {
  platforms: Platform[]
  onExport: (platform: Platform) => void
}

export function AvailableSourcesList({
  platforms,
  onExport,
}: AvailableSourcesListProps) {
  const instagramPlatform = platforms.find(
    platform =>
      platform.id === "instagram" ||
      platform.name.toLowerCase().includes("instagram") ||
      platform.company.toLowerCase().includes("instagram")
  )
  const isInstagramAvailable = Boolean(instagramPlatform)

  const linkedinPlatform = platforms.find(
    platform =>
      platform.id === "linkedin-playwright" ||
      platform.id === "linkedin" ||
      platform.name.toLowerCase().includes("linkedin") ||
      platform.company.toLowerCase().includes("linkedin")
  )
  const isLinkedinAvailable = Boolean(linkedinPlatform)

  const chatgptPlatform = platforms.find(
    platform =>
      platform.id === "chatgpt-playwright" ||
      platform.id === "chatgpt" ||
      platform.name.toLowerCase().includes("chatgpt") ||
      platform.company.toLowerCase().includes("openai")
  )
  const isChatGPTAvailable = Boolean(chatgptPlatform)

  return (
    <section className="space-y-4">
      <Text as="h2" intent="body">
        Connect sources (more coming soon)
      </Text>
      <div className="grid grid-cols-2 gap-4">
        {([
          {
            label: "Connect Instagram",
            Icon: PlatformInstagramGlyphIcon,
            state: (isInstagramAvailable ? "available" : "comingSoon") as ConnectSourceCardVariant,
            onClick:
              isInstagramAvailable && instagramPlatform
                ? () => onExport(instagramPlatform)
                : undefined,
          },
          {
            label: "Connect LinkedIn",
            Icon: PlatformLinkedinIcon,
            state: (isLinkedinAvailable ? "available" : "comingSoon") as ConnectSourceCardVariant,
            onClick:
              isLinkedinAvailable && linkedinPlatform
                ? () => onExport(linkedinPlatform)
                : undefined,
          },
          {
            label: "Connect Spotify",
            Icon: PlatformSpotifyIcon,
            state: "comingSoon" as ConnectSourceCardVariant,
          },
          {
            label: "Connect ChatGPT",
            Icon: PlatformChatGPTIcon,
            state: (isChatGPTAvailable ? "available" : "comingSoon") as ConnectSourceCardVariant,
            onClick:
              isChatGPTAvailable && chatgptPlatform
                ? () => onExport(chatgptPlatform)
                : undefined,
          },
        ])
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
