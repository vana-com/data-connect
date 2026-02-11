import { Link } from "react-router-dom"
import { ArrowRightIcon, ExternalLinkIcon, LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { getPrimaryDataSourceLabel } from "@/lib/scope-labels"
import type { BuilderManifest, GrantSession } from "../../types"
import { GrantWarning } from "./grant-warning"
import { ActionPanel } from "@/components/typography/action-button"

// Note: `isApproving` maps to the "creating-grant" / "approving" states.
// The consent screen stays visible while the Allow button shows a loading spinner.
interface GrantConsentStateProps {
  session?: GrantSession
  builderManifest?: BuilderManifest
  builderName?: string
  isApproving: boolean
  declineHref: string
  onApprove: () => void
  onDeny?: () => void
}

/** Pick the best icon from the builder manifest icons array (prefer 48–96px). */
function pickBuilderIcon(manifest?: BuilderManifest): string | undefined {
  if (!manifest?.icons?.length) return undefined
  // Prefer an icon in the 48–96px range; fall back to first
  const sized = manifest.icons.find(icon => {
    const w = parseInt(icon.sizes?.split("x")[0] ?? "", 10)
    return w >= 48 && w <= 96
  })
  return (sized ?? manifest.icons[0]).src
}

export function GrantConsentState({
  session,
  builderManifest,
  builderName,
  isApproving,
  declineHref,
  onApprove,
  onDeny,
}: GrantConsentStateProps) {
  const dataSourceLabel = getPrimaryDataSourceLabel(session?.scopes)
  const dataLabel = dataSourceLabel ? `${dataSourceLabel} data` : "data"
  const appName = builderName ?? builderManifest?.name ?? session?.appName ?? "this app"
  const builderIconSrc = pickBuilderIcon(builderManifest)

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
              {builderIconSrc ? (
                <div
                  className="flex items-center justify-center rounded-button p-1"
                  aria-hidden="true"
                >
                  <img
                    src={builderIconSrc}
                    alt=""
                    className="size-8 rounded-full object-cover"
                  />
                </div>
              ) : (
                <PlatformIcon iconName={appName} aria-hidden="true" />
              )}
            </div>
            <Text as="p" intent="button" weight="medium">
              See your {dataLabel}
            </Text>
          </ActionPanel>
        </div>

        {/* Scope list */}
        {session?.scopes && session.scopes.length > 0 && (
          <div className="space-y-1">
            <Text as="p" intent="small" color="mutedForeground">
              Permissions requested:
            </Text>
            <ul className="list-disc pl-5 space-y-0.5">
              {session.scopes.map(scope => (
                <Text as="li" key={scope} intent="small">
                  {formatScope(scope)}
                </Text>
              ))}
            </ul>
          </div>
        )}

        {/* Builder links (privacy policy, terms) */}
        {(builderManifest?.privacyPolicyUrl || builderManifest?.termsUrl) && (
          <div className="flex items-center gap-3">
            {builderManifest.privacyPolicyUrl && (
              <Text
                as="a"
                href={builderManifest.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                intent="small"
                link="default"
                withIcon
              >
                Privacy Policy
                <ExternalLinkIcon aria-hidden="true" />
              </Text>
            )}
            {builderManifest.termsUrl && (
              <Text
                as="a"
                href={builderManifest.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                intent="small"
                link="default"
                withIcon
              >
                Terms of Service
                <ExternalLinkIcon aria-hidden="true" />
              </Text>
            )}
          </div>
        )}

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

/** Turn scope strings like "chatgpt.conversations" into readable labels. */
function formatScope(scope: string): string {
  // Split on dots/colons/hyphens and title-case each part
  return scope
    .split(/[.:\-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
