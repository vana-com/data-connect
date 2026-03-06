import { openExternalUrl } from "@/lib/open-resource"

export function isAllowedSubmittedAppExternalUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

export function parseSubmittedAppExternalUrl(value: string): URL {
  if (!isAllowedSubmittedAppExternalUrl(value)) {
    throw new Error("App submission externalUrl must use https://.")
  }

  return new URL(value)
}

export async function openSubmittedAppExternalUrl(url: string | URL) {
  // TODO: If callers start passing arbitrary URL objects here, re-validate the
  // URL branch too so this helper remains a hard trust boundary instead of just
  // a convenience wrapper around prior validation.
  const parsedUrl =
    typeof url === "string" ? parseSubmittedAppExternalUrl(url) : url

  return openExternalUrl(parsedUrl.toString())
}
