import { AlertTriangleIcon, ArrowRightIcon, LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PlatformIcon } from "@/components/icons/platform-icon"
import { Text } from "@/components/typography/text"
import { OpenExternalLink } from "@/components/typography/link-open-external"
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
  const scopeLabels = session?.scopes?.map(formatScopeLabel) ?? []
  const scopeActionLabel =
    scopeLabels.length === 0
      ? dataLabel
      : scopeLabels.length === 1
        ? scopeLabels[0]
        : scopeLabels.length === 2
          ? `${scopeLabels[0]} and ${scopeLabels[1]}`
          : `${scopeLabels.slice(0, -1).join(", ")}, and ${scopeLabels[scopeLabels.length - 1]}`
  const appName =
    builderName ?? builderManifest?.name ?? session?.appName ?? "this app"
  const builderIconSrc = pickBuilderIcon(builderManifest)
  const privacyPolicyUrl = builderManifest?.privacyPolicyUrl
  const termsUrl = builderManifest?.termsUrl
  const supportUrl = builderManifest?.supportUrl
  const builderLinks = [
    privacyPolicyUrl
      ? { href: privacyPolicyUrl, label: "Privacy Policy" }
      : null,
    termsUrl ? { href: termsUrl, label: "Terms of Service" } : null,
    supportUrl ? { href: supportUrl, label: "Support" } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>

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

        {/* TODO: style this as design system */}
        {builderManifest?.verified === false && (
          <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
            <AlertTriangleIcon
              className="size-4 shrink-0 text-yellow-500"
              aria-hidden="true"
            />
            <Text as="p" intent="small">
              This app could not be verified. Proceed with caution.
            </Text>
          </div>
        )}

        {/* purposely not wrapped in action-outset */}
        <ActionPanel className="justify-start gap-w4">
          <div className="h-full flex items-center gap-1">
            <PlatformIcon
              iconName={dataSourceLabel ?? "Data"}
              aria-hidden="true"
            />
            <ArrowRightIcon aria-hidden="true" className="size-[1.5em]" />
            <PlatformIcon
              iconName={appName}
              imageSrc={builderIconSrc}
              aria-hidden="true"
            />
          </div>
          {/* Scope list */}
          <Text as="p" intent="button" weight="medium">
            See your {scopeActionLabel}
          </Text>
        </ActionPanel>

        <div className="flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            disabled={isApproving}
            onClick={handleCancel}
            className={cn(
              "text-muted-foreground",
              "border border-transparent hover:border-ring hover:bg-background"
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
        <div className="flex flex-col items-end gap-2">
          {builderLinks.length > 0 && (
            <Text as="p" intent="body" dim align="right">
              Read {appName}'s{" "}
              {builderLinks.map((link, index) => (
                <span key={link.label}>
                  <OpenExternalLink href={link.href}>
                    {link.label}
                  </OpenExternalLink>
                  {index < builderLinks.length - 2
                    ? ", "
                    : index === builderLinks.length - 2
                      ? " and "
                      : ""}
                </span>
              ))}
              .
            </Text>
          )}
          <GrantWarning align="right" />
        </div>
      </div>
    </div>
  )
}
