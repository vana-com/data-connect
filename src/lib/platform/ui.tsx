import type { ElementType } from "react"
import type { Platform, Run } from "@/types"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { formatUpdatedRecencyLabel } from "@/lib/date-format"
import {
  getPlatformRegistryEntryById,
  getPlatformRegistryEntryByName,
} from "./utils"
import { getPlatformIconComponentForPlatform } from "./icons"

// Label rules for connected source recency:
// - no matching run (or invalid date) => "" (renders nothing)
// - same-day run => "Updated today"
// - within 7 days => "Updated last Thursday" (weekday)
// - older than 7 days => "Updated Feb 11" (short month + day)
// Cutoff choice: dayDiff 0-7 uses the weekday variant; dayDiff >= 8 uses month+day.
export function getLastRunLabel(runs: Run[], platformId: string) {
  const platformEntry = getPlatformRegistryEntryById(platformId)
  const platformRuns = runs.filter(run => {
    if (run.platformId === platformId) return true

    const runEntry =
      getPlatformRegistryEntryById(run.platformId) ??
      getPlatformRegistryEntryByName(run.name) ??
      getPlatformRegistryEntryByName(run.company)

    if (!platformEntry || !runEntry) return false
    return runEntry.id === platformEntry.id
  })
  if (platformRuns.length === 0) return ""

  const latestRun = platformRuns
    .slice()
    .sort(
      (a, b) =>
        new Date(b.endDate || b.startDate).getTime() -
        new Date(a.endDate || a.startDate).getTime()
    )[0]
  return formatUpdatedRecencyLabel(latestRun.endDate || latestRun.startDate)
}

export function getPlatformIconComponent(
  platform: Platform
): ElementType<{ className?: string }> {
  const Icon = getPlatformIconComponentForPlatform(platform)
  if (Icon) return Icon
  return ({ className }: { className?: string }) => (
    <PlatformIcon iconName={platform.name} size={20} className={className} />
  )
}
