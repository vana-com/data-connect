import { Navigate, useLocation } from "react-router-dom"
import { buildSettingsUrl } from "../settings/url"

export function Runs() {
  const location = useLocation()
  const source = new URLSearchParams(location.search).get("source")
  const to = buildSettingsUrl({
    section: "runs",
    source,
  })

  return <Navigate to={to} replace />
}
