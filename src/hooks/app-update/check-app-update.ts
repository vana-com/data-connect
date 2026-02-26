import { corsFetch } from "@/lib/cors-fetch"

const GITHUB_LATEST_RELEASE_API =
  "https://api.github.com/repos/vana-com/data-connect/releases/latest"
const DEFAULT_RELEASE_PAGE_URL =
  "https://github.com/vana-com/data-connect/releases/latest"

const SEMVER_TAG_PATTERN = /^(?:v)?(\d+)\.(\d+)\.(\d+)$/

export type AppUpdateDecision =
  | {
      status: "upToDate"
      localVersion: string
      remoteVersion: string
      releaseUrl: string
    }
  | {
      status: "updateAvailable"
      localVersion: string
      remoteVersion: string
      releaseUrl: string
    }
  | {
      status: "unknown"
      localVersion: string | null
      remoteVersion: string | null
      releaseUrl: string
    }

interface GithubLatestReleaseResponse {
  tag_name?: string
  html_url?: string
  prerelease?: boolean
  draft?: boolean
}

interface CheckAppUpdateDependencies {
  getLocalVersion?: () => Promise<string | null>
  fetchLatestRelease?: () => Promise<GithubLatestReleaseResponse>
}

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  )
}

function normalizeSemverTag(value: string): string | null {
  const match = value.trim().match(SEMVER_TAG_PATTERN)
  if (!match) return null
  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`
}

function compareSemver(left: string, right: string): number {
  const leftParts = left.split(".").map(part => Number(part))
  const rightParts = right.split(".").map(part => Number(part))
  for (let index = 0; index < 3; index += 1) {
    const delta = leftParts[index] - rightParts[index]
    if (delta !== 0) return delta
  }
  return 0
}

async function fetchLatestRelease(): Promise<GithubLatestReleaseResponse> {
  const response = await corsFetch(GITHUB_LATEST_RELEASE_API)
  if (!response.ok) {
    throw new Error(`release-check-http-${response.status}`)
  }
  return response.json() as Promise<GithubLatestReleaseResponse>
}

export async function getLocalAppVersion(): Promise<string | null> {
  if (!isTauriRuntime()) {
    return null
  }

  try {
    const { getVersion } = await import("@tauri-apps/api/app")
    return await getVersion()
  } catch {
    return null
  }
}

export async function checkAppUpdate(
  dependencies: CheckAppUpdateDependencies = {}
): Promise<AppUpdateDecision> {
  const readLocalVersion = dependencies.getLocalVersion ?? getLocalAppVersion
  const readLatestRelease = dependencies.fetchLatestRelease ?? fetchLatestRelease

  const localVersionRaw = await readLocalVersion()
  const localVersion = localVersionRaw ? normalizeSemverTag(localVersionRaw) : null
  if (!localVersion) {
    return {
      status: "unknown",
      localVersion: localVersionRaw,
      remoteVersion: null,
      releaseUrl: DEFAULT_RELEASE_PAGE_URL,
    }
  }

  let latestRelease: GithubLatestReleaseResponse
  try {
    latestRelease = await readLatestRelease()
  } catch {
    return {
      status: "unknown",
      localVersion,
      remoteVersion: null,
      releaseUrl: DEFAULT_RELEASE_PAGE_URL,
    }
  }

  const releaseUrl =
    typeof latestRelease.html_url === "string" && latestRelease.html_url.length > 0
      ? latestRelease.html_url
      : DEFAULT_RELEASE_PAGE_URL

  if (latestRelease.prerelease || latestRelease.draft) {
    return {
      status: "unknown",
      localVersion,
      remoteVersion: null,
      releaseUrl,
    }
  }

  const remoteVersionRaw =
    typeof latestRelease.tag_name === "string" ? latestRelease.tag_name : ""
  const remoteVersion = normalizeSemverTag(remoteVersionRaw)
  if (!remoteVersion) {
    return {
      status: "unknown",
      localVersion,
      remoteVersion: remoteVersionRaw || null,
      releaseUrl,
    }
  }

  if (compareSemver(remoteVersion, localVersion) > 0) {
    return {
      status: "updateAvailable",
      localVersion,
      remoteVersion,
      releaseUrl,
    }
  }

  return {
    status: "upToDate",
    localVersion,
    remoteVersion,
    releaseUrl,
  }
}
