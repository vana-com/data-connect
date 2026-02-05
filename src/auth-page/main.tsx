import React from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"

const root = document.getElementById("root")

if (!root) {
  throw new Error("Missing root element for auth page.")
}

const renderBootError = (message: string) => {
  root.innerHTML = `
    <div style="padding:16px;font-family:system-ui,sans-serif;color:#0a0a0a;">
      <strong>Auth page failed to load.</strong>
      <div style="margin-top:8px;white-space:pre-wrap;">${message}</div>
    </div>
  `
}

root.innerHTML = `
  <div style="padding:16px;font-family:system-ui,sans-serif;color:#0a0a0a;">
    Loading auth page…
  </div>
`

window.addEventListener("error", event => {
  const message =
    event.error instanceof Error ? event.error.message : event.message
  renderBootError(message || "Unknown error.")
})

window.addEventListener("unhandledrejection", event => {
  const reason = event.reason
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "Unknown error."
  renderBootError(message)
})

const MAX_BOOT_RETRIES = 10
const BOOT_RETRY_DELAY_MS = 500

const renderApp = async (attempt = 0) => {
  try {
    const { App } = await import("./App")
    createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch (err) {
    if (attempt < MAX_BOOT_RETRIES) {
      root.innerHTML = `
        <div style="padding:16px;font-family:system-ui,sans-serif;color:#0a0a0a;">
          Loading auth page… (retrying ${attempt + 1}/${MAX_BOOT_RETRIES})
        </div>
      `
      window.setTimeout(() => {
        void renderApp(attempt + 1)
      }, BOOT_RETRY_DELAY_MS)
      return
    }
    const message = err instanceof Error ? err.message : "Unknown error."
    console.error("Auth page boot error:", err)
    renderBootError(`(after ${MAX_BOOT_RETRIES} retries)\n${message}`)
  }
}

void renderApp()
