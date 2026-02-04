import type { ElementType } from "react"
import type { Platform, Run } from "@/types"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { type PlatformRegistryAvailability } from "./registry"
import {
  getPlatformRegistryEntryById,
  getPlatformRegistryEntryByName,
} from "./utils"
import { getPlatformIconComponentForPlatform } from "./icons"

export const getAvailabilityIconClassName = (
  availability: PlatformRegistryAvailability
) => {
  if (availability === "comingSoon") return "bg-muted text-muted-foreground"
  if (availability === "requiresConnector") return "bg-muted text-foreground"
  return "bg-accent/10 text-accent"
}

export const getPlatformDisplay = (platform: { id: string; name: string }) => {
  const entry =
    getPlatformRegistryEntryById(platform.id) ??
    getPlatformRegistryEntryByName(platform.name)
  if (entry) {
    const availability = entry.availability ?? "available"
    return {
      icon: entry.iconEmoji,
      iconClassName: getAvailabilityIconClassName(availability),
      displayName: entry.displayName,
    }
  }
  return {
    icon: "📦",
    iconClassName: getAvailabilityIconClassName("requiresConnector"),
    displayName: platform.name,
  }
}

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
  const Icon = getPlatformIconComponentForPlatform(platform)
  if (Icon) return Icon
  return ({ className }: { className?: string }) => (
    <PlatformIcon name={platform.name} size={20} className={className} />
  )
}
