import { afterEach, describe, expect, it, vi } from "vitest"
import { scheduleCloseTab } from "./auth"

describe("scheduleCloseTab", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("attempts to close and navigate to /close-tab", () => {
    vi.useFakeTimers()
    const closeSpy = vi.fn()
    const assignSpy = vi.fn()

    scheduleCloseTab(10, { close: closeSpy, assign: assignSpy })
    vi.advanceTimersByTime(10)

    expect(closeSpy).toHaveBeenCalled()
    expect(assignSpy).toHaveBeenCalledWith("/close-tab")
  })
})
