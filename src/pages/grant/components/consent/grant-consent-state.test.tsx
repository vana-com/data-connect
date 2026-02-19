import { cleanup, render, screen } from "@testing-library/react"
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

function createBuilderManifest(
  overrides: Partial<BuilderManifest> = {}
): BuilderManifest {
  return {
    name: "Demo App",
    appUrl: "https://demo.app",
    ...overrides,
  }
}

function renderConsent(
  scopes: string[],
  options: { builderManifest?: BuilderManifest } = {}
) {
  return render(
    <GrantConsentState
      session={createSession(scopes)}
      builderName="Demo App"
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

  it("renders a two-scope action label with 'and'", () => {
    renderConsent(["chatgpt.conversations", "spotify.history"])

    expect(
      screen.getByText("See your ChatGPT Conversations and Spotify History")
    ).toBeTruthy()
  })

  it("renders a three-scope action label with Oxford comma", () => {
    renderConsent([
      "chatgpt.conversations",
      "spotify.history",
      "instagram.posts",
    ])

    expect(
      screen.getByText(
        "See your ChatGPT Conversations, Spotify History, and Instagram Posts"
      )
    ).toBeTruthy()
  })

  it("falls back to generic copy when scopes are empty", () => {
    renderConsent([])

    expect(screen.getByText("See your data")).toBeTruthy()
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
})
