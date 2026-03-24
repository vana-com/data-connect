import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

interface CapabilityDocument {
  platforms?: string[]
  permissions: Array<string | { identifier: string; allow?: unknown[] }>
}

describe("default desktop capabilities", () => {
  it("allows clipboard manager text writes", () => {
    const filePath = resolve(process.cwd(), "src-tauri/capabilities/default.json")
    const document = JSON.parse(
      readFileSync(filePath, "utf-8")
    ) as CapabilityDocument

    const hasWriteTextPermission = document.permissions.some(
      permission => permission === "clipboard-manager:allow-write-text"
    )

    expect(hasWriteTextPermission).toBe(true)
  })

  it("keeps updater and process permissions macOS-only", () => {
    const filePath = resolve(
      process.cwd(),
      "src-tauri/capabilities/updater-macos.json"
    )
    const document = JSON.parse(
      readFileSync(filePath, "utf-8")
    ) as CapabilityDocument

    expect(document.platforms).toEqual(["macOS"])
    expect(document.permissions).toContain("process:default")
    expect(document.permissions).toContain("updater:default")
  })
})
