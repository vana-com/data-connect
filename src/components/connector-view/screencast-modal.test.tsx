// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react"
import { ScreencastModal } from "./screencast-modal"

const WS_CONNECTING = 0
const WS_OPEN = 1
const WS_CLOSED = 3

class MockWebSocket {
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
}

describe("ScreencastModal", () => {
  beforeEach(() => {
    // jsdom doesn't have navigator.permissions — mock it
    Object.defineProperty(navigator, "permissions", {
      value: {
        query: vi.fn().mockResolvedValue({
          state: "granted",
          addEventListener: vi.fn(),
        }),
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("renders iframe immediately when clipboard permission is granted", async () => {
    render(<ScreencastModal nekoUrl="http://localhost:8080" />)
    const iframe = await waitFor(() => screen.getByTitle("Remote browser view"))
    expect(iframe.getAttribute("src")).toBe(
      "http://localhost:8080/?embed=1&usr=user&pwd=x"
    )
  })

  it("shows clipboard button when permission is not granted", async () => {
    ;(navigator.permissions.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      state: "prompt",
      addEventListener: vi.fn(),
    })
    render(<ScreencastModal nekoUrl="http://localhost:8080" />)
    const button = await waitFor(() =>
      screen.getByText("Enable clipboard sharing")
    )
    expect(button).toBeTruthy()
    expect(screen.queryByTitle("Remote browser view")).toBeNull()
  })

  it("loads iframe after clipboard button is clicked", async () => {
    ;(navigator.permissions.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      state: "prompt",
      addEventListener: vi.fn(),
    })
    Object.assign(navigator, {
      clipboard: { readText: vi.fn().mockResolvedValue("") },
    })
    render(<ScreencastModal nekoUrl="http://localhost:8080" />)
    const button = await waitFor(() =>
      screen.getByText("Enable clipboard sharing")
    )
    fireEvent.click(button)
    const iframe = await waitFor(() => screen.getByTitle("Remote browser view"))
    expect(iframe).toBeTruthy()
  })

  it("loads iframe when Permissions API is not supported", async () => {
    ;(navigator.permissions.query as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("not supported")
    )
    render(<ScreencastModal nekoUrl="http://localhost:8080" />)
    const iframe = await waitFor(() => screen.getByTitle("Remote browser view"))
    expect(iframe).toBeTruthy()
  })

  it("sets clipboard permissions on the iframe", async () => {
    render(<ScreencastModal nekoUrl="http://localhost:8080" />)
    const iframe = await waitFor(() => screen.getByTitle("Remote browser view"))
    expect(iframe.getAttribute("allow")).toBe("clipboard-read; clipboard-write")
  })

  it("shows connecting state before iframe loads", () => {
    render(<ScreencastModal nekoUrl="http://localhost:8080" />)
    expect(screen.getByText("Connecting to browser...")).toBeTruthy()
  })

  it("shows connected state after iframe loads", async () => {
    render(<ScreencastModal nekoUrl="http://localhost:8080" />)
    const iframe = await waitFor(() => screen.getByTitle("Remote browser view"))
    fireEvent.load(iframe)
    expect(
      screen.getByText(
        "Sign in below — your input is forwarded to the remote browser"
      )
    ).toBeTruthy()
  })

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn()
    render(
      <ScreencastModal nekoUrl="http://localhost:8080" onClose={onClose} />
    )
    const button = screen.getByLabelText("Close browser view")
    fireEvent.click(button)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("does not render close button when onClose is not provided", () => {
    render(<ScreencastModal nekoUrl="http://localhost:8080" />)
    expect(screen.queryByLabelText("Close browser view")).toBeNull()
  })

  describe("CDP mode", () => {
    let originalWebSocket: typeof WebSocket

    beforeEach(() => {
      originalWebSocket = globalThis.WebSocket
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      globalThis.WebSocket = MockWebSocket as any
      MockWebSocket.instances = []
    })

    afterEach(() => {
      globalThis.WebSocket = originalWebSocket
    })

    it("renders canvas viewer instead of iframe in CDP mode", () => {
      render(
        <ScreencastModal
          nekoUrl="http://localhost:8080"
          viewMode="cdp"
          screencastWsUrl="ws://localhost:3000/ws/screencast?token=test"
        />
      )
      expect(screen.queryByTitle("Remote browser view")).toBeNull()
      expect(document.querySelector("canvas")).toBeTruthy()
    })

    it("skips clipboard permission check in CDP mode", () => {
      render(
        <ScreencastModal
          nekoUrl="http://localhost:8080"
          viewMode="cdp"
          screencastWsUrl="ws://localhost:3000/ws/screencast?token=test"
        />
      )
      expect(navigator.permissions.query).not.toHaveBeenCalled()
    })
  })
})
