// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react"
import { ConnectorView } from "./index"

const WS_CONNECTING = 0
const WS_OPEN = 1
const WS_CLOSED = 3

class MockWebSocket {
  static CONNECTING = WS_CONNECTING
  static OPEN = WS_OPEN
  static CLOSED = WS_CLOSED
  static instances: MockWebSocket[] = []

  readyState = WS_CONNECTING
  url: string
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null

  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sentMessages.push(data)
  }

  close() {
    this.readyState = WS_CLOSED
  }

  simulateOpen() {
    this.readyState = WS_OPEN
    this.onopen?.()
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  simulateClose() {
    this.readyState = WS_CLOSED
    this.onclose?.()
  }
}

describe("ConnectorView", () => {
  let originalWebSocket: typeof WebSocket

  beforeEach(() => {
    vi.useFakeTimers()
    originalWebSocket = globalThis.WebSocket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.WebSocket = MockWebSocket as any
    MockWebSocket.instances = []
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    globalThis.WebSocket = originalWebSocket
  })

  it("shows connecting state initially", () => {
    render(<ConnectorView wsUrl="ws://localhost:9222/screencast" />)
    expect(screen.getByText("Connecting to browser...")).toBeTruthy()
  })

  it("calls onConnectionChange when connection state changes", async () => {
    const onChange = vi.fn()
    render(
      <ConnectorView
        wsUrl="ws://localhost:9222/screencast"
        onConnectionChange={onChange}
      />
    )

    expect(onChange).toHaveBeenCalledWith("connecting")

    await act(async () => {
      MockWebSocket.instances[0].simulateOpen()
    })

    expect(onChange).toHaveBeenCalledWith("connected")
  })

  it("shows disconnected state and reconnects on WebSocket close", async () => {
    const onChange = vi.fn()
    render(
      <ConnectorView
        wsUrl="ws://localhost:9222/screencast"
        onConnectionChange={onChange}
      />
    )

    await act(async () => {
      MockWebSocket.instances[0].simulateOpen()
    })

    expect(onChange).toHaveBeenCalledWith("connected")

    act(() => {
      MockWebSocket.instances[0].simulateClose()
    })

    expect(onChange).toHaveBeenCalledWith("disconnected")
    expect(screen.getByText("Disconnected. Reconnecting...")).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100)
    })

    expect(MockWebSocket.instances.length).toBe(2)
  })

  it("sends mouse events with scaled coordinates", async () => {
    render(<ConnectorView wsUrl="ws://localhost:9222/screencast" />)

    const ws = MockWebSocket.instances[0]

    await act(async () => {
      ws.simulateOpen()
    })

    const canvas = document.querySelector("canvas")!

    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    await act(async () => {
      fireEvent.click(canvas, { clientX: 400, clientY: 300 })
    })

    expect(ws.sentMessages.length).toBeGreaterThan(0)
    const msg = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1])
    expect(msg.type).toBe("mouse")
    expect(msg.action).toBe("click")
  })

  it("sends keyboard events when canvas is focused", async () => {
    render(<ConnectorView wsUrl="ws://localhost:9222/screencast" />)

    const ws = MockWebSocket.instances[0]

    await act(async () => {
      ws.simulateOpen()
    })

    const canvas = document.querySelector("canvas")!

    await act(async () => {
      fireEvent.keyDown(canvas, { key: "a", code: "KeyA" })
    })

    expect(ws.sentMessages.length).toBeGreaterThan(0)
    const msg = JSON.parse(ws.sentMessages[ws.sentMessages.length - 1])
    expect(msg.type).toBe("keyboard")
    expect(msg.action).toBe("keyDown")
    expect(msg.key).toBe("a")
  })

  it("cleans up WebSocket on unmount", async () => {
    const { unmount } = render(
      <ConnectorView wsUrl="ws://localhost:9222/screencast" />
    )

    const ws = MockWebSocket.instances[0]

    await act(async () => {
      ws.simulateOpen()
    })

    unmount()

    expect(ws.readyState).toBe(WS_CLOSED)
  })
})
