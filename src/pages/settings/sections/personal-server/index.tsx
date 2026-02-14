import type { usePersonalServer } from "@/hooks/usePersonalServer"
import { SettingsPersonalServerSection } from "./components/settings-personal-server-section"

interface SettingsPersonalServerProps {
  personalServer: ReturnType<typeof usePersonalServer>
}

export function SettingsPersonalServer({
  personalServer,
}: SettingsPersonalServerProps) {
  return <SettingsPersonalServerSection personalServer={personalServer} />
}
