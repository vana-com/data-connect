import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/typography/text"
import { DebugTogglePanel } from "@/components/elements/debug-toggle-panel"
import {
  buildGrantDebugPresetSearch,
  GRANT_DEBUG_PARAM_PRESETS,
  type ConsentDebugScenario,
} from "../grant-ui-debug"
import type { GrantFlowState, GrantSession } from "../types"

export type { ConsentDebugScenario } from "../grant-ui-debug"

const DEBUG_STATUSES: GrantFlowState["status"][] = [
  "loading",
  "claiming",
  "verifying-builder",
  "preparing-server",
  "consent",
  "approving",
  "creating-grant",
  "success",
  "error",
]

const CONSENT_DEBUG_SCENARIOS: {
  value: ConsentDebugScenario
  label: string
}[] = [
  { value: "5-linkedin", label: "LinkedIn multi" },
  { value: "mixed", label: "LinkedIn + Spotify + ChatGPT" },
]

interface GrantDebugPanelProps {
  activeStatus: GrantFlowState["status"] | null
  debugBuilderName: string
  session: GrantSession
  walletConnected: boolean
  consentDebugScenario: ConsentDebugScenario
  onConsentDebugScenarioChange: (s: ConsentDebugScenario) => void
  onChangeStatus: (status: GrantFlowState["status"] | null) => void
  onToggleWallet: () => void
}

const CONSENT_STATUSES: GrantFlowState["status"][] = [
  "consent",
  "creating-grant",
  "approving",
]

export function GrantDebugPanel({
  activeStatus,
  debugBuilderName,
  session,
  walletConnected,
  consentDebugScenario,
  onConsentDebugScenarioChange,
  onChangeStatus,
  onToggleWallet,
}: GrantDebugPanelProps) {
  const showScopeScenarios = activeStatus != null && CONSENT_STATUSES.includes(activeStatus)

  return (
    <DebugTogglePanel title="Grant debug" openClassName="min-w-[320px]">
      <div className="space-y-1.5 border-b pb-3">
        <p className="text-xs font-medium">Params (URL)</p>
        <div className="flex flex-wrap gap-2">
          {GRANT_DEBUG_PARAM_PRESETS.map(preset => (
            <Button key={preset.label} size="xs" variant="outline" asChild>
              <Link to={`/grant?${buildGrantDebugPresetSearch(preset)}`}>
                {preset.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-3">
        <Text intent="fine" color="mutedForeground">
          {debugBuilderName} · {session.scopes.join(", ")}
        </Text>
        <Button
          size="xs"
          variant="outline"
          selected={activeStatus === null}
          onClick={() => onChangeStatus(null)}
        >
          Live
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {DEBUG_STATUSES.map(status => (
          <Button
            key={status}
            size="xs"
            variant="outline"
            selected={activeStatus === status}
            onClick={() => onChangeStatus(status)}
          >
            {status}
          </Button>
        ))}
      </div>
      {showScopeScenarios && (
        <div className="mt-3 space-y-1.5 border-t pt-3">
          <p className="text-xs font-medium">Scope scenarios</p>
          <div className="flex flex-wrap gap-2">
            {CONSENT_DEBUG_SCENARIOS.map(({ value, label }) => (
              <Button
                key={value}
                size="xs"
                variant={consentDebugScenario === value ? "default" : "outline"}
                onClick={() => onConsentDebugScenarioChange(value)}
              >
                {label}
              </Button>
            ))}
            <Button
              size="xs"
              variant={consentDebugScenario === null ? "default" : "outline"}
              onClick={() => onConsentDebugScenarioChange(null)}
            >
              real
            </Button>
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <Button
          size="xs"
          variant="outline"
          onClick={onToggleWallet}
        >
          Wallet: {walletConnected ? "connected" : "missing"}
        </Button>
      </div>
    </DebugTogglePanel>
  )
}
