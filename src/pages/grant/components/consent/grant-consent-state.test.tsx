import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LINKS } from "@/config/links"
import type { BuilderManifest, GrantSession } from "../../types"
import { GrantConsentState } from "./grant-consent-state"

afterEach(() => {
  cleanup()
})

function createSession(scopes: string[]): GrantSession {
  return {
    id: "session-1",
    granteeAddress: "0xgrantee",
    scopes,
    expiresAt: "2030-01-01T00:00:00.000Z",
  }
}


function renderConsent(
  scopes: string[],
  options: { builderManifest?: BuilderManifest; builderName?: string } = {}
) {
  return render(
    <GrantConsentState
      session={createSession(scopes)}
      builderName={options.builderName ?? "Demo App"}
      builderManifest={options.builderManifest}
      isApproving={false}
      onApprove={vi.fn()}
      onDeny={vi.fn()}
    />
  )
}

describe("GrantConsentState scope action label", () => {
  it("renders a one-scope action label", () => {
    renderConsent(["chatgpt.conversations"])

    expect(screen.getAllByText("See your ChatGPT Conversations").length).toBeGreaterThan(0)
  })

  it("renders two independent scope action labels", () => {
    renderConsent(["chatgpt.conversations", "spotify.playlists"])

    expect(screen.getByText("See your ChatGPT Conversations")).toBeTruthy()
    expect(screen.getByText("See your Spotify Playlists")).toBeTruthy()
  })

  it("renders three independent scope action labels", () => {
    renderConsent([
      "chatgpt.conversations",
      "spotify.playlists",
      "instagram.posts",
    ])

    expect(screen.getByText("See your ChatGPT Conversations")).toBeTruthy()
    expect(screen.getByText("See your Spotify Playlists")).toBeTruthy()
    expect(screen.getByText("See your Instagram Posts")).toBeTruthy()
  })

  it("falls back to generic copy when scopes are empty", () => {
    renderConsent([])

    expect(screen.getByText("Allow access to your data")).toBeTruthy()
    expect(screen.queryByText(/^See your /)).toBeNull()
  })

  it("allows immediately without checkbox acknowledgement", () => {
    renderConsent(["chatgpt.conversations"])

    const allowButton = screen.getByRole("button", { name: "Agree and Allow" })
    expect((allowButton as HTMLButtonElement).disabled).toBe(false)
  })

  it("renders compact clickwrap disclosure with legal doc link", () => {
    renderConsent(["chatgpt.conversations"])

    expect(
      screen.getByText(
        /you acknowledge that you are initiating access with credentials you control/i
      )
    ).toBeTruthy()
    expect(
      screen.getByRole("link", {
        name: "Data Extraction Risk & Responsibility Disclosure",
      })
    ).toBeTruthy()
    expect(
      screen
        .getByRole("link", {
          name: "Data Extraction Risk & Responsibility Disclosure",
        })
        .getAttribute("href")
    ).toBe(LINKS.legalDataExtractionRiskResponsibilityDisclosure)
  })

  it("falls back when builder icon image fails to load", () => {
    const { container } = renderConsent(["chatgpt.conversations"], {
      builderName: "Qapp",
      builderManifest: {
        name: "Qapp",
        appUrl: "https://qapp.example.com",
        icons: [{ src: "https://qapp.example.com/broken-icon.png", sizes: "64x64" }],
      },
    })

    const image = container.querySelector("img")
    expect(image).toBeTruthy()

    fireEvent.error(image as HTMLImageElement)

    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByText("Q")).toBeTruthy()
  })
})
