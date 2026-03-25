import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

interface CapabilityDocument {
  platforms?: string[]
  permissions: Array<string | { identifier: string; allow?: unknown[] }>
}

describe("default desktop capabilities", () => {
  it("keeps updater and process permissions out of the shared capability", () => {
    const filePath = resolve(process.cwd(), "src-tauri/capabilities/default.json")
    const document = JSON.parse(
      readFileSync(filePath, "utf-8")
    ) as CapabilityDocument

    const stringPermissions = document.permissions.filter(
      permission => typeof permission === "string"
    )

    expect(stringPermissions).not.toContain("updater:allow-check")
    expect(stringPermissions).not.toContain("updater:allow-download")
    expect(stringPermissions).not.toContain("updater:allow-install")
    expect(stringPermissions).not.toContain("process:allow-restart")
  })

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
})

describe("macOS updater capabilities", () => {
  it("scope updater and restart permissions to macOS main window only", () => {
    const filePath = resolve(
      process.cwd(),
      "src-tauri/capabilities/updater-macos.json"
    )
    const document = JSON.parse(
      readFileSync(filePath, "utf-8")
    ) as CapabilityDocument & { windows?: string[] }

    expect(document.platforms).toEqual(["macOS"])
    expect(document.windows).toEqual(["main"])
    expect(document.permissions).toEqual([
      "updater:allow-check",
      "updater:allow-download",
      "updater:allow-install",
      "process:allow-restart",
    ])
  })
})
