import { Link } from "react-router-dom"
import { LoaderIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/classes"
import type { GrantSession, GrantStep } from "../../types"
import { GrantProgressSteps } from "./grant-progress-steps"
import { GrantAppInfo } from "./grant-app-info"
import { GrantScopesList } from "./grant-scopes-list"
import { GrantWalletInfo } from "./grant-wallet-info"
import { GrantWarning } from "./grant-warning"

interface GrantConsentStateProps {
  session?: GrantSession
  walletAddress: string | null
  currentStep: GrantStep
  isApproving: boolean
  declineHref: string
  onApprove: () => void
}

export function GrantConsentState({
  session,
  walletAddress,
  currentStep,
  isApproving,
  declineHref,
  onApprove,
}: GrantConsentStateProps) {
  return (
    <div className="grid min-h-screen place-items-center bg-muted p-6">
      <div className="w-full max-w-[520px] rounded-card bg-background p-10 shadow-md">
        <div className="space-y-6">
          <GrantProgressSteps currentStep={currentStep} />
          <GrantAppInfo appName={session?.appName} appIcon={session?.appIcon} />
          <GrantScopesList scopes={session?.scopes} />
          <GrantWalletInfo walletAddress={walletAddress} />
          <GrantWarning />
          <div className="flex gap-3">
            <Button
              asChild
              variant="outline"
              className={cn(
                "flex-1 text-muted-foreground",
                isApproving && "pointer-events-none opacity-60"
              )}
            >
              <Link
                to={declineHref}
                aria-disabled={isApproving}
                onClick={event => {
                  if (isApproving) {
                    event.preventDefault()
                  }
                }}
              >
                Decline
              </Link>
            </Button>
            <Button
              type="button"
              onClick={onApprove}
              disabled={isApproving}
              variant="accent"
              className="flex-1"
            >
              {isApproving ? (
                <>
                  <LoaderIcon
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                  <span aria-live="polite">Approving…</span>
                </>
              ) : (
                "Approve"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
