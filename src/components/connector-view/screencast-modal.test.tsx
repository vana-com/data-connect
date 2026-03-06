// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { ScreencastModal } from "./screencast-modal"

vi.mock("@/lib/runtime", () => ({
  useRuntime: () => ({
    mode: "tauri",
    invoke: vi.fn(),
    fetch: vi.fn(),
    onEvent: vi.fn(),
    getAppVersion: vi.fn(),
  }),
}))

vi.mock("./neko-client", () => ({
  NekoClient: vi.fn(({ server, className }) => (
    <div data-testid="neko-client" data-server={server} className={className} />
  )),
}))

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
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("renders NekoClient with the server URL", () => {
    render(<ScreencastModal nekoUrl="http://localhost:3000/neko" />)
    const nekoClient = screen.getByTestId("neko-client")
    expect(nekoClient.getAttribute("data-server")).toBe(
      "http://localhost:3000/neko",
    )
  })

  it("shows connecting state initially", () => {
    render(<ScreencastModal nekoUrl="http://localhost:3000/neko" />)
    expect(screen.getByText("Connecting to browser...")).toBeTruthy()
  })

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn()
    render(
      <ScreencastModal nekoUrl="http://localhost:3000/neko" onClose={onClose} />,
    )
    const button = screen.getByLabelText("Close browser view")
    fireEvent.click(button)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("does not render close button when onClose is not provided", () => {
    render(<ScreencastModal nekoUrl="http://localhost:3000/neko" />)
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

    it("renders canvas viewer instead of NekoClient in CDP mode", () => {
      render(
        <ScreencastModal
          nekoUrl="http://localhost:3000/neko"
          viewMode="cdp"
          screencastWsUrl="ws://localhost:3000/ws/screencast?token=test"
        />,
      )
      expect(screen.queryByTestId("neko-client")).toBeNull()
      expect(document.querySelector("canvas")).toBeTruthy()
    })
  })
})
