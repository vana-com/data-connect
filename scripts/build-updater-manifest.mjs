#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { basename, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const SEMVER_TAG_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/
const MACOS_UPDATER_ASSET_PATTERN =
  /^(.+?)_(\d+\.\d+\.\d+)_(aarch64|arm64|x86_64|x64)\.app\.tar\.gz$/
const REQUIRED_PLATFORM_KEYS = ["darwin-aarch64", "darwin-x86_64"]

function printHelp() {
  console.log(`Usage: node scripts/build-updater-manifest.mjs --release-json <path> --signature-dir <path> --output <path>

Build a Tauri-compatible static updater manifest from a GitHub release payload
and downloaded signature files.`)
}

function parseArgs(argv) {
  const args = {
    output: null,
    releaseJson: null,
    signatureDir: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--help" || arg === "-h") {
      args.help = true
      continue
    }

    if (arg === "--output") {
      args.output = argv[index + 1] ?? null
      index += 1
      continue
    }

    if (arg === "--release-json") {
      args.releaseJson = argv[index + 1] ?? null
      index += 1
      continue
    }

    if (arg === "--signature-dir") {
      args.signatureDir = argv[index + 1] ?? null
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function normalizeVersion(rawVersion) {
  if (typeof rawVersion !== "string") {
    throw new Error("Release payload is missing tag_name")
  }

  const match = rawVersion.trim().match(SEMVER_TAG_PATTERN)
  if (!match) {
    throw new Error(`Release tag is not a stable semver: ${rawVersion}`)
  }

  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`
}

function resolvePlatformEntry(assetName, releaseVersion) {
  const match = assetName.match(MACOS_UPDATER_ASSET_PATTERN)
  if (!match) return null

  const assetVersion = match[2]
  if (assetVersion !== releaseVersion) return null

  const arch = match[3]
  if (arch === "aarch64" || arch === "arm64") {
    return { platformKey: "darwin-aarch64", signatureName: `${assetName}.sig` }
  }
  if (arch === "x86_64" || arch === "x64") {
    return { platformKey: "darwin-x86_64", signatureName: `${assetName}.sig` }
  }

  return null
}

function readSignatureMap(signatureDir) {
  const entries = readdirSync(signatureDir, { withFileTypes: true })
  const signatures = new Map()

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".sig")) continue

    const signaturePath = resolve(signatureDir, entry.name)
    const signature = readFileSync(signaturePath, "utf8").trim()
    if (!signature) {
      throw new Error(`Signature file is empty: ${signaturePath}`)
    }
    signatures.set(entry.name, signature)
  }

  return signatures
}

function readReleasePayload(releaseJsonPath) {
  return JSON.parse(readFileSync(releaseJsonPath, "utf8"))
}

export function buildUpdaterManifest(release, signatures) {
  const version = normalizeVersion(release.tag_name ?? release.tagName)
  const publishedAt = release.published_at ?? release.publishedAt
  const notes = typeof release.body === "string" ? release.body.trim() : ""
  const rawAssets = Array.isArray(release.assets) ? release.assets : []
  const platforms = {}

  for (const asset of rawAssets) {
    const assetName = typeof asset.name === "string" ? asset.name : ""
    const resolvedEntry = resolvePlatformEntry(assetName, version)
    if (!resolvedEntry) continue

    const assetUrl =
      typeof asset.browser_download_url === "string"
        ? asset.browser_download_url
        : typeof asset.browserDownloadUrl === "string"
          ? asset.browserDownloadUrl
          : null

    if (!assetUrl) {
      throw new Error(
        `Release asset is missing browser_download_url: ${assetName}`
      )
    }

    if (platforms[resolvedEntry.platformKey]) {
      throw new Error(
        `Multiple updater assets matched ${resolvedEntry.platformKey}`
      )
    }

    const signature = signatures.get(resolvedEntry.signatureName)
    if (!signature) {
      throw new Error(`Missing signature content for asset: ${assetName}`)
    }

    platforms[resolvedEntry.platformKey] = {
      signature,
      url: assetUrl,
    }
  }

  for (const platformKey of REQUIRED_PLATFORM_KEYS) {
    if (!platforms[platformKey]) {
      throw new Error(`Missing updater asset for platform: ${platformKey}`)
    }
  }

  return {
    version,
    ...(notes ? { notes } : {}),
    ...(typeof publishedAt === "string" && publishedAt.length > 0
      ? { pub_date: publishedAt }
      : {}),
    platforms,
  }
}

export function writeUpdaterManifest(outputPath, manifest) {
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  if (!args.releaseJson) {
    throw new Error("Missing required --release-json argument")
  }
  if (!args.signatureDir) {
    throw new Error("Missing required --signature-dir argument")
  }
  if (!args.output) {
    throw new Error("Missing required --output argument")
  }

  const releaseJsonPath = resolve(args.releaseJson)
  const signatureDir = resolve(args.signatureDir)
  const outputPath = resolve(args.output)

  const release = readReleasePayload(releaseJsonPath)
  const signatures = readSignatureMap(signatureDir)
  const manifest = buildUpdaterManifest(release, signatures)
  writeUpdaterManifest(outputPath, manifest)

  console.log(`Created updater manifest: ${basename(outputPath)}`)
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    main()
  } catch (error) {
    console.error(
      `\n❌ ${error instanceof Error ? error.message : String(error)}`
    )
    process.exit(1)
  }
}
