import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Connect } from "./index"

vi.mock("./use-connect-page", () => ({
  useConnectPage: () => ({
    connectTitle: "Connect your ChatGPT",
    connectCta: "Connect ChatGPT",
    busyCta: "Checking connectors...",
    dataSourceLabel: "ChatGPT",
    dataLabel: "ChatGPT data",
    isAlreadyConnected: true,
    hasConnector: true,
    isBusy: false,
    isAutoRedirecting: true,
    connectorErrorMessage: null,
    showDebugBypass: false,
    handleConnect: vi.fn(),
    handleDebugGrant: vi.fn(),
  }),
}))

describe("Connect loading state", () => {
  it("renders loading state while auto-redirecting", () => {
    render(<Connect />)

    expect(screen.getByText("Loading…")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /connect/i })).toBeNull()
  })
})
