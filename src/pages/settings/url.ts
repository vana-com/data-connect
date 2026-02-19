import { ROUTES } from "@/config/routes"
import { SETTINGS_SECTION_ORDER } from "./sections"
import type { SettingsSection } from "./types"

export const SETTINGS_SECTION_PARAM = "section"
export const DEFAULT_SETTINGS_SECTION: SettingsSection = "personalServer"

export function isSettingsSection(value: string | null): value is SettingsSection {
  return value !== null && SETTINGS_SECTION_ORDER.includes(value as SettingsSection)
}

interface BuildSettingsUrlOptions {
  section?: SettingsSection
  source?: string | null
  fromSearch?: string | URLSearchParams
}

export function buildSettingsUrl({
  section = DEFAULT_SETTINGS_SECTION,
  source,
  fromSearch,
}: BuildSettingsUrlOptions = {}) {
  const params = new URLSearchParams(
    fromSearch instanceof URLSearchParams ? fromSearch.toString() : fromSearch
  )

  if (section === DEFAULT_SETTINGS_SECTION) {
    params.delete(SETTINGS_SECTION_PARAM)
  } else {
    params.set(SETTINGS_SECTION_PARAM, section)
  }

  if (source === null) {
    params.delete("source")
  } else if (typeof source === "string" && source.length > 0) {
    params.set("source", source)
  }

  const nextSearch = params.toString()
  return `${ROUTES.settings}${nextSearch ? `?${nextSearch}` : ""}`
}
