import { PageContainer } from "@/components/elements/page-container"
import { PageHeading } from "@/components/typography/page-heading"
import { Text } from "@/components/typography/text"
import { useEmbrowsePage } from "./use-embrowse-page"

// Config — will come from the connect flow (session relay / URL params).
// For dev, use the mock HTML served by Vite's public dir.
const EMBROWSE_URL = import.meta.env.VITE_EMBROWSE_URL ?? "/mock-embrowse.html"
const SERVER_URL = import.meta.env.VITE_DEMO_SERVER_URL ?? "http://localhost:8080"

/** Feature-detect credentialless iframe support (Chrome 110+, FF 119+, no Safari) */
const supportsCredentialless = "credentialless" in HTMLIFrameElement.prototype

export function Embrowse() {
  const mode = supportsCredentialless ? "iframe" as const : "popup" as const

  const { iframeRef, embrowseUrl, status, openPopup } = useEmbrowsePage({
    embrowseUrl: EMBROWSE_URL,
    mode,
    platform: "instagram",
    scopes: ["instagram.ads", "instagram.profile"],
    serverUrl: SERVER_URL,
  })

  return (
    <PageContainer>
      <div className="space-y-w6">
        <PageHeading>Connect your data</PageHeading>
        <Text as="p" intent="body">
          Log into Instagram below to connect your data.
        </Text>

        {mode === "popup" ? (
          <button
            onClick={openPopup}
            className="rounded-lg border border-border px-4 py-2 hover:bg-muted/50"
          >
            Open Embrowse
          </button>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
            <iframe
              ref={iframeRef}
              src={embrowseUrl}
              className="w-full h-[600px] border-0"
              allow="clipboard-read; clipboard-write; cross-origin-isolated"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              // @ts-expect-error — credentialless is not in React's iframe types yet
              credentialless={supportsCredentialless ? "" : undefined}
              title="Embrowse — connect your data"
            />
          </div>
        )}

        {status !== "loading" && (
          <Text as="p" intent="small" color="muted">
            Status: {status}
          </Text>
        )}
      </div>
    </PageContainer>
  )
}
