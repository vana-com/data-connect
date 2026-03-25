#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const TARGET_ALIASES = new Map([
  ["aarch64", "aarch64"],
  ["arm64", "aarch64"],
  ["x86_64", "x86_64"],
  ["x64", "x86_64"],
])

const REQUIRED_TARGETS = ["aarch64", "x86_64"]
const MACOS_UPDATER_TARBALL_PATTERN = /\.app\.tar\.gz$/i

function fail(message) {
  throw new Error(message)
}

function parseArgs(argv) {
  const args = {
    releaseJson: "",
    signaturesDir: "",
    output: "",
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === "--release-json") {
      args.releaseJson = argv[index + 1] ?? ""
      index += 1
      continue
    }
    if (token === "--signatures-dir") {
      args.signaturesDir = argv[index + 1] ?? ""
      index += 1
      continue
    }
    if (token === "--output") {
      args.output = argv[index + 1] ?? ""
      index += 1
      continue
    }
    fail(`Unknown argument: ${token}`)
  }

  if (!args.releaseJson) {
    fail("Missing required argument: --release-json <path>")
  }
  if (!args.signaturesDir) {
    fail("Missing required argument: --signatures-dir <path>")
  }
  if (!args.output) {
    fail("Missing required argument: --output <path>")
  }

  return args
}

function normalizeVersion(version) {
  if (typeof version !== "string" || version.trim().length === 0) {
    fail("Release metadata is missing a valid tag name")
  }

  return version.trim().replace(/^v/, "")
}

function findTargetToken(assetName) {
  const matcher = /(?:^|[_-])(aarch64|arm64|x86_64|x64)(?=[._-]|$)/gi
  const matches = [...assetName.matchAll(matcher)]

  if (matches.length === 0) {
    fail(`Could not determine macOS updater target from asset '${assetName}'`)
  }

  if (matches.length > 1) {
    fail(`Asset '${assetName}' maps to multiple target tokens`)
  }

  const rawTarget = matches[0][1]?.toLowerCase()
  const normalizedTarget = rawTarget ? TARGET_ALIASES.get(rawTarget) : null
  if (!normalizedTarget) {
    fail(`Unsupported macOS updater target '${rawTarget}' in asset '${assetName}'`)
  }

  return normalizedTarget
}

function getMacOsUpdaterTarballs(assets) {
  const manifestAssetsByTarget = new Map()

  for (const asset of assets) {
    if (!MACOS_UPDATER_TARBALL_PATTERN.test(asset.name)) continue

    const normalizedTarget = findTargetToken(asset.name)
    if (manifestAssetsByTarget.has(normalizedTarget)) {
      const existingAsset = manifestAssetsByTarget.get(normalizedTarget)
      fail(
        `Multiple updater tarballs map to darwin-${normalizedTarget}: '${existingAsset.name}' and '${asset.name}'`
      )
    }

    manifestAssetsByTarget.set(normalizedTarget, asset)
  }

  for (const target of REQUIRED_TARGETS) {
    if (!manifestAssetsByTarget.has(target)) {
      fail(`Missing macOS updater tarball for darwin-${target}`)
    }
  }

  return manifestAssetsByTarget
}

function getSignatureAsset(assets, tarballAssetName) {
  const expectedSignatureName = `${tarballAssetName}.sig`
  const matches = assets.filter(asset => asset.name === expectedSignatureName)

  if (matches.length !== 1) {
    fail(
      `Expected exactly one signature asset for '${tarballAssetName}', found ${matches.length}`
    )
  }

  return matches[0]
}

function readSignature(signaturesDir, signatureAssetName) {
  const signaturePath = resolve(signaturesDir, signatureAssetName)

  let signature
  try {
    signature = readFileSync(signaturePath, "utf8").trim()
  } catch (error) {
    fail(
      `Failed to read signature file '${signatureAssetName}' from '${signaturesDir}': ${String(
        error
      )}`
    )
  }

  if (!signature) {
    fail(`Signature file '${signatureAssetName}' is empty`)
  }

  return signature
}

function getReleaseNotes(release) {
  return typeof release.body === "string" ? release.body : ""
}

function getPublicationDate(release) {
  if (typeof release.published_at === "string" && release.published_at.length > 0) {
    return release.published_at
  }

  if (typeof release.created_at === "string" && release.created_at.length > 0) {
    return release.created_at
  }

  return ""
}

function normalizeReleaseAsset(asset) {
  if (
    !asset ||
    typeof asset.name !== "string" ||
    typeof asset.browser_download_url !== "string"
  ) {
    fail("Release metadata contains an asset without the required fields")
  }

  return {
    name: asset.name,
    browser_download_url: asset.browser_download_url,
  }
}

export function buildUpdaterManifest(release, options) {
  const assets = Array.isArray(release.assets)
    ? release.assets.map(normalizeReleaseAsset)
    : fail("Release metadata is missing an assets array")
  const version = normalizeVersion(release.tag_name)
  const publicationDate = getPublicationDate(release)
  const tarballsByTarget = getMacOsUpdaterTarballs(assets)

  const platforms = {}

  for (const target of REQUIRED_TARGETS) {
    const tarballAsset = tarballsByTarget.get(target)
    const signatureAsset = getSignatureAsset(assets, tarballAsset.name)
    const signature = readSignature(options.signaturesDir, signatureAsset.name)

    platforms[`darwin-${target}`] = {
      signature,
      url: tarballAsset.browser_download_url,
    }
  }

  return {
    version,
    notes: getReleaseNotes(release),
    pub_date: publicationDate,
    platforms,
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const releasePath = resolve(args.releaseJson)
  const rawRelease = readFileSync(releasePath, "utf8")
  const release = JSON.parse(rawRelease)
  const manifest = buildUpdaterManifest(release, {
    signaturesDir: args.signaturesDir,
  })

  writeFileSync(args.output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
