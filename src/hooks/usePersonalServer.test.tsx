import { beforeEach, describe, expect, it, vi, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"

// --- Tauri mocks ---

const mockInvoke = vi.fn()

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

type EventHandler = (event: { payload: unknown }) => void
const listeners = new Map<string, EventHandler>()

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn((eventName: string, handler: EventHandler) => {
    listeners.set(eventName, handler)
    return Promise.resolve(() => {
      listeners.delete(eventName)
    })
  }),
}))

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn(() => Promise.reject(new Error("not ready"))),
}))

// --- Redux mock ---

let authState = {
  walletAddress: null as string | null,
  masterKeySignature: null as string | null,
}

vi.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ app: { auth: authState } }),
}))

vi.mock("../state/store", () => ({
  // RootState type stub — only needed for TS import
}))

// --- Helpers ---

function emit(event: string, payload: unknown) {
  const handler = listeners.get(event)
  if (!handler) throw new Error(`No listener for ${event}`)
  handler({ payload })
}

// Reset module-level state between tests by re-importing the hook.
// vitest caches modules, so we use `vi.resetModules()` + dynamic import.
async function importHook() {
  const mod = await import("./usePersonalServer")
  return mod.usePersonalServer
}

describe("usePersonalServer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
    listeners.clear()
    mockInvoke.mockReset()
    authState = { walletAddress: null, masterKeySignature: null }
    // Default: invoke succeeds with a running server
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "start_personal_server") {
        return Promise.resolve({ running: true, port: 8080 })
      }
      if (cmd === "stop_personal_server") {
        return Promise.resolve()
      }
      return Promise.resolve()
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts in unauthenticated mode on mount", async () => {
    const usePersonalServer = await importHook()

    const { result } = renderHook(() => usePersonalServer())

    // Let the mount effect fire and invoke resolve
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockInvoke).toHaveBeenCalledWith("start_personal_server", {
      port: null,
      masterKeySignature: null,
      gatewayUrl: null,
      ownerAddress: null,
    })

    expect(result.current.status).toBe("starting")
  })

  it("restarts with credentials when walletAddress changes", async () => {
    const usePersonalServer = await importHook()

    const { result, rerender } = renderHook(() => usePersonalServer())

    // Let initial unauthenticated start complete
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Simulate the ready event from the first start
    act(() => {
      emit("personal-server-ready", { port: 8080 })
    })

    expect(result.current.status).toBe("running")
    mockInvoke.mockClear()

    // Now sign in — set walletAddress
    authState = { walletAddress: "0xabc", masterKeySignature: "sig123" }
    rerender()

    // restartServer calls stop, then waits 500ms, then starts
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(mockInvoke).toHaveBeenCalledWith("stop_personal_server")
    expect(mockInvoke).toHaveBeenCalledWith("start_personal_server", {
      port: null,
      masterKeySignature: "sig123",
      gatewayUrl: null,
      ownerAddress: "0xabc",
    })
  })

  it("resets running.current on error event", async () => {
    const usePersonalServer = await importHook()

    const { result } = renderHook(() => usePersonalServer())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Simulate ready
    act(() => {
      emit("personal-server-ready", { port: 8080 })
    })

    expect(result.current.status).toBe("running")

    // Simulate error event
    act(() => {
      emit("personal-server-error", { message: "Something went wrong" })
    })

    expect(result.current.status).toBe("error")
    expect(result.current.error).toBe("Something went wrong")

    // After error, should be able to start again (running.current was reset)
    mockInvoke.mockClear()

    await act(async () => {
      await result.current.startServer(null)
    })

    expect(mockInvoke).toHaveBeenCalledWith(
      "start_personal_server",
      expect.any(Object)
    )
  })

  it("auto-restarts on crash with exponential backoff", async () => {
    const usePersonalServer = await importHook()

    const { result } = renderHook(() => usePersonalServer())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Simulate ready then crash
    act(() => {
      emit("personal-server-ready", { port: 8080 })
    })

    mockInvoke.mockClear()

    // Crash (exitCode=1)
    act(() => {
      emit("personal-server-exited", { exitCode: 1, crashed: true })
    })

    expect(result.current.status).toBe("starting")

    // Advance 2s (first backoff)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })

    expect(mockInvoke).toHaveBeenCalledWith(
      "start_personal_server",
      expect.any(Object)
    )
  })

  it("gives up after MAX_RESTART_ATTEMPTS crashes", async () => {
    const usePersonalServer = await importHook()

    const { result } = renderHook(() => usePersonalServer())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Ready
    act(() => {
      emit("personal-server-ready", { port: 8080 })
    })

    // Simulate 4 crashes (MAX_RESTART_ATTEMPTS = 3, so crash 4 should give up)
    for (let i = 1; i <= 3; i++) {
      mockInvoke.mockClear()
      act(() => {
        emit("personal-server-exited", { exitCode: 1, crashed: true })
      })

      expect(result.current.status).toBe("starting")

      // Advance the backoff timer
      await act(async () => {
        await vi.advanceTimersByTimeAsync(Math.pow(2, i) * 1000)
      })

      expect(mockInvoke).toHaveBeenCalledWith(
        "start_personal_server",
        expect.any(Object)
      )
    }

    // 4th crash — should give up
    act(() => {
      emit("personal-server-exited", { exitCode: 1, crashed: true })
    })

    expect(result.current.status).toBe("error")
    expect(result.current.error).toContain("crashed repeatedly")
  })

  it("resets restart count on successful ready event", async () => {
    const usePersonalServer = await importHook()

    const { result } = renderHook(() => usePersonalServer())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Ready
    act(() => {
      emit("personal-server-ready", { port: 8080 })
    })

    // Crash twice
    for (let i = 1; i <= 2; i++) {
      act(() => {
        emit("personal-server-exited", { exitCode: 1, crashed: true })
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(Math.pow(2, i) * 1000)
      })
    }

    // Ready again — should reset the counter
    act(() => {
      emit("personal-server-ready", { port: 8080 })
    })

    expect(result.current.status).toBe("running")

    // Now crash 3 more times — should still auto-restart (counter was reset)
    for (let i = 1; i <= 3; i++) {
      mockInvoke.mockClear()
      act(() => {
        emit("personal-server-exited", { exitCode: 1, crashed: true })
      })

      expect(result.current.status).toBe("starting")
      await act(async () => {
        await vi.advanceTimersByTimeAsync(Math.pow(2, i) * 1000)
      })
      expect(mockInvoke).toHaveBeenCalledWith(
        "start_personal_server",
        expect.any(Object)
      )
    }
  })

  it("restartingRef is true during restart and false after ready event", async () => {
    const usePersonalServer = await importHook()

    const { result, rerender } = renderHook(() => usePersonalServer())

    // Let initial unauthenticated start complete
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Simulate the ready event from the first start
    act(() => {
      emit("personal-server-ready", { port: 8080 })
    })

    expect(result.current.restartingRef.current).toBe(false)

    // Now sign in — set walletAddress to trigger Phase 2 restart
    authState = { walletAddress: "0xabc", masterKeySignature: "sig123" }
    rerender()

    // restartingRef should be true synchronously after the effect fires
    expect(result.current.restartingRef.current).toBe(true)

    // Let the restart complete (stop + 500ms delay + start)
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Still restarting — server hasn't emitted ready yet
    expect(result.current.restartingRef.current).toBe(true)

    // Simulate the ready event from the restarted server
    act(() => {
      emit("personal-server-ready", { port: 9090 })
    })

    expect(result.current.restartingRef.current).toBe(false)
    expect(result.current.port).toBe(9090)
  })

  it("sets status to stopped on graceful exit (not crash)", async () => {
    const usePersonalServer = await importHook()

    const { result } = renderHook(() => usePersonalServer())

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    act(() => {
      emit("personal-server-ready", { port: 8080 })
    })

    expect(result.current.status).toBe("running")

    // Graceful exit (exitCode=0)
    act(() => {
      emit("personal-server-exited", { exitCode: 0, crashed: false })
    })

    expect(result.current.status).toBe("stopped")
    expect(result.current.port).toBeNull()
  })
})
