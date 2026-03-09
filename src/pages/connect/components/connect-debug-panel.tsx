import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/typography/text"
import { DebugTogglePanel } from "@/components/elements/debug-toggle-panel"
import { ROUTES } from "@/config/routes"
import {
  buildConnectDebugPresetSearch,
  CONNECT_DEBUG_PARAM_PRESETS,
  type ConnectDebugState,
} from "../connect-ui-debug"

const DEBUG_STATES: {
  value: Exclude<ConnectDebugState, null>
  label: string
}[] = [
  { value: "idle", label: "Idle" },
  { value: "checking-connectors", label: "Checking" },
  { value: "collecting-data", label: "Collecting" },
  { value: "no-connector", label: "No connector" },
  { value: "already-connected", label: "Connected" },
  { value: "redirecting", label: "Redirecting" },
]

interface ConnectDebugPanelProps {
  activeState: ConnectDebugState
  dataSourceLabel: string
  scopes: string[]
  onChangeState: (state: ConnectDebugState) => void
}

export function ConnectDebugPanel({
  activeState,
  dataSourceLabel,
  scopes,
  onChangeState,
}: ConnectDebugPanelProps) {
  return (
    <DebugTogglePanel title="Connect debug" openClassName="min-w-[320px]">
      <div className="space-y-1.5 border-b pb-3">
        <p className="text-xs font-medium">Params (URL)</p>
        <div className="flex flex-wrap gap-2">
          {CONNECT_DEBUG_PARAM_PRESETS.map(preset => (
            <Button key={preset.label} size="xs" variant="outline" asChild>
              <Link to={`${ROUTES.connect}?${buildConnectDebugPresetSearch(preset)}`}>
                {preset.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-3">
        <Text intent="fine" color="mutedForeground">
          {dataSourceLabel} · {scopes.join(", ")}
        </Text>
        <Button
          size="xs"
          variant="outline"
          selected={activeState === null}
          onClick={() => onChangeState(null)}
        >
          Live
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {DEBUG_STATES.map(({ value, label }) => (
          <Button
            key={value}
            size="xs"
            variant="outline"
            selected={activeState === value}
            onClick={() => onChangeState(value)}
          >
            {label}
          </Button>
        ))}
      </div>
    </DebugTogglePanel>
  )
}
