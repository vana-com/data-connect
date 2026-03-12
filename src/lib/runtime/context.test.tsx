import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import type { ReactNode } from "react"

describe("runtime detection", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    delete (window as { __TAURI__?: unknown }).__TAURI__
    delete (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  })

  it("detects Tauri runtime when __TAURI__ is present", async () => {
    Object.defineProperty(window, "__TAURI__", {
      configurable: true,
      value: {},
    })

    const { isTauri } = await import("./context")
    expect(isTauri).toBe(true)
  })

  it("detects Tauri runtime when __TAURI_INTERNALS__ is present", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {},
    })

    const { isTauri } = await import("./context")
    expect(isTauri).toBe(true)
  })

  it("detects HTTP runtime when neither __TAURI__ nor __TAURI_INTERNALS__ is present", async () => {
    const { isTauri } = await import("./context")
    expect(isTauri).toBe(false)
  })

  it("useRuntime throws when used outside RuntimeProvider", async () => {
    const { useRuntime } = await import("./context")

    expect(() => {
      renderHook(() => useRuntime())
    }).toThrow("useRuntime must be used within a RuntimeProvider")
  })

  it("useRuntime returns a runtime when used inside RuntimeProvider", async () => {
    const { useRuntime, RuntimeProvider } = await import("./context")

    const wrapper = ({ children }: { children: ReactNode }) => (
      <RuntimeProvider>{children}</RuntimeProvider>
    )

    const { result } = renderHook(() => useRuntime(), { wrapper })
    expect(result.current).toBeDefined()
    expect(result.current.mode).toBe("http") // No __TAURI__ in test env
    expect(typeof result.current.invoke).toBe("function")
    expect(typeof result.current.onEvent).toBe("function")
  })
})
