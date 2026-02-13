import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  RegistrationRow,
  getRegistrationState,
} from "./registration-row"

describe("getRegistrationState", () => {
  it("returns error when server status is error", () => {
    expect(getRegistrationState("error", "https://abc123.server.vana.org")).toBe(
      "error"
    )
  })

  it("returns registered when server is running with a tunnel URL", () => {
    expect(getRegistrationState("running", "https://abc123.server.vana.org")).toBe(
      "registered"
    )
  })

  it("returns pending for all other states", () => {
    expect(getRegistrationState("running", null)).toBe("pending")
    expect(getRegistrationState("starting", "https://abc123.server.vana.org")).toBe(
      "pending"
    )
    expect(getRegistrationState("stopped", null)).toBe("pending")
  })
})

describe("RegistrationRow", () => {
  it("renders registered badge", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <RegistrationRow
          status="running"
          tunnelUrl="https://abc123.server.vana.org"
        />
      </TooltipProvider>
    )
    expect(screen.getByText("On-Chain Registration")).toBeTruthy()
    expect(screen.getByText("Registered")).toBeTruthy()
  })

  it("renders needs repair badge", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <RegistrationRow
          status="error"
          tunnelUrl="https://abc123.server.vana.org"
        />
      </TooltipProvider>
    )
    expect(screen.getByText("Needs repair")).toBeTruthy()
  })

  it("renders not registered badge", () => {
    render(
      <TooltipProvider delayDuration={120}>
        <RegistrationRow status="stopped" tunnelUrl={null} isLast />
      </TooltipProvider>
    )
    expect(screen.getByText("Not registered")).toBeTruthy()
  })
})
