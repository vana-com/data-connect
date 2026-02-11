import { Link } from "react-router-dom"
import { ArrowRightIcon, LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { getPrimaryDataSourceLabel } from "@/lib/scope-labels"
import type { GrantSession } from "../../types"
import { GrantWarning } from "./grant-warning"
import { ActionPanel } from "@/components/typography/action-button"

// Note: `isApproving` maps to the "creating-grant" / "approving" states.
// The consent screen stays visible while the Allow button shows a loading spinner.
interface GrantConsentStateProps {
  session?: GrantSession
  builderName?: string
  isApproving: boolean
  declineHref: string
  onApprove: () => void
  onDeny?: () => void
}

export function GrantConsentState({
  session,
  builderName,
  isApproving,
  declineHref,
  onApprove,
  onDeny,
}: GrantConsentStateProps) {
  const dataSourceLabel = getPrimaryDataSourceLabel(session?.scopes)
  const dataLabel = dataSourceLabel ? `${dataSourceLabel} data` : "data"
  const appName = builderName ?? session?.appName ?? "this app"

  const handleCancel = (event: React.MouseEvent) => {
    if (isApproving) {
      event.preventDefault()
      return
    }
    if (onDeny) {
      event.preventDefault()
      onDeny()
    }
  }

  return (
    <div className="container py-w24">
      <div className="space-y-w6">
        <Text as="h1" intent="title">
          Allow access to your {dataLabel}
        </Text>
        <Text as="p">
          This will allow <strong>{appName}</strong> to:
        </Text>

        <div className="action-outsetx">
          <ActionPanel className="justify-start gap-w4">
            <div className="h-full flex items-center gap-1">
              <PlatformIcon
                iconName={dataSourceLabel ?? "Data"}
                aria-hidden="true"
              />
              <ArrowRightIcon aria-hidden="true" className="size-[1.5em]" />
              <PlatformIcon iconName={appName} aria-hidden="true" />
            </div>
            <Text as="p" intent="button" weight="medium">
              See your {dataLabel}
            </Text>
          </ActionPanel>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <Button
            asChild
            variant="ghost"
            className={cn(
              "text-muted-foreground",
              "border border-transparent hover:border-ring hover:bg-background",
              isApproving && "pointer-events-none opacity-60"
            )}
          >
            <Link
              to={declineHref}
              aria-disabled={isApproving}
              onClick={handleCancel}
            >
              Cancel
            </Link>
          </Button>
          <Button
            type="button"
            onClick={onApprove}
            disabled={isApproving}
            variant="accent"
            className="w-[140px] disabled:opacity-100"
          >
            {isApproving ? (
              <>
                <LoaderIcon
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                />
                <span aria-live="polite">Allowing…</span>
              </>
            ) : (
              "Allow"
            )}
          </Button>
        </div>

        <hr />
        <div className="flex justify-end">
          <GrantWarning />
        </div>
      </div>
    </div>
  )
}
