import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { buildUpdaterManifest } from "./build-updater-manifest.mjs"

function createReleaseAsset(name) {
  return {
    name,
    browser_download_url: `https://github.com/vana-com/data-connect/releases/download/v1.2.4/${name}`,
  }
}

function createReleaseFixture(assets) {
  return {
    tag_name: "v1.2.4",
    body: "Release notes",
    published_at: "2026-03-24T09:10:11Z",
    assets,
  }
}

function writeSignatures(entries) {
  const directory = mkdtempSync(join(tmpdir(), "dataconnect-updater-manifest-"))
  for (const [filename, contents] of entries) {
    writeFileSync(join(directory, filename), `${contents}\n`, "utf8")
  }
  return directory
}

const tempDirectories = []

function trackDirectory(directory) {
  tempDirectories.push(directory)
  return directory
}

afterEach(() => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop()
    if (directory) {
      rmSync(directory, { force: true, recursive: true })
    }
  }
})

describe("buildUpdaterManifest", () => {
  it("builds one canonical manifest for both macOS updater targets", () => {
    const release = createReleaseFixture([
      createReleaseAsset("DataConnect_1.2.4_aarch64.app.tar.gz"),
      createReleaseAsset("DataConnect_1.2.4_aarch64.app.tar.gz.sig"),
      createReleaseAsset("DataConnect_1.2.4_x86_64.app.tar.gz"),
      createReleaseAsset("DataConnect_1.2.4_x86_64.app.tar.gz.sig"),
    ])
    const signaturesDir = trackDirectory(
      writeSignatures([
        ["DataConnect_1.2.4_aarch64.app.tar.gz.sig", "arm-signature"],
        ["DataConnect_1.2.4_x86_64.app.tar.gz.sig", "intel-signature"],
      ])
    )

    expect(
      buildUpdaterManifest(release, {
        signaturesDir,
      })
    ).toEqual({
      version: "1.2.4",
      notes: "Release notes",
      pub_date: "2026-03-24T09:10:11Z",
      platforms: {
        "darwin-aarch64": {
          signature: "arm-signature",
          url: "https://github.com/vana-com/data-connect/releases/download/v1.2.4/DataConnect_1.2.4_aarch64.app.tar.gz",
        },
        "darwin-x86_64": {
          signature: "intel-signature",
          url: "https://github.com/vana-com/data-connect/releases/download/v1.2.4/DataConnect_1.2.4_x86_64.app.tar.gz",
        },
      },
    })
  })

  it("normalizes legacy asset aliases into canonical manifest targets", () => {
    const release = createReleaseFixture([
      createReleaseAsset("DataConnect_1.2.4_arm64.app.tar.gz"),
      createReleaseAsset("DataConnect_1.2.4_arm64.app.tar.gz.sig"),
      createReleaseAsset("DataConnect_1.2.4_x64.app.tar.gz"),
      createReleaseAsset("DataConnect_1.2.4_x64.app.tar.gz.sig"),
    ])
    const signaturesDir = trackDirectory(
      writeSignatures([
        ["DataConnect_1.2.4_arm64.app.tar.gz.sig", "arm-signature"],
        ["DataConnect_1.2.4_x64.app.tar.gz.sig", "intel-signature"],
      ])
    )

    const manifest = buildUpdaterManifest(release, {
      signaturesDir,
    })

    expect(Object.keys(manifest.platforms)).toEqual([
      "darwin-aarch64",
      "darwin-x86_64",
    ])
  })

  it("fails when multiple tarballs normalize to the same target", () => {
    const release = createReleaseFixture([
      createReleaseAsset("DataConnect_1.2.4_aarch64.app.tar.gz"),
      createReleaseAsset("DataConnect_1.2.4_aarch64.app.tar.gz.sig"),
      createReleaseAsset("DataConnect_1.2.4_arm64.app.tar.gz"),
      createReleaseAsset("DataConnect_1.2.4_arm64.app.tar.gz.sig"),
      createReleaseAsset("DataConnect_1.2.4_x86_64.app.tar.gz"),
      createReleaseAsset("DataConnect_1.2.4_x86_64.app.tar.gz.sig"),
    ])
    const signaturesDir = trackDirectory(
      writeSignatures([
        ["DataConnect_1.2.4_aarch64.app.tar.gz.sig", "arm-signature"],
        ["DataConnect_1.2.4_arm64.app.tar.gz.sig", "duplicate-arm-signature"],
        ["DataConnect_1.2.4_x86_64.app.tar.gz.sig", "intel-signature"],
      ])
    )

    expect(() =>
      buildUpdaterManifest(release, {
        signaturesDir,
      })
    ).toThrow(
      "Multiple updater tarballs map to darwin-aarch64: 'DataConnect_1.2.4_aarch64.app.tar.gz' and 'DataConnect_1.2.4_arm64.app.tar.gz'"
    )
  })

  it("fails when a required signature asset is missing", () => {
    const release = createReleaseFixture([
      createReleaseAsset("DataConnect_1.2.4_aarch64.app.tar.gz"),
      createReleaseAsset("DataConnect_1.2.4_aarch64.app.tar.gz.sig"),
      createReleaseAsset("DataConnect_1.2.4_x86_64.app.tar.gz"),
    ])
    const signaturesDir = trackDirectory(
      writeSignatures([["DataConnect_1.2.4_aarch64.app.tar.gz.sig", "arm-signature"]])
    )

    expect(() =>
      buildUpdaterManifest(release, {
        signaturesDir,
      })
    ).toThrow(
      "Expected exactly one signature asset for 'DataConnect_1.2.4_x86_64.app.tar.gz', found 0"
    )
  })
})
