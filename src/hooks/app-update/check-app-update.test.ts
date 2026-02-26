import { beforeEach, describe, expect, it, vi } from "vitest"
import { checkAppUpdate, getLocalAppVersion } from "./check-app-update"

const mockGetVersion = vi.fn()

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: () => mockGetVersion(),
}))

describe("checkAppUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns upToDate when versions are equal", async () => {
    const result = await checkAppUpdate({
      getLocalVersion: async () => "1.2.3",
      fetchLatestRelease: async () => ({ tag_name: "v1.2.3" }),
    })

    expect(result).toEqual({
      status: "upToDate",
      localVersion: "1.2.3",
      remoteVersion: "1.2.3",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })
  })

  it("returns updateAvailable when remote is newer", async () => {
    const result = await checkAppUpdate({
      getLocalVersion: async () => "1.2.3",
      fetchLatestRelease: async () => ({ tag_name: "v1.3.0" }),
    })

    expect(result).toEqual({
      status: "updateAvailable",
      localVersion: "1.2.3",
      remoteVersion: "1.3.0",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })
  })

  it("returns upToDate when local is newer", async () => {
    const result = await checkAppUpdate({
      getLocalVersion: async () => "1.4.0",
      fetchLatestRelease: async () => ({ tag_name: "v1.3.9" }),
    })

    expect(result).toEqual({
      status: "upToDate",
      localVersion: "1.4.0",
      remoteVersion: "1.3.9",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })
  })

  it("returns unknown for malformed remote version", async () => {
    const result = await checkAppUpdate({
      getLocalVersion: async () => "1.2.3",
      fetchLatestRelease: async () => ({ tag_name: "latest-build" }),
    })

    expect(result).toEqual({
      status: "unknown",
      localVersion: "1.2.3",
      remoteVersion: "latest-build",
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })
  })

  it("returns unknown on remote fetch failure", async () => {
    const result = await checkAppUpdate({
      getLocalVersion: async () => "1.2.3",
      fetchLatestRelease: async () => {
        throw new Error("network down")
      },
    })

    expect(result).toEqual({
      status: "unknown",
      localVersion: "1.2.3",
      remoteVersion: null,
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })
  })

  it("treats prerelease payload as unknown", async () => {
    const result = await checkAppUpdate({
      getLocalVersion: async () => "1.2.3",
      fetchLatestRelease: async () => ({
        tag_name: "v1.3.0",
        prerelease: true,
      }),
    })

    expect(result).toEqual({
      status: "unknown",
      localVersion: "1.2.3",
      remoteVersion: null,
      releaseUrl: "https://github.com/vana-com/data-connect/releases/latest",
    })
  })
})

describe("getLocalAppVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns tauri version when runtime is tauri", async () => {
    mockGetVersion.mockResolvedValue("1.2.3")
    Object.assign(window, { __TAURI__: {} })

    const version = await getLocalAppVersion()

    expect(version).toBe("1.2.3")
    expect(mockGetVersion).toHaveBeenCalledTimes(1)
    Reflect.deleteProperty(window, "__TAURI__")
  })

  it("returns null outside tauri runtime", async () => {
    Reflect.deleteProperty(window, "__TAURI__")
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__")

    const version = await getLocalAppVersion()

    expect(version).toBeNull()
    expect(mockGetVersion).not.toHaveBeenCalled()
  })
})
