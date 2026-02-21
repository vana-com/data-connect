type OpenResourceKind = "auto" | "external-url" | "local-path"

interface OpenResourceOptions {
  kind?: OpenResourceKind
  newTab?: boolean
}

const FILE_PROTOCOL = "file://"

const WINDOWS_DRIVE_PATH = /^[a-zA-Z]:[\\/]/
const HAS_URI_SCHEME = /^[a-zA-Z][a-zA-Z\d+\-.]*:/

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value)
const isFileUrl = (value: string) => value.toLowerCase().startsWith(FILE_PROTOCOL)
const isLikelyLocalPath = (value: string) =>
  value.startsWith("/") ||
  value.startsWith("~/") ||
  value.startsWith("./") ||
  value.startsWith("../") ||
  WINDOWS_DRIVE_PATH.test(value)

const inferKind = (target: string): OpenResourceKind => {
  if (isFileUrl(target) || isLikelyLocalPath(target)) {
    return "local-path"
  }
  if (isHttpUrl(target)) {
    return "external-url"
  }
  if (HAS_URI_SCHEME.test(target)) {
    return "external-url"
  }
  return "local-path"
}

export const normalizeLocalPath = (value: string) =>
  isFileUrl(value) ? decodeURI(value.slice(FILE_PROTOCOL.length)) : value

export const toFileUrl = (path: string) => {
  const normalizedPath = normalizeLocalPath(path.trim())
  return `${FILE_PROTOCOL}${encodeURI(normalizedPath)}`
}

export const toLocalDirectoryPath = (path: string) => {
  const normalizedPath = normalizeLocalPath(path.trim())
  return normalizedPath.endsWith(".json")
    ? normalizedPath.replace(/[\\/][^\\/]+$/, "")
    : normalizedPath
}

export async function openResource(
  target: string,
  options: OpenResourceOptions = {}
): Promise<boolean> {
  const trimmed = target.trim()
  if (!trimmed) return false

  const kind = options.kind ?? inferKind(trimmed)
  const openInNewTab = options.newTab ?? true

  const shellTarget =
    kind === "local-path" ? normalizeLocalPath(trimmed) : trimmed
  const browserTarget =
    kind === "local-path" ? toFileUrl(trimmed) : trimmed

  try {
    const { open } = await import("@tauri-apps/plugin-shell")
    await open(shellTarget)
    return true
  } catch {
    if (kind === "local-path") {
      try {
        const { invoke } = await import("@tauri-apps/api/core")
        await invoke("open_folder", { path: shellTarget })
        return true
      } catch {
        // Fall through to browser fallback.
      }
    }
    if (typeof window === "undefined") return false
    const popup = window.open(
      browserTarget,
      openInNewTab ? "_blank" : "_self",
      "noopener,noreferrer"
    )
    return Boolean(popup || !openInNewTab)
  }
}

export const openLocalPath = (path: string) =>
  openResource(path, { kind: "local-path" })

export const openExportFolderPath = (path: string) =>
  openLocalPath(toLocalDirectoryPath(path))

export const openExternalUrl = (url: string) =>
  openResource(url, { kind: "external-url" })
