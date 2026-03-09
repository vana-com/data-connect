import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LINKS } from "@/config/links"
import type { BuilderManifest } from "../../types"
import { GrantConsentState } from "./grant-consent-state"

afterEach(() => {
  cleanup()
})

function renderConsent(
  scopes: string[],
  options: { builderManifest?: BuilderManifest; appName?: string } = {}
) {
  return render(
    <GrantConsentState
      scopes={scopes}
      appName={options.appName ?? "Demo App"}
      builderManifest={options.builderManifest}
      isApproving={false}
      onApprove={vi.fn()}
      onDeny={vi.fn()}
    />
  )
}

describe("GrantConsentState scope action label", () => {
  it("renders a one-scope action label as compiled sentence", () => {
    renderConsent(["chatgpt.conversations"])

    expect(screen.getByText("See your ChatGPT Conversations")).toBeTruthy()
  })

  it("compiles multiple same-platform scopes into one sentence", () => {
    renderConsent([
      "linkedin.experience",
      "linkedin.education",
      "linkedin.skills",
      "linkedin.languages",
      "linkedin.profile",
    ])

    expect(
      screen.getByText(
        "See your LinkedIn experience, education, skills, languages, and profile"
      )
    ).toBeTruthy()
  })

  it("compiles multiple ChatGPT scopes into one sentence", () => {
    renderConsent([
      "chatgpt.conversations",
      "chatgpt.memories",
    ])

    expect(
      screen.getByText("See your ChatGPT conversations and memories")
    ).toBeTruthy()
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

  it("collapses repeated platform scopes into one sentence within mixed rows", () => {
    renderConsent([
      "linkedin.experience",
      "spotify.history",
      "chatgpt.conversations",
      "chatgpt.memories",
    ])

    expect(screen.getByText("See your LinkedIn Experience")).toBeTruthy()
    expect(screen.getByText("See your Spotify History")).toBeTruthy()
    expect(screen.getByText("Allow access to your data")).toBeTruthy()
    expect(
      screen.getByText("See your ChatGPT conversations and memories")
    ).toBeTruthy()
    expect(screen.queryByText("See your ChatGPT Conversations")).toBeNull()
    expect(screen.queryByText("See your ChatGPT Memories")).toBeNull()
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

  it("renders the builder icon image when provided", () => {
    const { container } = renderConsent(["chatgpt.conversations"], {
      appName: "Qapp",
      builderManifest: {
        name: "Qapp",
        appUrl: "https://qapp.example.com",
        icons: [{ src: "https://qapp.example.com/broken-icon.png", sizes: "64x64" }],
      },
    })

    const image = container.querySelector("img")
    expect(image).toBeTruthy()
    expect(
      container.querySelector('img[src="https://qapp.example.com/broken-icon.png"]')
    ).toBeTruthy()
  })
})
