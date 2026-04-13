#!/usr/bin/env node

import { spawnSync } from "child_process"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const resolveScript = join(__dirname, "resolve-connectors.js")
const generateScript = join(__dirname, "generate-platform-registry.js")

const run = script => {
  const result = spawnSync(process.execPath, [script], {
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
  run(resolveScript)
  run(generateScript)
} catch (error) {
  console.error(`[fetch-connectors] ERROR: ${error.message}`)
  process.exit(1)
}
