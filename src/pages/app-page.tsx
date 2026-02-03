import { Navigate, useParams } from "react-router-dom"
import { DEFAULT_APP_ID, getAppRegistryEntry } from "../apps/registry"
import { ROUTES } from "@/config/routes"
import { RickRollAppPage } from "./RickRollApp"

export function AppPage() {
  const { appId } = useParams()
  const entry = getAppRegistryEntry(appId)

  if (!entry) {
    return <Navigate to={ROUTES.app(DEFAULT_APP_ID)} replace />
  }

  switch (entry.id) {
    case "rickroll":
      return <RickRollAppPage />
    default:
      return <Navigate to={ROUTES.app(DEFAULT_APP_ID)} replace />
  }
}
