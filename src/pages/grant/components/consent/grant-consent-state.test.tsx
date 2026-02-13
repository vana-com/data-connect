import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
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

  it("falls back to generic copy and hides scope list when scopes are empty", () => {
    renderConsent([])

    expect(screen.getByText("See your data")).toBeTruthy()
    expect(screen.queryByRole("list")).toBeNull()
  })
})

describe("GrantConsentState builder links sentence", () => {
  it("renders one link naturally", () => {
    renderConsent(["chatgpt.conversations"], {
      builderManifest: createBuilderManifest({
        privacyPolicyUrl: "https://demo.app/privacy",
      }),
    })

    const sentence = screen.getByText(
      (_, element) =>
        element?.tagName.toLowerCase() === "p" &&
        Boolean(element.textContent?.includes("Demo App's")) &&
        Boolean(element.textContent?.includes("Privacy Policy"))
    )
    expect(sentence.textContent).toContain("Privacy Policy.")
    expect(sentence.textContent).not.toContain(" and ")
    expect(sentence.textContent).not.toContain(", ")
  })

  it("renders two links with 'and'", () => {
    renderConsent(["chatgpt.conversations"], {
      builderManifest: createBuilderManifest({
        privacyPolicyUrl: "https://demo.app/privacy",
        termsUrl: "https://demo.app/terms",
      }),
    })

    const sentence = screen.getByText(
      (_, element) =>
        element?.tagName.toLowerCase() === "p" &&
        Boolean(element.textContent?.includes("Demo App's")) &&
        Boolean(element.textContent?.includes("Privacy Policy"))
    )
    expect(sentence.textContent).toContain(
      "Privacy Policy and Terms of Service."
    )
    expect(sentence.textContent).not.toContain("Privacy Policy,")
  })

  it("renders three links with comma plus 'and'", () => {
    renderConsent(["chatgpt.conversations"], {
      builderManifest: createBuilderManifest({
        privacyPolicyUrl: "https://demo.app/privacy",
        termsUrl: "https://demo.app/terms",
        supportUrl: "https://demo.app/support",
      }),
    })

    const sentence = screen.getByText(
      (_, element) =>
        element?.tagName.toLowerCase() === "p" &&
        Boolean(element.textContent?.includes("Demo App's")) &&
        Boolean(element.textContent?.includes("Privacy Policy"))
    )
    expect(sentence.textContent).toContain(
      "Privacy Policy, Terms of Service and Support."
    )
  })
})
