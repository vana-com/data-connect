import { Link } from "react-router-dom"
import { LoaderIcon } from "lucide-react"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import type { GrantSession, GrantStep } from "../types"
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
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="w-full max-w-[520px] rounded-card bg-background p-10 shadow-md">
        <div className="space-y-6">
          <GrantProgressSteps currentStep={currentStep} />
          <GrantAppInfo appName={session?.appName} appIcon={session?.appIcon} />
          <GrantScopesList scopes={session?.scopes} />
          <GrantWalletInfo walletAddress={walletAddress} />
          <GrantWarning />
          <div className="flex gap-3">
            <Text
              as={Link}
              to={declineHref}
              intent="button"
              weight="medium"
              color="mutedForeground"
              aria-disabled={isApproving}
              onClick={event => {
                if (isApproving) {
                  event.preventDefault()
                }
              }}
              className={cn(
                "inline-flex flex-1 items-center justify-center rounded-button border border-border bg-background px-4 py-3 transition-colors hover:bg-muted",
                focusRing,
                isApproving && "pointer-events-none opacity-60"
              )}
            >
              Decline
            </Text>
            <button
              type="button"
              onClick={onApprove}
              disabled={isApproving}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-button bg-accent px-4 py-3 text-background transition-colors hover:bg-accent/90",
                "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70",
                focusRing
              )}
            >
              {isApproving ? (
                <>
                  <LoaderIcon
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                  <Text
                    as="span"
                    intent="button"
                    weight="medium"
                    color="inherit"
                    aria-live="polite"
                  >
                    Approving…
                  </Text>
                </>
              ) : (
                <Text as="span" intent="button" weight="medium" color="inherit">
                  Approve
                </Text>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
