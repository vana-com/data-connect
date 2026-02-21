import { Button } from "@/components/ui/button"
import { Text } from "@/components/typography/text"
import type { GrantFlowState, GrantSession } from "../types"

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

interface GrantDebugPanelProps {
  activeStatus: GrantFlowState["status"] | null
  debugBuilderName: string
  session: GrantSession
  walletConnected: boolean
  onChangeStatus: (status: GrantFlowState["status"] | null) => void
  onToggleWallet: () => void
}

export function GrantDebugPanel({
  activeStatus,
  debugBuilderName,
  session,
  walletConnected,
  onChangeStatus,
  onToggleWallet,
}: GrantDebugPanelProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-card bg-background p-3 shadow-md">
        <div className="flex items-center justify-between">
          <Text intent="small" weight="medium">
            Grant debug
          </Text>
          <Button
            type="button"
            size="xs"
            variant="outline"
            selected={activeStatus === null}
            onClick={() => onChangeStatus(null)}
          >
            Live
          </Button>
        </div>
        <Text intent="fine" color="mutedForeground" className="mt-2">
          {debugBuilderName} · {session.scopes.join(", ")}
        </Text>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEBUG_STATUSES.map(status => (
            <Button
              key={status}
              type="button"
              size="xs"
              variant="outline"
              selected={activeStatus === status}
              onClick={() => onChangeStatus(status)}
            >
              {status}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={onToggleWallet}
          >
            Wallet: {walletConnected ? "connected" : "missing"}
          </Button>
        </div>
      </div>
    </div>
  )
}
