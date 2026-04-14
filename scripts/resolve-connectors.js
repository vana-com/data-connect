#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs"
import { execSync } from "child_process"
import { dirname, join, resolve as resolvePath } from "path"
import { fileURLToPath } from "url"
import {
  loadConnectorIndex,
  readJson,
  resolveConnectorArtifacts,
  sha256Buffer,
} from "@opendatalabs/data-connectors-tools/installer-core"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const CONNECTORS_DIR = join(ROOT, "connectors")
const DEPENDENCIES_PATH = join(CONNECTORS_DIR, "connector-dependencies.json")
const LOCK_PATH = join(CONNECTORS_DIR, "lock.json")
const REGISTRY_PATH = join(CONNECTORS_DIR, "registry.json")
const DEFAULT_INDEX_URL =
  "https://raw.githubusercontent.com/vana-com/data-connectors/main/connector-index.json"
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
    indexUrl: process.env.CONNECTOR_INDEX_URL || null,
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
    if (arg === "--index-url" || arg === "--registry-url") {
      out.indexUrl = args[++i] ?? null
    }
  }
  return out
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

function getSourceMeta(indexSource, resolvedConnectors) {
  if (indexSource.mode === "local" && indexSource.rootDir) {
    try {
      const sourceRef = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: indexSource.rootDir,
      })
        .toString()
        .trim()
      const sourceRevision = execSync("git rev-parse HEAD", {
        cwd: indexSource.rootDir,
      })
        .toString()
        .trim()
      return { sourceRef, sourceRevision }
    } catch {
      return {
        sourceRef: resolvePath(indexSource.rootDir),
        sourceRevision: "unknown",
      }
    }
  }

  const gitRefs = [
    ...new Set(resolvedConnectors.map(entry => entry.entry.gitRef).filter(Boolean)),
  ]
  if (gitRefs.length === 1) {
    const sourceRef = gitRefs[0]
    return {
      sourceRef,
      sourceRevision: /^[0-9a-f]{40}$/i.test(sourceRef) ? sourceRef : "unknown",
    }
  }

  return { sourceRef: "remote", sourceRevision: "unknown" }
}

function getCommitish(indexSource, resolvedConnectors) {
  const sourceMeta = getSourceMeta(indexSource, resolvedConnectors)
  if (/^[0-9a-f]{40}$/i.test(sourceMeta.sourceRevision)) {
    return sourceMeta.sourceRevision
  }
  const gitRefs = [
    ...new Set(resolvedConnectors.map(entry => entry.entry.gitRef).filter(Boolean)),
  ]
  return gitRefs.length === 1 ? gitRefs[0] : "main"
}

function buildRegistryEntry(resolved) {
  return {
    id: resolved.entry.connectorId,
    company: resolved.entry.company,
    version: resolved.entry.version,
    name: resolved.entry.name,
    status: resolved.entry.status,
    description: resolved.entry.description,
    consumerMetadata: resolved.entry.consumerMetadata ?? null,
    files: resolved.entry.sourceFiles,
    checksums: {
      script: sha256Buffer(resolved.scriptBuffer),
      metadata: sha256Buffer(resolved.manifestBuffer),
    },
  }
}

function materializeConnectors(resolution, checkMode, existingRegistry) {
  const writes = []
  const registryEntries = []
  const commitish = getCommitish(resolution.source, resolution.resolved)
  const sourceRepo =
    resolution.source.doc.sourceRepo ??
    "https://github.com/vana-com/data-connectors"
  const rawRepoBase = sourceRepo
    .replace("https://github.com/", "https://raw.githubusercontent.com/")
    .replace(/\/$/, "")

  for (const resolved of resolution.resolved) {
    const sourceFiles = resolved.entry.sourceFiles
    if (!sourceFiles?.metadata || !sourceFiles?.script) {
      throw new Error(
        `Connector ${resolved.connectorId} is missing sourceFiles metadata/script in connector-index.json`,
      )
    }

    writes.push({
      path: join(CONNECTORS_DIR, sourceFiles.metadata),
      buffer: resolved.manifestBuffer,
    })
    writes.push({
      path: join(CONNECTORS_DIR, sourceFiles.script),
      buffer: resolved.scriptBuffer,
    })

    const metadataDir = dirname(sourceFiles.metadata)
    for (const schemaFile of resolved.schemaFiles) {
      const schemaName = schemaFile.path.split("/").at(-1)
      if (!schemaName || schemaName === "manifest.schema.json") continue
      writes.push({
        path: join(CONNECTORS_DIR, metadataDir, "schemas", schemaName),
        buffer: schemaFile.buffer,
      })
    }

    for (const assetFile of resolved.assetFiles) {
      writes.push({
        path: join(CONNECTORS_DIR, metadataDir, assetFile.path),
        buffer: assetFile.buffer,
      })
    }

    if (resolved.readme) {
      writes.push({
        path: join(CONNECTORS_DIR, metadataDir, resolved.readme.path),
        buffer: resolved.readme.buffer,
      })
    }

    registryEntries.push(buildRegistryEntry(resolved))
  }

  if (!checkMode) {
    removeExistingConnectorDirs()
    for (const write of writes) {
      mkdirSync(dirname(write.path), { recursive: true })
      writeFileSync(write.path, write.buffer)
    }
  }

  return {
    writes,
    registry: {
      version: "3.0.0",
      lastUpdated:
        existingRegistry?.lastUpdated ??
        resolution.source.doc.generatedAt ??
        resolution.source.doc.lastUpdated ??
        new Date().toISOString(),
      baseUrl: `${rawRepoBase}/${commitish}/connectors`,
      connectors: registryEntries.sort((a, b) => a.id.localeCompare(b.id)),
    },
  }
}

function buildLock(indexSource, dependencies, materialized, resolution, resolvedAt) {
  const sourceMeta = getSourceMeta(indexSource, resolution.resolved)
  return {
    lock_version: "2.0",
    dependency_file: "connectors/connector-dependencies.json",
    resolved_at: resolvedAt,
    source_repo:
      indexSource.doc.sourceRepo ??
      dependencies.source_repo ??
      "https://github.com/vana-com/data-connectors",
    source_ref: sourceMeta.sourceRef,
    source_revision: sourceMeta.sourceRevision,
    index: {
      mode: indexSource.mode,
      path: indexSource.indexPath ?? null,
      url: indexSource.indexUrl,
      version: indexSource.doc.indexVersion ?? "unknown",
    },
    dependencies: dependencies.connectors,
    connectors: resolution.resolved
      .map(resolved => ({
        id: resolved.connectorId,
        company: resolved.entry.company,
        version: resolved.entry.version,
        resolved_from: resolved.constraint,
        files: resolved.entry.sourceFiles,
        checksums: {
          script: sha256Buffer(resolved.scriptBuffer),
          metadata: sha256Buffer(resolved.manifestBuffer),
          artifact: resolved.checksums.artifact,
        },
        artifact_path: resolved.entry.artifactPath ?? null,
        artifact_url: resolved.entry.artifactUrl ?? null,
        git_ref: resolved.entry.gitRef ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  }
}

function assertWritesMatch(writes) {
  for (const write of writes) {
    if (!existsSync(write.path)) {
      throw new Error(`Connector file missing: ${write.path}`)
    }
    const current = sha256Buffer(readFileSync(write.path))
    const expected = sha256Buffer(write.buffer)
    if (current !== expected) {
      throw new Error(`Connector file drift detected: ${write.path}`)
    }
  }
}

function assertTextFileMatches(path, expectedText, errorMessage) {
  const current = existsSync(path) ? readFileSync(path, "utf8") : null
  if (current !== expectedText) {
    throw new Error(errorMessage)
  }
}

async function main() {
  const { checkMode, fromLocal, indexUrl } = parseArgs()
  if (process.env.SKIP_CONNECTOR_FETCH) {
    console.log("[resolve-connectors] SKIP_CONNECTOR_FETCH set — skipping")
    return
  }

  const dependencies = readJson(DEPENDENCIES_PATH)
  const existingLock = existsSync(LOCK_PATH) ? readJson(LOCK_PATH) : null
  const existingRegistry = existsSync(REGISTRY_PATH) ? readJson(REGISTRY_PATH) : null
  const indexSource = await loadConnectorIndex({
    fromLocal,
    indexUrl,
    defaultIndexUrl: DEFAULT_INDEX_URL,
  })
  const resolution = await resolveConnectorArtifacts({
    dependencies,
    source: indexSource,
  })
  const materialized = materializeConnectors(resolution, checkMode, existingRegistry)
  const nextRegistryText = `${JSON.stringify(materialized.registry, null, 2)}\n`
  const nextLock = buildLock(
    indexSource,
    dependencies,
    materialized,
    resolution,
    checkMode && existingLock?.resolved_at
      ? existingLock.resolved_at
      : new Date().toISOString(),
  )
  const nextLockText = `${JSON.stringify(nextLock, null, 2)}\n`

  if (checkMode) {
    assertWritesMatch(materialized.writes)
    assertTextFileMatches(
      REGISTRY_PATH,
      nextRegistryText,
      "Connector registry drift detected. Run `node scripts/resolve-connectors.js`.",
    )
    assertTextFileMatches(
      LOCK_PATH,
      nextLockText,
      "Connector lock drift detected. Run `node scripts/resolve-connectors.js`.",
    )
    console.log("[resolve-connectors] Connector registry is up to date.")
    return
  }

  writeFileSync(REGISTRY_PATH, nextRegistryText)
  writeFileSync(LOCK_PATH, nextLockText)
  console.log(
    `[resolve-connectors] Resolved ${materialized.registry.connectors.length} connector(s) from ${
      indexSource.mode === "local" ? indexSource.rootDir : indexSource.indexUrl
    }`,
  )
}

main().catch(error => {
  console.error(`[resolve-connectors] ERROR: ${error.message}`)
  process.exit(1)
})
