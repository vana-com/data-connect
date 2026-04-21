#!/usr/bin/env node

// Legacy wrapper kept for existing install/dev entrypoints during the migration.

import { spawnSync } from "child_process"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const resolveScript = join(__dirname, "resolve-connectors.js")
const generateScript = join(__dirname, "generate-platform-registry.js")

const run = (script, args = []) => {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${script} exited with status ${result.status}`)
  }
}

try {
  const check = spawnSync(process.execPath, [resolveScript, "--check"], {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  })
  if (check.error) throw check.error
  if (check.status !== 0) {
    run(resolveScript)
  }
  run(generateScript)
} catch (error) {
  console.error(`[fetch-connectors] legacy wrapper failed: ${error.message}`)
  process.exit(1)
}
