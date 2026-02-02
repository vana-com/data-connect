import type { ElementType } from "react"
import type { Platform, Run } from "@/types"
import { PlatformChatGPTIcon } from "@/components/icons/platform-chatgpt"
import { PlatformInstagramGlyphIcon } from "@/components/icons/platform-instagram-glyph"
import { PlatformLinkedinIcon } from "@/components/icons/platform-linkedin"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { PlatformSpotifyIcon } from "@/components/icons/platform-spotify"

export function getLastRunLabel(runs: Run[], platformId: string) {
  const platformRuns = runs.filter(run => run.platformId === platformId)
  if (platformRuns.length === 0) {
    return "No runs yet"
  }
  const latestRun = platformRuns
    .slice()
    .sort(
      (a, b) =>
        new Date(b.endDate || b.startDate).getTime() -
        new Date(a.endDate || a.startDate).getTime()
    )[0]
  const date = new Date(latestRun.endDate || latestRun.startDate)
  if (Number.isNaN(date.getTime())) {
    return "No runs yet"
  }
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" })
  return `Last ${weekday}`
}

export function getPlatformIconComponent(
  platform: Platform
): ElementType<{ className?: string }> {
  const name = platform.name.toLowerCase()
  if (name.includes("chatgpt")) return PlatformChatGPTIcon
  if (name.includes("instagram")) return PlatformInstagramGlyphIcon
  if (name.includes("linkedin")) return PlatformLinkedinIcon
  if (name.includes("spotify")) return PlatformSpotifyIcon
  return ({ className }: { className?: string }) => (
    <PlatformIcon name={platform.name} size={20} className={className} />
  )
}
