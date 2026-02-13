import { AlertTriangleIcon, ArrowRightIcon, ExternalLinkIcon, LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { cn } from "@/lib/classes"
import { formatScopeLabel, getPrimaryDataSourceLabel } from "@/lib/scope-labels"
import type { BuilderManifest, GrantSession } from "../../types"
import { GrantWarning } from "./grant-warning"
import { ActionPanel } from "@/components/typography/button-action"

// Note: `isApproving` maps to the "creating-grant" / "approving" states.
// The consent screen stays visible while the Allow button shows a loading spinner.
interface GrantConsentStateProps {
  session?: GrantSession
  builderManifest?: BuilderManifest
  builderName?: string
  isApproving: boolean
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
  onApprove,
  onDeny,
}: GrantConsentStateProps) {
  const dataSourceLabel = getPrimaryDataSourceLabel(session?.scopes)
  const dataLabel = dataSourceLabel ? `${dataSourceLabel} data` : "data"
  const appName = builderName ?? builderManifest?.name ?? session?.appName ?? "this app"
  const builderIconSrc = pickBuilderIcon(builderManifest)

  const handleCancel = () => {
    if (isApproving) return
    if (onDeny) {
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

        {builderManifest?.description && (
          <Text as="p" intent="small" color="mutedForeground">
            {builderManifest.description}
          </Text>
        )}

        {builderManifest?.verified === false && (
          <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
            <AlertTriangleIcon className="size-4 shrink-0 text-yellow-500" aria-hidden="true" />
            <Text as="p" intent="small">
              This app could not be verified. Proceed with caution.
            </Text>
          </div>
        )}

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
                  {formatScopeLabel(scope)}
                </Text>
              ))}
            </ul>
          </div>
        )}

        {/* Builder links (privacy policy, terms, support) */}
        {(builderManifest?.privacyPolicyUrl || builderManifest?.termsUrl || builderManifest?.supportUrl) && (
          <div className="flex items-center gap-3 flex-wrap">
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
            {builderManifest.supportUrl && (
              <Text
                as="a"
                href={builderManifest.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                intent="small"
                link="default"
                withIcon
              >
                Support
                <ExternalLinkIcon aria-hidden="true" />
              </Text>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            disabled={isApproving}
            onClick={handleCancel}
            className={cn(
              "text-muted-foreground",
              "border border-transparent hover:border-ring hover:bg-background",
            )}
          >
            Cancel
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

