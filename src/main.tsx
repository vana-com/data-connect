import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./styles/index.css"

// Clear stale debug flag that forces bundled Chromium download instead of system Chrome.
// This is a session-only dev toggle — should never persist across app restarts.
localStorage.removeItem("dataconnect_simulate_no_chrome")

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={120}>
      <App />
    </TooltipProvider>
  </React.StrictMode>
)
