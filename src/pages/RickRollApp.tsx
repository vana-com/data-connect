import { useSyncExternalStore } from "react"
import { useNavigate } from "react-router-dom"
import { ExternalLink } from "lucide-react"
import { RickRollApp } from "../apps/rickroll/App"
import { DEFAULT_APP_ID, getAppRegistryEntry } from "../apps/registry"
import { buildGrantSearchParams } from "../lib/grant-params"
import { isAppConnected, subscribeConnectedApps } from "../lib/storage"

const getIsRickrollConnected = () => isAppConnected(DEFAULT_APP_ID)

export function RickRollAppPage() {
  const navigate = useNavigate()
  const isConnected = useSyncExternalStore(subscribeConnectedApps, getIsRickrollConnected)
  const appEntry = getAppRegistryEntry(DEFAULT_APP_ID)

  const handleConnect = () => {
    // Trigger grant flow using React Router navigation
    const sessionId = "grant-session-" + Date.now()
    const searchParams = buildGrantSearchParams({
      sessionId,
      appId: appEntry?.id || DEFAULT_APP_ID,
      scopes: appEntry?.scopes,
    })
    const search = searchParams.toString()
    navigate(`/grant${search ? `?${search}` : ""}`)
  }

  if (!isConnected) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f7", padding: "48px" }}>
        <div
          style={{
            maxWidth: "500px",
            margin: "0 auto",
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "48px",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#1a1a1a",
              marginBottom: "16px",
            }}
          >
            RickRoll Facts
          </h1>
          <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "32px" }}>
            Discover fun facts from your ChatGPT conversations
          </p>

          <div
            style={{
              padding: "24px",
              backgroundColor: "#fef3c7",
              border: "1px solid #fde68a",
              borderRadius: "12px",
              marginBottom: "24px",
            }}
          >
            <p style={{ fontSize: "14px", color: "#92400e", marginBottom: "8px" }}>
              Authorization Required
            </p>
            <p style={{ fontSize: "13px", color: "#78350f", margin: 0 }}>
              This app needs access to your ChatGPT export data to generate insights about
              your conversations.
            </p>
          </div>

          <button
            onClick={handleConnect}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: "16px",
              fontWeight: 600,
              color: "white",
              backgroundColor: "#6366f1",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = "#4f46e5"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = "#6366f1"
            }}
          >
            Grant Access
          </button>

          <a
            href="/data"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 20px",
              fontSize: "14px",
              color: "#6b7280",
              backgroundColor: "transparent",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              textDecoration: "none",
              marginTop: "16px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = "#f9fafb"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = "transparent"
            }}
          >
            <ExternalLink style={{ width: "14px", height: "14px" }} />
            Back to Your Data
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      <RickRollApp />
    </div>
  )
}
