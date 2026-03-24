import { describe, expect, it } from "vitest"
import { buildUpdaterManifest } from "./build-updater-manifest.mjs"

describe("buildUpdaterManifest", () => {
  it("builds a macOS updater manifest from release assets and signatures", () => {
    const manifest = buildUpdaterManifest(
      {
        tag_name: "v0.7.42",
        published_at: "2026-03-24T08:00:00Z",
        body: "Release notes",
        assets: [
          {
            name: "DataConnect_0.7.42_aarch64.app.tar.gz",
            browser_download_url:
              "https://github.com/vana-com/data-connect/releases/download/v0.7.42/DataConnect_0.7.42_aarch64.app.tar.gz",
          },
          {
            name: "DataConnect_0.7.42_x64.app.tar.gz",
            browser_download_url:
              "https://github.com/vana-com/data-connect/releases/download/v0.7.42/DataConnect_0.7.42_x64.app.tar.gz",
          },
        ],
      },
      new Map([
        ["DataConnect_0.7.42_aarch64.app.tar.gz.sig", "sig-aarch64"],
        ["DataConnect_0.7.42_x64.app.tar.gz.sig", "sig-x64"],
      ])
    )

    expect(manifest).toEqual({
      version: "0.7.42",
      notes: "Release notes",
      pub_date: "2026-03-24T08:00:00Z",
      platforms: {
        "darwin-aarch64": {
          signature: "sig-aarch64",
          url: "https://github.com/vana-com/data-connect/releases/download/v0.7.42/DataConnect_0.7.42_aarch64.app.tar.gz",
        },
        "darwin-x86_64": {
          signature: "sig-x64",
          url: "https://github.com/vana-com/data-connect/releases/download/v0.7.42/DataConnect_0.7.42_x64.app.tar.gz",
        },
      },
    })
  })
})
