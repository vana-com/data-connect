import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("tauri updater config", () => {
  it("points at the stable latest manifest with a public key", () => {
    const filePath = resolve(process.cwd(), "src-tauri/tauri.conf.json")
    const document = JSON.parse(readFileSync(filePath, "utf-8")) as {
      bundle?: { createUpdaterArtifacts?: boolean }
      plugins?: {
        updater?: {
          endpoints?: string[]
          pubkey?: string
        }
      }
    }

    expect(document.bundle?.createUpdaterArtifacts).toBe(true)
    expect(document.plugins?.updater?.endpoints).toEqual([
      "https://github.com/vana-com/data-connect/releases/latest/download/latest.json",
    ])
    expect(document.plugins?.updater?.pubkey).toBeTruthy()
  })
})
