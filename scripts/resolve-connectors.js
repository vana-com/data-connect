#!/usr/bin/env node

import { createHash } from "crypto"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs"
import { dirname, join, resolve as resolvePath } from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const CONNECTORS_DIR = join(ROOT, "connectors")
const DEPENDENCIES_PATH = join(CONNECTORS_DIR, "connector-dependencies.json")
const LOCK_PATH = join(CONNECTORS_DIR, "lock.json")
const REGISTRY_PATH = join(CONNECTORS_DIR, "registry.json")
const DEFAULT_LOCAL_SOURCE = join(ROOT, "..", "data-connectors")
const DEFAULT_REGISTRY_URL =
  "https://raw.githubusercontent.com/vana-com/data-connectors/main/registry.json"
const NON_CONNECTOR_FILES = new Set([
  "connector-dependencies.json",
  "connector-dependencies.schema.json",
  "index.ts",
  "lock.json",
  "registry.json",
  "types",
])

function parseArgs() {
  const out = {
    checkMode: false,
    fromLocal: process.env.CONNECTORS_PATH || null,
    registryUrl: process.env.REGISTRY_URL || null,
  }
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === "--check") {
      out.checkMode = true
      continue
    }
    if (arg === "--from-local" || arg === "--from") {
      out.fromLocal = args[++i] ?? null
      continue
    }
    if (arg === "--registry-url") {
      out.registryUrl = args[++i] ?? null
    }
  }
  return out
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function sha256Buffer(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim())
  if (!match) {
    throw new Error(`Unsupported version format "${version}"`)
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

function compareVersions(a, b) {
  const av = typeof a === "string" ? parseVersion(a) : a
  const bv = typeof b === "string" ? parseVersion(b) : b
  if (av.major !== bv.major) return av.major - bv.major
  if (av.minor !== bv.minor) return av.minor - bv.minor
  return av.patch - bv.patch
}

function evaluateComparator(version, comparator) {
  const match = /^(>=|<=|>|<|=|\^|~)?\s*(\d+\.\d+\.\d+)$/.exec(comparator)
  if (!match) {
    throw new Error(`Unsupported comparator "${comparator}"`)
  }
  const operator = match[1] ?? "="
  const target = parseVersion(match[2])
  const cmp = compareVersions(version, target)
  switch (operator) {
    case "=":
      return cmp === 0
    case ">":
      return cmp > 0
    case ">=":
      return cmp >= 0
    case "<":
      return cmp < 0
    case "<=":
      return cmp <= 0
    case "^":
      return (
        cmp >= 0 &&
        compareVersions(version, {
          major: target.major + 1,
          minor: 0,
          patch: 0,
        }) < 0
      )
    case "~":
      return (
        cmp >= 0 &&
        compareVersions(version, {
          major: target.major,
          minor: target.minor + 1,
          patch: 0,
        }) < 0
      )
    default:
      return false
  }
}

function satisfies(version, range) {
  const normalized = range.trim()
  if (normalized === "*" || normalized === "") return true
  const parsed = parseVersion(version)
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .every(token => evaluateComparator(parsed, token))
}

function findFirst(dir, predicate) {
  if (!existsSync(dir)) return null
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      const nested = findFirst(full, predicate)
      if (nested) return nested
    } else if (predicate(entry, full)) {
      return full
    }
  }
  return null
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    )
  }
  return response.json()
}

async function fetchBinary(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    )
  }
  return Buffer.from(await response.arrayBuffer())
}

async function loadRegistrySource({ fromLocal, registryUrl }) {
  const resolvedLocal = resolvePath(fromLocal ?? DEFAULT_LOCAL_SOURCE)
  if (existsSync(resolvedLocal)) {
    const doc = readJson(join(resolvedLocal, "registry.json"))
    let sourceRef = "unknown"
    let sourceRevision = "unknown"
    try {
      sourceRef = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: resolvedLocal,
      })
        .toString()
        .trim()
      sourceRevision = execSync("git rev-parse HEAD", { cwd: resolvedLocal })
        .toString()
        .trim()
    } catch {}
    return {
      mode: "local",
      rootDir: resolvedLocal,
      registryUrl: null,
      doc,
      sourceRepo: "https://github.com/vana-com/data-connectors",
      sourceRef,
      sourceRevision,
    }
  }

  const url = registryUrl ?? DEFAULT_REGISTRY_URL
  const doc = await fetchJson(url)
  return {
    mode: "remote",
    rootDir: null,
    registryUrl: url,
    doc,
    sourceRepo: "https://github.com/vana-com/data-connectors",
    sourceRef: "remote",
    sourceRevision: "unknown",
  }
}

function selectResolvedEntry(entries, constraint, connectorId) {
  const matches = entries.filter(entry => satisfies(entry.version, constraint))
  if (matches.length === 0) {
    const available = entries.map(entry => entry.version).join(", ")
    throw new Error(
      `No published version for ${connectorId} satisfies "${constraint}". Available: ${available || "(none)"}`
    )
  }
  return matches.sort((a, b) => compareVersions(b.version, a.version))[0]
}

function extractAvailableVersions(doc, connectorId) {
  if (Array.isArray(doc.connectors)) {
    const entry = doc.connectors.find(candidate => candidate.id === connectorId)
    return entry ? [entry] : []
  }
  if (doc.connectors && typeof doc.connectors === "object") {
    const entries = doc.connectors[connectorId]
    return Array.isArray(entries) ? entries : []
  }
  throw new Error("Unsupported registry document shape")
}

function localRegistryFile(rootDir, relativePath) {
  const candidates = [
    join(rootDir, relativePath),
    join(rootDir, "connectors", relativePath),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

function resolveLocalFile(rootDir, entry, fileKey, extension) {
  const relativePath = entry.files?.[fileKey]
  if (relativePath) {
    const exact = localRegistryFile(rootDir, relativePath)
    if (exact) return exact
  }
  return findFirst(rootDir, name => name === `${entry.id}.${extension}`)
}

function verifyChecksum(label, expected, actual) {
  if (expected && expected !== actual) {
    throw new Error(
      `${label} checksum mismatch: expected ${expected}, got ${actual}`
    )
  }
}

function verifyPublishedVersion(
  connectorId,
  manifestVersion,
  publishedVersion
) {
  if (publishedVersion && manifestVersion !== publishedVersion) {
    throw new Error(
      `${connectorId} version mismatch: registry says ${publishedVersion} but manifest declares ${manifestVersion}`
    )
  }
}

function buildRegistryEntry(resolvedEntry, manifestChecksum, scriptChecksum) {
  return {
    id: resolvedEntry.id,
    company: resolvedEntry.company,
    version: resolvedEntry.version,
    name: resolvedEntry.name,
    status: resolvedEntry.status,
    description: resolvedEntry.description,
    consumerMetadata: resolvedEntry.consumerMetadata,
    files: resolvedEntry.files,
    checksums: {
      script: scriptChecksum,
      metadata: manifestChecksum,
    },
  }
}

function removeExistingConnectorDirs() {
  for (const entry of readdirSync(CONNECTORS_DIR)) {
    if (entry.startsWith(".") || NON_CONNECTOR_FILES.has(entry)) continue
    const full = join(CONNECTORS_DIR, entry)
    if (statSync(full).isDirectory()) {
      rmSync(full, { recursive: true, force: true })
    }
  }
}

function buildLock(registrySource, dependencies, resolvedRegistry, resolvedAt) {
  return {
    lock_version: "1.0",
    dependency_file: "connectors/connector-dependencies.json",
    resolved_at: resolvedAt,
    source_repo: registrySource.sourceRepo,
    source_ref: registrySource.sourceRef,
    source_revision: registrySource.sourceRevision,
    registry: {
      mode: registrySource.mode,
      url: registrySource.registryUrl,
      version: registrySource.doc.version ?? "unknown",
    },
    dependencies: dependencies.connectors,
    connectors: resolvedRegistry.connectors.map(connector => ({
      id: connector.id,
      company: connector.company,
      version: connector.version,
      resolved_from: dependencies.connectors[connector.id],
      files: connector.files,
      checksums: connector.checksums,
    })),
  }
}

async function main() {
  const { checkMode, fromLocal, registryUrl } = parseArgs()
  if (process.env.SKIP_CONNECTOR_FETCH) {
    console.log("[resolve-connectors] SKIP_CONNECTOR_FETCH set — skipping")
    return
  }

  const dependencies = readJson(DEPENDENCIES_PATH)
  const existingLock = existsSync(LOCK_PATH) ? readJson(LOCK_PATH) : null
  const registrySource = await loadRegistrySource({ fromLocal, registryUrl })
  const pendingWrites = []
  const registryEntries = []

  for (const [connectorId, constraint] of Object.entries(
    dependencies.connectors
  )) {
    const availableEntries = extractAvailableVersions(
      registrySource.doc,
      connectorId
    )
    const resolvedEntry = selectResolvedEntry(
      availableEntries,
      constraint,
      connectorId
    )

    let manifestBuffer
    let scriptBuffer
    let manifest

    if (registrySource.mode === "local") {
      const manifestPath = resolveLocalFile(
        registrySource.rootDir,
        resolvedEntry,
        "metadata",
        "json"
      )
      const scriptPath = resolveLocalFile(
        registrySource.rootDir,
        resolvedEntry,
        "script",
        "js"
      )
      if (!manifestPath || !scriptPath) {
        throw new Error(`Could not find local files for ${connectorId}`)
      }
      manifestBuffer = readFileSync(manifestPath)
      scriptBuffer = readFileSync(scriptPath)
    } else {
      const baseUrl = registrySource.doc.baseUrl.replace(/\/$/, "")
      manifestBuffer = await fetchBinary(
        `${baseUrl}/${resolvedEntry.files.metadata}`
      )
      scriptBuffer = await fetchBinary(
        `${baseUrl}/${resolvedEntry.files.script}`
      )
    }

    manifest = JSON.parse(manifestBuffer.toString("utf8"))
    const manifestChecksum = sha256Buffer(manifestBuffer)
    const scriptChecksum = sha256Buffer(scriptBuffer)
    verifyPublishedVersion(connectorId, manifest.version, resolvedEntry.version)
    verifyChecksum(
      `${connectorId} metadata`,
      resolvedEntry.checksums?.metadata,
      manifestChecksum
    )
    verifyChecksum(
      `${connectorId} script`,
      resolvedEntry.checksums?.script,
      scriptChecksum
    )

    pendingWrites.push({
      path: join(CONNECTORS_DIR, resolvedEntry.files.metadata),
      buffer: manifestBuffer,
    })
    pendingWrites.push({
      path: join(CONNECTORS_DIR, resolvedEntry.files.script),
      buffer: scriptBuffer,
    })

    registryEntries.push(
      buildRegistryEntry(resolvedEntry, manifestChecksum, scriptChecksum)
    )
  }

  const nextRegistry = {
    version: registrySource.doc.version ?? "unknown",
    lastUpdated: registrySource.doc.lastUpdated ?? new Date().toISOString(),
    baseUrl: registrySource.doc.baseUrl,
    connectors: registryEntries.sort((a, b) => a.id.localeCompare(b.id)),
  }

  const nextLock = buildLock(
    registrySource,
    dependencies,
    nextRegistry,
    checkMode && existingLock?.resolved_at
      ? existingLock.resolved_at
      : new Date().toISOString()
  )

  const nextRegistryText = `${JSON.stringify(nextRegistry, null, 2)}\n`
  const nextLockText = `${JSON.stringify(nextLock, null, 2)}\n`

  if (checkMode) {
    const currentRegistry = existsSync(REGISTRY_PATH)
      ? readFileSync(REGISTRY_PATH, "utf8")
      : null
    const currentLock = existsSync(LOCK_PATH)
      ? readFileSync(LOCK_PATH, "utf8")
      : null
    if (currentRegistry !== nextRegistryText || currentLock !== nextLockText) {
      throw new Error(
        "Connector registry drift detected. Run `node scripts/resolve-connectors.js`."
      )
    }
    console.log("[resolve-connectors] Connector registry is up to date.")
    return
  }

  removeExistingConnectorDirs()
  for (const write of pendingWrites) {
    mkdirSync(dirname(write.path), { recursive: true })
    writeFileSync(write.path, write.buffer)
  }
  writeFileSync(REGISTRY_PATH, nextRegistryText)
  writeFileSync(LOCK_PATH, nextLockText)
  console.log(
    `[resolve-connectors] Resolved ${nextRegistry.connectors.length} connector(s) from ${
      registrySource.mode === "local"
        ? registrySource.rootDir
        : registrySource.registryUrl
    }`
  )
}

main().catch(error => {
  console.error(`[resolve-connectors] ERROR: ${error.message}`)
  process.exit(1)
})
